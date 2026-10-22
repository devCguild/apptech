import { Typography } from "@montage-ui/core";

import { TIME_SLOTS } from "../timeSlots.js";

// 맨 위 아이콘 줄: 아침·점심·저녁 미션 + 포인트. 누르면 아래 시트에서 그 카드가 펼쳐진다
export default function MissionBar({ slot, meals, points, onSelect }) {
  return (
    <nav className="mission-bar" aria-label="오늘의 미션">
      {Object.entries(TIME_SLOTS).map(([s, { label, emoji }]) => {
        const done = meals[s].length > 0;
        return (
          <button key={s} type="button" className="mission" onClick={() => onSelect(s)}>
            <span className="mission-icon" aria-hidden="true">
              {emoji}
              {done ? <span className="mission-badge is-done">✓</span> : s === slot && <span className="mission-badge">지금</span>}
            </span>
            <Typography variant="label1" weight="bold" color="semantic.foreground.neutral.strong">
              {label} 미션
            </Typography>
          </button>
        );
      })}
      <div className="mission">
        <span className="mission-icon" aria-hidden="true">🪙</span>
        <Typography variant="label1" weight="bold" color="semantic.foreground.neutral.strong">
          {points} P
        </Typography>
      </div>
    </nav>
  );
}
