import { Button, Chip, FlexBox, SectionMessage, Typography } from "@montage-ui/core";
import { useEffect, useState } from "react";

import { API, loadSeoulParks } from "../../api.js";
import { addPoints, readPointEvents } from "../../lib/points.js";
import { kstDate, readJson, writeJson } from "../../lib/storage.js";
import { distanceMeters, formatDistance, parksWithin, pickTodaySpot } from "./geo.js";

const APP_ID = "walk"; // registry.js 의 id
const CITY_HALL = { lat: 37.5665, lng: 126.978 }; // 위치를 못 받을 때 기준 (서울시청)
const NEARBY_METERS = 2000;
const VERIFY_METERS = 100;
const VISIT_POINTS = 100;

// 💾 기록 (CLAUDE.md 기록 규칙: daily3_ 이름, 읽기·쓰기는 lib/storage.js 의 try-catch)
const VISITS_KEY = "daily3_walk_visits"; // ["YYYY-MM-DD|공원명", ...]
const SPOT_KEY = "daily3_walk_spot"; // { date, park } 오늘 정해진 스팟 (걸어가도 바뀌지 않게)

// 산책으로 모은 포인트 (잔액은 적립 기록을 더해서 계산)
function walkPoints() {
  return readPointEvents()
    .filter((e) => e.appId === APP_ID)
    .reduce((sum, e) => sum + e.amount, 0);
}

// 브라우저 위치 한 번 받기
function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("이 브라우저는 위치 기능을 지원하지 않아요"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      (error) =>
        reject(new Error(error.code === 1 ? "위치 권한이 거부됐어요" : "위치를 가져오지 못했어요")),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

// 산책 스팟 미니앱: 2km 안 오늘의 공원에 가서 방문 인증
export default function App() {
  const today = kstDate();
  const [location, setLocation] = useState({ status: "loading", coords: CITY_HALL, message: "" });
  const [parks, setParks] = useState({ status: "loading" });
  const [points, setPoints] = useState(walkPoints);
  const [visits, setVisits] = useState(() => readJson(VISITS_KEY, []));
  const [verify, setVerify] = useState({ status: "idle", message: "" });
  const [savedSpot, setSavedSpot] = useState(() => readJson(SPOT_KEY, null));

  useEffect(() => {
    getPosition()
      .then((coords) => setLocation({ status: "ok", coords, message: "" }))
      .catch((error) => setLocation({ status: "fallback", coords: CITY_HALL, message: error.message }));
    loadSeoulParks().then((result) => setParks({ status: "done", ...result }));
  }, []);

  const nearby = parks.status === "done" ? parksWithin(parks.parks, location.coords, NEARBY_METERS) : [];
  // 오늘 이미 정한 스팟이 있으면 그대로, 없으면 지금 위치 기준으로 고른다
  const fixedPark = savedSpot?.date === today ? savedSpot.park : null;
  const todayPark = fixedPark ?? pickTodaySpot(nearby, today);
  const spot = todayPark && { ...todayPark, distance: distanceMeters(location.coords, todayPark) };
  const visitId = spot ? `${today}|${spot.name}` : "";

  // 실제 위치로 고른 스팟만 오늘 하루 고정한다 (서울시청 기본값으로 고른 건 고정하지 않음)
  useEffect(() => {
    if (fixedPark || !todayPark || location.status !== "ok" || parks.isMock) return;
    const { name, address, lat, lng } = todayPark;
    const next = { date: today, park: { name, address, lat, lng } };
    setSavedSpot(next);
    writeJson(SPOT_KEY, next);
  }, [fixedPark, todayPark, location.status, parks.isMock, today]);
  const alreadyVisited = visits.includes(visitId);

  async function handleVerify() {
    setVerify({ status: "checking", message: "" });
    let here;
    try {
      here = await getPosition(); // 인증은 항상 지금 위치로 다시 확인
      setLocation({ status: "ok", coords: here, message: "" });
    } catch (error) {
      setVerify({ status: "fail", message: `${error.message}. 위치를 허용해야 인증할 수 있어요.` });
      return;
    }

    const left = distanceMeters(here, spot) - VERIFY_METERS;
    if (left > 0) {
      setVerify({ status: "fail", message: `${spot.name}까지 ${formatDistance(left)} 더 가야 인증돼요.` });
      return;
    }
    if (visits.includes(visitId)) return;

    const nextVisits = [...visits, visitId];
    setVisits(nextVisits);
    writeJson(VISITS_KEY, nextVisits);
    addPoints(APP_ID, VISIT_POINTS, `${spot.name} 방문 인증`); // 홈·내 기록 포인트에 같이 잡힘
    setPoints(walkPoints());
    setVerify({ status: "done", message: `+${VISIT_POINTS}P 인증 완료` });
  }

  return (
    <FlexBox flexDirection="column" gap="12px" sx={{ padding: "8px 20px 32px" }}>
      <FlexBox justifyContent="space-between" alignItems="center" gap="8px">
        <Typography as="h2" variant="headline2" weight="bold" color="semantic.foreground.neutral.strong">
          🌳 오늘의 산책 스팟
        </Typography>
        <Chip size="small" variant="outlined" disableInteraction>
          산책 포인트 {points}P
        </Chip>
      </FlexBox>

      {location.status === "loading" && (
        <Typography variant="body2" color="semantic.foreground.neutral.tertiary">
          📍 내 위치를 확인하는 중이에요…
        </Typography>
      )}
      {location.status === "fallback" && (
        <SectionMessage variant="info" description="서울시청 기준으로 가까운 공원을 보여 드려요.">
          {location.message}
        </SectionMessage>
      )}

      {parks.status === "loading" && (
        <Typography variant="body2" color="semantic.foreground.neutral.tertiary">
          공원 목록을 불러오는 중이에요…
        </Typography>
      )}
      {parks.status === "done" && parks.isMock && (
        <SectionMessage
          variant="cautionary"
          description={`공원 정보를 불러오지 못해 예시 공원 5곳으로 보여 드려요. (${parks.error})`}
        >
          목업 데이터 사용 중
        </SectionMessage>
      )}

      {parks.status === "done" && !spot && (
        <Typography variant="body2" color="semantic.foreground.neutral.secondary">
          내 위치에서 2km 안에 공원이 없어요.
        </Typography>
      )}

      {spot && (
        <FlexBox flexDirection="column" gap="4px">
          <Typography variant="title3" weight="bold" color="semantic.foreground.neutral.strong">
            {spot.name}
          </Typography>
          <Typography variant="body2" color="semantic.foreground.neutral.secondary">
            {spot.address}
          </Typography>
          <Typography variant="label1" weight="medium" color="semantic.foreground.brand.primary">
            {location.status === "ok" ? "내 위치에서" : "서울시청에서"} {formatDistance(spot.distance)}
            {fixedPark && " · 오늘의 스팟은 하루 동안 그대로예요"}
          </Typography>
        </FlexBox>
      )}

      {spot && (
        <FlexBox flexDirection="column" gap="6px">
          <Button
            variant="solid"
            color="primary"
            fullWidth
            loading={verify.status === "checking"}
            disabled={alreadyVisited}
            onClick={handleVerify}
          >
            {alreadyVisited ? "오늘은 이미 인증했어요" : "방문 인증"}
          </Button>
          {verify.message && (
            <Typography
              variant="body2"
              weight="medium"
              color={
                verify.status === "done"
                  ? "semantic.foreground.positive.primary"
                  : "semantic.foreground.neutral.secondary"
              }
            >
              {verify.message}
            </Typography>
          )}
        </FlexBox>
      )}

      {nearby.length > 0 && (
        <FlexBox flexDirection="column" gap="4px">
          <Typography variant="label1" weight="bold" color="semantic.foreground.neutral.secondary">
            2km 안 공원 {nearby.length}곳 (가까운 순)
          </Typography>
          <ol style={{ margin: 0, paddingLeft: "20px" }}>
            {nearby.slice(0, 10).map((park) => (
              <li key={`${park.name}|${park.address}`}>
                <Typography variant="body2" color="semantic.foreground.neutral.primary">
                  {park.name} · {formatDistance(park.distance)}
                </Typography>
              </li>
            ))}
          </ol>
        </FlexBox>
      )}

      {/* 🔌 이 화면이 쓰는 API (CLAUDE.md API 화면 규칙: 맨 아래에 주소·원본 JSON·출처) */}
      <FlexBox flexDirection="column" gap="2px" sx={{ marginTop: "12px" }}>
        <Typography variant="label2" weight="bold" color="semantic.foreground.neutral.secondary">
          🔌 이 화면이 쓰는 API
        </Typography>
        <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">
          서울 공원 (원본 JSON): <a href={API.parks}>{API.parks}</a>
        </Typography>
        <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">
          출처: 공공데이터포털 「전국도시공원정보표준데이터」
          {parks.referenceDate ? ` · 데이터 기준일 ${parks.referenceDate}` : ""} · 인증 기록 날짜 {today}
        </Typography>
      </FlexBox>
    </FlexBox>
  );
}
