// 미션 목록. 출처(source)별로 나눠 두고, 광고 미션은 광고사 키가 연결돼야 켜진다
import { TIME_SLOTS } from "../../timeSlots.js";

export const MISSION_SOURCES = {
  ours: { label: "오늘의 미션" },
  adpopcorn: { label: "광고 미션", note: "애드팝콘 매체 승인 대기 중이에요. 연결되면 여기에 광고 미션이 보여요." },
};

export const MISSIONS = [
  {
    id: "attendance",
    source: "ours",
    title: "출석 체크",
    description: "하루 한 번 눌러서 출석해요",
    reward: 10,
    kind: "tap",
  },
  ...Object.entries(TIME_SLOTS).map(([slot, { label, from, to }]) => ({
    id: `checkin-${slot}`,
    source: "ours",
    title: `${label} 체크인`,
    description: `${from}~${to} 사이에 들러요`,
    reward: 5,
    kind: "slot",
    slot,
  })),
  {
    id: "visit-moapet",
    source: "ours",
    title: "모아펫 들르기",
    description: "모아펫에 다녀오면 보상을 받을 수 있어요",
    reward: 5,
    kind: "visit",
    href: `${import.meta.env.BASE_URL}moapet/`,
  },
];
