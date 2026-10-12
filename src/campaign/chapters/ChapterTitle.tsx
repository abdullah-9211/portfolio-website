"use client";

import { useRef, type CSSProperties } from "react";
import { Act, useActProgress, ramp } from "@/campaign/scroll/Act";
import { ContourField } from "@/campaign/ui/ContourField";
import { regionById, type RegionId } from "@/data/campaign";

type ChapterTitleProps = {
  region: RegionId;
  /** Where this is, shown under the name. */
  place: string;
  /** One sentence that sets up the chapter. */
  lede: string;
  seed: number;
};

/**
 * The card that opens a chapter, the way a game names a region when you
 * first walk into it: the name, a rule, and where and when.
 */
export function ChapterTitle({ region, place, lede, seed }: ChapterTitleProps) {
  const r = regionById[region];
  return (
    <Act
      id={r.anchor}
      span={2.6}
      className="ctitle"
      labelledBy={`${r.anchor}-name`}
      style={{ "--region": r.tint } as CSSProperties}
    >
      <TitleStage region={region} place={place} lede={lede} seed={seed} />
    </Act>
  );
}

function TitleStage({ region, place, lede, seed }: ChapterTitleProps) {
  const r = regionById[region];
  const ref = useRef<HTMLDivElement>(null);

  useActProgress((p, life) => {
    const el = ref.current;
    if (!el) return;
    // Arrive while sliding in, hold through the pin, then recede.
    el.style.setProperty("--in", ramp(life, 0.14, 0.3).toFixed(3));
    el.style.setProperty("--out", ramp(p, 0.82, 1).toFixed(3));
  });

  return (
    <div ref={ref} className="ctitle-stage">
      <ContourField
        seed={seed}
        color={r.tint}
        alpha={0.2}
        className="ctitle-field"
        hills={[{ x: 0.5, y: 0.52, radius: 0.22, height: 0.9 }]}
      />
      <div className="ctitle-inner wrap">
        {r.numeral && (
          <p className="ctitle-numeral display" aria-hidden="true">
            {r.numeral}
          </p>
        )}
        <p className="ctitle-kicker">{r.numeral ? `Chapter ${r.numeral}` : r.note}</p>
        <h2 id={`${r.anchor}-name`} className="ctitle-name display-caps">
          {r.name}
        </h2>
        <span className="ctitle-rule" aria-hidden="true" />
        <p className="ctitle-place">
          {place}
          <span aria-hidden="true"> / </span>
          <span className="tnum">{r.years}</span>
        </p>
        <p className="ctitle-lede">{lede}</p>
      </div>
    </div>
  );
}
