import { SegmentedControl, SegmentedControlItem, Typography } from "@montage-ui/core";

import { TIME_SLOTS, currentSlot } from "../../../timeSlots.js";

// 미리보기 스위치: 고르면 ?t=morning|lunch|evening 주소로 이동
export default function PreviewSwitch() {
  const current = currentSlot();

  return (
    <nav className="preview" aria-label="시간대 미리보기">
      <Typography variant="label2" color="semantic.foreground.neutral.tertiary">
        미리보기
      </Typography>
      <SegmentedControl
        value={current}
        onValueChange={(slot) => {
          window.location.search = `?t=${slot}`;
        }}
        size="small"
        name="preview"
      >
        {Object.entries(TIME_SLOTS).map(([slot, { label }]) => (
          <SegmentedControlItem key={slot} value={slot}>
            {label}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
    </nav>
  );
}
