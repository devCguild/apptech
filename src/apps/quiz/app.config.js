// 오늘의 퀴즈 입구 정보 (이슈 #9: registry.js 가 자동으로 모아 간다)
// 이 파일 하나로 입구(홈·전체 앱)에 붙는다
import quizIcon from "../../assets/hub/quiz-icon.png";
import quizCard from "../../assets/hub/quiz-card.png";

import QuizApp from "./index.jsx";

export default {
  id: "quiz",
  order: 3,
  name: "오늘의 퀴즈",
  category: "quiz",
  tone: "blue",
  summary: "한 문제씩 가볍게 도전", // 홈 목록·이어서 즐겨요
  catalog: "짧게 풀고\n차곡차곡 모아요", // 전체 앱 카드
  cta: "퀴즈 풀러 가기",
  icon: quizIcon,
  banner: quizCard,
  card: quizCard,
  Component: QuizApp,
};
