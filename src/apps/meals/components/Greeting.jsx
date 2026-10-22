import { Typography } from "@montage-ui/core";

import { TIME_SLOTS } from "../lib/slots.js";

// 시간대 인사 문장 (페이지 첫 문장)
export default function Greeting({ slot }) {
  return (
    <Typography as="h2" variant="title2" weight="bold" className="page-lead">
      {TIME_SLOTS[slot].greeting}
    </Typography>
  );
}
