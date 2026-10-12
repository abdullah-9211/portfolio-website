import { ChapterTitle } from "./ChapterTitle";
import { Reveal } from "@/campaign/ui/Reveal";
import { TrophyTrigger } from "@/campaign/ui/TrophyTrigger";
import { MedalStage } from "@/campaign/ui/Stage3D";
import { Photo } from "@/campaign/ui/Photo";
import { TechList } from "@/campaign/ui/TechList";
import { projects } from "@/data/projects";
import { EarthGame } from "@/campaign/games/earth/EarthGame";
import { FormCheckGame } from "@/campaign/games/formcheck/FormCheckGame";
import { MoveFootage } from "./MoveFootage";

const [move, earth, scraper] = projects;

export function ChapterFast() {
  return (
    <>
      <ChapterTitle
        region="fast"
        place="Islamabad"
        seed={3}
        lede="A computer science degree, a medal, and three projects that got more ambitious every year."
      />
      <div className="chapter" style={{ "--region": "#9ccb6b" } as React.CSSProperties}>
        <section className="wrap spread spread-degree" aria-labelledby="fast-degree">
          <Reveal className="spread-text" stagger={70}>
            <h3 id="fast-degree" className="display h-section">
              Bachelor of Science in Computer Science
            </h3>
            <p className="body">
              FAST National University of Computer and Emerging Sciences, August 2020 to August 2024. My rule then is
              my rule now: if I don&rsquo;t know how to do something, I get it done anyway and learn on the way.
            </p>
            <dl className="statline">
              <div>
                <dt>CGPA</dt>
                <dd className="tnum">3.70</dd>
              </div>
              <div>
                <dt>Silver Medal</dt>
                <dd>Fall 2021</dd>
              </div>
              <div>
                <dt>Dean&rsquo;s List of Honour</dt>
                <dd>Every semester with a 3.5+ SGPA</dd>
              </div>
            </dl>
            <TrophyTrigger id="silver-medal" />
            <TrophyTrigger id="deans-list" />
          </Reveal>
          <div className="spread-visual">
            <MedalStage className="medal-stage" />
            <p className="visual-note">Throw it to spin it. The back is engraved.</p>
          </div>
        </section>

        <section className="wrap project project-scraper" aria-labelledby="proj-scraper">
          <Reveal stagger={70}>
            <p className="project-year tnum">2021</p>
            <h3 id="proj-scraper" className="display h-section">
              {scraper.name}
            </h3>
            <p className="body">
              A console app that scraped the websites of NUST, FAST and LUMS, sorted every word into nouns, verbs and
              adjectives, and graphed the most common nouns to compare how three universities talk about themselves.
            </p>
            <TechList items={scraper.tags} />
          </Reveal>
        </section>

        <section className="wrap project project-earth" aria-labelledby="proj-earth">
          <div className="spread">
            <Reveal className="spread-text" stagger={70}>
              <p className="project-year tnum">2022</p>
              <h3 id="proj-earth" className="display h-section">
                {earth.name}
              </h3>
              <p className="body">
                An Android game about climate. You make calls on the world&rsquo;s problems, and every call moves
                biodiversity, population and your budget. It keeps going until the planet doesn&rsquo;t.
              </p>
              <TechList items={earth.tags} />
            </Reveal>
            <Reveal className="shots shots-landscape" stagger={90}>
              <Photo src="/photos/earth/globe.webp" alt="The original game's main screen: a globe, a day counter and bars for sea level, hunger and biodiversity." width={1280} height={590} caption="The original, on Android" />
              <Photo src="/photos/earth/map.webp" alt="The original game's world map with continents in flat colours." width={1280} height={590} />
              <Photo src="/photos/earth/region.webp" alt="A region panel for Asia with a bar for each climate measure." width={1280} height={590} />
            </Reveal>
          </div>
          <EarthGame />
        </section>

        <section className="wrap project project-move" aria-labelledby="proj-move">
          <div className="spread spread-flip">
            <Reveal className="spread-text" stagger={70}>
              <p className="project-year tnum">2023 to 2024</p>
              <h3 id="proj-move" className="display h-section">
                {move.name}
              </h3>
              <p className="body">
                A fitness app that watches your form while you train. Pose estimation compares your posture with a
                trainer&rsquo;s and tells you what to fix.
              </p>
              <TechList items={move.tags} />
              <TrophyTrigger id="shipped-move" />
            </Reveal>
            <Reveal className="shots shots-phones" stagger={90}>
              <Photo src="/photos/move/splash.webp" alt="Move's sign-in screen with the logo and the line Innovating Your Fitness Journey." width={590} height={1280} sizes="(min-width: 900px) 15vw, 30vw" />
              <Photo src="/photos/move/report.webp" alt="Move's workout report: 57.9% accuracy, four exercises, 9 minutes 37 seconds, and a score for each exercise." width={590} height={1280} sizes="(min-width: 900px) 15vw, 30vw" />
              <Photo src="/photos/move/profile.webp" alt="Move's profile screen with completed workouts." width={590} height={1280} sizes="(min-width: 900px) 15vw, 30vw" />
            </Reveal>
          </div>
          <MoveFootage />
          <FormCheckGame />
        </section>
      </div>
    </>
  );
}
