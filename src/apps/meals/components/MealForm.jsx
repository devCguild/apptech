import { Button, Chip, TextField, Typography } from "@montage-ui/core";
import { useMemo, useState } from "react";

import { RATIOS, matchFoods, searchFoods } from "../lib/foods.js";
import { HEALTH, judgeFood } from "../lib/health.js";

// 식사 입력: "김치찌개, 공기밥" + 인분 선택 → 기록 (이름·연락처 같은 개인정보는 받지 않는다)
// 치는 동안 마지막 쉼표 뒤 글자로 관련 음식을 아래에 추천한다 (data.js 안에서만 찾아서 API 호출 없음)
export default function MealForm({ slot, tone, dataStatus, onAdd }) {
  const [text, setText] = useState("");
  const [ratio, setRatio] = useState(1);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const inputId = `meal-input-${slot}`;
  const listId = `meal-suggest-${slot}`;

  const parts = text.split(",");
  const last = parts[parts.length - 1].trim();
  const suggestions = useMemo(() => searchFoods(last), [last]);
  const open = focused && suggestions.length > 0 && !suggestions.some((f) => f.name === last);

  const typeText = (value) => {
    setText(value);
    setActive(-1);
  };

  // 추천어를 고르면 마지막 조각을 그 이름으로 바꾸고 다음 음식을 칠 수 있게 ", " 를 붙인다
  const pick = (food) => {
    typeText([...parts.slice(0, -1).map((p) => p.trim()), food.name].filter(Boolean).join(", ") + ", ");
  };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault(); // 추천어 고르기만 하고 기록은 아직 안 함
      pick(suggestions[active]);
    } else if (e.key === "Escape") {
      setFocused(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const items = matchFoods(text, ratio);
    if (items.length === 0) return;
    onAdd(items);
    typeText("");
  };

  return (
    <form className="meal-form" onSubmit={submit}>
      <label htmlFor={inputId} className="visually-hidden">먹은 음식</label>
      <div className="meal-form-row">
        <div className="meal-form-input">
          <TextField
            id={inputId}
            value={text}
            onChange={(e) => typeText(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={onKeyDown}
            placeholder="예: 김치찌개, 공기밥"
            autoComplete="off"
            width="100%"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          />
          {open && (
            <ul id={listId} className="suggest" role="listbox" aria-label="관련 음식">
              {suggestions.map((f, i) => (
                <li
                  key={f.name}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={`suggest-item${i === active ? " is-active" : ""}`}
                  onMouseDown={(e) => e.preventDefault()} // 누르는 순간 입력칸 포커스가 빠지지 않게
                  onClick={() => pick(f)}
                >
                  <span className="suggest-name">
                    <Typography variant="body2" weight="medium" color="semantic.foreground.neutral.strong" noWrap>
                      {f.name}
                    </Typography>
                    <Typography variant="caption1" color="semantic.foreground.neutral.tertiary" noWrap>
                      {f.kcal}kcal{f.serving ? ` · ${f.serving}` : ""}
                    </Typography>
                  </span>
                  <Typography variant="caption2" color="semantic.foreground.neutral.secondary" className="suggest-badge">
                    {HEALTH[judgeFood(f)].badge}
                  </Typography>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button type="submit" disabled={!text.trim()} className={`cta-${tone}`}>
          기록하기
        </Button>
      </div>
      <div className="ratio-row" role="group" aria-label="양 선택">
        {RATIOS.map((r) => (
          <Chip key={r} type="button" size="small" active={ratio === r} aria-pressed={ratio === r} onClick={() => setRatio(r)}>
            {r}인분
          </Chip>
        ))}
      </div>
      <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">
        {dataStatus === "loading" ? "영양 데이터를 불러오는 중이에요… 그동안은 예시 음식만 찾아져요" : "치면 아래에 관련 음식이 떠요 · 쉼표(,)로 여러 개를 적을 수 있어요"}
      </Typography>
    </form>
  );
}
