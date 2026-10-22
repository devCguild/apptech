import { Button, SectionMessage, TextButton, TextField, Typography } from "@montage-ui/core";
import { IconBulb } from "@montage-ui/icon";
import { memo, useEffect, useRef, useState } from "react";

import { fetchPokemon, peekPokemon, preloadPokemon } from "./pokeapi.js";
import {
  POINTS_PER_QUIZ,
  firstLetterHint,
  isCorrect,
  randomPokemonId,
} from "./quiz.js";
import { addPoints, getPoints } from "./storage.js";
import "./PokemonQuiz.css";

function firstIds() {
  const current = randomPokemonId();
  return { current, next: randomPokemonId(current) };
}

// 포켓몬 실루엣 퀴즈: 실루엣을 보고 이름을 맞히면 포인트를 준다
export default function PokemonQuiz() {
  const [ids, setIds] = useState(firstIds); // 지금 문제와 미리 받아 둘 다음 문제
  const [pokemon, setPokemon] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState("playing"); // playing | correct | gaveUp
  const [points, setPoints] = useState(getPoints);
  const [played, setPlayed] = useState(false); // 한 문제라도 넘겼는지 (첫 화면에서는 포커스를 뺏지 않는다)

  useEffect(() => {
    let ignore = false;
    fetchPokemon(ids.current).then(
      (data) => !ignore && setPokemon(data),
      () => !ignore && setLoadError(true),
    );
    return () => {
      ignore = true;
    };
  }, [ids, retry]);

  // 지금 문제가 보이면 다음 문제를 미리 받아 둔다
  useEffect(() => {
    if (pokemon) preloadPokemon(ids.next);
  }, [pokemon, ids.next]);

  const revealed = result === "correct" || result === "gaveUp";
  const answer = pokemon?.names.ko ?? pokemon?.names.en;

  function correct() {
    setResult("correct");
    setPoints(addPoints(POINTS_PER_QUIZ));
  }

  function next() {
    // 미리 받아 둔 문제면 바로 바꿔서 "불러오는 중" 화면이 끼지 않게 한다
    setPokemon(peekPokemon(ids.next) ?? null);
    setIds({ current: ids.next, next: randomPokemonId(ids.next) });
    setResult("playing");
    setPlayed(true);
  }

  function reload() {
    setLoadError(false);
    setRetry((n) => n + 1);
  }

  return (
    <section className="pq">
      {/* 앱 이름은 위의 미니앱 틀(MiniAppPage)이 보여 준다 */}
      <div className="pq-header">
        <Typography variant="label1" color="semantic.foreground.neutral.secondary">
          내 포인트
        </Typography>
        <Typography variant="label1" weight="bold" color="semantic.foreground.brand.primary">
          {points.toLocaleString("ko-KR")} P
        </Typography>
      </div>

      <QuizStage pokemon={pokemon} answer={answer} revealed={revealed} />

      {loadError && (
        <SectionMessage
          variant="negative"
          trailingButton={
            <Button size="small" variant="outlined" color="assistive" onClick={reload}>
              다시 시도
            </Button>
          }
        >
          포켓몬을 불러오지 못했어요.
        </SectionMessage>
      )}

      {revealed ? (
        <div className="pq-result">
          <SectionMessage variant={result === "correct" ? "positive" : "info"}>
            {result === "correct"
              ? `No.${String(pokemon.id).padStart(3, "0")} ${answer} · +${POINTS_PER_QUIZ} P`
              : `정답은 No.${String(pokemon.id).padStart(3, "0")} ${answer}였어요.`}
          </SectionMessage>
          {/* 공개되면 이 버튼으로 포커스를 옮겨 엔터로 넘길 수 있게 한다 */}
          <Button fullWidth onClick={next} autoFocus>
            다음 문제
          </Button>
        </div>
      ) : (
        <QuizForm
          key={ids.current}
          pokemon={pokemon}
          answer={answer}
          onCorrect={correct}
          onGiveUp={() => setResult("gaveUp")}
          autoFocus={played}
        />
      )}

      <Typography as="p" variant="caption1" color="semantic.foreground.neutral.tertiary">
        비공식 팬 퀴즈예요. Pokémon과 포켓몬 이미지의 권리는 Nintendo·Creatures·GAME FREAK에 있어요.
        데이터 출처: <a href="https://pokeapi.co/">PokeAPI</a>
        <br />
        포인트는 연습용이에요. 현금이나 실제 보상으로 바꿀 수 없어요.
      </Typography>
    </section>
  );
}

// 실루엣 무대. 문제나 공개 여부가 바뀔 때만 다시 그린다 (입력할 때는 그리지 않음)
const QuizStage = memo(function QuizStage({ pokemon, answer, revealed }) {
  return (
    <div className={`pq-stage${revealed ? " is-revealed" : ""}`}>
      <Typography as="p" variant="title2" weight="bold" className="pq-stage-title">
        {revealed ? `정답은 ${answer}!` : "이건 누구일까?"}
      </Typography>
      {pokemon ? (
        <img
          className="pq-pokemon"
          src={pokemon.imageUrl}
          alt={revealed ? answer : "이름을 맞혀 볼 포켓몬의 실루엣"}
          draggable={false}
        />
      ) : (
        <Typography variant="body1" className="pq-stage-status">
          불러오는 중…
        </Typography>
      )}
      {/* 공개될 때만 붙는 레이어라 붙을 때마다 번쩍임이 한 번 재생된다. 이미지는 그대로 둔다 */}
      {revealed && <div className="pq-flash" aria-hidden />}
    </div>
  );
});

// 이름 입력·힌트·제출. 입력값은 여기서만 들고 있어서 글자를 쳐도 무대는 다시 그리지 않는다.
// 문제가 바뀌면 부모가 key를 바꿔 입력값·힌트를 초기화한다.
function QuizForm({ pokemon, answer, onCorrect, onGiveUp, autoFocus }) {
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
