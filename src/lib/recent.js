import { readJson, writeJson } from "./storage.js";

// 홈의 "이어서 즐겨요"에 띄울 마지막으로 연 앱
const KEY = "daily3_recent_app";

export function readRecentAppId() {
  return readJson(KEY, null);
}

export function saveRecentAppId(appId) {
  writeJson(KEY, appId);
}
