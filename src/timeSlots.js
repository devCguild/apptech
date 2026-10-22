// ⏰ 시간대는 여기 한 곳에서만 정한다 (CLAUDE.md 시간대 규칙)
export const TIME_SLOTS = {
  morning: { label: "아침", emoji: "🌅", tone: "peach", from: "06:00", to: "10:59", greeting: "좋은 아침이에요! 아침 한 끼로 오늘을 시작해요", todo: "아침 식사를 기록하고 경험치 +10 받기" }, // ⏰ 아침
  lunch:   { label: "점심", emoji: "🌞", tone: "green", from: "11:00", to: "15:59", greeting: "점심 맛있게 드셨나요? 방금 먹은 걸 남겨 봐요", todo: "점심 식사를 기록하고 캐릭터 키우기" }, // ⏰ 점심
  evening: { label: "저녁", emoji: "🌙", tone: "blue", from: "16:00", to: "05:59", greeting: "오늘 하루 수고했어요. 저녁까지 채우면 삼시 완성!", todo: "저녁을 기록하고 '삼시 완성' 보너스 +20 받기" }, // ⏰ 저녁
};

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// 한국 시간 기준 지금 몇 분째인지 (0~1439)
function nowMinutesKST(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return get("hour") * 60 + get("minute");
}

// 지금 시각이 어느 시간대인지. to 가 from 보다 작으면 자정을 넘기는 구간(저녁)
export function slotAt(date = new Date()) {
  const now = nowMinutesKST(date);
  const hit = Object.entries(TIME_SLOTS).find(([, { from, to }]) => {
    const f = toMinutes(from);
    const t = toMinutes(to);
    return f <= t ? now >= f && now <= t : now >= f || now <= t;
  });
  return hit ? hit[0] : "evening";
}

// 주소의 ?t= 가 있으면 그걸 먼저, 없으면 지금 시각
export function currentSlot() {
  const t = new URLSearchParams(window.location.search).get("t");
  return t in TIME_SLOTS ? t : slotAt();
}
