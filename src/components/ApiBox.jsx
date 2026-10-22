import { Typography } from "@montage-ui/core";

import { API } from "../api.js";
import { NUTRITION_DATA, isSample } from "../lib/foods.js";

// 화면 맨 아래 "🔌 이 화면이 쓰는 API" 상자
export default function ApiBox() {
  const entries = Object.entries(API);
  const sources = Object.values(NUTRITION_DATA?.sources ?? {});

  return (
    <footer className="api-box">
      <Typography as="h2" variant="label1" weight="bold">
        🔌 이 화면이 쓰는 API
      </Typography>

      <Typography variant="caption1" color="semantic.foreground.neutral.secondary">
        {isSample
          ? "음식 영양 정보는 아직 화면 확인용 임시 예시값이에요. 아래 데이터는 키가 필요해서 파이썬이 data.js로 받아 와요."
          : `음식 영양 정보: 파이썬이 받아 둔 data.js · 기준 날짜 ${NUTRITION_DATA.baseDate || "미기재"}`}
      </Typography>
      <ul className="api-list">
        {sources.map((s) => (
          <li key={s.name}>
            <Typography variant="caption1">
              <a href={s.page}>{s.name}</a> ({s.count}개) · 출처 식품의약품안전처·공공데이터포털
            </Typography>
          </li>
        ))}
        <li>
          <Typography variant="caption1">
            원본 데이터: <a href="data.js">data.js</a>
          </Typography>
        </li>
        {entries.map(([name, url]) => (
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
