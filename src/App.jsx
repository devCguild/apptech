import { ProgressIndicator, Typography } from "@montage-ui/core";
import { useState } from "react";

import { TIME_SLOTS, currentSlot } from "./timeSlots.js";
import { loadAllDays, loadDay, rewardOf, saveDay, todayKST, totalOf } from "./lib/records.js";
import { characterOf } from "./lib/character.js";
import { HEALTH, bodyOf } from "./lib/health.js";
import Pet from "./components/Pet.jsx";
import PreviewSwitch from "./components/PreviewSwitch.jsx";
import Greeting from "./components/Greeting.jsx";
import CharacterPanel from "./components/CharacterPanel.jsx";
import SlotCard from "./components/SlotCard.jsx";
import ApiBox from "./components/ApiBox.jsx";
import TabBar from "./components/TabBar.jsx";

export default function App() {
  const slot = currentSlot();
  const today = todayKST();
  const [meals, setMeals] = useState(() => loadDay(today));
  const [tab, setTab] = useState("today");
  const [opened, setOpened] = useState({});
  const [message, setMessage] = useState("");

  const update = (next) => {
    setMeals(next);
    saveDay(next, today);
  };

  // 기록하면 캐릭터가 방금 먹은 음식에 반응한다 (가장 영향이 큰 음식 기준)
  const addMeal = (s, items) => {
    update({ ...meals, [s]: [...meals[s], ...items] });
    const top = [...items].sort((a, b) => Math.abs(HEALTH[b.health].delta) - Math.abs(HEALTH[a.health].delta))[0];
    setMessage(HEALTH[top.health].say(top.name));
  };

  // 지난 날 기록 + 오늘 기록으로 캐릭터 경험치·포인트 계산
  const days = { ...loadAllDays(), [today]: meals };
  const rewards = Object.values(days).map(rewardOf);
  const exp = rewards.reduce((s, r) => s + r.exp, 0);
  const points = rewards.reduce((s, r) => s + r.points, 0);
  const character = characterOf(exp);
  const body = bodyOf(days);
  const todayReward = rewardOf(meals);
  const todayTotal = totalOf(Object.values(meals).flat());
  const others = Object.keys(TIME_SLOTS).filter((s) => s !== slot);

  const slotCard = (s) => (
    <SlotCard
      key={s}
      slot={s}
      info={TIME_SLOTS[s]}
      active={s === slot}
      open={!!opened[s]}
      onToggle={(isOpen) => setOpened((o) => ({ ...o, [s]: isOpen }))}
      items={meals[s]}
      onAdd={(items) => addMeal(s, items)}
      onRemove={(i) => update({ ...meals, [s]: meals[s].filter((_, j) => j !== i) })}
    />
  );

  return (
    <div className="shell">
      <main className="page">
        <PreviewSwitch />
        <Typography as="h1" variant="title3" weight="bold" className="brand">
          삼시삼키
        </Typography>

        {tab === "today" ? (
          <>
            <Greeting slot={slot} />

            <div className="point-card">
              <span>
                <Typography variant="label1" color="semantic.foreground.neutral.tertiary">
                  오늘의 삼시
                </Typography>
                <Typography as="p" variant="title1" weight="bold" color="semantic.foreground.neutral.strong">
                  {todayReward.complete ? "삼시 완성!" : `${todayReward.filled} / 3끼`}
                </Typography>
                <Typography variant="label1" color="semantic.foreground.neutral.tertiary">
                  내 포인트 {points.toLocaleString("ko-KR")} P · 삼키는 {body.label}
                </Typography>
              </span>
              <span className="point-card-pet">
                {message && (
                  <span className="pet-bubble" role="status">
                    <Typography variant="caption1" weight="medium" color="semantic.foreground.neutral.inverse">
                      {message}
                    </Typography>
                  </span>
                )}
                <Pet weight={body.weight} mood={body.mood} size={104} label={`삼키, ${body.label}`} />
              </span>
            </div>
            <div className="point-progress">
              <ProgressIndicator percent={(todayReward.filled / 3) * 100} />
            </div>

            <Typography as="h2" variant="headline1" weight="bold" className="section-title">
              지금 기록해요
            </Typography>
            {slotCard(slot)}

            <Typography as="h2" variant="headline1" weight="bold" className="section-title">
              다른 끼니도 확인해요
            </Typography>
            <div className="slot-rows">{others.map(slotCard)}</div>
          </>
        ) : (
          <CharacterPanel character={character} body={body} points={points} todayTotal={todayTotal} />
        )}

        <ApiBox />
      </main>
      <TabBar value={tab} onChange={setTab} />
    </div>
  );
}
