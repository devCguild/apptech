import { addPoints as addPointEvent, pointTotals } from "../../lib/points.js";

// 포인트 저장 위치는 이 파일에서만 정한다.
// 팀 공통 적립 기록(lib/points.js)에 쌓아서 홈·내 기록 포인트와 같이 움직인다.
export const APP_ID = "pokemon";

// 전체 잔액 (홈의 "내 포인트"와 같은 값). 적립 기록에는 appId 가 남아 내 기록에서 앱별로 구분된다
export function getPoints() {
  return pointTotals().total;
}

export function addPoints(amount) {
  addPointEvent(APP_ID, amount, "포켓몬 실루엣 퀴즈 정답");
  return getPoints();
}
