import { addPoints, readPointEvents } from "../../../lib/points.js";

// 포인트는 공용 addPoints 로만 준다 (CLAUDE.md 앱 구조 규칙)
// 끼니마다 하루 한 번 +3, 하루 세 끼를 다 적으면 보너스 1~20 랜덤 (하루 한 번)
export const APP_ID = "meals";
export const MEAL_POINTS = 3;
export const BONUS_MIN = 1;
export const BONUS_MAX = 20;
const BONUS_REASON = "삼시 완성 보너스";

const givenToday = (date, reason) =>
  readPointEvents().some((e) => e.appId === APP_ID && e.date === date && e.reason === reason);

// 준 포인트를 { meal, bonus } 로 돌려준다 (이미 받은 건 0)
export function giveMealPoint(slotLabel, date, complete) {
  const reason = `${slotLabel} 기록`;
  const meal = givenToday(date, reason) ? 0 : addPoints(APP_ID, MEAL_POINTS, reason).amount;
  let bonus = 0;
  if (complete && !givenToday(date, BONUS_REASON)) {
    bonus = BONUS_MIN + Math.floor(Math.random() * (BONUS_MAX - BONUS_MIN + 1));
    addPoints(APP_ID, bonus, BONUS_REASON);
  }
  return { meal, bonus };
}

export function mealPointTotal() {
  return readPointEvents()
    .filter((e) => e.appId === APP_ID)
    .reduce((sum, e) => sum + e.amount, 0);
}
