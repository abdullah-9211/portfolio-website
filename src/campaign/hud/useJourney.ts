"use client";

import { useEffect, useRef } from "react";
import { mainRoute, regionById, stops, type RegionId } from "@/data/campaign";
import { journey } from "@/campaign/state/journey";
import { mainRouteGeometry, sideRouteGeometry } from "@/campaign/map/terrain";
import { useScroll } from "@/campaign/scroll/ScrollProvider";
import { campaign } from "@/campaign/state/store";
import { sfx } from "@/campaign/audio/sfx";

export type JourneyFrame = {
  /** Index into `stops` of the stop the reader is in, or -1 before the first. */
  stop: number;
  /** Position on the map, interpolated between the regions on either side. */
  x: number;
  y: number;
  /** Heading in degrees, for the minimap arrow. */
  heading: number;
};

const regionStops = stops.filter((s) => s.region);

/**
 * Follows the reader through the page: which stop they are in, where that
 * puts them on the map, and which regions that discovers.
 */
export function useJourney(onFrame: (f: JourneyFrame) => void) {
  const scroll = useScroll();
  const latest = useRef(onFrame);
  useEffect(() => {
    latest.current = onFrame;
  });

  useEffect(() => {
    let tops: number[] = [];
    let regionTops: number[] = [];
    // Where, in the same terms as the reading line, the marker leaves each checkpoint.
    let regionLeaves: number[] = [];
    let docHeight = -1;
    let measuredVh = -1;
    let lastStop = -2;

    const measure = () => {
      const y = window.scrollY;
      const top = (anchor: string) => {
        const el = document.getElementById(anchor);
        return el ? el.getBoundingClientRect().top + y : Infinity;
      };
      tops = stops.map((s) => top(s.anchor));
      regionTops = regionStops.map((s) => top(s.anchor));
      // A checkpoint that opens with a pinned scene holds the marker until that scene has played
      // out. Otherwise the marker would already be on its way while the place is still on screen.
      const vh = window.innerHeight;
      regionLeaves = regionStops.map((s, k) => {
        const el = document.getElementById(s.anchor);
        const pinned = el?.classList.contains("act") ? Math.max(0, el.offsetHeight - vh) : 0;
        return regionTops[k] + vh * 0.5 + pinned;
      });
      docHeight = document.documentElement.scrollHeight;
      measuredVh = vh;
    };

    return scroll.subscribe((y, vh) => {
      if (document.documentElement.scrollHeight !== docHeight || vh !== measuredVh) measure();
      const line = y + vh * 0.5;

      let stop = -1;
      for (let i = 0; i < tops.length; i++) if (tops[i] <= line) stop = i;

      if (stop !== lastStop) {
        lastStop = stop;
        const region: RegionId | null = stop >= 0 ? (stops[stop].region ?? null) : null;
        // A stop without its own region (the inventory) keeps the last region current.
        if (region || stop < 1) campaign.setRegion(region);
        if (region) {
          const r = regionById[region];
          if (campaign.discover(region, r.name, r.note)) sfx.discover();
        }
      }

      // Map position. Between two regions on the main route the reader moves along the drawn
      // curve. It arrives at a checkpoint at the moment that place is discovered, and stays there
      // while its opening scene is on screen.
      let i = -1;
      for (let k = 0; k < regionTops.length; k++) if (regionTops[k] <= line) i = k;
      const here = regionStops[Math.max(i, 0)].region as RegionId;
      const next = regionStops[Math.min(i + 1, regionStops.length - 1)].region as RegionId;
      let t = 0;
      if (i >= 0 && i < regionTops.length - 1) {
        const leave = Math.min(regionLeaves[i], regionTops[i + 1] - vh * 0.25);
        const linear = Math.min(1, Math.max(0, (line - leave) / (regionTops[i + 1] - leave)));
        // Ease out of one checkpoint and into the next, so the marker settles on each.
        t = linear * linear * (3 - 2 * linear);
      }
      const route = mainRouteGeometry();
      const a = mainRoute.indexOf(here);
      const b = mainRoute.indexOf(next);
      let mx: number;
      let my: number;
      let heading: number;
      if (a >= 0 && b >= 0) {
        const length = route.regionLength[a] + (route.regionLength[b] - route.regionLength[a]) * t;
        const p = route.pointAt(length);
        const ahead = route.pointAt(Math.min(route.total, length + 6));
        const behind = route.pointAt(Math.max(0, length - 6));
        mx = p.x;
        my = p.y;
        heading = (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI;
        journey.reach(length);
      } else {
        // The detour to base camp has its own drawn trail: out from The Forge, back to the end of the map.
        const side = sideRouteGeometry();
        const leg = next === "camp" ? side.out : side.back;
        const length = leg.total * t;
        const p = leg.pointAt(length);
        const ahead = leg.pointAt(Math.min(leg.total, length + 6));
        const behind = leg.pointAt(Math.max(0, length - 6));
        mx = p.x;
        my = p.y;
        heading = (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI;
        // The side trip happens after The Forge, so the main line is walked at least that far.
        journey.reach(route.regionLength[mainRoute.indexOf("forge")]);
        if (next === "next" && t > 0.98) journey.reach(route.total);
      }
      latest.current({ stop, x: mx, y: my, heading });
    });
  }, [scroll]);
}
