import { judgeFood } from "./health.js";

// 식약처 식품영양성분 DB 는 키가 필요해서 브라우저에서 부르지 않는다 (CLAUDE.md API 화면 규칙).
// 나중에 파이썬이 만든 public/data.js 로 바꿀 자리. 지금 값은 화면 확인용 임시 예시값(1인분)이다.
export const SAMPLE_FOODS = [
  { name: "공기밥", kcal: 300, carbG: 65, proteinG: 6, fatG: 1 },
  { name: "김치찌개", kcal: 250, carbG: 12, proteinG: 18, fatG: 14 },
  { name: "된장찌개", kcal: 180, carbG: 14, proteinG: 13, fatG: 8 },
  { name: "제육볶음", kcal: 450, carbG: 20, proteinG: 28, fatG: 28 },
  { name: "비빔밥", kcal: 600, carbG: 90, proteinG: 20, fatG: 16 },
  { name: "떡볶이", kcal: 480, carbG: 95, proteinG: 10, fatG: 6 },
  { name: "김밥", kcal: 480, carbG: 75, proteinG: 14, fatG: 13 },
  { name: "라면", kcal: 500, carbG: 78, proteinG: 10, fatG: 16 },
  { name: "토스트", kcal: 350, carbG: 40, proteinG: 12, fatG: 15 },
  { name: "샐러드", kcal: 150, carbG: 12, proteinG: 6, fatG: 9 },
  { name: "바나나", kcal: 90, carbG: 23, proteinG: 1, fatG: 0 },
  { name: "우유", kcal: 130, carbG: 10, proteinG: 6, fatG: 7 },
];

// public/data.js 에 파이썬이 받아 둔 음식(음식·통합·건강기능식품 3종)이 있으면 그걸, 없으면 임시 예시값을 쓴다
export const NUTRITION_DATA = window.NUTRITION_DATA ?? null;
export const isSample = !NUTRITION_DATA?.foods?.length;
const FOODS = isSample ? SAMPLE_FOODS : NUTRITION_DATA.foods;

// 같은 이름이 여러 데이터에 있으면 음식 → 통합 → 건강기능식품 순으로 쓴다
const KIND_ORDER = { food: 0, integrated: 1, supplement: 2 };
const byPriority = (a, b) => (KIND_ORDER[a.kind] ?? 0) - (KIND_ORDER[b.kind] ?? 0) || a.name.length - b.name.length;

function findFood(name) {
  const exact = FOODS.filter((f) => f.name === name).sort(byPriority);
  if (exact.length) return exact[0];
  return FOODS.filter((f) => f.name.includes(name) || name.includes(f.name)).sort(byPriority)[0];
}

// 검색창 아래 추천어: 이름이 query 로 시작하는 음식 먼저, 그다음 이름에 query 가 들어간 음식
export function searchFoods(query, limit = 8) {
  const q = query.trim();
  if (!q) return [];
  const starts = [];
  const contains = [];
  for (const f of FOODS) {
    if (f.name.startsWith(q)) starts.push(f);
    else if (f.name.includes(q)) contains.push(f);
  }
  const seen = new Set();
  return [...starts.sort(byPriority), ...contains.sort(byPriority)]
    .filter((f) => !seen.has(f.name) && seen.add(f.name))
    .slice(0, limit);
}

export const RATIOS = [0.5, 1, 1.5, 2];

// "김치찌개, 공기밥" → 쉼표로 나눠 각각 찾기. 못 찾은 음식은 영양 정보 없이 이름만 남긴다
export function matchFoods(text, ratio) {
  const round = (n) => Math.round(n * ratio * 10) / 10;
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => {
      const food = findFood(name);
      const item = food
        ? { name: food.name, ratio, serving: food.serving, kcal: round(food.kcal), carbG: round(food.carbG), proteinG: round(food.proteinG), fatG: round(food.fatG) }
        : { name, ratio, kcal: null };
      return { ...item, health: judgeFood(item) }; // 기록할 때 판정을 같이 저장해 두면 나중에 규칙이 바뀌어도 지난 기록은 그대로
    });
}
