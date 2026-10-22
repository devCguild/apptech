from fastapi.testclient import TestClient

from app import parks
from app.main import app

client = TestClient(app)


def _clear(monkeypatch):
    parks._cache.clear()
    monkeypatch.setattr(parks, "_service_key", lambda: None)


def test_parks_without_key_returns_503(monkeypatch):
    _clear(monkeypatch)
    response = client.get("/api/parks")
    assert response.status_code == 503


def test_parks_keeps_only_seoul_with_coordinates(monkeypatch):
    _clear(monkeypatch)
    monkeypatch.setattr(parks, "_service_key", lambda: "test")
    # 실제 응답처럼 body.items.item 에 목록이 들어 있다
    page = {
        "totalCount": "3",
        "items": {"item": [
            {"parkNm": "탑골공원", "rdnmadr": "서울특별시 종로구 종로 99",
             "latitude": "37.5711", "longitude": "126.9883", "referenceDate": "2026-05-01"},
            {"parkNm": "부산공원", "rdnmadr": "부산광역시 중구",
             "latitude": "35.1", "longitude": "129.0", "referenceDate": "2026-06-01"},
            {"parkNm": "좌표없는공원", "lnmadr": "서울특별시 중구", "latitude": ""},
        ]},
    }
    monkeypatch.setattr(parks, "_fetch_page", lambda key, n: page)

    response = client.get("/api/parks")
    assert response.status_code == 200
    assert response.json() == {
        "parks": [{"name": "탑골공원", "address": "서울특별시 종로구 종로 99",
                   "lat": 37.5711, "lng": 126.9883}],
        "referenceDate": "2026-06-01",
    }


def test_parks_upstream_error_returns_502(monkeypatch):
    _clear(monkeypatch)
    monkeypatch.setattr(parks, "_service_key", lambda: "test")

    def fail(key, n):
        raise RuntimeError("SERVICE_KEY_IS_NOT_REGISTERED_ERROR")

    monkeypatch.setattr(parks, "_fetch_page", fail)
    assert client.get("/api/parks").status_code == 502
