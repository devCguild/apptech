// 🔌 API 주소는 여기 한 곳에서만 정한다 (CLAUDE.md API 화면 규칙)
const configuredBase = import.meta.env?.VITE_API_BASE_URL;
const API_BASE = configuredBase ? configuredBase.replace(/\/+$/, "") : "https://apptech-api.vercel.app";

export const API = {
  // ---- CMG (webcam-quiz) ----
  webcamQuestion: `${import.meta.env?.VITE_API_BASE ?? "http://localhost:8000"}/api/webcam-quiz/question`, // 🔌 Windy Webcams (백엔드 경유)
  webcamAnswer: `${import.meta.env?.VITE_API_BASE ?? "http://localhost:8000"}/api/webcam-quiz/answer`, // 🔌 정답 확인
  // ---- /CMG ----
  rewardsStatus: `${API_BASE}/api/rewards/status`, // 🔌 적립 서비스 준비 상태 · 공개 JSON
  rewardsSession: `${API_BASE}/api/session`, // 🔌 익명 브라우저 계정 만들기 · POST
  rewardsWallet: `${API_BASE}/api/wallet`, // 🔌 본인 적립 내역 · 인증 필요
};
