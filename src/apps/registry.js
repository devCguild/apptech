// 앱 입구에 보이는 미니앱 목록 (CLAUDE.md 앱 구조 규칙, 이슈 #9)
// 새 방식: 각 앱 폴더의 app.config.js 를 자동으로 모은다 → 앱 PR은 자기 폴더만 고친다
// 아래 LISTED_APPS 는 아직 옮기지 않은 앱. 옮기면 여기서 지운다
// 미니앱은 React 컴포넌트(Component) 또는 독립 HTML 앱 주소(href) 중 하나
import whereamiIcon from "./whereami/art-icon.svg"; // CMG
import whereamiCard from "./whereami/art-card.svg"; // CMG
import samki from "./meals/samki.svg";
import pokemonIcon from "./pokemon/assets/icon.png";
import pokemonCard from "./pokemon/assets/card.png";

import WhereamiApp from "./whereami/index.jsx"; // CMG
import MealsApp from "./meals/index.jsx";
import PokemonApp from "./pokemon/index.jsx";

export const CATEGORIES = [
  { id: "all", label: "전체" },
  { id: "pet", label: "펫" },
  { id: "quiz", label: "퀴즈" },
  { id: "mission", label: "미션" },
];

const LISTED_APPS = [
  {
    id: "meals",
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
  },
  // CMG — 여기는 어디? (Windy Webcams 나라 맞히기)
  {
    id: "whereami",
    name: "여기는 어디?",
    category: "quiz",
    tone: "sky",
    summary: "웹캠 사진 보고 나라 맞히기",
    catalog: "세계 곳곳 풍경 보고\n어느 나라인지 맞혀요",
    cta: "맞히러 가기",
    icon: whereamiIcon,
    banner: whereamiCard,
    card: whereamiCard,
    Component: WhereamiApp,
  },
  {
    id: "pokemon",
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
  },
];

// app.config.js 로 옮긴 앱은 order 순서로 먼저, 그 뒤에 아직 안 옮긴 앱
// 같은 id 가 둘 다 있으면 app.config.js 쪽만 쓴다(옮긴 앱 PR이 이 파일을 안 고쳐도 중복 없음)
const CONFIGURED_APPS = Object.values(import.meta.glob("./*/app.config.js", { eager: true, import: "default" }))
  .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
const configuredIds = new Set(CONFIGURED_APPS.map((app) => app.id));

export const MINI_APPS = [...CONFIGURED_APPS, ...LISTED_APPS.filter((app) => !configuredIds.has(app.id))];

export function findMiniApp(appId) {
  return MINI_APPS.find((app) => app.id === appId);
}
