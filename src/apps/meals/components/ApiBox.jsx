import { Button, Typography } from "@montage-ui/core";

import { API } from "../../../api.js";
import { NUTRITION_DATA, isSample } from "../lib/foods.js";

// 화면 맨 아래 "🔌 이 화면이 쓰는 API" 상자 (불러오는 중 / 실패 / 성공 안내 포함)
export default function ApiBox({ status, onRetry }) {
  const entries = Object.entries(API);
  const sources = Object.values(NUTRITION_DATA?.sources ?? {});

  return (
    <footer className="api-box">
      <Typography as="h2" variant="label1" weight="bold">
        🔌 이 화면이 쓰는 API
      </Typography>

      {status === "loading" && (
        <Typography variant="caption1" color="semantic.foreground.neutral.secondary">
          영양 데이터(data.js)를 불러오는 중이에요…
        </Typography>
      )}
      {status === "error" && (
        <div className="api-box-error">
          <Typography variant="caption1" color="semantic.foreground.negative.primary">
            영양 데이터를 불러오지 못했어요. 지금은 임시 예시값을 쓰고 있어요.
          </Typography>
          <Button size="xsmall" variant="outlined" color="assistive" onClick={onRetry}>
            다시 시도
          </Button>
        </div>
      )}
      {status === "ready" && (
        <Typography variant="caption1" color="semantic.foreground.neutral.secondary">
          {isSample
            ? "data.js 가 비어 있어서 임시 예시값을 쓰고 있어요."
            : `파이썬이 공공데이터포털에서 받아 둔 data.js · 기준 날짜 ${NUTRITION_DATA.baseDate || "미기재"}`}
        </Typography>
      )}

      <ul className="api-list">
        {sources.map((s) => (
          <li key={s.name}>
            <Typography variant="caption1">
              <a href={s.page}>{s.name}</a> ({s.count.toLocaleString("ko-KR")}개) · 출처 식품의약품안전처·공공데이터포털
            </Typography>
          </li>
        ))}
        <li>
          <Typography variant="caption1">
            원본 데이터: <a href={`${import.meta.env.BASE_URL}data.js`}>data.js</a>
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
