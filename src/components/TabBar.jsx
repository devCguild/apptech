import { BottomNavigation, BottomNavigationItem } from "@montage-ui/core";
import { IconHome, IconPerson } from "@montage-ui/icon";

// 하단 탭: 오늘 기록 / 내 캐릭터
export default function TabBar({ value, onChange }) {
  return (
    <nav className="tab-bar">
      <BottomNavigation value={value} onValueChange={onChange}>
        <BottomNavigationItem value="today" icon={<IconHome />} label="오늘" />
        <BottomNavigationItem value="character" icon={<IconPerson />} label="내 캐릭터" />
      </BottomNavigation>
    </nav>
  );
}
