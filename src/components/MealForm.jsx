import { Button, Chip, TextField, Typography } from "@montage-ui/core";
import { useState } from "react";

import { RATIOS, matchFoods } from "../lib/foods.js";

// 식사 입력: "김치찌개, 공기밥" + 인분 선택 → 기록 (이름·연락처 같은 개인정보는 받지 않는다)
export default function MealForm({ slot, onAdd }) {
  const [text, setText] = useState("");
  const [ratio, setRatio] = useState(1);
  const inputId = `meal-input-${slot}`;

  const submit = (e) => {
    e.preventDefault();
    const items = matchFoods(text, ratio);
    if (items.length === 0) return;
    onAdd(items);
    setText("");
  };

  return (
    <form className="meal-form" onSubmit={submit}>
      <label htmlFor={inputId} className="visually-hidden">먹은 음식</label>
      <div className="meal-form-row">
        <div className="meal-form-input">
          <TextField
            id={inputId}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="예: 김치찌개, 공기밥"
            autoComplete="off"
            width="100%"
          />
        </div>
        <Button type="submit" disabled={!text.trim()}>
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
        쉼표(,)로 여러 개를 적을 수 있어요
      </Typography>
    </form>
  );
}
