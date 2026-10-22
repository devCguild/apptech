// 미션 모으기: 이 파일 하나로 입구(홈·전체 앱)에 붙는다
import missionIcon from "../../assets/hub/mission-icon.png";
import missionCard from "../../assets/hub/mission-card.png";
import MissionApp from "./index.jsx";

export default {
  id: "mission",
  order: 2,
  name: "미션 모으기",
  category: "mission",
  tone: "peach",
  summary: "내게 맞는 미션 찾아보기",
  catalog: "마음에 드는 미션을\n골라요",
  cta: "미션 고르러 가기",
  icon: missionIcon,
  banner: missionCard,
  card: missionCard,
  Component: MissionApp,
};
