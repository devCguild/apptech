// 💾 기록은 localStorage 의 daily3_ 이름으로만 저장, 읽기·쓰기는 모두 try/catch (CLAUDE.md 기록 규칙)
const PREFIX = "daily3_meals_";

// 한국 시간 기준 YYYY-MM-DD
export function todayKST(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(date);
}

const empty = () => ({ morning: [], lunch: [], evening: [] });

export function loadDay(day = todayKST()) {
  try {
    return { ...empty(), ...JSON.parse(localStorage.getItem(PREFIX + day) ?? "{}") };
  } catch {
    return empty(); // 시크릿 창 등 저장이 막혀도 화면은 그대로
  }
}

export function saveDay(meals, day = todayKST()) {
  try {
    localStorage.setItem(PREFIX + day, JSON.stringify(meals));
    return true;
  } catch {
    return false;
  }
}

// 저장된 모든 날짜의 기록 (캐릭터 경험치 계산용)
export function loadAllDays() {
  const days = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX)) days[key.slice(PREFIX.length)] = loadDay(key.slice(PREFIX.length));
    }
  } catch {
    // 저장소를 못 읽으면 빈 기록으로
  }
  return days;
}

// 보상: 끼니 1회 기록 경험치 +10·포인트 +3, 하루 세 끼 모두면 보너스 경험치 +20·포인트 1~20 랜덤 (기획서 5.4)
export function rewardOf(meals) {
  const filled = Object.values(meals).filter((items) => items.length > 0).length;
  return { filled, exp: filled * 10 + (filled === 3 ? 20 : 0), points: filled * 3, complete: filled === 3 };
}

export function totalOf(items) {
  return items.reduce(
    (sum, it) => ({
      kcal: sum.kcal + (it.kcal ?? 0),
      carbG: sum.carbG + (it.carbG ?? 0),
      proteinG: sum.proteinG + (it.proteinG ?? 0),
      fatG: sum.fatG + (it.fatG ?? 0),
    }),
    { kcal: 0, carbG: 0, proteinG: 0, fatG: 0 },
  );
}
