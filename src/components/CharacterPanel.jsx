import { ProgressIndicator, Typography } from "@montage-ui/core";

import { EXP_PER_LEVEL } from "../lib/character.js";

// 아래 시트 "내 캐릭터" 탭: 경험치·포인트·오늘 영양 합계
export default function CharacterPanel({ character, points, todayTotal }) {
  return (
    <div className="sheet-panel">
      <div className="sheet-bar">
        <ProgressIndicator percent={character.percent} />
        <span className="sheet-bar-icon" aria-hidden="true">{character.emoji}</span>
      </div>
      <dl className="stat-list">
        <div className="stat-row">
          <dt><Typography variant="body2" color="semantic.foreground.neutral.secondary">경험치</Typography></dt>
          <dd><Typography variant="headline1" weight="bold">{character.expInLevel} / {EXP_PER_LEVEL}</Typography></dd>
        </div>
        <div className="stat-row">
          <dt><Typography variant="body2" color="semantic.foreground.neutral.secondary">모은 포인트</Typography></dt>
          <dd><Typography variant="body2" weight="bold">🪙 {points}P</Typography></dd>
        </div>
        <div className="stat-row">
          <dt><Typography variant="body2" color="semantic.foreground.neutral.secondary">오늘 합계</Typography></dt>
          <dd>
            <Typography variant="body2" weight="bold">
              {Math.round(todayTotal.kcal)}kcal · 탄 {Math.round(todayTotal.carbG)} 단 {Math.round(todayTotal.proteinG)} 지 {Math.round(todayTotal.fatG)}g
            </Typography>
          </dd>
        </div>
      </dl>
      <Typography variant="caption2" color="semantic.foreground.neutral.tertiary">
        ※ 임시 예시값으로 계산한 추정치이며 의료 조언이 아니에요.
      </Typography>
    </div>
  );
}
