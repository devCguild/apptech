import { ProgressIndicator, Tab, TabList, TabListItem, TabPanel, Typography } from "@montage-ui/core";
import { useState } from "react";

import { TIME_SLOTS, currentSlot } from "./timeSlots.js";
import { loadAllDays, loadDay, rewardOf, saveDay, todayKST, totalOf } from "./lib/records.js";
import { characterOf } from "./lib/character.js";
import PreviewSwitch from "./components/PreviewSwitch.jsx";
import MissionBar from "./components/MissionBar.jsx";
import Greeting from "./components/Greeting.jsx";
import GameScene from "./components/GameScene.jsx";
import CharacterPanel from "./components/CharacterPanel.jsx";
import SlotCard from "./components/SlotCard.jsx";
import ApiBox from "./components/ApiBox.jsx";

export default function App() {
  const slot = currentSlot();
  const today = todayKST();
  const [meals, setMeals] = useState(() => loadDay(today));
  const [tab, setTab] = useState("meals");
  const [opened, setOpened] = useState({});

  const update = (next) => {
    setMeals(next);
    saveDay(next, today);
  };

  // 지난 날 기록 + 오늘 기록으로 캐릭터 경험치·포인트 계산
  const days = { ...loadAllDays(), [today]: meals };
  const rewards = Object.values(days).map(rewardOf);
  const exp = rewards.reduce((s, r) => s + r.exp, 0);
  const points = rewards.reduce((s, r) => s + r.points, 0);
  const character = characterOf(exp);
  const todayReward = rewardOf(meals);
  const todayTotal = totalOf(Object.values(meals).flat());

  // 지금 시간대 카드를 맨 위로, 나머지는 아래에 접어 둔다
  const order = [slot, ...Object.keys(TIME_SLOTS).filter((s) => s !== slot)];

  // 위 미션 아이콘을 누르면 "오늘 기록" 탭에서 그 카드를 펼치고 스크롤
  const selectSlot = (s) => {
    setTab("meals");
    setOpened((o) => ({ ...o, [s]: true }));
    requestAnimationFrame(() => document.querySelector(`[data-slot="${s}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  return (
    <div className="app">
      <div className="stage">
        <PreviewSwitch />
        <MissionBar slot={slot} meals={meals} points={points} onSelect={selectSlot} />
        <Greeting slot={slot} />
        <GameScene character={character} todo={TIME_SLOTS[slot].todo} />
      </div>

      <section className="sheet" aria-label="오늘의 삼시">
        <Tab value={tab} onValueChange={setTab}>
          <TabList size="medium" resize="hug">
            <TabListItem value="meals">오늘 기록</TabListItem>
            <TabListItem value="character">내 캐릭터</TabListItem>
          </TabList>

          <TabPanel value="meals">
            <div className="sheet-panel">
              <div className="sheet-bar">
                <ProgressIndicator percent={(todayReward.filled / 3) * 100} />
                <span className="sheet-bar-icon" aria-hidden="true">{todayReward.complete ? "🎉" : "🍚"}</span>
              </div>
              <div className="stat-row">
                <Typography variant="body2" color="semantic.foreground.neutral.secondary">오늘의 삼시</Typography>
                <Typography variant="headline1" weight="bold">
                  {todayReward.complete ? "삼시 완성!" : `${todayReward.filled} / 3끼`}
                </Typography>
              </div>
              <div className="cards">
                {order.map((s) => (
                  <SlotCard
                    key={s}
                    slot={s}
                    info={TIME_SLOTS[s]}
                    active={s === slot}
                    open={!!opened[s]}
                    onToggle={(isOpen) => setOpened((o) => ({ ...o, [s]: isOpen }))}
                    items={meals[s]}
                    onAdd={(items) => update({ ...meals, [s]: [...meals[s], ...items] })}
                    onRemove={(i) => update({ ...meals, [s]: meals[s].filter((_, j) => j !== i) })}
                  />
                ))}
              </div>
            </div>
          </TabPanel>

          <TabPanel value="character">
            <CharacterPanel character={character} points={points} todayTotal={todayTotal} />
          </TabPanel>
        </Tab>
      </section>

      <ApiBox />
    </div>
  );
}
