import { Typography } from "@montage-ui/core";

import { API } from "../api.js";

// 화면 맨 아래 "🔌 이 화면이 쓰는 API" 상자
export default function ApiBox() {
  const entries = Object.entries(API);

  return (
    <footer className="api-box">
      <Typography as="h2" variant="label1" weight="bold">
        🔌 이 화면이 쓰는 API
      </Typography>
      {entries.length === 0 ? (
        <Typography variant="caption1" color="semantic.foreground.neutral.secondary">
          아직 부르는 API가 없어요. 음식 영양 정보는 화면 확인용 임시 예시값이에요. 식약처 식품영양성분 DB는 키가 필요해서, 나중에 파이썬이 만든 data.js로 붙일 예정이에요.
        </Typography>
      ) : (
        <ul className="api-list">
          {entries.map(([name, url]) => (
            <li key={name}>
              <Typography variant="caption1">
                {name}: <a href={url}>{url}</a>
              </Typography>
            </li>
          ))}
        </ul>
      )}
    </footer>
  );
}
