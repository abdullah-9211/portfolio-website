"use client";

import { useId, useState } from "react";
import clsx from "clsx";

/**
 * The "some space we can use" capstone for Projects — client ask: "In for
 * fun, I meant something animated and interactive below the data space as
 * well." Placed after the third row, where the section previously just
 * ended into empty vertical space before Stack begins.
 *
 * Rather than an unrelated decorative addition, this is a genuinely
 * playable miniature of What On Earth's actual mechanic, described above
 * in projects.ts: "every decision shifts biodiversity, population, and
 * currency, and the game keeps going until the planet doesn't." Four
 * decisions, three meters, real tension (no choice is free — every button
 * trades one meter for another) — a few seconds of actual play, not a
 * static callback. The three meter colors are the exact hex values
 * ProjectGlyph's "What On Earth" glyph already uses for the same three
 * bars (#4CAF6D / #E8B93B / #E24C4C), so this reads as that small glyph
 * zoomed in and made playable, not a new unrelated widget bolted on.
 *
 * No-JS: this is "use client" but every value it renders comes straight
 * from useState's initial value, which Next.js server-renders like any
 * other markup — a no-JS visitor sees the complete starting board (three
 * meters at their start heights, all four decisions with their real
 * effect text, the idle status line) exactly as a sensible resting state,
 * same safe-default-then-enhance convention as AccessConsole.tsx. Buttons
 * are real <button>s; without JS they simply don't respond to clicks,
 * same degrade-with-no-error as AccessConsole's request rows.
 *
 * Motion: the only animated property is the meter bar's CSS `height`
 * transition, fired by an explicit click (a discrete interaction, not
 * ambient/looping motion) — and the sitewide `prefers-reduced-motion`
 * rule in globals.css already forces every transition-duration to
 * ~0ms, so a reduced-motion visitor still gets the real, instant state
 * change with zero extra code needed here.
 */

type MeterKey = "biodiversity" | "population" | "currency";

type Meters = Record<MeterKey, number>;

type Choice = {
  id: string;
  label: string;
  delta: Meters;
  flavor: string;
};

const METER_LABELS: Record<MeterKey, string> = {
  biodiversity: "Biodiversity",
  population: "Population",
  currency: "Currency",
};

// Same three hex values as ProjectGlyph's earth-bar-a/b/c.
const METER_COLORS: Record<MeterKey, string> = {
  biodiversity: "#4CAF6D",
  population: "#E8B93B",
  currency: "#E24C4C",
};

const METER_ORDER: MeterKey[] = ["biodiversity", "population", "currency"];

// Currency starts lowest on purpose — the fragile meter, so the first
// couple of decisions already carry real weight instead of coasting.
const START_METERS: Meters = { biodiversity: 58, population: 52, currency: 40 };

const CHOICES: Choice[] = [
  {
    id: "mine",
    label: "Open a mine",
    delta: { biodiversity: -14, population: 4, currency: 16 },
    flavor: "The ledger looks great. The forest doesn't.",
  },
  {
    id: "reforest",
    label: "Reforest a region",
    delta: { biodiversity: 14, population: -2, currency: -10 },
    flavor: "Biodiversity climbs. The budget notices.",
  },
  {
    id: "ubi",
    label: "Universal basic income",
    delta: { biodiversity: 0, population: 12, currency: -12 },
    flavor: "People do better. The treasury does worse.",
  },
  {
    id: "subsidy",
    label: "Green energy subsidy",
    delta: { biodiversity: 8, population: 4, currency: -6 },
    flavor: "Nobody loses much on this one. Nobody gains much either.",
  },
];

function clamp(n: number) {
  return Math.max(0, Math.min(100, n));
}

function formatDelta(delta: Meters) {
  return METER_ORDER.filter((key) => delta[key] !== 0)
    .map((key) => {
      const value = delta[key];
      const sign = value > 0 ? "+" : "−";
      return `${METER_LABELS[key].toLowerCase()} ${sign}${Math.abs(value)}`;
    })
    .join(" · ");
}

export function EarthPlaytest() {
  const headingId = useId();
  const [meters, setMeters] = useState<Meters>(START_METERS);
  const [roundCount, setRoundCount] = useState(0);
  const [lastFlavor, setLastFlavor] = useState<string | null>(null);
  const [endedBy, setEndedBy] = useState<string | null>(null);

  function applyChoice(choice: Choice) {
    if (endedBy) return;

    const next: Meters = {
      biodiversity: clamp(meters.biodiversity + choice.delta.biodiversity),
      population: clamp(meters.population + choice.delta.population),
      currency: clamp(meters.currency + choice.delta.currency),
    };
    const zeroed = METER_ORDER.filter((key) => next[key] === 0);

    setMeters(next);
    setRoundCount((r) => r + 1);
    setLastFlavor(choice.flavor);
    if (zeroed.length > 0) {
      setEndedBy(zeroed.map((key) => METER_LABELS[key]).join(" and "));
    }
  }

  function reset() {
    setMeters(START_METERS);
    setRoundCount(0);
    setLastFlavor(null);
    setEndedBy(null);
  }

  const statusText = endedBy
    ? `The planet doesn't. ${endedBy} hit zero after ${roundCount} decision${
        roundCount === 1 ? "" : "s"
      }.`
    : (lastFlavor ?? "Pick a decision — see what it costs.");

  return (
    <div className="border-t border-line py-10 sm:py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-dim">
        playtest, not the app
      </p>
      <h3
        id={headingId}
        className="font-display mt-2 text-xl font-bold text-paper sm:text-2xl"
      >
        Keep the planet running
      </h3>
      <p className="mt-3 max-w-2xl leading-relaxed text-dim">
        What On Earth, shrunk to four buttons and the same three meters. Every
        decision trades one for another — same as the real game, this
        one keeps going until the planet doesn&rsquo;t.
      </p>

      <div role="group" aria-labelledby={headingId} className="mt-8">
        <div className="flex items-end justify-center gap-6 sm:gap-10">
          {METER_ORDER.map((key) => (
            <div key={key} className="flex flex-col items-center gap-2">
              <div className="relative h-24 w-8 overflow-hidden border border-line sm:h-28 sm:w-10">
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 w-full transition-[height] duration-500 ease-out"
                  style={{
                    height: `${meters[key]}%`,
                    backgroundColor: METER_COLORS[key],
                  }}
                />
              </div>
              <span className="font-mono text-[11px] uppercase tracking-wide text-dim">
                {METER_LABELS[key]}
              </span>
              <span className="font-mono text-xs text-paper">
                {meters[key]}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CHOICES.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => applyChoice(choice)}
              disabled={!!endedBy}
              className={clsx(
                "rounded-sm border border-line px-4 py-3 text-left transition-colors duration-300 ease-out",
                "hover:border-dim hover:bg-line/40",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2",
                "disabled:cursor-default disabled:opacity-50"
              )}
            >
              <span className="font-display block text-sm font-semibold text-paper">
                {choice.label}
              </span>
              <span className="mt-1 block font-mono text-[11px] text-dim">
                {formatDelta(choice.delta)}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p
            aria-live="polite"
            className="min-h-[1.5em] font-mono text-xs text-dim"
          >
            {statusText}
          </p>
          <button
            type="button"
            onClick={reset}
            className="font-mono text-xs text-dim underline decoration-dotted underline-offset-4 hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2"
          >
            reset
          </button>
        </div>
      </div>
    </div>
  );
}
