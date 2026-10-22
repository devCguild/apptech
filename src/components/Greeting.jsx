import { Typography } from "@montage-ui/core";

import { TIME_SLOTS } from "../timeSlots.js";

// 시간대 인사 문장 (공지 띠)
export default function Greeting({ slot }) {
  return (
    <div className="notice">
      <span aria-hidden="true">📢</span>
      <Typography variant="body2" weight="medium" color="semantic.foreground.neutral.strong">
        {TIME_SLOTS[slot].greeting}
      </Typography>
    </div>
  );
}
