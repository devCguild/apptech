import { TIME_SLOTS as BASE_SLOTS, currentTimeSlot } from "../../../timeSlots.js";

// 시간대 시각은 공용 src/timeSlots.js 한 곳에서만 정한다. 여기는 삼시삼키 화면에 쓰는 그림·색·문구만 덧붙인다
const MEAL_TEXT = {
  morning: { emoji: "🌅", tone: "peach", greeting: "좋은 아침이에요! 아침 한 끼로 오늘을 시작해요", todo: "아침 식사를 기록하고 경험치 +10 받기" },
  lunch: { emoji: "🌞", tone: "green", greeting: "점심 맛있게 드셨나요? 방금 먹은 걸 남겨 봐요", todo: "점심 식사를 기록하고 캐릭터 키우기" },
  evening: { emoji: "🌙", tone: "blue", greeting: "오늘 하루 수고했어요. 저녁까지 채우면 삼시 완성!", todo: "저녁을 기록하고 '삼시 완성' 보너스 +20 받기" },
};

export const TIME_SLOTS = Object.fromEntries(
  Object.entries(BASE_SLOTS).map(([slot, base]) => [slot, { ...base, ...MEAL_TEXT[slot] }]),
);

export const currentSlot = currentTimeSlot;
