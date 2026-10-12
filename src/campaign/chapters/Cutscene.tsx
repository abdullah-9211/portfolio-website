"use client";

import { useRef } from "react";
import { Act, useActProgress, ramp } from "@/campaign/scroll/Act";
import { Cue } from "@/campaign/scroll/Cue";
import { awardTrophy } from "@/campaign/ui/TrophyTrigger";

/**
 * The one cutscene. The frame letterboxes, the page goes quiet, and the
 * acquisition lands as a gold banner. Everything before and after it is
 * kept calmer so this is the moment the page is remembered for.
 */
export function Cutscene() {
  return (
    <Act id="cutscene-acquisition" span={6} className="cutscene" labelledBy="cutscene-heading">
      <CutsceneStage />
    </Act>
  );
}

function CutsceneStage() {
  const ref = useRef<HTMLDivElement>(null);
  const awarded = useRef(false);

  useActProgress((p, life) => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--bars", (ramp(life, 0.1, 0.22) * (1 - ramp(p, 0.93, 1))).toFixed(3));
    el.style.setProperty("--hit", ramp(p, 0.3, 0.42).toFixed(3));
    el.style.setProperty("--glow", (ramp(p, 0.3, 0.5) * (1 - ramp(p, 0.86, 1) * 0.6)).toFixed(3));
    el.style.setProperty("--ring", ramp(p, 0.3, 0.95).toFixed(3));
    if (p > 0.4 && !awarded.current) {
      awarded.current = true;
      awardTrophy("acquired");
    }
  });

  return (
    <div ref={ref} className="cutscene-stage">
      <div className="cutscene-glow" aria-hidden="true" />
      <svg className="cutscene-rings" viewBox="-500 -500 1000 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <circle key={i} r={70 * i} style={{ "--i": i } as React.CSSProperties} />
        ))}
      </svg>

      <div className="cutscene-body">
        <Cue from={-1} to={0.3} rampOut={0.06} className="cutscene-cue">
          <p className="cutscene-date tnum">December 2025</p>
          <p className="display cutscene-quiet">Then the map changed under my feet.</p>
        </Cue>

        <Cue from={0.3} to={0.7} rampIn={0.05} rampOut={0.05} rise={0} className="cutscene-cue cutscene-main">
          <h2 id="cutscene-heading" className="cutscene-heading">
            <span className="cutscene-amount display tnum">$1.725B</span>
            <span className="banner cutscene-banner">
              <span>Veeam acquires Securiti</span>
            </span>
          </h2>
        </Cue>

        <Cue from={0.71} to={1} rampIn={0.05} rampOut={0.05} className="cutscene-cue">
          <blockquote className="cutscene-quote display">
            &ldquo;The industry&rsquo;s first trusted data platform for accelerating safe AI at scale.&rdquo;
          </blockquote>
          <p className="body cutscene-after">
            Veeam&rsquo;s data resilience platform, combined with Securiti&rsquo;s data security, governance and AI
            trust. My team and our codebase carried straight through. It wasn&rsquo;t a job change. It was the same
            work under a new name.
          </p>
        </Cue>
      </div>

      <div className="cutscene-bar cutscene-bar-top" aria-hidden="true" />
      <div className="cutscene-bar cutscene-bar-bottom" aria-hidden="true" />
    </div>
  );
}
