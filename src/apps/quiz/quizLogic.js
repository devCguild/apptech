import { TIME_SLOTS } from "../../timeSlots.js";
import { kstDate } from "../../lib/storage.js";

export const CATEGORIES = [
  { id: "economy", label: "경제" },
  { id: "society", label: "사회" },
  { id: "history", label: "역사" },
  { id: "science", label: "과학" },
  { id: "english", label: "영어" },
];

export const REWARD = 10; // 정답 1회 적립금(원)

export function pickQuestion(items, category, seenIds, rng = Math.random) {
  const pool = (items || []).filter((q) => q.category === category && !seenIds.includes(q.id));
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}

// 하루에 시간대당 1회만 적립
export function canReward(rewarded, date, slot) {
  return rewarded.date !== date || !rewarded.slots.includes(slot);
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

const ORDER = Object.keys(TIME_SLOTS);

// 퀴즈의 '오늘'은 첫 시간대(아침 06:00)에 바뀐다. 자정 넘은 새벽 저녁은 전날 기록으로 센다.
export function slotDate(now = new Date()) {
  return kstDate(new Date(now.getTime() - toMinutes(TIME_SLOTS[ORDER[0]].from) * 60000));
}

// 오늘 시간대별 상태: done(맞힘) · missed(지나감) · now(지금) · upcoming(아직)
export function slotProgress(rewarded, date, current) {
  const curIdx = ORDER.indexOf(current);
  return ORDER.map((slot, i) => ({
    slot,
    label: TIME_SLOTS[slot].label,
    state: !canReward(rewarded, date, slot) ? "done" : i < curIdx ? "missed" : i === curIdx ? "now" : "upcoming",
  }));
}

// 다음 시간대 안내용. 마지막 시간대 다음은 내일 첫 시간대
export function nextSlot(current) {
  const i = ORDER.indexOf(current);
  const slot = ORDER[(i + 1) % ORDER.length];
  return { slot, label: TIME_SLOTS[slot].label, from: TIME_SLOTS[slot].from, tomorrow: i + 1 >= ORDER.length };
}
