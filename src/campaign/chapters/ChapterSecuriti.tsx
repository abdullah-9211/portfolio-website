"use client";

import { useRef, type CSSProperties } from "react";
import { ChapterTitle } from "./ChapterTitle";
import { Act, useActProgress, ramp } from "@/campaign/scroll/Act";
import { Cue } from "@/campaign/scroll/Cue";
import { awardTrophy, TrophyTrigger } from "@/campaign/ui/TrophyTrigger";
import { GatekeeperGame } from "@/campaign/games/gatekeeper/GatekeeperGame";

/** Systems the access-control work reached, in the order it reached them. */
const systems = [
  { name: "SharePoint", x: 150, y: 120, phase: 0 },
  { name: "Databricks", x: 100, y: 300, phase: 0 },
  { name: "Snowflake", x: 150, y: 480, phase: 0 },
  { name: "Apache Trino", x: 650, y: 120, phase: 1 },
  { name: "Presto", x: 700, y: 300, phase: 1 },
  { name: "Starburst", x: 650, y: 480, phase: 1 },
];
const CORE = { x: 400, y: 300 };

export function ChapterSecuriti() {
  return (
    <>
      <ChapterTitle
        region="securiti"
        place="Islamabad"
        seed={19}
        lede="The job: deciding who gets to touch what data."
      />
      <div className="chapter chapter-flush" style={{ "--region": "#5fd4e6" } as CSSProperties}>
        <Act span={5.4} className="policy" labelledBy="securiti-work">
          <PolicyStage />
        </Act>
        <section className="wrap project" aria-labelledby="gatekeeper-intro">
          <div className="game-intro">
            <h3 id="gatekeeper-intro" className="display h-section">
              Now you do it.
            </h3>
            <p className="body">
              Access control sounds dry until you are the one deciding. Requests come in, the policy keeps changing,
              and one wrong &ldquo;allow&rdquo; is a breach.
            </p>
          </div>
          <GatekeeperGame />
        </section>
      </div>
    </>
  );
}

function PolicyStage() {
  const svg = useRef<SVGSVGElement>(null);
  const promoted = useRef(false);

  useActProgress((p) => {
    const el = svg.current;
    if (!el) return;
    el.style.setProperty("--a", ramp(p, 0.04, 0.3).toFixed(3));
    el.style.setProperty("--b", ramp(p, 0.66, 0.86).toFixed(3));
    el.style.setProperty("--lvl", ramp(p, 0.46, 0.54).toFixed(3));
    if (p > 0.5 && !promoted.current) {
      promoted.current = true;
      awardTrophy("promoted");
    }
  });

  return (
    <div className="policy-stage wrap">
      <div className="policy-copy">
        <h3 id="securiti-work" className="sr-only">
          What I did at Securiti.ai
        </h3>
        <Cue from={-1} to={0.22} rampOut={0.04} className="policy-cue">
          <p className="policy-date tnum">June 2024</p>
          <p className="display policy-line">Associate Software Development Engineer.</p>
          <p className="body">Back end, Data Access Control Policy team.</p>
          <TrophyTrigger id="hired" />
        </Cue>
        <Cue from={0.23} to={0.45} rampIn={0.04} rampOut={0.04} className="policy-cue">
          <p className="display policy-line">Access governance across three systems.</p>
          <p className="body">
            I helped build and maintain data access governance across SharePoint, Databricks and Snowflake, then built
            backup and restore for Databricks and Snowflake access policies.
          </p>
        </Cue>
        <Cue from={0.46} to={0.66} rampIn={0.04} rampOut={0.04} className="policy-cue">
          <p className="policy-date tnum">July 2025</p>
          <p className="display policy-line">Promoted to Software Development Engineer.</p>
          <p className="body">Thirteen months in.</p>
        </Cue>
        <Cue from={0.67} to={1} rampIn={0.04} rampOut={0.05} className="policy-cue">
          <p className="display policy-line">Then, three more.</p>
          <p className="body">
            Access control for Ranger-based systems: Apache Trino, Presto and Starburst. With the Quarantine team, a
            faster flow of operations. And a rebuilt data labeling policy flow that cut processing time for customers.
          </p>
        </Cue>
      </div>

      <svg ref={svg} className="policy-diagram" viewBox="-70 20 940 560" role="img" aria-label="A policy engine in the centre connected to SharePoint, Databricks and Snowflake, then to Apache Trino, Presto and Starburst.">
        {systems.map((s) => (
          <line key={s.name} className="policy-link" data-phase={s.phase} x1={CORE.x} y1={CORE.y} x2={s.x} y2={s.y} pathLength={1} />
        ))}
        <g className="policy-core" transform={`translate(${CORE.x} ${CORE.y})`}>
          <circle className="policy-core-ring" r={86} />
          <circle className="policy-core-ring" r={62} />
          <path className="policy-core-mark" d="M0 -34 L34 0 L0 34 L-34 0Z" />
          <text className="policy-core-label" y={128} textAnchor="middle">
            Access policy
          </text>
        </g>
        <g className="policy-level" transform={`translate(${CORE.x} ${CORE.y})`}>
          <circle r={104} />
        </g>
        {systems.map((s) => (
          <g key={s.name} className="policy-node" data-phase={s.phase} transform={`translate(${s.x} ${s.y})`}>
            <circle r={13} />
            <text x={s.x < CORE.x ? -26 : 26} y={7} textAnchor={s.x < CORE.x ? "end" : "start"}>
              {s.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
