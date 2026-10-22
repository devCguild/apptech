// 💾 기록은 localStorage 에 daily3_ 로 시작하는 이름으로, 읽기·쓰기는 try/catch (CLAUDE.md 기록 규칙)
export function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 시크릿 창 등 저장이 막힌 곳: 화면은 그대로 두고 저장만 건너뛴다
  }
}

// 한국 시간 기준 YYYY-MM-DD
export function kstDate(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(date);
}
