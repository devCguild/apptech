// 먹은 음식 → 건강/보통/주의 판정, 기록 전체 → 캐릭터 체형
// 판정은 재미용 단순 규칙이다. 칼로리를 적게 먹는 것 자체에는 보상하지 않고(기획서 5.4), 음식의 균형만 본다.

const HEALTHY_WORDS = ["샐러드", "채소", "나물", "두부", "현미", "잡곡", "고구마", "닭가슴살", "생선", "과일", "바나나", "사과", "요거트", "우유", "계란", "달걀", "미역", "버섯", "브로콜리", "된장"];
const UNHEALTHY_WORDS = ["라면", "튀김", "치킨", "피자", "햄버거", "버거", "감자튀김", "과자", "콜라", "사이다", "케이크", "도넛", "아이스크림", "초콜릿", "소시지", "햄", "탕수육", "짜장", "떡볶이"];

export const HEALTH = {
  healthy: { delta: -1, badge: "🥗 건강", say: (name) => `${name} 먹고 몸이 가벼워졌어요!` },
  neutral: { delta: 0, badge: "🍚 보통", say: (name) => `${name} 맛있게 먹었어요` },
  unhealthy: { delta: 1, badge: "🍔 살찌는 음식", say: (name) => `${name} 때문에 배가 볼록해졌어요…` },
};

export function judgeFood(item) {
  const name = item.name ?? "";
  if (UNHEALTHY_WORDS.some((w) => name.includes(w))) return "unhealthy";
  if (HEALTHY_WORDS.some((w) => name.includes(w))) return "healthy";
  if (item.kcal == null || item.kcal === 0) return "neutral";

  const fatRatio = ((item.fatG ?? 0) * 9) / item.kcal; // 칼로리 중 지방 비율
  if (fatRatio > 0.4 || item.kcal > 800) return "unhealthy";
  if (fatRatio <= 0.3 && (item.proteinG ?? 0) >= 10 && item.kcal <= 600) return "healthy";
  return "neutral";
}

// 체형 점수: 건강 -1, 주의 +1. 너무 마르지 않게 아래는 -4(날씬)에서 멈춘다
const MIN = -4;
const MAX = 6;

export const SHAPES = [
  { upTo: -2, label: "날씬하고 튼튼해요", mood: "happy" },
  { upTo: 2, label: "보통 체형이에요", mood: "happy" },
  { upTo: 4, label: "조금 통통해졌어요", mood: "meh" },
  { upTo: MAX, label: "배가 볼록해요", mood: "sad" },
];

export function bodyOf(days) {
  let weight = 0;
  for (const day of Object.keys(days).sort()) {
    for (const items of Object.values(days[day])) {
      for (const it of items) {
        weight = Math.min(MAX, Math.max(MIN, weight + HEALTH[it.health ?? judgeFood(it)].delta));
      }
    }
  }
  const shape = SHAPES.find((s) => weight <= s.upTo);
  return { weight, ...shape };
}
