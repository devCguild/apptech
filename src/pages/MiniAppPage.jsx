import { IconButton, Typography } from "@montage-ui/core";
import { IconChevronLeft } from "@montage-ui/icon";
import { useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router";

import { findMiniApp } from "../apps/registry.js";
import { saveRecentAppId } from "../lib/recent.js";

// 미니앱을 여는 공통 틀: 위에 뒤로 가기 + 앱 이름, 아래는 각 앱 화면
export default function MiniAppPage() {
  const { appId } = useParams();
  const navigate = useNavigate();
  const app = findMiniApp(appId);

  useEffect(() => {
    if (app) saveRecentAppId(app.id);
  }, [app]);

  if (!app) return <Navigate to="/apps" replace />;
  if (app.href) {
    window.location.replace(app.href);
    return null;
  }
  const { Component } = app;

  return (
    <div className="mini-app">
      <header className="mini-app-bar">
        <IconButton aria-label="뒤로 가기" onClick={() => navigate(-1)}>
          <IconChevronLeft />
        </IconButton>
        <Typography as="h1" variant="headline1" weight="bold">
          {app.name}
        </Typography>
      </header>
      <Component />
    </div>
  );
}
