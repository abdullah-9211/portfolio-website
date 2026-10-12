// Builds src/campaign/games/earth/land.json: evenly spread points on the
// globe that fall on land, each tagged with a region. The game draws its
// planet from these.
// Usage: node scripts/build-land-points.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { feature } from "topojson-client";
import { geoContains } from "d3-geo";

const topo = JSON.parse(readFileSync("node_modules/world-atlas/land-110m.json", "utf8"));
const land = feature(topo, topo.objects.land);

// 0 North America, 1 South America, 2 Europe, 3 Africa, 4 Asia, 5 Oceania, 6 Polar
function region(lat, lon) {
  if (lat < -60 || lat > 72 || (lat > 59 && lon > -75 && lon < -10)) return 6;
  if (lon < -30) return lat > 12.5 ? 0 : 1;
  if (lat < -10 && lon > 110) return 5;
  if (lat < 0 && lon > 130) return 5;
  if (lon >= -30 && lon < 60 && lat < 36 && !(lon > 35 && lat > 12 && lon > 43)) {
    if (lon > 34 && lat > 30) return 4;
    return 3;
  }
  if (lon < 45 && lat >= 36) return 2;
  return 4;
}

const N = 15000;
const golden = Math.PI * (3 - Math.sqrt(5));
const out = [];
for (let i = 0; i < N; i++) {
  const y = 1 - (i / (N - 1)) * 2;
  const theta = golden * i;
  const lat = (Math.asin(y) * 180) / Math.PI;
  let lon = ((theta * 180) / Math.PI) % 360;
  if (lon > 180) lon -= 360;
  if (geoContains(land, [lon, lat])) out.push(Math.round(lat * 10) / 10, Math.round(lon * 10) / 10, region(lat, lon));
}
writeFileSync("src/campaign/games/earth/land.json", JSON.stringify(out));
console.log("land points:", out.length / 3);
