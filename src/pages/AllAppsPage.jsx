import { Chip, SearchField, Typography } from "@montage-ui/core";
import { useState } from "react";

import { CATEGORIES, MINI_APPS } from "../apps/registry.js";
import AppCard from "../components/AppCard.jsx";

export default function AllAppsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const keyword = query.trim();
  const apps = MINI_APPS.filter(
    (app) =>
      (category === "all" || app.category === category) &&
      (keyword === "" || app.name.includes(keyword) || app.catalog.includes(keyword)),
  );

  return (
    <main className="page">
      <Typography as="h1" variant="title1" weight="bold" className="page-title">
        전체 앱
      </Typography>
      <SearchField
        placeholder="어떤 앱을 찾으세요?"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onReset={() => setQuery("")}
      />
      <div className="chips" role="group" aria-label="카테고리">
        {CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            size="large"
            active={category === c.id}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </Chip>
        ))}
      </div>
      <div className="app-cards">
        {apps.map((app) => (
          <AppCard key={app.id} app={app} />
        ))}
        {apps.length === 0 && (
          <Typography variant="body2" color="semantic.foreground.neutral.tertiary" className="empty">
            찾는 앱이 없어요
          </Typography>
        )}
      </div>
    </main>
  );
}
