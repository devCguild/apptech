import { Link } from "react-router";

import { saveRecentAppId } from "../lib/recent.js";

// 미니앱으로 가는 링크. 독립 HTML 앱(href)은 페이지 이동, React 미니앱은 #/apps/<id>
export default function AppLink({ app, children, ...props }) {
  if (app.href) {
    return (
      <a href={app.href} onClick={() => saveRecentAppId(app.id)} {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link to={`/apps/${app.id}`} {...props}>
      {children}
    </Link>
  );
}
