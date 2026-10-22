import { Typography } from "@montage-ui/core";
import { IconChevronRight } from "@montage-ui/icon";
import { Link } from "react-router";

// 전체 앱 목록의 큰 카드
export default function AppCard({ app }) {
  return (
    <Link to={`/apps/${app.id}`} className={`app-card tone-${app.tone}`}>
      <span className="app-card-text">
        <Typography as="h2" variant="title3" weight="bold" color="semantic.foreground.neutral.strong">
          {app.name}
        </Typography>
        <Typography variant="body2" color="semantic.foreground.neutral.secondary" className="keep-lines">
          {app.catalog}
        </Typography>
      </span>
      <img className="app-card-art" src={app.card} alt="" />
      <span className="app-card-go" aria-hidden="true">
        <IconChevronRight />
      </span>
    </Link>
  );
}
