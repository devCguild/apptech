import { Typography } from "@montage-ui/core";

import { findMiniApp } from "../apps/registry.js";
import { pointTotals, readPointEvents } from "../lib/points.js";

const timeFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default function RecordsPage() {
  const events = readPointEvents().slice().reverse();
  const { total, today } = pointTotals(events);

  return (
    <main className="page">
      <Typography as="h1" variant="title1" weight="bold" className="page-title">
        내 기록
      </Typography>
      <section className="point-card">
        <span>
          <Typography variant="label1" color="semantic.foreground.neutral.tertiary">
            모은 포인트
          </Typography>
          <Typography as="p" variant="title1" weight="bold" color="semantic.foreground.neutral.strong">
            {total.toLocaleString("ko-KR")} P
          </Typography>
          <Typography variant="label1" color="semantic.foreground.neutral.tertiary">
            오늘 {today.toLocaleString("ko-KR")} P
          </Typography>
        </span>
      </section>

      <Typography as="h2" variant="headline1" weight="bold" className="section-title">
        적립 내역
      </Typography>
      {events.length === 0 ? (
        <Typography variant="body2" color="semantic.foreground.neutral.tertiary" className="empty">
          아직 모은 포인트가 없어요. 앱을 하나 열어 시작해 보세요.
        </Typography>
      ) : (
        <ul className="records">
          {events.map((e) => (
            <li key={e.at} className="record">
              <span>
                <Typography variant="body2" weight="bold">
                  {findMiniApp(e.appId)?.name ?? e.appId}
                </Typography>
                <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">
                  {e.reason} · {timeFormat.format(new Date(e.at))}
                </Typography>
              </span>
              <Typography variant="body1" weight="bold" color="semantic.primary.normal">
                +{e.amount.toLocaleString("ko-KR")} P
              </Typography>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
