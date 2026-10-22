import { addPoints } from "../../lib/points.js";
import { kstDate, readJson, writeJson } from "../../lib/storage.js";

// 💾 미션별 오늘 기록: { "YYYY-MM-DD": { [missionId]: { visitedAt?, doneAt? } } }. 오늘 것만 남긴다
const KEY = "daily3_missions";

function readToday() {
  const all = readJson(KEY, {});
  const today = all && typeof all === "object" ? all[kstDate()] : null;
  return today && typeof today === "object" ? today : {};
}

function writeToday(today) {
  writeJson(KEY, { [kstDate()]: today });
}

export function readMissionProgress() {
  return readToday();
}

export function markVisited(missionId) {
  const today = readToday();
  writeToday({ ...today, [missionId]: { ...today[missionId], visitedAt: new Date().toISOString() } });
}

// 오늘 이미 받았으면 null, 아니면 포인트를 적립하고 기록을 돌려준다
export function completeMission(mission) {
  const today = readToday();
  if (today[mission.id]?.doneAt) return null;
  const event = addPoints("mission", mission.reward, mission.title);
  writeToday({ ...today, [mission.id]: { ...today[mission.id], doneAt: event.at } });
  return event;
}
