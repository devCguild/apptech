import { Navigate, Route, Routes, useMatch } from "react-router";

import TabBar from "./components/TabBar.jsx";
import HomePage from "./pages/HomePage.jsx";
import AllAppsPage from "./pages/AllAppsPage.jsx";
import RecordsPage from "./pages/RecordsPage.jsx";
import MiniAppPage from "./pages/MiniAppPage.jsx";

export default function App() {
  const inMiniApp = useMatch("/apps/:appId");

  return (
    <div className="shell">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/apps" element={<AllAppsPage />} />
        <Route path="/apps/:appId" element={<MiniAppPage />} />
        <Route path="/records" element={<RecordsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!inMiniApp && <TabBar />}
    </div>
  );
}
