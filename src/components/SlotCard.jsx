import { ContentBadge, Typography } from "@montage-ui/core";
import { IconChevronRight } from "@montage-ui/icon";

import { totalOf } from "../lib/records.js";
import { HEALTH, judgeFood } from "../lib/health.js";
import MealForm from "./MealForm.jsx";

// 시간대 카드 (아침/점심/저녁 하나씩). 지금 시간대는 큰 톤 카드로 강조, 나머지는 한 줄로 접어 둔다
export default function SlotCard({ slot, info, active, open, onToggle, items, onAdd, onRemove }) {
  const total = totalOf(items);
  const summary = items.length ? `${items.length}개 · ${Math.round(total.kcal)}kcal` : "아직 기록 없음";

  const list = items.length > 0 && (
    <ul className="meal-list">
      {items.map((it, i) => (
        <li key={i} className="meal-item">
          <div className="meal-item-text">
            <Typography variant="body2" weight="bold" color="semantic.foreground.neutral.strong">
              {it.name} <Typography as="span" variant="caption1" color="semantic.foreground.neutral.tertiary">{it.ratio}인분 · {HEALTH[it.health ?? judgeFood(it)].badge}</Typography>
            </Typography>
            <Typography variant="caption1" color="semantic.foreground.neutral.secondary">
              {it.kcal == null ? "영양 정보 없음" : `${it.kcal}kcal · 탄 ${it.carbG}g 단 ${it.proteinG}g 지 ${it.fatG}g${it.serving ? ` (${it.serving})` : ""}`}
            </Typography>
          </div>
          <button type="button" className="meal-remove" onClick={() => onRemove(i)} aria-label={`${it.name} 지우기`}>
            ✕
          </button>
        </li>
      ))}
    </ul>
  );

  if (active) {
    return (
      <section className={`now-card tone-${info.tone}`} data-slot={slot}>
        <div className="now-card-head">
          <div className="now-card-text">
            <ContentBadge size="small" variant="solid" color="neutral">지금은 {info.label}</ContentBadge>
            <Typography as="h3" variant="title2" weight="bold" color="semantic.foreground.neutral.strong">
              {info.label} 기록하기
            </Typography>
            <Typography variant="body2" color="semantic.foreground.neutral.secondary">
              {info.todo}
            </Typography>
          </div>
          <span className="now-card-art" aria-hidden="true">{info.emoji}</span>
        </div>
        {list}
        <MealForm slot={slot} tone={info.tone} onAdd={onAdd} />
      </section>
    );
  }

  return (
    <details className="slot-row" data-slot={slot} open={open} onToggle={(e) => onToggle(e.currentTarget.open)}>
      <summary>
        <span className={`slot-row-icon tone-${info.tone}`} aria-hidden="true">{info.emoji}</span>
        <span className="slot-row-text">
          <Typography variant="headline2" weight="bold" color="semantic.foreground.neutral.strong">
            {info.label}
          </Typography>
          <Typography variant="label1" color="semantic.foreground.neutral.tertiary">
            {summary}
          </Typography>
        </span>
        <IconChevronRight className="slot-row-chevron" />
      </summary>
      <div className="slot-row-body">
        {list}
        <MealForm slot={slot} tone={info.tone} onAdd={onAdd} />
      </div>
    </details>
  );
}
