import { NOISE_GLSL, TERRAIN_GLSL } from "@/lib/gl";

/**
 * The view from the Great Plateau at golden hour, after the opening of
 * Breath of the Wild: Hyrule Castle on the horizon, Death Mountain under
 * its cap of cloud, mist lying in the valleys, a forest of round-crowned
 * trees below, the ruined Temple of Time, and a grassy knoll for Link to
 * stand on (he is a 3D model layered over this canvas; see LinkFigure).
 *
 * The land is a height field marched per pixel, and the trees are part of
 * it, so they catch the low sun and throw shadows. A homage drawn from
 * scratch; no game assets are used.
 */
export const VISTA = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec2 uRes;
uniform float uTime;
uniform float uQ;
uniform vec2 uPointer;
${NOISE_GLSL}
${TERRAIN_GLSL}

const float FOCAL = 1.5;
// Low sun, off to the right.
const vec3 SUN = normalize(vec3(0.8, 0.2, 0.56));
const vec3 SUNCOL = vec3(1.0, 0.74, 0.44);
const vec2 MOUNT = vec2(7.0, 34.0);

float ground(vec2 p, int oct) {
  float h = 2.2 * erodedFbm(p * 0.17 + vec2(3.1, 1.7), oct);
  // A wide basin below the plateau, with the far country rising behind it.
  float basin = smoothstep(2.0, 13.0, length((p - vec2(0.0, 6.0)) * vec2(0.42, 0.7)));
  h = h * mix(0.12, 1.0, basin) - 0.9;
  // Death Mountain: a steep cone with a notched crater.
  float dm = length(p - MOUNT);
  float cone = min(7.4 - dm * 0.95, 6.0 + dm * 0.5);
  cone += (erodedFbm(p * 0.7, 4) - 0.5) * 1.0 * smoothstep(0.0, 5.0, dm);
  h = max(h, cone - 0.9);
  // A jagged ridge running out from it on both sides.
  float ridge = 3.2 - abs(p.y - 30.0 - sin(p.x * 0.2) * 2.0) * 0.8 + (noised(p * 0.9).x - 0.5) * 2.6;
  h = max(h, ridge - 0.9 - smoothstep(10.0, 22.0, abs(p.x - 6.0)) * 2.0);
  return h;
}

// Where forest grows: gentle, low ground, in broad patches.
float forestAt(vec2 p) {
  return smoothstep(0.42, 0.56, fbm(p * 0.33 + 7.0));
}

// One round crown per grid cell.
float crown(vec2 p, out float id) {
  vec2 g = p * 3.6;
  vec2 c = floor(g);
  vec2 jitter = hash22(c);
  id = hash21(c + 4.0);
  vec2 f = g - c - 0.5 - (jitter - 0.5) * 0.4;
  float r = 0.3 + id * 0.12;
  return sqrt(max(r * r - dot(f, f), 0.0)) / 3.6 * 2.6 * step(0.18, id);
}

float height(vec2 p, int oct, float trees) {
  float h = ground(p, oct);
  if (trees > 0.0) {
    float id;
    float slopeOk = smoothstep(1.2, 0.2, h + 0.9);
    h += crown(p, id) * forestAt(p) * slopeOk * trees;
  }
  return h;
}

vec3 skyColor(vec3 rd) {
  float sunAmt = max(dot(rd, SUN), 0.0);
  float up = max(rd.y, 0.0);
  // Peach at the horizon, through pale gold and green-grey, to a dusty teal overhead.
  vec3 col = mix(vec3(0.98, 0.72, 0.44), vec3(0.86, 0.8, 0.6), smoothstep(0.0, 0.12, up));
  col = mix(col, vec3(0.5, 0.62, 0.62), smoothstep(0.08, 0.34, up));
  col = mix(col, vec3(0.3, 0.44, 0.52), smoothstep(0.3, 0.7, up));
  col += SUNCOL * pow(sunAmt, 6.0) * 0.55;
  col += vec3(1.0, 0.92, 0.72) * pow(sunAmt, 90.0) * 1.6;
  // High streaked cloud, lit from below.
  vec2 cp = rd.xz / max(rd.y, 0.04);
  float streak = fbm(cp * vec2(0.5, 1.6) + vec2(uTime * 0.004, 0.0));
  float cloud = smoothstep(0.5, 0.78, streak) * smoothstep(0.03, 0.2, rd.y);
  vec3 cc = mix(vec3(0.6, 0.5, 0.46), vec3(1.0, 0.8, 0.56), smoothstep(0.5, 0.9, fbm(cp * vec2(0.5, 1.6) + 0.2)));
  cc += SUNCOL * pow(sunAmt, 3.0) * 0.4;
  return mix(col, cc, cloud * 0.75);
}

// Haze colour in a given direction: cool grey-green, warming toward the sun.
vec3 hazeColor(vec3 rd) {
  float sunAmt = max(dot(rd, SUN), 0.0);
  return mix(vec3(0.55, 0.62, 0.58), vec3(1.0, 0.78, 0.5), pow(sunAmt, 3.0));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float aspect = uRes.x / uRes.y;
  float t = uTime;
  float pan = (uQ - 0.75) * 1.6 + uPointer.x * 0.04;
  // High on the plateau, looking out and a little down.
  vec3 ro = vec3(pan, 2.5, -1.0);
  vec3 ta = ro + vec3(0.06 - pan * 0.02, -0.11 + uPointer.y * -0.01, 1.0);
  mat3 cam = lookAt(ro, ta);
  vec3 rd = cam * normalize(vec3(uv, FOCAL));
  float sunAmt = max(dot(rd, SUN), 0.0);

  // ── March the land, trees and all ──
  float tt = 0.6, hit = -1.0;
  for (int i = 0; i < 110; i++) {
    vec3 p = ro + rd * tt;
    float d = p.y - height(p.xz, 5, tt < 26.0 ? 1.0 : 0.0);
    if (d < 0.0018 * tt) { hit = tt; break; }
    tt += max(d * 0.4, 0.012);
    if (tt > 90.0) break;
  }

  vec3 col = skyColor(rd);
  vec3 haze = hazeColor(rd);
  float depth = 1e5;

  if (hit > 0.0) {
    depth = hit;
    vec3 p = ro + rd * hit;
    float treesOn = hit < 26.0 ? 1.0 : 0.0;
    float e = 0.003 * hit;
    float h0 = height(p.xz, 8, treesOn);
    vec3 n = normalize(vec3(h0 - height(p.xz + vec2(e, 0.0), 8, treesOn), e, h0 - height(p.xz + vec2(0.0, e), 8, treesOn)));
    float g0 = ground(p.xz, 6);
    float canopy = clamp((h0 - g0) * 14.0, 0.0, 1.0);
    float forest = forestAt(p.xz) * smoothstep(1.2, 0.2, g0 + 0.9);
    float dm = length(p.xz - MOUNT);

    // Ground: sun-bleached meadow with ochre patches of dry grass and bare earth.
    float meadow = fbm(p.xz * 0.7);
    vec3 grass = mix(vec3(0.22, 0.3, 0.1), vec3(0.42, 0.44, 0.16), meadow);
    grass = mix(grass, vec3(0.62, 0.5, 0.24), smoothstep(0.55, 0.78, fbm(p.xz * 1.9 + 9.0)) * 0.7);
    grass *= 0.85 + 0.3 * vnoise(p.xz * 40.0);
    vec3 rock = mix(vec3(0.3, 0.27, 0.25), vec3(0.5, 0.44, 0.38), fbm(p.xz * 3.0 + p.y * 2.0));
    rock *= 0.75 + 0.5 * smoothstep(0.3, 0.7, fbm(vec2(p.y * 9.0, dot(p.xz, vec2(0.7)) * 1.4)));
    vec3 mat = mix(rock, grass, smoothstep(0.55, 0.78, n.y));
    // Tree crowns: deep green in the shade, yellow-green where the sun finds them.
    float id;
    crown(p.xz, id);
    vec3 leaf = mix(vec3(0.07, 0.17, 0.06), vec3(0.2, 0.33, 0.09), id);
    leaf *= 0.8 + 0.4 * vnoise(p.xz * 60.0);
    mat = mix(mat, leaf, canopy);
    // Far forest, past where single trees are drawn, reads as dark mottled cover.
    mat = mix(mat, vec3(0.1, 0.2, 0.08) * (0.7 + 0.6 * vnoise(p.xz * 5.0)), forest * (1.0 - treesOn) * smoothstep(0.7, 0.9, n.y));
    // The volcano's dark red rock.
    mat = mix(mat, mix(vec3(0.2, 0.12, 0.11), vec3(0.36, 0.2, 0.16), fbm(p.xz * 1.4)), smoothstep(10.0, 5.0, dm));

    // Sunlight with a marched shadow: long ones, this low.
    float sh = 1.0, st = 0.05;
    for (int i = 0; i < 18; i++) {
      vec3 sp = p + SUN * st;
      float d = sp.y - height(sp.xz, 4, treesOn);
      sh = min(sh, 9.0 * d / st);
      st += max(d * 0.9, 0.06);
      if (sh < 0.02 || st > 9.0) break;
    }
    sh = clamp(sh, 0.0, 1.0);
    float dif = max(dot(n, SUN), 0.0);
    vec3 light = SUNCOL * dif * sh * 2.6;
    light += vec3(0.36, 0.46, 0.52) * (0.45 + 0.55 * n.y) * 0.7;
    // Light scattering through the leaves on the sun side of each crown.
    light += vec3(0.5, 0.5, 0.1) * canopy * pow(max(dot(n, SUN) * 0.5 + 0.5, 0.0), 2.0) * sh * 0.5;
    // Crowns shade themselves underneath.
    light *= 1.0 - canopy * 0.35 * (1.0 - n.y);
    col = mat * light;
    // Lava in the crater and down the flanks.
    float veins = smoothstep(0.04, 0.0, abs(fbm(p.xz * 1.1 + 30.0) - 0.5)) * smoothstep(7.0, 1.5, dm);
    col += vec3(1.0, 0.3, 0.05) * (veins * 1.5 + smoothstep(1.6, 0.5, dm) * 2.4);

    // Air. Distance fades everything toward the haze, quickly, as in the evening light.
    float fog = 1.0 - exp(-hit * 0.036);
    col = mix(col, haze, fog);
    // Mist pooled in the hollows, drifting.
    float low = exp(-max(p.y + 0.75, 0.0) * 2.6);
    float drift = fbm(p.xz * 0.28 + vec2(t * 0.02, 0.0)) * fbm(p.xz * 0.9 - vec2(t * 0.012, 2.0));
    float mist = low * (1.0 - exp(-hit * 0.08)) * smoothstep(0.1, 0.42, drift) * 1.5;
    col = mix(col, mix(vec3(0.86, 0.88, 0.82), vec3(1.0, 0.86, 0.66), pow(sunAmt, 2.0)), clamp(mist, 0.0, 0.92));
  }

  // ── Bands of cloud lying across the far valleys ──
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float dist = 14.0 + fi * 6.0;
    if (dist < depth) {
      float y = -0.085 + fi * 0.022 + uPointer.y * 0.004;
      float bank = fbm(vec2(uv.x * (2.2 - fi * 0.4) + fi * 4.0 + t * 0.006 + pan * (0.2 - fi * 0.05), fi * 3.0));
      float m = smoothstep(0.03 + bank * 0.05, 0.0, abs(uv.y - y - (bank - 0.5) * 0.05)) * smoothstep(0.42, 0.62, bank);
      col = mix(col, mix(vec3(0.84, 0.86, 0.8), vec3(1.0, 0.86, 0.66), pow(sunAmt, 2.0)), m * 0.7);
    }
  }

  // ── Death Mountain's cap of cloud, and its glow ──
  vec3 mw = vec3(MOUNT.x, 6.4, MOUNT.y) - ro;
  float mz = dot(mw, cam[2]);
  vec2 ms = vec2(dot(mw, cam[0]), dot(mw, cam[1])) / mz * FOCAL;
  vec2 cq = (uv - ms - vec2(0.0, 0.035)) * mz * 0.05;
  float capShape = fbm(cq * 3.0 + vec2(t * 0.01, 0.0));
  float cap = smoothstep(0.02 + capShape * 0.06, 0.0, sdEllipse(cq, vec2(0.16, 0.035 + capShape * 0.02)));
  vec3 capCol = mix(vec3(0.3, 0.29, 0.38), vec3(0.5, 0.42, 0.44), capShape);
  capCol += vec3(1.0, 0.28, 0.1) * smoothstep(0.03, -0.04, cq.y) * exp(-cq.x * cq.x * 90.0) * 0.9;
  col = mix(col, capCol, cap * 0.92);
  col += vec3(1.0, 0.36, 0.1) * exp(-dot(uv - ms, uv - ms) * 900.0) * 0.5;

  // ── Hyrule Castle, on its rock, far across the field ──
  vec3 kw = vec3(-8.0, ground(vec2(-8.0, 24.0), 4) + 0.3, 24.0) - ro;
  float kz = dot(kw, cam[2]);
  vec2 kp = (uv - vec2(dot(kw, cam[0]), dot(kw, cam[1])) / kz * FOCAL) / (6.2 / kz);
  if (abs(kp.x) < 0.9 && kp.y > -0.2 && kp.y < 1.15) {
    // The crag it stands on: steep, broken, wider at the foot.
    float cragTop = 0.2 - pow(abs(kp.x) * 1.25, 1.6) * 0.42 + (fbm(vec2(kp.x * 7.0, 1.0)) - 0.5) * 0.12;
    float crag = max(kp.y - cragTop, abs(kp.x) - 0.78);
    float k = crag;
    // Curtain walls with battlements, stepping up to the keep.
    k = min(k, sdBox(kp - vec2(0.0, 0.2), vec2(0.5, 0.05)));
    k = min(k, sdBox(kp - vec2(0.0, 0.3), vec2(0.34, 0.07)));
    k = min(k, sdBox(kp - vec2(0.0, 0.42), vec2(0.2, 0.09)));
    k = max(k, -max(sdBox(vec2(mod(kp.x, 0.05) - 0.025, kp.y - 0.255), vec2(0.011, 0.012)), abs(kp.x) - 0.5));
    // The central tower and its great spire.
    k = min(k, sdBox(kp - vec2(0.0, 0.6), vec2(0.07, 0.2)));
    k = min(k, max(abs(kp.x) * 5.4 + kp.y - 1.08, 0.78 - kp.y));
    // Lesser towers, each with a pointed roof, taller toward the middle.
    for (int i = 0; i < 8; i++) {
      float fi = float(i);
      float x = (fi - 3.5) * 0.13 + (hash11(fi) - 0.5) * 0.04;
      float base = 0.2 + 0.1 * (1.0 - abs(x) * 1.6);
      float top = base + 0.16 + 0.26 * (1.0 - abs(x) * 1.7) * (0.6 + 0.4 * hash11(fi + 3.0));
      float tw = 0.026 + 0.01 * hash11(fi + 7.0);
      k = min(k, sdBox(kp - vec2(x, (base + top) * 0.5), vec2(tw, (top - base) * 0.5)));
      k = min(k, max(abs(kp.x - x) * 4.6 + kp.y - top - tw * 4.6 - 0.02, top - kp.y));
    }
    float m = smoothstep(0.012, -0.012, k);
    // Pale stone, sunlit on its right faces, slate-blue roofs, and windows.
    vec3 stone = mix(vec3(0.5, 0.5, 0.52), vec3(0.74, 0.7, 0.64), smoothstep(-0.2, 0.3, kp.x + sin(kp.x * 48.0) * 0.06));
    stone = mix(stone, vec3(0.22, 0.27, 0.42), smoothstep(0.5, 0.75, kp.y) * smoothstep(0.0, 0.02, abs(sin(kp.x * 24.0))));
    stone *= 0.8 + 0.35 * step(0.5, fract(kp.y * 22.0)) * 0.3;
    stone += SUNCOL * 0.25 * smoothstep(0.03, 0.0, -k) * smoothstep(0.0, 0.3, kp.x);
    // The crag is dark rock with grass on its ledges, and it sinks into the mist at its foot.
    vec3 cragCol = mix(vec3(0.22, 0.22, 0.2), vec3(0.4, 0.37, 0.3), fbm(kp * vec2(9.0, 22.0)));
    cragCol = mix(cragCol, vec3(0.24, 0.3, 0.12), smoothstep(0.5, 0.7, fbm(kp * 6.0 + 2.0)) * 0.7);
    cragCol *= 0.6 + 0.7 * smoothstep(-0.4, 0.5, kp.x);
    stone = mix(stone, cragCol, step(crag, 0.0) * step(kp.y, 0.2));
    float fogK = 1.0 - exp(-kz * 0.036);
    float foot = smoothstep(-0.2, 0.06, kp.y);
    col = mix(col, mix(stone * 0.82, haze, fogK * 0.36), m * foot * step(kz, depth + 6.0));
  }

  // ── The ruined Temple of Time, on the plateau to the left ──
  vec3 tw3 = vec3(5.6, ground(vec2(5.6, 9.5), 4) + 0.75, 9.5) - ro;
  float tz = dot(tw3, cam[2]);
  vec2 tp = (uv - vec2(dot(tw3, cam[0]), dot(tw3, cam[1])) / tz * FOCAL) / (2.3 / tz);
  if (tz < depth + 4.0 && abs(tp.x) < 0.8 && tp.y > -0.06 && tp.y < 1.3) {
    // Nave with a steep gable, a square tower at the far end, tall lancet windows, a fallen corner.
    float nave = max(sdBox(tp - vec2(-0.1, 0.25), vec2(0.42, 0.25)), -1.0);
    float gable = max(abs(tp.x + 0.1) * 1.5 + tp.y - 1.02, 0.5 - tp.y);
    float tower = sdBox(tp - vec2(0.42, 0.42), vec2(0.13, 0.42));
    float spire = max(abs(tp.x - 0.42) * 3.4 + tp.y - 1.24, 0.84 - tp.y);
    float k = min(min(nave, gable), min(tower, spire));
    // Windows cut through, so the sky shows.
    float wx = mod(tp.x + 0.47, 0.17) - 0.085;
    float win = max(abs(wx) - 0.028, abs(tp.y - 0.27) - 0.13 + abs(wx) * 1.5);
    win = max(win, abs(tp.x + 0.1) - 0.36);
    k = max(k, -win);
    k = max(k, -(length(tp - vec2(-0.1, 0.66)) - 0.07));
    // The roof has fallen in on the left.
    k = max(k, -(tp.x + 0.62 + (tp.y - 0.3) * 0.5 + (fbm(tp * 9.0) - 0.5) * 0.2));
    k += (fbm(tp * 22.0) - 0.5) * 0.018;
    float m = smoothstep(0.008, -0.008, k);
    vec3 stone = mix(vec3(0.3, 0.3, 0.28), vec3(0.52, 0.48, 0.4), fbm(tp * vec2(14.0, 30.0)));
    stone *= 0.55 + 0.75 * smoothstep(-0.3, 0.5, tp.x);
    // Moss and ivy climbing the lower courses.
    stone = mix(stone, vec3(0.18, 0.28, 0.1), smoothstep(0.45, 0.7, fbm(tp * 7.0 + 3.0)) * smoothstep(0.55, 0.05, tp.y) * 0.8);
    stone += SUNCOL * smoothstep(0.02, 0.0, -k) * 0.3;
    float fogT = 1.0 - exp(-tz * 0.036);
    col = mix(col, mix(stone * 0.9, haze, fogT * 0.3), m);
  }

  // Birds, far off.
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 bp = uv - vec2(mod(t * 0.016 + fi * 0.13, 1.4) * aspect - 0.7 * aspect + sin(fi * 3.0) * 0.03, 0.3 + sin(fi * 2.0) * 0.03 + sin(t * 0.6 + fi) * 0.008);
    float flap = sin(t * 6.0 + fi * 2.0) * 0.005;
    float b = min(sdSeg(bp, vec2(0.0), vec2(-0.01, 0.004 + flap)), sdSeg(bp, vec2(0.0), vec2(0.01, 0.004 + flap))) - 0.001;
    col = mix(col, vec3(0.2, 0.2, 0.24), smoothstep(0.001, -0.001, b));
  }

  // Sun glare across the lens.
  col += SUNCOL * pow(sunAmt, 10.0) * 0.3;

  // ── The knoll at the plateau's edge ──
  float cx = uv.x + 0.5 * aspect;
  float kx = cx / aspect;
  float knollTop = -0.5 + 0.34 * exp(-pow((kx - 0.62) / 0.3, 2.0)) + (fbm(vec2(cx * 5.0, 9.0)) - 0.5) * 0.03;
  float kd = knollTop - uv.y;
  float km = smoothstep(0.003, -0.003, -kd);
  // Grass in clumps, bleached at the tips, with bare earth showing through.
  vec3 turf = mix(vec3(0.13, 0.2, 0.06), vec3(0.4, 0.42, 0.14), fbm(vec2(cx * 7.0, uv.y * 16.0)));
  turf = mix(turf, vec3(0.36, 0.27, 0.16), smoothstep(0.58, 0.74, fbm(vec2(cx * 4.0 + 5.0, uv.y * 9.0))) * 0.7);
  turf *= 0.7 + 0.6 * vnoise(vec2(cx * 260.0, uv.y * 60.0));
  // The slope is lit from the right and falls into shade on the left.
  float slopeDir = 0.34 * exp(-pow((kx - 0.62) / 0.3, 2.0)) * -(kx - 0.62);
  turf *= mix(0.45, 1.25, smoothstep(-0.25, 0.3, kx - 0.62)) * (1.0 - 0.3 * smoothstep(0.0, 0.3, kd));
  turf += SUNCOL * exp(-kd * 40.0) * smoothstep(0.5, 0.9, kx) * 0.22 + slopeDir * 0.0;
  col = mix(col, turf, km);
  // Rocks set in the turf.
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 rc = vec2((0.74 + fi * 0.07 + hash11(fi) * 0.03) * aspect, -0.36 - fi * 0.045 + hash11(fi + 2.0) * 0.03);
    vec2 rq = (vec2(cx, uv.y) - rc) / (0.03 + hash11(fi + 5.0) * 0.03);
    float rk = length(rq * vec2(0.8, 1.3)) - 1.0 + (vnoise(rq * 3.0 + fi) - 0.5) * 0.5;
    vec3 rcol = mix(vec3(0.2, 0.18, 0.17), vec3(0.56, 0.48, 0.42), smoothstep(-0.4, 0.8, rq.x + rq.y)) * (0.8 + 0.4 * vnoise(rq * 9.0));
    col = mix(col, rcol, smoothstep(0.06, -0.06, rk));
  }
  // Grass blades along the crest and standing out of the slope, moving in gusts.
  for (int layer = 0; layer < 3; layer++) {
    float fl = float(layer);
    float dens = 170.0 + fl * 90.0;
    float id = floor(cx * dens);
    float baseY = knollTop - fl * 0.035 * hash11(id + fl);
    float bh = (0.014 + hash11(id + fl * 7.0) * 0.034);
    float gust = sin(t * 1.6 + cx * 5.0) * 0.6 + sin(t * 3.1 + id) * 0.25;
    float by = uv.y - baseY;
    float bx = fract(cx * dens) - 0.5 - gust * by * 15.0;
    float blade = smoothstep(0.4, 0.0, abs(bx) + by / bh * 0.45) * step(-0.003, by) * step(by, bh);
    vec3 bc = mix(vec3(0.1, 0.17, 0.05), vec3(0.62, 0.6, 0.22), pow(clamp(by / bh, 0.0, 1.0), 1.5));
    bc *= mix(0.5, 1.2, smoothstep(-0.25, 0.3, kx - 0.62));
    col = mix(col, bc, blade);
  }

  // ── Where Link stands. He is a 3D model drawn over this canvas; only his shadow is painted here. ──
  float hx = 0.6 * aspect;
  float hGround = -0.5 + 0.34 * exp(-pow((0.6 - 0.62) / 0.3, 2.0)) + (fbm(vec2(hx * 5.0, 9.0)) - 0.5) * 0.03;
  float scale = 0.5;
  vec2 hp = vec2(cx - hx, uv.y - hGround + 0.008) / scale;
  // His shadow falls away to the left, long in this light.
  float shadow = smoothstep(0.05, 0.0, sdEllipse(hp - vec2(-0.3, -0.012), vec2(0.42, 0.022)));
  col *= 1.0 - 0.5 * shadow * km;
  // A few blades in front of his boots.
  {
    float id = floor(cx * 230.0);
    float bh = 0.016 + hash11(id + 40.0) * 0.026;
    float by = uv.y - hGround + 0.014;
    float bx = fract(cx * 230.0) - 0.5 - sin(t * 1.6 + cx * 5.0) * by * 9.0;
    float blade = smoothstep(0.4, 0.0, abs(bx) + by / bh * 0.45) * step(0.0, by) * step(by, bh) * step(abs(cx - hx), 0.12);
    col = mix(col, mix(vec3(0.1, 0.17, 0.05), vec3(0.56, 0.56, 0.2), by / bh), blade);
  }

  // Motes of pollen in the low sun.
  for (int i = 0; i < 16; i++) {
    float fi = float(i);
    float life = fract(t * (0.02 + hash11(fi) * 0.02) + hash11(fi + 9.0));
    vec2 mp = vec2((hash11(fi + 2.0) - 0.5) * aspect + sin(t * 0.4 + fi) * 0.03 + life * 0.08, mix(-0.5, 0.2, life));
    col += SUNCOL * smoothstep(0.006, 0.0, length(uv - mp)) * sin(life * 3.1416) * 0.5;
  }

  // Grade: filmic, a touch of warmth, vignette, grain.
  col = aces(col * 0.86);
  col = mix(col, col * col * (3.0 - 2.0 * col), 0.18);
  col *= 1.0 - 0.26 * dot(uv * vec2(0.68, 1.0), uv * vec2(0.68, 1.0));
  col += (hash21(gl_FragCoord.xy + t) - 0.5) * 0.014;
  outColor = vec4(col, 1.0);
}`;
