import { readJson, writeJson } from "../../lib/storage.js";

// 💾 퀴즈 기록 (읽기·쓰기 try/catch 는 lib/storage.js 가 처리). 포인트는 lib/points.js 의 addPoints 로만 준다.
const KEYS = {
  seen: "daily3_quiz_seen",
  rewarded: "daily3_quiz_rewarded",
};

export function loadState() {
  const seen = readJson(KEYS.seen, []);
  const rewarded = readJson(KEYS.rewarded, { date: "", slots: [] });
  return {
    seen: Array.isArray(seen) ? seen : [],
    rewarded:
      rewarded && typeof rewarded.date === "string" && Array.isArray(rewarded.slots)
        ? rewarded
        : { date: "", slots: [] },
  };
}

export function saveState(state) {
  writeJson(KEYS.seen, state.seen);
  writeJson(KEYS.rewarded, state.rewarded);
}
