import { BottomNavigation, BottomNavigationItem } from "@montage-ui/core";
import { IconApps, IconDocumentText, IconHome } from "@montage-ui/icon";
import { useLocation, useNavigate } from "react-router";

export default function TabBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="tab-bar">
      <BottomNavigation value={pathname} onValueChange={navigate}>
        <BottomNavigationItem value="/" icon={<IconHome />} label="홈" />
        <BottomNavigationItem value="/apps" icon={<IconApps />} label="전체 앱" />
        <BottomNavigationItem value="/records" icon={<IconDocumentText />} label="내 기록" />
      </BottomNavigation>
    </nav>
  );
}
