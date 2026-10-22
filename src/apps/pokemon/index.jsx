import { Button, SectionMessage, Typography } from "@montage-ui/core";
import { useEffect, useState } from "react";

import QuizForm from "./components/QuizForm.jsx";
import QuizStage from "./components/QuizStage.jsx";
import { fetchPokemon, peekPokemon, preloadPokemon } from "./lib/pokeapi.js";
import { POINTS_PER_QUIZ, randomPokemonId } from "./lib/quiz.js";
import { addPoints, getPoints } from "./lib/storage.js";
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
