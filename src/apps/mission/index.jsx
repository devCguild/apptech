import { Button, Typography } from "@montage-ui/core";
import { useState } from "react";

import { TIME_SLOTS, currentTimeSlot } from "../../timeSlots.js";
import { MISSIONS, MISSION_SOURCES } from "./missions.js";
import { completeMission, markVisited, readMissionProgress } from "./progress.js";
import "./mission.css";

// 미션 모으기: 미션을 수행하면 하루 한 번 포인트를 받는다 (포인트는 lib/points.js)
export default function App() {
  const [progress, setProgress] = useState(readMissionProgress);
  const [message, setMessage] = useState("");
  const slot = currentTimeSlot();

  const done = MISSIONS.filter((m) => progress[m.id]?.doneAt);
  const earned = done.reduce((sum, m) => sum + m.reward, 0);

  function claim(mission) {
    const event = completeMission(mission);
    setProgress(readMissionProgress());
    setMessage(event ? `${mission.title} 완료! +${mission.reward} P` : "오늘은 이미 받은 미션이에요");
  }

  function visit(mission) {
    markVisited(mission.id);
    window.location.href = mission.href;
  }

  return (
    <div className="mission">
      <section className="mission-summary">
        <Typography variant="label1" color="semantic.foreground.neutral.tertiary">
          오늘 미션으로 모은 포인트
        </Typography>
        <Typography as="p" variant="title2" weight="bold">
          {earned.toLocaleString("ko-KR")} P
        </Typography>
        <Typography variant="label1" color="semantic.foreground.neutral.tertiary">
          {done.length} / {MISSIONS.length} 완료 · 지금은 {TIME_SLOTS[slot].label}
        </Typography>
      </section>

      <p className="mission-message" role="status" aria-live="polite">
        {message}
      </p>

      <Typography as="h2" variant="headline1" weight="bold" className="mission-section">
        {MISSION_SOURCES.ours.label}
      </Typography>
      <ul className="mission-list">
        {MISSIONS.map((mission) => (
          <MissionRow
            key={mission.id}
            mission={mission}
            state={missionState(mission, progress[mission.id], slot)}
            onClaim={() => claim(mission)}
            onVisit={() => visit(mission)}
          />
        ))}
      </ul>

      <Typography as="h2" variant="headline1" weight="bold" className="mission-section">
        {MISSION_SOURCES.adpopcorn.label}
      </Typography>
      <p className="mission-pending">{MISSION_SOURCES.adpopcorn.note}</p>
    </div>
  );
}

// done: 오늘 받음 · ready: 지금 받을 수 있음 · go: 다녀와야 함 · wait: 다른 시간대
function missionState(mission, record, slot) {
  if (record?.doneAt) return "done";
  if (mission.kind === "slot") return mission.slot === slot ? "ready" : "wait";
  if (mission.kind === "visit") return record?.visitedAt ? "ready" : "go";
  return "ready";
}

function MissionRow({ mission, state, onClaim, onVisit }) {
  const action = {
    done: <Button size="small" variant="outlined" disabled>완료</Button>,
    ready: <Button size="small" variant="solid" onClick={onClaim}>받기</Button>,
    go: <Button size="small" variant="outlined" onClick={onVisit}>다녀오기</Button>,
    wait: <Button size="small" variant="outlined" disabled>{TIME_SLOTS[mission.slot]?.label}에 열려요</Button>,
  }[state];

  return (
    <li className={`mission-row is-${state}`}>
      <span className="mission-row-text">
        <Typography variant="body1" weight="bold">
          {mission.title}
        </Typography>
        <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">
          {mission.description}
        </Typography>
      </span>
      <span className="mission-reward">+{mission.reward} P</span>
      {action}
    </li>
  );
}
