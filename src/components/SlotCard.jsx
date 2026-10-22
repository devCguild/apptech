import { ContentBadge, Typography } from "@montage-ui/core";

import { totalOf } from "../lib/records.js";
import MealForm from "./MealForm.jsx";

// 시간대 카드 (아침/점심/저녁 하나씩). 지금 시간대는 펼쳐서 강조, 나머지는 작게 접어 둔다
export default function SlotCard({ slot, info, active, open, onToggle, items, onAdd, onRemove }) {
  const total = totalOf(items);
  const summary = items.length ? `${items.length}개 · ${Math.round(total.kcal)}kcal` : "아직 기록 없음";

  const body = (
    <div className="card-body">
      {items.length > 0 && (
        <ul className="meal-list">
          {items.map((it, i) => (
            <li key={i} className="meal-item">
              <div className="meal-item-text">
                <Typography variant="body2" weight="bold">
                  {it.name} <Typography as="span" variant="caption1" color="semantic.foreground.neutral.tertiary">{it.ratio}인분</Typography>
                </Typography>
                <Typography variant="caption1" color="semantic.foreground.neutral.secondary">
                  {it.kcal == null ? "영양 정보 없음" : `${it.kcal}kcal · 탄 ${it.carbG}g 단 ${it.proteinG}g 지 ${it.fatG}g`}
                </Typography>
              </div>
              <button type="button" className="meal-remove" onClick={() => onRemove(i)} aria-label={`${it.name} 지우기`}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <MealForm slot={slot} onAdd={onAdd} />
    </div>
  );

  const title = (
    <div className="card-title">
      <Typography as="h2" variant={active ? "headline1" : "body1"} weight="bold">
        {info.emoji} {info.label}
      </Typography>
      {active && <ContentBadge size="small" color="accent" accentColor="semantic.foreground.brand.primary">지금</ContentBadge>}
      <Typography variant="caption1" color="semantic.foreground.neutral.tertiary" className="card-summary">
        {summary}
      </Typography>
    </div>
  );

  if (active) {
    return (
      <section className="card is-active" data-slot={slot}>
        {title}
        <Typography variant="body2" color="semantic.foreground.brand.primary">
          ✅ 할 일: {info.todo}
        </Typography>
        {body}
      </section>
    );
  }

  return (
    <details className="card is-folded" data-slot={slot} open={open} onToggle={(e) => onToggle(e.currentTarget.open)}>
      <summary>{title}</summary>
      {body}
    </details>
  );
}
