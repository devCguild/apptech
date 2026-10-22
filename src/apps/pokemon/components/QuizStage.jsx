import { Typography } from "@montage-ui/core";
import { memo } from "react";

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

export default QuizStage;
