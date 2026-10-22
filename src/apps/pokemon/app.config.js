// 포켓몬 퀴즈: 이 파일 하나로 입구(홈·전체 앱)에 붙는다
import pokemonIcon from "./assets/icon.png";
import pokemonCard from "./assets/card.png";
import PokemonApp from "./index.jsx";

export default {
  id: "pokemon",
  order: 40,
  name: "포켓몬 퀴즈",
  category: "quiz",
  tone: "blue",
  summary: "실루엣 보고 맞히기",
  catalog: "실루엣을 보고\n포켓몬을 맞혀요",
  cta: "맞히러 가기",
  icon: pokemonIcon,
  banner: pokemonCard,
  card: pokemonCard,
  Component: PokemonApp,
};
