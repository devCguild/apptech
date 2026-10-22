import { addPoints, readPointEvents } from "../../../lib/points.js";

// 포인트는 공용 addPoints 로만 준다 (CLAUDE.md 앱 구조 규칙). 끼니마다 하루 한 번 +1
export const APP_ID = "meals";

export function giveMealPoint(slotLabel, date) {
  const reason = `${slotLabel} 기록`;
  const already = readPointEvents().some((e) => e.appId === APP_ID && e.date === date && e.reason === reason);
  if (!already) addPoints(APP_ID, 1, reason);
}

export function mealPointTotal() {
  return readPointEvents()
    .filter((e) => e.appId === APP_ID)
    .reduce((sum, e) => sum + e.amount, 0);
}
