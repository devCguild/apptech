import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { CATEGORIES, REWARD, canReward, nextSlot, pickQuestion, slotDate, slotProgress } from "./quizLogic.js";

const items = [
  { id: "economy-1", category: "economy" },
  { id: "economy-2", category: "economy" },
  { id: "history-1", category: "history" },
];

describe("pickQuestion", () => {
  it("분야로 거르고 rng=0 이면 첫 후보", () => {
    assert.equal(pickQuestion(items, "economy", [], () => 0).id, "economy-1");
  });
  it("푼 문제는 제외", () => {
    assert.equal(pickQuestion(items, "economy", ["economy-1"], () => 0).id, "economy-2");
  });
  it("다 풀었으면 null", () => {
    assert.equal(pickQuestion(items, "history", ["history-1"]), null);
  });
  it("items 가 없어도 null", () => {
    assert.equal(pickQuestion(undefined, "history", []), null);
  });
});

describe("canReward", () => {
  const rewarded = { date: "2026-10-22", slots: ["morning"] };
  it("같은 날 같은 시간대는 false", () => {
    assert.equal(canReward(rewarded, "2026-10-22", "morning"), false);
  });
  it("같은 날 다른 시간대는 true", () => {
    assert.equal(canReward(rewarded, "2026-10-22", "lunch"), true);
  });
  it("다른 날이면 true", () => {
    assert.equal(canReward(rewarded, "2026-10-23", "morning"), true);
  });
});

describe("상수", () => {
  it("분야 5개, 적립 10원", () => {
    assert.deepEqual(CATEGORIES.map((c) => c.id), ["economy", "society", "history", "science", "english"]);
    assert.equal(REWARD, 10);
  });
});

describe("slotDate (하루는 아침 06:00 에 바뀐다)", () => {
  it("한국 시간 05:30 저녁은 전날 기준", () => {
    assert.equal(slotDate(new Date("2026-10-22T20:30:00Z")), "2026-10-22");
  });
  it("한국 시간 06:00 부터 새 날짜", () => {
    assert.equal(slotDate(new Date("2026-10-22T21:00:00Z")), "2026-10-23");
  });
});

describe("slotProgress", () => {
  const none = { date: "", slots: [] };
  const states = (r, date, cur) => slotProgress(r, date, cur).map((s) => s.state);
  it("점심에 처음 들어오면 아침은 지남, 점심은 지금, 저녁은 대기", () => {
    assert.deepEqual(states(none, "2026-10-22", "lunch"), ["missed", "now", "upcoming"]);
  });
  it("맞힌 시간대는 done", () => {
    const r = { date: "2026-10-22", slots: ["morning", "lunch"] };
    assert.deepEqual(states(r, "2026-10-22", "lunch"), ["done", "done", "upcoming"]);
  });
  it("어제 기록은 오늘 영향 없음", () => {
    const r = { date: "2026-10-21", slots: ["morning"] };
    assert.deepEqual(states(r, "2026-10-22", "morning"), ["now", "upcoming", "upcoming"]);
  });
  it("라벨을 함께 준다", () => {
    const first = slotProgress(none, "2026-10-22", "morning")[0];
    assert.equal(first.slot, "morning");
    assert.equal(first.label, "아침");
  });
});

describe("nextSlot", () => {
  it("점심 다음은 저녁(오늘)", () => {
    assert.deepEqual(nextSlot("lunch"), { slot: "evening", label: "저녁", from: "16:00", tomorrow: false });
  });
  it("저녁 다음은 내일 아침", () => {
    assert.deepEqual(nextSlot("evening"), { slot: "morning", label: "아침", from: "06:00", tomorrow: true });
  });
});
