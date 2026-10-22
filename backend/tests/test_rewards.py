from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
import hashlib
import hmac
import sqlite3
from urllib.parse import urlencode

from fastapi.testclient import TestClient
import pytest

from app.config import Settings
from app.main import create_app


HASH_KEY = "test-only-provider-signature-key"


@pytest.fixture
def database_url(tmp_path):
    return f"sqlite:///{tmp_path / 'rewards.db'}"


@contextmanager
def rewards_client(database_url, **overrides):
    values = {"database_url": database_url, "adpopcorn_hash_key": HASH_KEY}
    values.update(overrides)
    with TestClient(create_app(settings=Settings(**values))) as client:
        yield client


@pytest.fixture
def client(database_url):
    with rewards_client(database_url) as active_client:
        yield active_client


def create_session(client):
    response = client.post("/api/session")
    assert response.status_code == 201
    assert response.headers["cache-control"] == "no-store"
    session = response.json()
    assert session["environment"] == "test"
    assert session["token"]
    assert session["user_id"]
    assert session["expires_at"]
    return session


def auth(session):
    return {"Authorization": f"Bearer {session['token']}"}


def wallet(client, session):
    response = client.get("/api/wallet", headers=auth(session))
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    return response.json()


def signed_reward(user_id, *, reward_key="reward-1", campaign_key="campaign-1", quantity="7"):
    fields = {
        "usn": user_id,
        "reward_key": reward_key,
        "campaign_key": campaign_key,
        "quantity": quantity,
    }
    # Provider signs the original quantity string in this exact order, without separators.
    plaintext = user_id + reward_key + quantity + campaign_key
    fields["signed_value"] = hmac.new(
        HASH_KEY.encode(), plaintext.encode(), hashlib.md5
    ).hexdigest()
    return fields


def callback(client, fields):
    return client.post(
        "/api/adpopcorn/callback",
        content=urlencode(fields),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )


def assert_rejected(response, result_code):
    assert response.headers["cache-control"] == "no-store"
    payload = response.json()
    assert payload["Result"] is False
    assert payload["ResultCode"] == result_code
    assert payload["ResultMsg"]


def test_session_creates_independent_empty_server_wallets(client):
    first = create_session(client)
    second = create_session(client)

    assert first["user_id"] != second["user_id"]
    assert first["token"] != second["token"]
    assert first["token"] != first["user_id"]
    assert wallet(client, first) == {
        "environment": "test", "user_id": first["user_id"], "balance": 0, "unit": "P", "transactions": []
    }
    assert wallet(client, second)["user_id"] == second["user_id"]
    assert wallet(client, second)["balance"] == 0


def test_client_cannot_choose_identity_or_seed_a_balance(client):
    existing = create_session(client)
    response = client.post(
        "/api/session", json={"user_id": existing["user_id"], "balance": 99999}
    )
    assert response.status_code == 201
    created = response.json()
    assert created["user_id"] != existing["user_id"]
    assert wallet(client, created)["balance"] == 0


@pytest.mark.parametrize("authorization", [None, "Bearer invalid-token", "Basic invalid-token"])
def test_wallet_requires_a_valid_session(client, authorization):
    headers = {} if authorization is None else {"Authorization": authorization}
    response = client.get("/api/wallet", headers=headers)
    assert response.status_code == 401
    assert response.headers["cache-control"] == "no-store"


def test_status_reports_test_environment_and_does_not_enable_live_ads(client):
    response = client.get("/api/rewards/status")
    assert response.status_code == 200
    status = response.json()
    assert status["storage_ready"] is True
    assert status["callback_ready"] is True
    assert status["environment"] == "test"
    assert status["live_enabled"] is False
    assert HASH_KEY not in response.text


def test_signed_callback_credits_only_its_registered_user(client):
    recipient = create_session(client)
    bystander = create_session(client)

    response = callback(client, signed_reward(recipient["user_id"]))
    assert response.status_code == 200
    assert response.json() == {"Result": True, "ResultCode": 1, "ResultMsg": "success"}
    balance = wallet(client, recipient)
    assert balance["balance"] == 7
    assert len(balance["transactions"]) == 1
    transaction = balance["transactions"][0]
    assert transaction["amount"] == 7
    assert transaction["campaign_key"] == "campaign-1"
    assert transaction["id"]
    assert transaction["created_at"]
    assert wallet(client, bystander)["balance"] == 0
    attempted_leak = client.get(
        "/api/wallet", params={"user_id": recipient["user_id"]}, headers=auth(bystander)
    )
    assert attempted_leak.status_code == 200
    assert attempted_leak.json()["balance"] == 0


def test_signature_uses_raw_quantity_string_before_integer_conversion(client):
    session = create_session(client)
    response = callback(client, signed_reward(session["user_id"], quantity="0007"))
    assert response.json()["ResultCode"] == 1
    assert wallet(client, session)["balance"] == 7


@pytest.mark.parametrize("field", ["usn", "reward_key", "quantity", "campaign_key"])
def test_tampering_any_signed_field_never_credits_wallet(client, field):
    session = create_session(client)
    fields = signed_reward(session["user_id"])
    fields[field] = "8" if field == "quantity" else fields[field] + "-tampered"

    assert_rejected(callback(client, fields), 1100)
    assert wallet(client, session)["balance"] == 0


def test_correctly_signed_unknown_user_is_rejected_without_creating_user(client):
    known_user = create_session(client)
    assert_rejected(callback(client, signed_reward("unregistered-user")), 3200)
    assert wallet(client, known_user)["balance"] == 0
    assert_rejected(callback(client, signed_reward("unregistered-user")), 3200)


@pytest.mark.parametrize("length,code", [(128, 3200), (129, 4000)])
def test_usn_length_matches_provider_contract(client, length, code):
    assert_rejected(callback(client, signed_reward("u" * length)), code)


@pytest.mark.parametrize("field,maximum", [("reward_key", 256), ("campaign_key", 50)])
def test_provider_identifier_length_boundaries(client, field, maximum):
    session = create_session(client)
    accepted = signed_reward(session["user_id"], **{field: "a" * maximum})
    assert callback(client, accepted).json()["ResultCode"] == 1
    rejected = signed_reward(session["user_id"], **{field: "b" * (maximum + 1)})
    assert_rejected(callback(client, rejected), 4000)
    assert wallet(client, session)["balance"] == 7


def test_reward_key_cannot_be_reused_by_another_campaign_or_user(client):
    first = create_session(client)
    second = create_session(client)
    assert callback(client, signed_reward(first["user_id"])).json()["ResultCode"] == 1

    assert_rejected(callback(client, signed_reward(first["user_id"])), 3100)
    assert_rejected(
        callback(client, signed_reward(second["user_id"], campaign_key="other-campaign")),
        3100,
    )
    assert wallet(client, first)["balance"] == 7
    assert len(wallet(client, first)["transactions"]) == 1
    assert wallet(client, second)["balance"] == 0


def test_simultaneous_duplicate_callbacks_credit_exactly_once(client):
    session = create_session(client)
    fields = signed_reward(session["user_id"])
    with ThreadPoolExecutor(max_workers=6) as pool:
        responses = list(pool.map(lambda _: callback(client, fields), range(6)))

    assert sorted(response.json()["ResultCode"] for response in responses) == [1] + [3100] * 5
    balance = wallet(client, session)
    assert balance["balance"] == 7
    assert len(balance["transactions"]) == 1


@pytest.mark.parametrize("quantity", ["-1", "0", "1.5", "1e3", "+1", " 1", "1 ", "9" * 100])
def test_non_positive_or_malformed_quantities_never_credit_wallet(client, quantity):
    session = create_session(client)
    assert_rejected(callback(client, signed_reward(session["user_id"], quantity=quantity)), 4000)
    assert wallet(client, session)["balance"] == 0


@pytest.mark.parametrize("field", ["usn", "reward_key", "campaign_key", "quantity", "signed_value"])
def test_missing_callback_fields_are_rejected(client, field):
    session = create_session(client)
    fields = signed_reward(session["user_id"])
    del fields[field]
    assert_rejected(callback(client, fields), 4000)
    assert wallet(client, session)["balance"] == 0


@pytest.mark.parametrize("field", ["usn", "reward_key", "campaign_key", "quantity", "signed_value"])
def test_duplicate_form_parameters_are_rejected(client, field):
    session = create_session(client)
    fields = signed_reward(session["user_id"])
    pairs = list(fields.items()) + [(field, fields[field])]
    assert_rejected(callback(client, pairs), 4000)
    assert wallet(client, session)["balance"] == 0


def test_callback_requires_form_encoding(client):
    session = create_session(client)
    response = client.post("/api/adpopcorn/callback", json=signed_reward(session["user_id"]))
    assert_rejected(response, 4000)
    assert wallet(client, session)["balance"] == 0


def test_provider_fields_are_stored_as_data_not_sql(client):
    session = create_session(client)
    campaign = "campaign'; DROP TABLE users; --"
    response = callback(client, signed_reward(session["user_id"], campaign_key=campaign))
    assert response.json()["ResultCode"] == 1
    assert wallet(client, session)["transactions"][0]["campaign_key"] == campaign
    assert create_session(client)["user_id"] != session["user_id"]


def test_session_and_reward_survive_app_restart(database_url):
    with rewards_client(database_url) as first_client:
        session = create_session(first_client)
        assert callback(first_client, signed_reward(session["user_id"])).json()["ResultCode"] == 1
        before = wallet(first_client, session)

    with rewards_client(database_url) as restarted_client:
        assert wallet(restarted_client, session) == before
        assert_rejected(callback(restarted_client, signed_reward(session["user_id"])), 3100)
        assert wallet(restarted_client, session)["balance"] == 7


def test_wallet_limits_visible_history_without_truncating_balance(client):
    session = create_session(client)
    for number in range(52):
        response = callback(
            client,
            signed_reward(session["user_id"], reward_key=f"reward-{number}", quantity="1"),
        )
        assert response.json()["ResultCode"] == 1
    balance = wallet(client, session)
    assert balance["balance"] == 52
    assert len(balance["transactions"]) == 50
    assert len({row["id"] for row in balance["transactions"]}) == 50


def test_expired_session_cannot_read_persisted_wallet(database_url):
    with rewards_client(database_url) as active_client:
        session = create_session(active_client)
    database_path = database_url.removeprefix("sqlite:///")
    with sqlite3.connect(database_path) as database:
        database.execute("UPDATE guest_sessions SET expires_at = 1")
    with rewards_client(database_url) as restarted_client:
        assert restarted_client.get("/api/wallet", headers=auth(session)).status_code == 401


def test_failed_ledger_write_never_leaves_a_credit_or_consumes_reward_key(client, database_url):
    session = create_session(client)
    database_path = database_url.removeprefix("sqlite:///")
    with sqlite3.connect(database_path) as database:
        database.execute(
            "CREATE TRIGGER fail_reward BEFORE INSERT ON reward_ledger "
            "BEGIN SELECT RAISE(ABORT, 'forced test write failure'); END"
        )
    fields = signed_reward(session["user_id"])
    failed = callback(client, fields)
    assert failed.status_code == 503
    assert_rejected(failed, 4000)
    assert wallet(client, session)["balance"] == 0
    assert wallet(client, session)["transactions"] == []

    with sqlite3.connect(database_path) as database:
        database.execute("DROP TRIGGER fail_reward")
    assert callback(client, fields).json()["ResultCode"] == 1
    assert wallet(client, session)["balance"] == 7


def test_vercel_without_durable_storage_disables_session_wallet_and_callback(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    with rewards_client(None) as unconfigured_client:
        status = unconfigured_client.get("/api/rewards/status").json()
        assert status["storage_ready"] is False
        assert status["callback_ready"] is False
        assert unconfigured_client.post("/api/session").status_code == 503
        assert unconfigured_client.get("/api/wallet", headers={"Authorization": "Bearer unavailable"}).status_code == 503
        assert callback(unconfigured_client, signed_reward("unknown")).status_code == 503


def test_vercel_never_uses_ephemeral_sqlite_for_rewards(database_url, monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    with rewards_client(database_url) as ephemeral_client:
        assert ephemeral_client.get("/api/rewards/status").json()["storage_ready"] is False
        assert ephemeral_client.post("/api/session").status_code == 503


def test_missing_signature_key_disables_callback_but_keeps_wallet(database_url):
    with rewards_client(database_url, adpopcorn_hash_key=None) as unconfigured_client:
        session = create_session(unconfigured_client)
        status = unconfigured_client.get("/api/rewards/status").json()
        assert status["storage_ready"] is True
        assert status["callback_ready"] is False
        assert callback(unconfigured_client, signed_reward(session["user_id"])).status_code == 503
        assert wallet(unconfigured_client, session)["balance"] == 0


def test_live_environment_fails_closed_without_explicit_enable(database_url):
    with rewards_client(database_url, adpopcorn_environment="live") as live_client:
        status = live_client.get("/api/rewards/status").json()
        assert status["environment"] == "live"
        assert status["live_enabled"] is False
        assert status["callback_ready"] is False
        assert callback(live_client, signed_reward("unknown")).status_code == 503


def test_test_session_cannot_read_or_receive_live_rewards_in_same_database(database_url):
    with rewards_client(database_url) as test_client:
        test_session = create_session(test_client)
        assert callback(test_client, signed_reward(test_session["user_id"])).json()["ResultCode"] == 1

    with rewards_client(database_url, adpopcorn_environment="live", allow_live_rewards=True) as live_client:
        assert live_client.get("/api/wallet", headers=auth(test_session)).status_code == 401
        assert_rejected(callback(live_client, signed_reward(test_session["user_id"])), 3200)
        response = live_client.post("/api/session")
        assert response.status_code == 201
        live_session = response.json()
        assert live_session["environment"] == "live"
        assert wallet(live_client, live_session)["balance"] == 0
        # Identical provider reward keys are isolated between test and live ledgers.
        assert callback(live_client, signed_reward(live_session["user_id"])).json()["ResultCode"] == 1
        assert wallet(live_client, live_session)["balance"] == 7

    with rewards_client(database_url) as test_client:
        assert wallet(test_client, test_session)["balance"] == 7
        assert test_client.get("/api/wallet", headers=auth(live_session)).status_code == 401


def test_invalid_environment_keeps_health_available_and_rewards_disabled(monkeypatch):
    monkeypatch.setenv("ADPOPCORN_ENVIRONMENT", "invalid")
    with TestClient(create_app()) as misconfigured_client:
        assert misconfigured_client.get("/api/health").status_code == 200
        status = misconfigured_client.get("/api/rewards/status").json()
        assert status["storage_ready"] is False
        assert status["callback_ready"] is False
        assert status["live_enabled"] is False
        assert misconfigured_client.post("/api/session").status_code == 503
