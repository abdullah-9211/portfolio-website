"use client";

import { useState } from "react";
import { Act, useActProgress, ramp } from "@/campaign/scroll/Act";
import { Cue } from "@/campaign/scroll/Cue";
import { useScroll } from "@/campaign/scroll/ScrollProvider";
import { regionById, type RegionId } from "@/data/campaign";
import { WorldMap } from "./WorldMap";

/** The map, introduced. The route draws itself while the copy says who this is. */
export function MapAct() {
  return (
    <Act id="world-map" span={3.4} className="mapact" labelledBy="mapact-heading">
      <MapStage />
    </Act>
  );
}

function MapStage() {
  const scroll = useScroll();
  const [reveal, setReveal] = useState(0);

  useActProgress((p, life) => {
    // Start drawing as the stage slides in, so it never arrives empty.
    const r = Math.round(Math.max(ramp(life, 0.12, 0.34) * 0.3, ramp(p, 0, 0.5)) * 40) / 40;
    setReveal((prev) => (prev === r ? prev : r));
  });

  return (
    <div className="mapact-stage wrap">
      <div className="mapact-copy">
        <Cue from={-1} to={0.5} rampOut={0.05} className="mapact-cue">
          <h2 id="mapact-heading" className="display mapact-heading">
            I&rsquo;m a software engineer who ended up running a company.
          </h2>
          <p className="body">
            At Veeam I build the systems that decide who gets to touch what data: access policy, audit trails,
            threat detection. At Valkrix, the AI product company I co-founded with two friends, I run operations as
            COO.
          </p>
        </Cue>
        <Cue from={0.51} rampIn={0.05} className="mapact-cue">
          <p className="display mapact-heading">This is the route so far.</p>
          <p className="body">
            Four chapters, one very large acquisition, and three games you can actually play, each built on real
            work. Scroll to walk it in order, or pick any marker to jump there.
          </p>
          <p className="mapact-hint">
            <span className="legend-dot legend-ahead" /> Ahead
            <span className="legend-dot legend-found" /> Visited
          </p>
        </Cue>
      </div>
      <div className="mapact-map">
        <WorldMap reveal={reveal} onTravel={(id: RegionId) => scroll.scrollTo(regionById[id].anchor)} />
      </div>
    </div>
  );
}
