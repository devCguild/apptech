// 모아펫: 독립 HTML 앱(public/moapet/)을 미니앱 틀 안에 띄운다. 이 파일 하나로 입구(홈·전체 앱)에 붙는다
import petBanner from "../../assets/hub/pet-banner.png";
import petCard from "../../assets/hub/pet-card.png";
import MoapetApp from "./index.jsx";

export default {
  id: "moapet",
  order: 1,
  name: "모아펫",
  category: "pet",
  tone: "green",
  summary: "작은 미션으로\n새싹 친구 키우기", // 홈 목록·이어서 즐겨요
  catalog: "매일 돌보며\n함께 자라요", // 전체 앱 카드
  cta: "펫 보러 가기",
  icon: petCard,
  banner: petBanner,
  card: petCard,
  Component: MoapetApp,
};
