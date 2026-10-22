// 산책 스팟용 위치 계산 (거리·날짜·오늘의 공원 고르기)

const EARTH_RADIUS_M = 6371000;

// 두 좌표 사이 거리(m), 하버사인 공식
export function distanceMeters(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// 한국 시간 기준 오늘 날짜 YYYY-MM-DD (CLAUDE.md 기록 규칙)
export function todayKST(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);
}

// 거리 표시: 1km 미만은 m, 이상은 km
export function formatDistance(meters) {
  return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;
}

// 공원마다 거리를 붙이고, maxMeters 안의 공원만 가까운 순으로
export function parksWithin(parks, from, maxMeters) {
  return parks
    .map((park) => ({ ...park, distance: distanceMeters(from, park) }))
    .filter((park) => park.distance <= maxMeters)
    .sort((a, b) => a.distance - b.distance);
}

// 같은 날짜면 같은 공원: 이름순으로 정렬한 뒤 날짜(일 수)로 하나를 고른다
export function pickTodaySpot(parks, dateStr) {
  if (parks.length === 0) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dayNumber = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  const sorted = [...parks].sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return sorted[dayNumber % sorted.length];
}
