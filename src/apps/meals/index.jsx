import { ProgressIndicator, Tab, TabList, TabListItem, TabPanel, Typography } from "@montage-ui/core";
import { useEffect, useState } from "react";

import { TIME_SLOTS, currentSlot } from "./lib/slots.js";
import { loadAllDays, loadDay, rewardOf, saveDay, todayKST, totalOf } from "./lib/records.js";
import { characterOf } from "./lib/character.js";
import { HEALTH, bodyOf } from "./lib/health.js";
import { setNutritionData } from "./lib/foods.js";
import { loadNutrition } from "./lib/nutrition.js";
import { giveMealPoint, mealPointTotal } from "./lib/mealPoints.js";
import PreviewSwitch from "./components/PreviewSwitch.jsx";
import Greeting from "./components/Greeting.jsx";
import CharacterPanel from "./components/CharacterPanel.jsx";
import SlotCard from "./components/SlotCard.jsx";
import ApiBox from "./components/ApiBox.jsx";
import Pet from "./components/Pet.jsx";
import "./meals.css";

// 삼시삼키 미니앱: 하루 세 끼를 기록하면 캐릭터 삼키가 자라고, 먹은 음식에 따라 체형이 바뀐다
export default function App() {
  const slot = currentSlot();
  const today = todayKST();
  const [meals, setMeals] = useState(() => loadDay(today));
  const [tab, setTab] = useState("today");
  const [opened, setOpened] = useState({});
  const [message, setMessage] = useState("");
  const [points, setPoints] = useState(mealPointTotal);
  const [dataStatus, setDataStatus] = useState("loading"); // loading | ready | error

  // 🔌 영양 데이터(data.js) 불러오기. 실패해도 임시 예시값으로 화면은 그대로 쓴다
  const fetchData = () => {
    setDataStatus("loading");
    loadNutrition()
      .then((data) => {
        setNutritionData(data);
        setDataStatus("ready");
      })
      .catch(() => setDataStatus("error"));
  };
  useEffect(fetchData, []);

  const update = (next) => {
    setMeals(next);
    saveDay(next, today);
  };

  // 기록하면 포인트를 주고, 캐릭터가 방금 먹은 음식에 반응한다 (가장 영향이 큰 음식 기준)
  const addMeal = (s, items) => {
    update({ ...meals, [s]: [...meals[s], ...items] });
    giveMealPoint(TIME_SLOTS[s].label, today);
    setPoints(mealPointTotal());
    const top = [...items].sort((a, b) => Math.abs(HEALTH[b.health].delta) - Math.abs(HEALTH[a.health].delta))[0];
    setMessage(HEALTH[top.health].say(top.name));
  };

  // 지난 날 기록 + 오늘 기록으로 캐릭터 경험치·체형 계산
  const days = { ...loadAllDays(), [today]: meals };
  const exp = Object.values(days).map(rewardOf).reduce((s, r) => s + r.exp, 0);
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
      dataStatus={dataStatus}
      onAdd={(items) => addMeal(s, items)}
      onRemove={(i) => update({ ...meals, [s]: meals[s].filter((_, j) => j !== i) })}
    />
  );

  return (
    <div className="meals">
      <PreviewSwitch />
      <Tab value={tab} onValueChange={setTab}>
        <TabList size="medium" resize="fill">
          <TabListItem value="today">오늘 기록</TabListItem>
          <TabListItem value="character">내 캐릭터</TabListItem>
        </TabList>

        <TabPanel value="today">
          <div className="meals-page">
            <Greeting slot={slot} />

            <div className="meals-today">
              <span className="meals-today-text">
                <Typography variant="label1" color="semantic.foreground.neutral.tertiary">
                  오늘의 삼시
                </Typography>
                <Typography as="p" variant="title1" weight="bold" color="semantic.foreground.neutral.strong">
                  {todayReward.complete ? "삼시 완성!" : `${todayReward.filled} / 3끼`}
                </Typography>
                <Typography variant="label1" color="semantic.foreground.neutral.tertiary">
                  삼시삼키 포인트 {points.toLocaleString("ko-KR")} P · 삼키는 {body.label}
                </Typography>
              </span>
              <span className="meals-today-pet">
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
            <div className="meals-today-progress">
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

            <ApiBox status={dataStatus} onRetry={fetchData} />
          </div>
        </TabPanel>

        <TabPanel value="character">
          <div className="meals-page">
            <CharacterPanel character={character} body={body} points={points} todayTotal={todayTotal} />
            <ApiBox status={dataStatus} onRetry={fetchData} />
          </div>
        </TabPanel>
      </Tab>
    </div>
  );
}
