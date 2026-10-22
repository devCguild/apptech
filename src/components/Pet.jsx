// 삼키: 먹은 음식에 따라 몸이 홀쭉해지거나 통통해지는 캐릭터 (참고 이미지의 호랑이 느낌, 그림은 SVG 로 직접 그림)
// weight: -4(날씬) ~ 6(통통), mood: happy | meh | sad
export default function Pet({ weight = 0, mood = "happy", size = 140, label = "삼키" }) {
  const sx = 1 + weight * 0.08; // 몸 가로
  const sy = 1 + weight * 0.02; // 몸 세로
  const cheek = Math.max(0, weight) * 1.2; // 통통하면 볼도 빵빵

  const mouth = {
    happy: "M70 74 Q80 84 90 74",
    meh: "M71 77 L89 77",
    sad: "M70 80 Q80 72 90 80",
  }[mood];

  return (
    <svg className="pet" width={size} height={size} viewBox="0 0 160 160" role="img" aria-label={label}>
      <ellipse className="pet-shadow" cx="80" cy="150" rx={34 * sx} ry="6" />

      <g className="pet-bounce">
        {/* 몸 */}
        <g className="pet-body" style={{ transform: `scale(${sx}, ${sy})` }}>
          <ellipse cx="80" cy="112" rx="34" ry="32" fill="#F6A623" />
          <ellipse cx="80" cy="118" rx="22" ry="20" fill="#FFF1D6" />
          <path d="M50 104 l10 3 M48 114 l10 2 M110 104 l-10 3 M112 114 l-10 2" stroke="#D9731A" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="62" cy="142" rx="11" ry="7" fill="#F6A623" />
          <ellipse cx="98" cy="142" rx="11" ry="7" fill="#F6A623" />
        </g>

        {/* 머리 */}
        <circle cx="54" cy="36" r="11" fill="#F6A623" />
        <circle cx="106" cy="36" r="11" fill="#F6A623" />
        <circle cx="54" cy="36" r="5" fill="#FFD9A0" />
        <circle cx="106" cy="36" r="5" fill="#FFD9A0" />
        <ellipse cx="80" cy="64" rx={36 + cheek} ry="32" fill="#F6A623" />
        <path d="M72 36 l8 8 l8 -8 M48 58 l10 2 M112 58 l-10 2" stroke="#D9731A" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <ellipse cx="80" cy="74" rx="16" ry="11" fill="#FFF1D6" />

        {/* 얼굴 */}
        <circle cx="66" cy="60" r="4" fill="#3A2A1A" />
        <circle cx="94" cy="60" r="4" fill="#3A2A1A" />
        <ellipse cx="80" cy="68" rx="4" ry="3" fill="#3A2A1A" />
        <path d={mouth} stroke="#3A2A1A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx={58 - cheek} cy="72" r={5 + cheek * 0.5} fill="#FF8A80" opacity="0.55" />
        <circle cx={102 + cheek} cy="72" r={5 + cheek * 0.5} fill="#FF8A80" opacity="0.55" />
        {mood === "sad" && <path d="M100 48 q4 6 0 9 q-4 -3 0 -9" fill="#7FC4FF" />}
      </g>
    </svg>
  );
}
