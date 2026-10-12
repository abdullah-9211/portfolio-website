"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { GameCard, GameFrame } from "@/campaign/games/GameFrame";
import { awardTrophy } from "@/campaign/ui/TrophyTrigger";
import { useReducedMotion } from "@/components/primitives/ReducedMotionProvider";
import { sfx } from "@/campaign/audio/sfx";
import {
  advance,
  apply,
  BASE_INCOME,
  DRIFT,
  ENDINGS,
  events,
  failure,
  START,
  START_COINS,
  START_YEAR,
  YEARS_PER_TURN,
  type Cause,
  type Option,
  type Stats,
} from "./events";

const Globe = dynamic(() => import("./Globe"), { ssr: false });

type Phase = "idle" | "choosing" | "news" | "won" | "lost";

type State = {
  phase: Phase;
  turn: number;
  stats: Stats;
  trend: Stats;
  coins: number;
  income: number;
  news: string;
  cause: Cause | null;
  choices: number[];
};

type Event = { type: "start" } | { type: "choose"; index: number } | { type: "continue" };

const initial: State = {
  phase: "idle",
  turn: 0,
  stats: START,
  trend: DRIFT,
  coins: START_COINS,
  income: BASE_INCOME,
  news: "",
  cause: null,
  choices: [],
};

function reduce(s: State, e: Event): State {
  switch (e.type) {
    case "start":
      return { ...initial, phase: "choosing" };
    case "choose": {
      if (s.phase !== "choosing") return s;
      const option: Option = events[s.turn].options[e.index];
      if (option.cost > s.coins) return s;
      const trend: Stats = {
        heat: s.trend.heat + (option.trend?.heat ?? 0),
        sea: s.trend.sea + (option.trend?.sea ?? 0),
        bio: s.trend.bio + (option.trend?.bio ?? 0),
        well: s.trend.well + (option.trend?.well ?? 0),
      };
      return {
        ...s,
        phase: "news",
        stats: apply(s.stats, option.now),
        trend,
        coins: s.coins - option.cost,
        income: s.income + (option.income ?? 0),
        news: option.result,
        choices: [...s.choices, e.index],
      };
    }
    case "continue": {
      if (s.phase !== "news") return s;
      // Time passes between decisions.
      const stats = advance(s.stats, s.trend);
      const cause = failure(stats);
      if (cause) return { ...s, phase: "lost", stats, cause, turn: s.turn + 1 };
      if (s.turn + 1 >= events.length) return { ...s, phase: "won", stats, turn: s.turn + 1 };
      const income = Math.round(s.income * (0.6 + (stats.well / 100) * 0.6));
      return { ...s, phase: "choosing", stats, coins: s.coins + income, turn: s.turn + 1 };
    }
  }
}

const gauges: { key: keyof Stats; label: string; bad: "high" | "low" }[] = [
  { key: "heat", label: "Warming", bad: "high" },
  { key: "sea", label: "Sea level", bad: "high" },
  { key: "bio", label: "Biodiversity", bad: "low" },
  { key: "well", label: "Wellbeing", bad: "low" },
];

const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);

function effectText(o: Option): string {
  const parts: string[] = [];
  const name: Record<keyof Stats, string> = { heat: "warming", sea: "sea level", bio: "biodiversity", well: "wellbeing" };
  (Object.keys(name) as (keyof Stats)[]).forEach((k) => {
    const now = o.now?.[k];
    const trend = o.trend?.[k];
    if (now) parts.push(`${name[k]} ${fmt(now)}`);
    if (trend) parts.push(`${name[k]} ${fmt(trend)} every turn`);
  });
  if (o.income) parts.push(`income ${fmt(o.income)} every turn`);
  return parts.length ? parts.join(", ") : "no change";
}

/**
 * What On Earth, rebuilt. Ten decisions between now and 2100, each with a
 * price, on a planet that visibly reacts. The original was an Android game
 * built at FAST in 2022.
 */
export function EarthGame() {
  const [s, dispatch] = useReducer(reduce, initial);
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);
  // What the visitor has turned the globe to, when they have.
  const [facing, setFacing] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const year = Math.min(2100, START_YEAR + s.turn * YEARS_PER_TURN);
  const event = events[Math.min(s.turn, events.length - 1)];
  const playing = s.phase === "choosing" || s.phase === "news";

  useEffect(() => {
    if (s.phase === "won") {
      awardTrophy("game-earth");
      sfx.trophy();
    } else if (s.phase === "lost") sfx.bad();
  }, [s.phase]);

  // Keep keyboard focus on the card as it changes, so the game can be played without a pointer.
  useEffect(() => {
    if (!playing) return;
    cardRef.current?.querySelector<HTMLElement>("button:not([disabled])")?.focus({ preventScroll: true });
  }, [playing, s.phase, s.turn]);

  return (
    <GameFrame
      id="game-earth"
      numeral="I"
      title="What On Earth"
      active={playing}
      onVisible={setVisible}
      basedOn="A remake of my 2022 Android game: every choice moves the planet's numbers, until it is uninhabitable or you reach 2100."
      stats={
        s.phase !== "idle" ? (
          <>
            <span>Year {s.phase === "won" ? 2100 : year}</span>
            <span className="we-coins">
              <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M10 5.5v9M7.5 8h3.4a1.6 1.6 0 0 1 0 3.2H7.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              {s.coins}
            </span>
          </>
        ) : null
      }
    >
      <div className="we" data-phase={s.phase}>
        <div className="we-globe" aria-hidden="true">
          <div className="we-glow" data-heat={s.stats.heat > 66 ? "hot" : s.stats.heat > 45 ? "warm" : "cool"} />
          {visible && <Globe stats={s.stats} focus={playing ? event.region : null} animate={!reduced} onFacing={setFacing} />}
          {playing && <p className="we-place">{facing ?? event.place}</p>}
        </div>

        <div className="we-panel">
          <dl className="we-gauges">
            {gauges.map((g) => {
              const v = s.stats[g.key];
              const danger = g.bad === "high" ? v >= 75 : v <= 25;
              const trend = s.trend[g.key];
              const worsening = g.bad === "high" ? trend > 0.05 : trend < -0.05;
              return (
                <div key={g.key} data-danger={danger}>
                  <dt>
                    {g.label}
                    <span className="we-trend" data-worse={worsening}>
                      {Math.abs(trend) < 0.05 ? "steady" : `${fmt(Math.round(trend * 10) / 10)} a turn`}
                    </span>
                  </dt>
                  <dd>
                    <span className="we-bar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} aria-label={`${g.label}${danger ? ", critical" : ""}`}>
                      <span style={{ transform: `scaleX(${(v / 100).toFixed(3)})` }} data-bad={g.bad} />
                    </span>
                    <span className="tnum we-val">{Math.round(v)}</span>
                  </dd>
                </div>
              );
            })}
          </dl>

          {playing && (
            <div className="we-card" ref={cardRef} key={`${s.turn}-${s.phase}`}>
              {s.phase === "choosing" ? (
                <>
                  <p className="we-turn tnum">
                    Decision {s.turn + 1} of {events.length}
                  </p>
                  <h4 className="display we-title">{event.title}</h4>
                  <p className="we-text">{event.text}</p>
                  <ul className="we-options">
                    {event.options.map((o, i) => {
                      const broke = o.cost > s.coins;
                      return (
                        <li key={o.label}>
                          <button type="button" className="we-option" disabled={broke} onClick={() => dispatch({ type: "choose", index: i })}>
                            <span className="we-option-label">{o.label}</span>
                            <span className="we-option-cost tnum" data-kind={o.cost > 0 ? "cost" : o.cost < 0 ? "gain" : "free"}>
                              {o.cost > 0 ? `${o.cost} coins` : o.cost < 0 ? `+${-o.cost} coins` : "Free"}
                            </span>
                            <span className="we-option-effect">{broke ? "You cannot afford this." : effectText(o)}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <>
                  <p className="we-turn tnum">{year}</p>
                  <p className="display we-news" role="status">
                    {s.news}
                  </p>
                  <button type="button" className="btn btn-primary" onClick={() => dispatch({ type: "continue" })}>
                    {s.turn + 1 >= events.length ? "See 2100" : `On to ${year + YEARS_PER_TURN}`}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {s.phase === "idle" && (
          <GameCard
            title="Your brief"
            hint="Click a choice, or Tab to it and press Enter. Drag the globe to turn it."
            actions={
              <button type="button" className="btn btn-primary" onClick={() => dispatch({ type: "start" })}>
                Take charge
              </button>
            }
          >
            <p>
              It is {START_YEAR} and the planet is yours to run. Ten decisions stand between now and 2100. Good ones
              cost money, bad ones pay, and time keeps passing either way. Keep all four gauges out of the red.
            </p>
          </GameCard>
        )}

        {(s.phase === "won" || s.phase === "lost") && (
          <GameCard
            title={s.phase === "won" ? "2100. Still here." : `Uninhabitable by ${year}`}
            tone={s.phase === "won" ? "win" : "lose"}
            actions={
              <button type="button" className="btn btn-primary" onClick={() => dispatch({ type: "start" })}>
                Try again
              </button>
            }
          >
            <p>
              {s.phase === "won"
                ? "You got the planet to the end of the century in one piece. In the original, the game only ever ended one way."
                : ENDINGS[s.cause ?? "heat"]}
            </p>
            <dl className="game-report">
              {gauges.map((g) => (
                <div key={g.key}>
                  <dt>{g.label}</dt>
                  <dd>{Math.round(s.stats[g.key])}</dd>
                </div>
              ))}
              <div>
                <dt>Decisions made</dt>
                <dd>{s.choices.length}</dd>
              </div>
              <div>
                <dt>Coins left</dt>
                <dd>{s.coins}</dd>
              </div>
            </dl>
          </GameCard>
        )}
      </div>
    </GameFrame>
  );
}
