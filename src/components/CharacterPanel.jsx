import { ProgressIndicator, Typography } from "@montage-ui/core";

import { EXP_PER_LEVEL } from "../lib/character.js";
import Pet from "./Pet.jsx";

// "내 캐릭터" 탭: 캐릭터 카드 + 경험치·포인트·오늘 영양 합계
export default function CharacterPanel({ character, body, points, todayTotal }) {
  return (
    <>
      <section className="hero-card tone-green">
        <div className="hero-card-text">
          <Typography variant="label1" color="semantic.foreground.neutral.secondary">
            Lv.{character.level}
          </Typography>
          <Typography as="h3" variant="title2" weight="bold" color="semantic.foreground.neutral.strong">
            삼키는 {body.label}
          </Typography>
          <Typography variant="body2" color="semantic.foreground.neutral.secondary">
            건강한 음식을 먹으면 가벼워지고, 기름지고 단 음식을 먹으면 통통해져요
          </Typography>
        </div>
        <Pet weight={body.weight} mood={body.mood} size={140} label={`삼키, ${body.label}`} />
      </section>

      <Typography as="h2" variant="headline1" weight="bold" className="section-title">
        이렇게 판단해요
      </Typography>
      <ul className="stat-rows">
        <li className="stat-card">
          <Typography variant="body2" weight="bold">🥗 건강</Typography>
          <Typography variant="caption1" color="semantic.foreground.neutral.secondary">채소·과일·두부·생선, 단백질 많고 기름 적은 음식</Typography>
        </li>
        <li className="stat-card">
          <Typography variant="body2" weight="bold">🍔 살찌는 음식</Typography>
          <Typography variant="caption1" color="semantic.foreground.neutral.secondary">라면·튀김·패스트푸드·단 음식, 기름 많은 음식</Typography>
        </li>
      </ul>

      <Typography as="h2" variant="headline1" weight="bold" className="section-title">
        성장 기록
      </Typography>
      <div className="white-card">
        <div className="progress-row">
          <Typography variant="label1" color="semantic.foreground.neutral.tertiary">경험치</Typography>
          <Typography variant="label1" weight="bold">{character.expInLevel} / {EXP_PER_LEVEL}</Typography>
        </div>
        <ProgressIndicator percent={character.percent} />
      </div>

      <ul className="stat-rows">
        <li className="stat-card">
          <Typography variant="body2" color="semantic.foreground.neutral.secondary">모은 포인트</Typography>
          <Typography variant="headline2" weight="bold">{points.toLocaleString("ko-KR")} P</Typography>
        </li>
        <li className="stat-card">
          <Typography variant="body2" color="semantic.foreground.neutral.secondary">오늘 칼로리</Typography>
          <Typography variant="headline2" weight="bold">{Math.round(todayTotal.kcal).toLocaleString("ko-KR")} kcal</Typography>
        </li>
        <li className="stat-card">
          <Typography variant="body2" color="semantic.foreground.neutral.secondary">오늘 탄·단·지</Typography>
          <Typography variant="headline2" weight="bold">
            {Math.round(todayTotal.carbG)} · {Math.round(todayTotal.proteinG)} · {Math.round(todayTotal.fatG)} g
          </Typography>
        </li>
      </ul>
      <Typography variant="caption2" color="semantic.foreground.neutral.tertiary" className="note">
        ※ 영양 수치는 추정치이고, 캐릭터 체형은 재미를 위한 표현이에요. 의료 조언이 아니에요.
      </Typography>
    </>
  );
}
