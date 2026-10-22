import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import { loadState, saveState } from "./quizStorage.js";

const DEFAULT = { seen: [], rewarded: { date: "", slots: [] } };

function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
}

afterEach(() => {
  delete globalThis.localStorage;
});

describe("quizStorage", () => {
  it("저장이 막혀(throw) 있어도 기본값을 돌려주고 저장도 안 터진다", () => {
    const boom = () => {
      throw new Error("blocked");
    };
    globalThis.localStorage = { getItem: boom, setItem: boom };
    assert.deepEqual(loadState(), DEFAULT);
    assert.doesNotThrow(() => saveState({ ...DEFAULT, seen: ["economy-1"] }));
  });

  it("localStorage 자체가 없어도 기본값", () => {
    assert.deepEqual(loadState(), DEFAULT);
  });

  it("저장한 값을 그대로 읽는다 (daily3_ 키)", () => {
    const s = fakeStorage();
    globalThis.localStorage = s;
    const state = { seen: ["economy-1"], rewarded: { date: "2026-10-22", slots: ["morning"] } };
    saveState(state);
    assert.deepEqual(loadState(), state);
    assert.ok([...s.m.keys()].every((k) => k.startsWith("daily3_")));
  });

  it("깨진 JSON 은 기본값", () => {
    const s = fakeStorage();
    s.setItem("daily3_quiz_seen", "{oops");
    globalThis.localStorage = s;
    assert.deepEqual(loadState().seen, []);
  });
});
