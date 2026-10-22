// 산책 스팟 미니앱 설정 (이슈 #9: 앱 폴더만 고치면 붙도록)
// 입구(홈·전체 앱·내 기록)에 보이는 정보. registry.js 는 이 파일을 불러오기만 한다
// 필요한 환경 변수
//   - 백엔드 DATA_GO_KR_KEY: 공공데이터포털 "전국도시공원정보표준데이터" 인증키 (backend/app/routers/walk.py)
//   - 프론트 VITE_API_BASE_URL: 백엔드 주소 (src/api.js 의 API_BASE, 공용)
import walkArt from "./walk.svg";
import WalkApp from "./index.jsx";

export default {
  id: "walk",
  name: "산책 스팟",
  category: "mission",
  tone: "green",
  summary: "가까운 공원 걷고 100P",
  catalog: "오늘의 공원까지\n걸어가요",
  cta: "산책 스팟 보기",
  icon: walkArt,
  banner: walkArt,
  card: walkArt,
  Component: WalkApp,
};
