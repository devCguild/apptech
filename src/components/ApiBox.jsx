import { Typography } from "@montage-ui/core";

import { API } from "../api.js";

// 화면 맨 아래 "🔌 이 화면이 쓰는 API" 상자
export default function ApiBox() {
  return (
    <footer className="api-box">
      <Typography as="h2" variant="label1" weight="bold">
        🔌 이 화면이 쓰는 API
      </Typography>
      <ul className="api-list">
        {Object.entries(API).map(([name, url]) => (
          <li key={name}>
            <Typography variant="caption1">
              {name}: <a href={url}>{url}</a>
            </Typography>
          </li>
        ))}
      </ul>
    </footer>
  );
}
