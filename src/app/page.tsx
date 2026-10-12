import { TitleScreen } from "@/campaign/hero/TitleScreen";
import { MapAct } from "@/campaign/map/MapAct";
import { ChapterFast } from "@/campaign/chapters/ChapterFast";
import { ChapterSecuriti } from "@/campaign/chapters/ChapterSecuriti";
import { Cutscene } from "@/campaign/chapters/Cutscene";
import { ChapterVeeam } from "@/campaign/chapters/ChapterVeeam";
import { ChapterValkrix } from "@/campaign/chapters/ChapterValkrix";
import { Inventory } from "@/campaign/chapters/Inventory";
import { SideQuests } from "@/campaign/chapters/SideQuests";
import { Ending } from "@/campaign/chapters/Ending";
import { Hud } from "@/campaign/hud/Hud";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#world-map">
        Skip to the story
      </a>
      <Hud />
      <main id="story">
        <TitleScreen />
        <MapAct />
        <ChapterFast />
        <ChapterSecuriti />
        <Cutscene />
        <ChapterVeeam />
        <ChapterValkrix />
        <Inventory />
        <SideQuests />
        <Ending />
      </main>
    </>
  );
}
