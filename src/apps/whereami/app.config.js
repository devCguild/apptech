// 담당: CMG — '여기는 어디?' 입구 설정 (#9: registry.js 대신 앱 폴더에 둔다)
// 백엔드: backend/app/routers/whereami.py · 필요한 키: WINDY_API_KEY (README.md)
import WhereamiApp from "./index.jsx";
import icon from "./art-icon.svg";
import card from "./art-card.svg";

export default {
  id: "whereami",
  name: "여기는 어디?",
  category: "quiz",
  tone: "sky",
  summary: "웹캠 사진 보고 나라 맞히기",
  catalog: "세계 곳곳 풍경 보고\n어느 나라인지 맞혀요",
  cta: "맞히러 가기",
  icon,
  banner: card,
  card,
  Component: WhereamiApp,
};
