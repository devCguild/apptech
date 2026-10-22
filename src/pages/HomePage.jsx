import { Button, Typography } from "@montage-ui/core";
import { IconChevronRight } from "@montage-ui/icon";
import { Link } from "react-router";

import coins from "../assets/hub/coins.png";
import { MINI_APPS, findMiniApp } from "../apps/registry.js";
import AppLink from "../components/AppLink.jsx";
import AppRow from "../components/AppRow.jsx";
import { pointTotals } from "../lib/points.js";
import { readRecentAppId } from "../lib/recent.js";

export default function HomePage() {
  const { total, today } = pointTotals();
  const featured = findMiniApp(readRecentAppId()) ?? MINI_APPS[0];
  const others = MINI_APPS.filter((app) => app.id !== featured.id);

  return (
    <main className="page">
      <Typography as="h1" variant="title3" weight="bold" className="brand">
        앱테크
      </Typography>
      <Typography as="h2" variant="title2" weight="bold" className="page-lead">
        오늘은 어떻게 모을까요?
      </Typography>

      <Link to="/records" className="point-card">
        <span>
          <Typography variant="label1" color="semantic.foreground.neutral.tertiary">
            내 포인트
          </Typography>
          <Typography as="p" variant="title1" weight="bold" color="semantic.foreground.neutral.strong">
            {total.toLocaleString("ko-KR")} P
          </Typography>
          <Typography variant="label1" color="semantic.foreground.neutral.tertiary">
            오늘 모은 포인트 {today.toLocaleString("ko-KR")} P
          </Typography>
        </span>
        <img src={coins} alt="" className="point-card-art" />
      </Link>

      <Typography as="h2" variant="headline1" weight="bold" className="section-title">
        이어서 즐겨요
      </Typography>
      <section className={`feature-card tone-${featured.tone}`}>
        <div className="feature-card-text">
          <Typography as="h3" variant="title2" weight="bold" color="semantic.foreground.neutral.strong">
            {featured.name}
          </Typography>
          <Typography variant="body2" color="semantic.foreground.neutral.secondary" className="keep-lines">
            {featured.summary}
          </Typography>
          <AppLink app={featured} className="feature-card-cta-link">
            <Button
              as="span"
              variant="solid"
              size="medium"
              className={`feature-card-cta cta-${featured.tone}`}
              trailingContent={<IconChevronRight />}
            >
              {featured.cta}
            </Button>
          </AppLink>
        </div>
        <img className="feature-card-art" src={featured.banner} alt="" />
      </section>

      <Typography as="h2" variant="headline1" weight="bold" className="section-title">
        다른 앱도 둘러보세요
      </Typography>
      <div className="app-rows">
        {others.map((app) => (
          <AppRow key={app.id} app={app} />
        ))}
      </div>
    </main>
  );
}
