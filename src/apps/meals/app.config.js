// 삼시삼키: 이 파일 하나로 입구(홈·전체 앱)에 붙는다 (#9: registry.js 대신 앱 폴더에 둔다)
// 필요한 키: 없음 (영양 데이터는 파이썬이 만든 public/data.js)
import samki from "./samki.svg";
import MealsApp from "./index.jsx";

export default {
  id: "meals",
  order: 3,
  name: "삼시삼키",
  category: "pet",
  tone: "peach",
  summary: "세 끼 기록하고\n삼키 키우기",
  catalog: "먹은 만큼\n삼키가 달라져요",
  cta: "밥 기록하러 가기",
  icon: samki,
  banner: samki,
  card: samki,
  Component: MealsApp,
};
