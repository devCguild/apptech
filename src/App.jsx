import { Typography } from "@montage-ui/core";

import { TIME_SLOTS } from "./timeSlots.js";
import PreviewSwitch from "./components/PreviewSwitch.jsx";
import Greeting from "./components/Greeting.jsx";
import SlotCard from "./components/SlotCard.jsx";
import ApiBox from "./components/ApiBox.jsx";
import WalkSpot from "./components/WalkSpot.jsx";

export default function App() {
  return (
    <>
      <PreviewSwitch />
      <header className="header">
        <Typography as="h1" variant="title2" weight="bold" color="semantic.foreground.neutral.strong">
          (서비스 이름)
        </Typography>
        <Greeting />
      </header>
      <main className="cards">
        {Object.entries(TIME_SLOTS).map(([slot, { label }]) => (
          <SlotCard key={slot} slot={slot} label={label}>
            {slot === "lunch" && <WalkSpot />}
          </SlotCard>
        ))}
      </main>
      <ApiBox />
    </>
  );
}
