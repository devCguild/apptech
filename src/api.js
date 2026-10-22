// 🔌 API 주소는 여기 한 곳에서만 정한다 (CLAUDE.md API 화면 규칙)
export const API = {
  parks: `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"}/api/parks`, // 🔌 서울 공원 (우리 백엔드 → 공공데이터포털)
};

// ── 오늘의 산책 스팟 (점심) ──────────────────────────────

// 백엔드를 못 부를 때 쓰는 서울시청 근처 공원 5곳 (마로니에공원은 2km 밖)
export const MOCK_PARKS = [
  { name: "탑골공원", address: "서울특별시 종로구 종로 99", lat: 37.5712, lng: 126.9881 },
  { name: "사직공원", address: "서울특별시 종로구 사직로 89", lat: 37.5758, lng: 126.9685 },
  { name: "서소문역사공원", address: "서울특별시 중구 칠패로 5", lat: 37.5598, lng: 126.969 },
  { name: "남산공원(백범광장)", address: "서울특별시 중구 소월로 91", lat: 37.5547, lng: 126.9811 },
  { name: "마로니에공원", address: "서울특별시 종로구 대학로 104", lat: 37.5806, lng: 127.0026 },
];

// 서울 공원 목록. 실패하면 목업을 돌려주고 isMock 으로 알려 준다
export async function loadSeoulParks() {
  try {
    const response = await fetch(API.parks, { signal: AbortSignal.timeout(20000) }); // 🔌 API 호출
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.parks) || data.parks.length === 0) throw new Error("공원 목록이 비어 있음");
    return { parks: data.parks, isMock: false, referenceDate: data.referenceDate ?? null, error: null };
  } catch (error) {
    return { parks: MOCK_PARKS, isMock: true, referenceDate: null, error: String(error.message ?? error) };
  }
}
