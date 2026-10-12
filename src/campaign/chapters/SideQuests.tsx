"use client";

import { useRef } from "react";
import Image from "next/image";
import { Act, useActProgress, ramp } from "@/campaign/scroll/Act";
import { useScroll } from "@/campaign/scroll/ScrollProvider";
import { ExternalGlyph } from "@/campaign/ui/glyphs";
import { GameScenes, RunTrack } from "./SideQuestArt";
import { LattePour } from "@/campaign/scenes/LattePour";

/** Each quest owns a stretch of the act's scroll. Games gets the longest because it has two halves. */
const quests = [
  { id: "basketball", name: "Pickup basketball", line: "Weekend games", from: 0, to: 0.2 },
  { id: "coffee", name: "Coffee, made properly", line: "Latte art", from: 0.2, to: 0.46 },
  { id: "games", name: "Story-driven games", line: "PS5 and Switch", from: 0.46, to: 0.82 },
  { id: "running", name: "Half marathon", line: "November 2026", from: 0.82, to: 1 },
] as const;

const court = [
  { src: "/photos/court/shot.webp", alt: "Abdullah taking a jump shot on an outdoor court.", w: 1280, h: 853 },
  { src: "/photos/court/crew.webp", alt: "Six players posing under the hoop on an outdoor court at night.", w: 1600, h: 1200 },
  { src: "/photos/court/aim.webp", alt: "Abdullah lining up a shot with the ball raised.", w: 1280, h: 853 },
];

const cups = [
  { src: "/photos/coffee/fern.webp", alt: "A latte with a rosetta poured into it, seen from above on a marble table.", w: 1200, h: 1355 },
  { src: "/photos/coffee/heart.webp", alt: "A latte with a layered heart.", w: 1200, h: 1324 },
  { src: "/photos/coffee/tulip.webp", alt: "A latte with a tulip.", w: 1200, h: 1600 },
  { src: "/photos/coffee/rosetta.webp", alt: "A latte with a fine-leafed rosetta.", w: 720, h: 1280 },
];

/**
 * Life off the clock. The section pins and scrolling walks through the
 * four quests one at a time; the art inside each one is driven by the
 * same scroll, so the coffee pours and the runner runs as you go.
 */
export function SideQuests() {
  return (
    <Act id="side-quests" span={9} className="sq-act" labelledBy="sq-heading" style={{ "--region": "#f08a4b" } as React.CSSProperties}>
      <Stage />
    </Act>
  );
}

function Stage() {
  const root = useRef<HTMLDivElement>(null);
  const km = useRef<HTMLSpanElement>(null);
  const scroll = useScroll();

  useActProgress((p) => {
    const el = root.current;
    if (!el) return;
    quests.forEach((q, i) => {
      const panel = el.querySelector<HTMLElement>(`[data-panel="${q.id}"]`);
      const tab = el.querySelector<HTMLElement>(`[data-tab="${q.id}"]`);
      if (!panel || !tab) return;
      const first = i === 0;
      const last = i === quests.length - 1;
      const o = (first ? 1 : ramp(p, q.from, q.from + 0.025)) * (last ? 1 : 1 - ramp(p, q.to - 0.025, q.to));
      // Progress inside this quest's own stretch, for its art.
      const local = Math.max(0, Math.min(1, (p - q.from) / (q.to - q.from)));
      panel.style.opacity = o.toFixed(3);
      panel.style.visibility = o < 0.02 ? "hidden" : "visible";
      panel.style.setProperty("--q", local.toFixed(4));
      if (o < 0.02) panel.setAttribute("inert", "");
      else panel.removeAttribute("inert");
      const active = p >= q.from && (p < q.to || last);
      tab.dataset.active = String(active);
      tab.style.setProperty("--fill", local.toFixed(3));
      if (q.id === "running" && km.current) km.current.textContent = (ramp(local, 0.05, 0.9) * 21.1).toFixed(1);
    });
  });

  const jump = (from: number) => {
    const act = root.current?.closest<HTMLElement>(".act");
    if (!act) return;
    const top = act.getBoundingClientRect().top + window.scrollY;
    const travel = act.offsetHeight - window.innerHeight;
    scroll.scrollTo(top + travel * (from + 0.03));
  };

  return (
    <div ref={root} className="sq-stage wrap">
      <div className="sq-side">
        <h2 id="sq-heading" className="display-caps sq-heading">
          Side quests
        </h2>
        <p className="sq-sub">Away from work, this is who I am.</p>
        <ol className="sq-list">
          {quests.map((q) => (
            <li key={q.id}>
              <button type="button" className="sq-tab" data-tab={q.id} data-active={q.id === "basketball"} onClick={() => jump(q.from)}>
                <span className="sq-tab-name">{q.name}</span>
                <span className="sq-tab-line">{q.line}</span>
                <span className="sq-tab-fill" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="sq-panels">
        <article className="sq-panel" data-panel="basketball">
          <div className="sq-text">
            <h3 className="display h-section">Pickup basketball</h3>
            <p className="body">
              I play regularly, mostly pickup games on weekends. It is my favourite way to stay active, and I make time
              for it whenever I can.
            </p>
          </div>
          <div className="sq-court">
            {court.map((s) => (
              <div key={s.src} className="sq-shot">
                <Image src={s.src} alt={s.alt} width={s.w} height={s.h} sizes="(min-width: 900px) 30vw, 46vw" />
              </div>
            ))}
          </div>
        </article>

        <article className="sq-panel" data-panel="coffee">
          <div className="sq-text">
            <h3 className="display h-section">Coffee, made properly</h3>
            <p className="body">
              I make my own coffee and post the results. Mostly rosettas so far. I am still working on a clean tulip.
            </p>
            <a className="btn btn-ghost" href="https://instagram.com/ground_pourfection" target="_blank" rel="noreferrer">
              @ground_pourfection <ExternalGlyph />
            </a>
          </div>
          <div className="sq-coffee">
            <LattePour />
            <div className="sq-cups">
              {cups.map((s, i) => (
                <div key={s.src} className="sq-shot sq-cup" style={{ "--i": i } as React.CSSProperties}>
                  <Image src={s.src} alt={s.alt} width={s.w} height={s.h} sizes="(min-width: 900px) 14vw, 22vw" />
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="sq-panel sq-panel-games" data-panel="games">
          <div className="sq-text">
            <h3 className="display h-section">Story-driven games</h3>
            <p className="body">
              Gaming has been a constant since I was a kid. I am drawn to games with a real narrative: less about
              winning, more about living through a story and seeing where it goes. Which is also why this site works
              the way it does.
            </p>
          </div>
          <GameScenes />
        </article>

        <article className="sq-panel" data-panel="running">
          <div className="sq-text">
            <h3 className="display h-section">Half marathon</h3>
            <p className="body">
              Running is the other constant alongside basketball. This one has a race date attached, November 2026, so
              the training is more structured than usual.
            </p>
            <p className="sq-km tnum">
              <span ref={km} className="display">
                0.0
              </span>{" "}
              of 21.1 km
            </p>
          </div>
          <RunTrack />
        </article>
      </div>
    </div>
  );
}
