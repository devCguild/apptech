import { Typography } from "@montage-ui/core";

// 언덕 위에 캐릭터가 서 있는 장면 + 말풍선(지금 할 일)
export default function GameScene({ character, todo }) {
  return (
    <div className="scene">
      <div className="hill hill-back" aria-hidden="true" />
      <div className="hill hill-front" aria-hidden="true" />
      <span className="tree tree-left" aria-hidden="true">🌳</span>
      <span className="tree tree-right" aria-hidden="true">🌳</span>

      <div className="hero">
        <div className="bubble">
          <Typography variant="label2" weight="medium" color="semantic.foreground.neutral.inverse">
            {todo}
          </Typography>
        </div>
        <span className="hero-emoji" role="img" aria-label={character.name}>
          {character.emoji}
        </span>
        <div className="hero-shadow" aria-hidden="true" />
        <Typography variant="label1" weight="bold" color="semantic.foreground.neutral.strong" className="hero-name">
          Lv.{character.level} {character.name}
        </Typography>
      </div>
    </div>
  );
}
