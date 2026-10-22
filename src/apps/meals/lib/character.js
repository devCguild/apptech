// 경험치 → 레벨·성장 단계 (기획서 5.4 캐릭터 키우기)
export const EXP_PER_LEVEL = 100;

const STAGES = [
  { from: 1, emoji: "🥚", name: "알" },
  { from: 2, emoji: "🐣", name: "아기 삼키" },
  { from: 4, emoji: "🐥", name: "꼬마 삼키" },
  { from: 7, emoji: "🐔", name: "튼튼 삼키" },
];

export function characterOf(exp) {
  const level = Math.floor(exp / EXP_PER_LEVEL) + 1;
  const stage = [...STAGES].reverse().find((s) => level >= s.from);
  const expInLevel = exp % EXP_PER_LEVEL;
  return { level, ...stage, expInLevel, percent: (expInLevel / EXP_PER_LEVEL) * 100 };
}
