"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore, type MouseEvent } from "react";
import { mainRoute, regions, type RegionId } from "@/data/campaign";
import { useCampaign } from "@/campaign/state/store";
import { journey } from "@/campaign/state/journey";
import { MAIN_ROUTE_D, MAP_H, MAP_W, SIDE_BACK_D, SIDE_OUT_D, mainRouteGeometry, terrainUrl } from "./terrain";

type WorldMapProps = {
  /** Called when a marker is chosen. Without it the markers are plain links. */
  onTravel?: (id: RegionId) => void;
  /** Draw the planned route up to this fraction (0 to 1). Defaults to all of it. */
  reveal?: number;
  className?: string;
  /** Hide labels, for the minimap. */
  compact?: boolean;
  title?: string;
};

const noSubscription = () => () => {};

/**
 * The map of the story. Regions are markers on procedural terrain, joined
 * by the route. Ember markers are still ahead, rune markers have been
 * visited, and the walked part of the route is drawn solid.
 */
export function WorldMap({ onTravel, reveal = 1, className, compact, title }: WorldMapProps) {
  const discovered = useCampaign((s) => s.discovered);
  const current = useCampaign((s) => s.region);
  // Drawn in the browser, so the server render has no terrain.
  const terrain = useSyncExternalStore(noSubscription, terrainUrl, () => "");
  const walkedRef = useRef<SVGPathElement>(null);

  // How far along the main route the reader has got: the furthest discovered region.
  const furthest = useMemo(() => {
    let idx = -1;
    mainRoute.forEach((id, i) => {
      if (discovered.includes(id)) idx = i;
    });
    return idx;
  }, [discovered]);

  // The walked line follows the reader live, and never falls behind a saved discovery.
  useEffect(() => {
    const path = walkedRef.current;
    if (!path) return;
    const route = mainRouteGeometry();
    const apply = () => {
      const saved = furthest > 0 ? route.regionLength[furthest] : 0;
      const length = Math.max(saved, journey.get());
      path.style.strokeDasharray = `${length.toFixed(1)} ${route.total + 10}`;
      path.style.opacity = length > 1 ? "1" : "0";
    };
    apply();
    return journey.subscribe(apply);
  }, [furthest]);

  const handle = (id: RegionId) => (e: MouseEvent) => {
    if (!onTravel) return;
    e.preventDefault();
    onTravel(id);
  };

  return (
    <svg
      className={`world-map ${compact ? "world-map-compact" : ""} ${className ?? ""}`}
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      role={compact ? "img" : "group"}
      aria-label={title ?? "Map of the story"}
    >
      <defs>
        <radialGradient id="map-fog" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#0b1626" stopOpacity="0.96" />
          <stop offset="0.6" stopColor="#0b1626" stopOpacity="0.7" />
          <stop offset="1" stopColor="#0b1626" stopOpacity="0" />
        </radialGradient>
      </defs>

      {terrain && <image href={terrain} width={MAP_W} height={MAP_H} aria-hidden="true" />}

      {/* Planned route, then the part already walked on top of it. */}
      <path
        className="map-route-planned"
        d={MAIN_ROUTE_D}
        pathLength={1}
        style={{ strokeDasharray: "0.012 0.012", strokeDashoffset: 0, opacity: reveal }}
      />
      <path className="map-route-side" d={SIDE_OUT_D} style={{ opacity: reveal }} />
      <path className="map-route-side" d={SIDE_BACK_D} style={{ opacity: reveal }} />
      <path
        ref={walkedRef}
        className="map-route-walked"
        d={MAIN_ROUTE_D}
        style={{ opacity: 0 }}
      />

      {/* What lies past the last marker is not mapped yet. */}
      {!discovered.includes("next") && (
        <ellipse cx={690} cy={40} rx={330} ry={150} fill="url(#map-fog)" aria-hidden="true" />
      )}

      {regions.map((r, i) => {
        const found = discovered.includes(r.id);
        const here = current === r.id;
        const shown = reveal >= Math.min(0.95, (i + 1) / (regions.length + 1));
        const dir = r.labelSide === "right" ? 1 : -1;
        return (
          <a
            key={r.id}
            href={`#${r.anchor}`}
            onClick={handle(r.id)}
            className="map-marker"
            data-found={found}
            data-here={here}
            data-shown={shown}
            style={{ "--tint": r.tint } as React.CSSProperties}
            aria-label={`${r.name}. ${r.note}. ${found ? "Visited" : "Not visited yet"}.`}
            aria-current={here ? "location" : undefined}
            tabIndex={compact ? -1 : 0}
          >
            <g transform={`translate(${r.x} ${r.y})`}>
              <circle className="map-marker-hit" r={44} />
              {here && <circle className="map-marker-pulse" r={30} />}
              <circle className="map-marker-ring" r={17} />
              <path className="map-marker-core" d="M0 -9 L9 0 L0 9 L-9 0Z" />
              {!compact && (
                <g className="map-marker-label" transform={`translate(${dir * 30} 0)`}>
                  <text className="map-marker-name" textAnchor={dir === 1 ? "start" : "end"} y={-3}>
                    {r.numeral ? `${r.numeral}  ` : ""}
                    {r.name}
                  </text>
                  <text className="map-marker-note" textAnchor={dir === 1 ? "start" : "end"} y={19}>
                    {r.note}
                  </text>
                </g>
              )}
            </g>
          </a>
        );
      })}
    </svg>
  );
}
