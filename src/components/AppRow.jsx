import { Typography } from "@montage-ui/core";
import { IconChevronRight } from "@montage-ui/icon";
import { Link } from "react-router";

// 홈 "다른 앱도 둘러보세요" 한 줄
export default function AppRow({ app }) {
  return (
    <Link to={`/apps/${app.id}`} className="app-row">
      <img className={`app-row-icon tone-${app.tone}`} src={app.icon} alt="" />
      <span className="app-row-text">
        <Typography variant="headline2" weight="bold" color="semantic.foreground.neutral.strong">
          {app.name}
        </Typography>
        <Typography variant="label1" color="semantic.foreground.neutral.tertiary">
          {app.summary}
        </Typography>
      </span>
      <IconChevronRight className="app-row-chevron" />
    </Link>
  );
}
