import { Typography } from "@montage-ui/core";

// 오늘의 퀴즈 미니앱. 이 폴더(src/apps/quiz/) 안에서 만든다. 포인트는 lib/points.js 의 addPoints 로 준다.
export default function App() {
  return (
    <div className="mini-app-empty">
      <Typography variant="headline1" weight="bold">
        준비 중이에요
      </Typography>
      <Typography variant="body2" color="semantic.foreground.neutral.tertiary">
        오늘의 퀴즈 화면은 src/apps/quiz/ 에서 만들어요
      </Typography>
    </div>
  );
}
