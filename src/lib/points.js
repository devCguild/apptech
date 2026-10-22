import { kstDate, readJson, writeJson } from "./storage.js";

// 포인트는 '적립 기록'을 쌓고, 잔액은 기록을 더해서 계산한다
const KEY = "daily3_points";

export function readPointEvents() {
  const events = readJson(KEY, []);
  return Array.isArray(events) ? events : [];
}

// 미니앱에서 포인트를 줄 때 부른다. 예: addPoints("mission", 10, "출석 체크")
export function addPoints(appId, amount, reason) {
  const now = new Date();
  const event = { appId, amount, reason, at: now.toISOString(), date: kstDate(now) };
  writeJson(KEY, [...readPointEvents(), event]);
  return event;
}

export function pointTotals(events = readPointEvents()) {
  const today = kstDate();
  return events.reduce(
    (sum, e) => ({
      total: sum.total + e.amount,
      today: sum.today + (e.date === today ? e.amount : 0),
    }),
    { total: 0, today: 0 },
  );
}
