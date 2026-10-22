import { Typography } from "@montage-ui/core";

// 시간대 카드 자리 (아침/점심/저녁 하나씩)
export default function SlotCard({ slot, label, children }) {
  return (
    <section className="card" data-slot={slot}>
      <Typography as="h2" variant="headline1" weight="bold">
        {label}
      </Typography>
      {children}
    </section>
  );
}
