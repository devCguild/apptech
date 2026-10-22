import { Button, TextButton, TextField, Typography } from "@montage-ui/core";
import { IconBulb } from "@montage-ui/icon";
import { useEffect, useRef, useState } from "react";

import { firstLetterHint, isCorrect } from "../lib/quiz.js";

// 이름 입력·힌트·제출. 입력값은 여기서만 들고 있어서 글자를 쳐도 무대는 다시 그리지 않는다.
// 문제가 바뀌면 부모가 key를 바꿔 입력값·힌트를 초기화한다.
export default function QuizForm({ pokemon, answer, onCorrect, onGiveUp, autoFocus }) {
  const [guess, setGuess] = useState("");
  const [wrong, setWrong] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const inputRef = useRef(null);

  // 다음 문제로 넘어왔으면 포켓몬이 준비되는 대로 입력칸에 포커스 (불러오는 동안은 입력칸이 비활성)
  useEffect(() => {
    if (autoFocus && pokemon) inputRef.current?.focus();
  }, [autoFocus, pokemon]);

  // 이름이 한 글자면 첫 글자가 곧 정답이라 힌트를 주지 않는다
  const canHint = answer && Array.from(answer).length > 1;

  function submit(event) {
    event.preventDefault();
    if (!pokemon) return;
    if (isCorrect(guess, pokemon.names)) {
      onCorrect();
    } else {
      setWrong(true);
      setShaking(true);
    }
  }

  return (
    <form className="pq-form" onSubmit={submit}>
      {canHint && (
        // 버튼과 힌트를 같은 칸에 겹쳐 두고 보이기만 바꾼다. 높이가 달라 입력칸이 움직이지 않게
        <div className="pq-hint-row">
          <TextButton
            type="button"
            size="small"
            color="assistive"
            leadingContent={<IconBulb aria-hidden />}
            onClick={() => setHintShown(true)}
            className={hintShown ? "is-hidden" : undefined}
            aria-hidden={hintShown}
            tabIndex={hintShown ? -1 : undefined}
          >
            힌트 보기 (첫 글자)
          </TextButton>
          <Typography
            variant="label1"
            color="semantic.foreground.neutral.secondary"
            className={`pq-hint${hintShown ? "" : " is-hidden"}`}
            aria-hidden={!hintShown}
          >
            <IconBulb width="1em" height="1em" aria-hidden />
            힌트: {hintShown ? firstLetterHint(answer) : ""}
          </Typography>
        </div>
      )}
      <div className={shaking ? "pq-shake" : undefined} onAnimationEnd={() => setShaking(false)}>
        <TextField
          value={guess}
          onChange={(e) => {
            setGuess(e.target.value);
            setWrong(false);
          }}
          placeholder="포켓몬 이름 (한국어·영어)"
          status={wrong ? "negative" : "normal"}
          disabled={!pokemon}
          width="100%"
          autoComplete="off"
          ref={inputRef}
        />
        {wrong && (
          <Typography variant="caption1" color="semantic.foreground.negative.primary">
            땡! 다시 생각해 보세요.
          </Typography>
        )}
      </div>
      <div className="pq-actions">
        <Button type="submit" fullWidth disabled={!pokemon || !guess.trim()}>
          제출
        </Button>
        <Button type="button" variant="outlined" color="assistive" disabled={!pokemon} onClick={onGiveUp}>
          모르겠어요
        </Button>
      </div>
    </form>
  );
}
