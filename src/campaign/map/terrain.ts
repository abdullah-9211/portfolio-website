"use client";

import { drawContours, type Hill } from "@/lib/contours";
import { mainRoute, regionById, regions } from "@/data/campaign";

export const MAP_W = 1000;
export const MAP_H = 1100;

/** Every region sits on its own rise, and the route climbs toward the summit. */
const hills: Hill[] = [
  ...regions.map((r) => ({
    x: r.x,
    y: r.y,
    radius: r.id === "next" ? 150 : 92,
    height: r.id === "next" ? 0.95 : 0.42 + (1 - r.y / MAP_H) * 0.3,
  })),
  { x: 120, y: 520, radius: 170, height: 0.36 },
  { x: 900, y: 930, radius: 150, height: 0.3 },
  { x: 880, y: 300, radius: 130, height: 0.34 },
];

let cached: string | null = null;

/** The world map's terrain as an image URL. Drawn once and reused everywhere. */
export function terrainUrl(): string {
  if (cached) return cached;
  const k = 1.6;
  const canvas = document.createElement("canvas");
  canvas.width = MAP_W * k;
  canvas.height = MAP_H * k;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.scale(k, k);
  drawContours(ctx, {
    width: MAP_W,
    height: MAP_H,
    seed: 11,
    scale: 300,
    levels: 26,
    cell: 6,
    hills,
    color: "#5fd4e6",
    alpha: 0.2,
    lineWidth: 0.9,
  });
  cached = canvas.toDataURL("image/png");
  return cached;
}

/** A smooth curve through the given points (Catmull-Rom converted to cubic Béziers). */
export function smoothPath(points: { x: number; y: number }[], tension = 0.5): string {
  if (points.length < 2) return "";
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + ((p2.x - p0.x) * tension) / 3;
    const c1y = p1.y + ((p2.y - p0.y) * tension) / 3;
    const c2x = p2.x - ((p3.x - p1.x) * tension) / 3;
    const c2y = p2.y - ((p3.y - p1.y) * tension) / 3;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x} ${p2.y}`;
  }
  return d;
}

const mainPoints = mainRoute.map((id) => regionById[id]);

/** The drawn routes. Everything that shows or follows the route uses these same curves. */
export const MAIN_ROUTE_D = smoothPath(mainPoints, 1);
/** The detour to base camp leaves from The Forge and rejoins at the end of the map. */
export const SIDE_OUT_D = smoothPath([regionById.forge, { x: 800, y: 380 }, regionById.camp], 1);
export const SIDE_BACK_D = smoothPath([regionById.camp, { x: 930, y: 360 }, regionById.next], 1);

type Measured = { total: number; pointAt: (length: number) => { x: number; y: number }; raw: SVGPathElement };

const measured = new Map<string, Measured>();

/** A path that can be asked for the point at a distance along it. */
function measure(d: string): Measured {
  const hit = measured.get(d);
  if (hit) return hit;
  let svg = document.getElementById("route-measure") as SVGSVGElement | null;
  if (!svg) {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = "route-measure";
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.setAttribute("aria-hidden", "true");
    svg.style.position = "absolute";
    document.body.appendChild(svg);
  }
  const raw = document.createElementNS("http://www.w3.org/2000/svg", "path");
  raw.setAttribute("d", d);
  svg.appendChild(raw);
  const total = raw.getTotalLength();
  const out: Measured = {
    total,
    raw,
    pointAt: (length) => {
      const pt = raw.getPointAtLength(Math.max(0, Math.min(total, length)));
      return { x: pt.x, y: pt.y };
    },
  };
  measured.set(d, out);
  return out;
}

export type RouteGeometry = {
  total: number;
  /** Distance along the route at which each main-route region sits, in route order. */
  regionLength: number[];
  pointAt: (length: number) => { x: number; y: number };
};

let geometry: RouteGeometry | null = null;

/** Measures the main route once, so positions can be found by distance along it. */
export function mainRouteGeometry(): RouteGeometry {
  if (geometry) return geometry;
  const path = measure(MAIN_ROUTE_D);
  let from = 0;
  const regionLength = mainPoints.map((r) => {
    let best = from;
    let bestDist = Infinity;
    // Regions are in order along the path, so each search starts where the last one ended.
    for (let l = from; l <= path.total; l += 2) {
      const pt = path.raw.getPointAtLength(l);
      const d = (pt.x - r.x) ** 2 + (pt.y - r.y) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = l;
      }
    }
    from = best;
    return best;
  });
  geometry = { total: path.total, regionLength, pointAt: path.pointAt };
  return geometry;
}

/** The two legs of the base-camp detour. */
export function sideRouteGeometry() {
  return { out: measure(SIDE_OUT_D), back: measure(SIDE_BACK_D) };
}
