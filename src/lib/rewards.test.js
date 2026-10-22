import test from "node:test";
import assert from "node:assert/strict";

import { createRewardsClient } from "./rewards.js";

const KEY = "daily3_rewards_session";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const ready = { storage_ready: true, callback_ready: true, environment: "test", live_enabled: false };
const session = (token = "unit-test-session") => ({
  token, user_id: USER_ID, environment: "test", expires_at: "2099-01-01T00:00:00Z",
});
const wallet = { environment: "test", user_id: USER_ID, balance: 0, unit: "P", transactions: [] };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status });

function storage(initial = null) {
  const values = new Map(initial === null ? [] : [[KEY, initial]]);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function harness({ initial = null, store = storage(initial), status = ready, onWallet = () => json(wallet), onSession = () => json(session(), 201) } = {}) {
  const calls = { status: 0, session: 0, wallet: 0, tokens: [] };
  const client = createRewardsClient({
    storage: () => store,
    fetchImpl: async (url, options) => {
      if (url.endsWith("/api/rewards/status")) { calls.status += 1; return json(status); }
      if (url.endsWith("/api/session")) { calls.session += 1; assert.equal(options.method, "POST"); return onSession(calls.session); }
      if (url.endsWith("/api/wallet")) {
        calls.wallet += 1;
        calls.tokens.push(options.headers.Authorization);
        return onWallet(calls.wallet);
      }
      throw new Error("Unexpected endpoint");
    },
  });
  return { client, calls, store };
}

test("unconfigured storage shows preparation without creating an account or a zero wallet", async () => {
  const { client, calls } = harness({ status: { ...ready, storage_ready: false } });
  const state = await client.load();
  assert.equal(state.kind, "preparing");
  assert.equal(Object.hasOwn(state, "wallet"), false);
  assert.equal(calls.session, 0);
  assert.equal(calls.wallet, 0);
});

test("parallel mounts share one in-flight account and wallet request", async () => {
  const { client, calls } = harness();
  const first = client.load();
  const second = client.load();
  assert.equal(first, second);
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a, b);
  assert.equal(calls.session, 1);
  assert.equal(calls.wallet, 1);
  assert.equal(a.userId, USER_ID);
  assert.equal(Object.hasOwn(a, "token"), false);
  assert.equal(Object.hasOwn(a, "session"), false);
});

test("a valid saved account survives client recreation", async () => {
  const store = storage();
  await harness({ store }).client.load();
  const next = harness({ store });
  assert.equal((await next.client.load()).kind, "wallet");
  assert.equal(next.calls.session, 0);
  assert.deepEqual(next.calls.tokens, ["Bearer unit-test-session"]);
});

test("native USN comes from the authenticated wallet even if saved metadata was altered", async () => {
  const { client, calls } = harness({ initial: JSON.stringify({ ...session(), user_id: "altered-cache" }) });
  const result = await client.load();
  assert.equal(result.userId, USER_ID);
  assert.equal(calls.session, 0);
});

test("expired saved account is replaced using server expiry", async () => {
  const expired = { ...session("expired"), expires_at: "2000-01-01T00:00:00Z" };
  const { client, calls } = harness({ initial: JSON.stringify(expired) });
  await client.load();
  assert.equal(calls.session, 1);
  assert.deepEqual(calls.tokens, ["Bearer unit-test-session"]);
});

test("a malformed saved record is replaced without claiming storage is blocked", async () => {
  const { client } = harness({ initial: "{" });
  assert.equal((await client.load()).persistent, true);
});

test("blocked storage keeps the same account in memory for this visit", async () => {
  const blocked = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
    removeItem() { throw new Error("blocked"); },
  };
  const { client, calls } = harness({ store: blocked });
  assert.equal((await client.load()).persistent, false);
  assert.equal((await client.load()).persistent, false);
  assert.equal(calls.session, 1);
});

test("network failure cannot become a zero balance or create a replacement account", async () => {
  const { client, calls } = harness({ onWallet: (count) => {
    if (count === 1) throw new Error("network disconnected");
    return json(wallet);
  } });
  await assert.rejects(client.load(), { code: "unavailable" });
  assert.equal((await client.load()).kind, "wallet");
  assert.equal(calls.session, 1);
});

test("an invalid bearer account refreshes once", async () => {
  const { client, calls } = harness({
    initial: JSON.stringify(session("old-account")),
    onWallet: (count) => count === 1 ? json({}, 401) : json(wallet),
  });
  await client.load();
  assert.equal(calls.session, 1);
  assert.deepEqual(calls.tokens, ["Bearer old-account", "Bearer unit-test-session"]);
});

test("repeated unauthorized responses stop after one automatic account refresh", async () => {
  const { client, calls } = harness({ onWallet: () => json({}, 401) });
  await assert.rejects(client.load(), { status: 401 });
  assert.equal(calls.session, 2);
  assert.equal(calls.wallet, 2);
});

test("wrong environment and malformed ledger responses are rejected", async () => {
  for (const value of [
    { ...wallet, environment: "live" },
    { ...wallet, balance: "0" },
    { ...wallet, user_id: "invalid-user-id" },
    { ...wallet, transactions: [{ id: "a", amount: 1, campaign_key: "campaign", created_at: "invalid" }] },
  ]) {
    const { client } = harness({ onWallet: () => json(value) });
    await assert.rejects(client.load(), { code: "invalid-response" });
  }
});

test("disabled live environment cannot create an account", async () => {
  const { client, calls } = harness({ status: { ...ready, environment: "live" } });
  assert.equal((await client.load()).kind, "preparing");
  assert.equal(calls.session, 0);
});

test("inconsistent readiness flags are rejected before account creation", async () => {
  const { client, calls } = harness({ status: { ...ready, live_enabled: true } });
  await assert.rejects(client.load(), { code: "invalid-response" });
  assert.equal(calls.session, 0);
});
