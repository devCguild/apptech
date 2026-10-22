// 🔌 API 주소는 여기 한 곳에서만 정한다 (CLAUDE.md API 화면 규칙)
export const API = {
  // ---- CMG (webcam-quiz) ----
  webcamQuestion: `${import.meta.env.VITE_API_BASE ?? "http://localhost:8000"}/api/webcam-quiz/question`, // 🔌 Windy Webcams (백엔드 경유)
  webcamAnswer: `${import.meta.env.VITE_API_BASE ?? "http://localhost:8000"}/api/webcam-quiz/answer`, // 🔌 정답 확인
  // ---- /CMG ----
};
