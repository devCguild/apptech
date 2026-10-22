// 출제 범위: 1세대 (PLAN.md "정하지 않은 것" 참고)
export const MAX_POKEMON_ID = 151;
export const POINTS_PER_QUIZ = 10;

export function randomPokemonId(exceptId) {
  let id;
  do {
    id = Math.floor(Math.random() * MAX_POKEMON_ID) + 1;
  } while (id === exceptId);
  return id;
}

function normalize(text) {
  return text.replace(/\s+/g, "").toLowerCase();
}

// 정답 언어가 정해지기 전까지 한국어·영어 이름 모두 정답으로 본다
export function isCorrect(guess, names) {
  const input = normalize(guess);
  if (!input) return false;
  return Object.values(names).some((name) => name && normalize(name) === input);
}

// 첫 글자만 보여 주고 나머지는 ○로 가린다. 예: 피카츄 → 피○○
export function firstLetterHint(name) {
  const [first, ...rest] = Array.from(name);
  return first + "○".repeat(rest.length);
}
