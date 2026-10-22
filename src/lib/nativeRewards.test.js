import test from "node:test";
import assert from "node:assert/strict";

import { canOpenNativeOfferwall, createNativeRewards } from "./nativeRewards.js";

const nativeReady = { platform: "android", configured: true, error: null };
const serverReady = { storage_ready: true, callback_ready: true, environment: "test", live_enabled: false };
const userId = "server-issued-user";

function harness({ origin = "https://appassets.androidplatform.net", configured = true, rawStatus, openResult = true } = {}) {
  const target = new EventTarget();
  target.location = { origin };
  const calls = { status: 0, users: [] };
  target.ApptechRewards = {
    getStatus() { calls.status += 1; return rawStatus === undefined ? JSON.stringify({ platform: "android", configured }) : rawStatus; },
    openOfferwall(usn) { calls.users.push(usn); return openResult; },
  };
  const adapter = createNativeRewards({ getWindow: () => target });
  return { adapter, target, calls };
}

test("normal browser and absent window expose no native offerwall", () => {
  assert.deepEqual(createNativeRewards({ getWindow: () => undefined }).getStatus(), {
    platform: "web", configured: false, error: null,
  });
  const { adapter, calls } = harness({ origin: "https://devcguild.github.io" });
  assert.equal(adapter.getStatus().platform, "web");
  assert.equal(adapter.openOfferwall({ userId, serverStatus: serverReady }).accepted, false);
  assert.equal(calls.status, 0);
  assert.deepEqual(calls.users, []);
});

test("an Android package without its bridge reports a retriable unavailable state", () => {
  const { adapter, target } = harness();
  delete target.ApptechRewards;
  assert.deepEqual(adapter.getStatus(), { platform: "android", configured: false, error: "unavailable" });
});

test("unconfigured native keys cannot open the offerwall", () => {
  const { adapter, calls } = harness({ configured: false });
  assert.equal(adapter.getStatus().configured, false);
  assert.deepEqual(adapter.openOfferwall({ userId, serverStatus: serverReady }), { accepted: false, reason: "not-ready" });
  assert.deepEqual(calls.users, []);
});

test("malformed bridge status cannot enable participation", () => {
  for (const rawStatus of ["{", "null", "[]", JSON.stringify({ platform: "ios", configured: true }), JSON.stringify({ platform: "android", configured: "true" }), { platform: "android", configured: true }]) {
    const { adapter, calls } = harness({ rawStatus });
    assert.equal(adapter.getStatus().error, "unavailable");
    assert.equal(adapter.openOfferwall({ userId, serverStatus: serverReady }).accepted, false);
    assert.deepEqual(calls.users, []);
  }
});

test("server storage, callbacks, valid USN, and live authorization all gate the button", () => {
  const base = { nativeStatus: nativeReady, serverStatus: serverReady, userId };
  assert.equal(canOpenNativeOfferwall(base), true);
  for (const serverStatus of [
    { ...serverReady, storage_ready: false },
    { ...serverReady, callback_ready: false },
    { ...serverReady, environment: "live" },
    { ...serverReady, environment: "unknown" },
    { ...serverReady, live_enabled: true },
    { ...serverReady, live_enabled: "true" },
  ]) assert.equal(canOpenNativeOfferwall({ ...base, serverStatus }), false);
  for (const invalidUser of ["", "x".repeat(101), "contains space", undefined]) {
    assert.equal(canOpenNativeOfferwall({ ...base, userId: invalidUser }), false);
  }
  assert.equal(canOpenNativeOfferwall({ ...base, serverStatus: { ...serverReady, environment: "live", live_enabled: true } }), true);
});

test("dispatch passes only the existing server user ID and returns no reward", () => {
  const { adapter, calls } = harness();
  const result = adapter.openOfferwall({ userId, serverStatus: serverReady });
  assert.deepEqual(result, { accepted: true, reason: null });
  assert.deepEqual(calls.users, [userId]);
  assert.equal(Object.hasOwn(result, "amount"), false);
  assert.equal(Object.hasOwn(result, "balance"), false);
});

test("native opening rejection and exceptions are retriable failures", () => {
  for (const openResult of [false, "true", null]) {
    const { adapter } = harness({ openResult });
    assert.deepEqual(adapter.openOfferwall({ userId, serverStatus: serverReady }), { accepted: false, reason: "open-failed" });
  }
  const { adapter, target } = harness();
  target.ApptechRewards.openOfferwall = () => { throw new Error("SDK unavailable"); };
  assert.deepEqual(adapter.openOfferwall({ userId, serverStatus: serverReady }), { accepted: false, reason: "open-failed" });
});

test("native close notification calls refresh once and detaches on unmount", () => {
  const { adapter, target } = harness();
  let refreshes = 0;
  const stop = adapter.subscribeOfferwallClosed(() => { refreshes += 1; });
  target.dispatchEvent(new Event("apptech:offerwall-closed"));
  assert.equal(refreshes, 1);
  stop();
  target.dispatchEvent(new Event("apptech:offerwall-closed"));
  assert.equal(refreshes, 1);
});

test("web notifications cannot invoke a native close subscription", () => {
  const { adapter, target } = harness({ origin: "http://127.0.0.1:5327" });
  let refreshes = 0;
  const stop = adapter.subscribeOfferwallClosed(() => { refreshes += 1; });
  target.dispatchEvent(new Event("apptech:offerwall-closed"));
  stop();
  assert.equal(refreshes, 0);
});
