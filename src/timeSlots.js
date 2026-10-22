// ⏰ 시간대는 여기 한 곳에서만 정한다 (CLAUDE.md 시간대 규칙)
export const TIME_SLOTS = {
  morning: { label: "아침", from: "06:00", to: "10:59" }, // ⏰ 아침
  lunch:   { label: "점심", from: "11:00", to: "15:59" }, // ⏰ 점심
  evening: { label: "저녁", from: "16:00", to: "05:59" }, // ⏰ 저녁
};

// ⏰ 한국 시간 기준 지금 시간대. 주소에 ?t=morning|lunch|evening 이 있으면 그걸 먼저 쓴다
export function currentTimeSlot(now = new Date()) {
  const preview = new URLSearchParams(window.location.search).get("t"); // ⏰ 미리보기
  if (preview in TIME_SLOTS) return preview;
  const hhmm = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(now); // ⏰ "HH:MM"
  if (hhmm >= TIME_SLOTS.morning.from && hhmm <= TIME_SLOTS.morning.to) return "morning"; // ⏰
  if (hhmm >= TIME_SLOTS.lunch.from && hhmm <= TIME_SLOTS.lunch.to) return "lunch"; // ⏰
  return "evening"; // ⏰ 16:00~05:59
}
