// 앱 입구에 보이는 미니앱 목록은 여기 한 곳에서만 정한다 (CLAUDE.md 앱 구조 규칙)
// 미니앱은 React 컴포넌트(Component) 또는 독립 HTML 앱 주소(href) 중 하나
import petBanner from "../assets/hub/pet-banner.png";
import petCard from "../assets/hub/pet-card.png";
import quizIcon from "../assets/hub/quiz-icon.png";
import quizCard from "../assets/hub/quiz-card.png";
import missionIcon from "../assets/hub/mission-icon.png";
import missionCard from "../assets/hub/mission-card.png";

import QuizApp from "./quiz/index.jsx";
import MissionApp from "./mission/index.jsx";

export const CATEGORIES = [
  { id: "all", label: "전체" },
  { id: "pet", label: "펫" },
  { id: "quiz", label: "퀴즈" },
  { id: "mission", label: "미션" },
];

export const MINI_APPS = [
  {
    id: "moapet",
    name: "모아펫",
    category: "pet",
    tone: "green",
    summary: "작은 미션으로\n새싹 친구 키우기", // 홈 목록·이어서 즐겨요
    catalog: "매일 돌보며\n함께 자라요", // 전체 앱 카드
    cta: "펫 보러 가기",
    icon: petCard,
    banner: petBanner,
    card: petCard,
    href: `${import.meta.env.BASE_URL}moapet/`, // 독립 HTML 앱 (public/moapet/)
  },
  {
    id: "quiz",
    name: "오늘의 퀴즈",
    category: "quiz",
    tone: "blue",
    summary: "한 문제씩 가볍게 도전",
    catalog: "짧게 풀고\n차곡차곡 모아요",
    cta: "퀴즈 풀러 가기",
    icon: quizIcon,
    banner: quizCard,
    card: quizCard,
    Component: QuizApp,
  },
  {
    id: "mission",
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
  },
];

export function findMiniApp(appId) {
  return MINI_APPS.find((app) => app.id === appId);
}
