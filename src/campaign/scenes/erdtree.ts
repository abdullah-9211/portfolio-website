import { NOISE_GLSL, TERRAIN_GLSL } from "@/lib/gl";

/**
 * Dusk in a dying land. A colossal golden tree burns through the fog over
 * marched hills, ruins stand on a rise, golden leaves fall, and a rider
 * waits on a cliff beside a small wisp of guiding light. A homage to
 * Elden Ring: muted, heavy with fog, lit almost entirely by the tree.
 */
export const ERDTREE = `#version 300 es
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
const vec3 GOLD = vec3(1.0, 0.72, 0.28);
// The tree stands far beyond the hills.
const vec3 TREE = vec3(13.0, 0.0, 60.0);

float height(vec2 p, int oct) {
  float h = 2.0 * erodedFbm(p * 0.19 + vec2(11.0, 4.0), oct);
  float valley = smoothstep(1.0, 8.0, length((p - vec2(1.0, 3.0)) * vec2(0.6, 0.8)));
  h = h * mix(0.14, 1.0, valley) - 0.25;
  // The land falls away toward the tree, so its trunk is seen whole.
  h *= 1.0 - 0.55 * smoothstep(18.0, 40.0, p.y);
  return h;
}

float ridged(vec2 p) { return 1.0 - abs(2.0 * vnoise(p) - 1.0); }

// The tree, drawn in its own plane. q is centred on the foot of the trunk, with the crown about 0.6 up.
vec3 tree(vec2 q, float t, out float mask) {
  // Trunk: flared at the root, leaning a little.
  float lean = q.y * 0.05 + sin(q.y * 3.0) * 0.02;
  float w = 0.035 + 0.13 * exp(-q.y * 8.0) + 0.012 * smoothstep(0.3, 0.55, q.y);
  float trunk = smoothstep(0.008, -0.008, abs(q.x - lean) - w) * step(0.0, q.y) * smoothstep(0.66, 0.5, q.y);
  float bark = 0.35 + 0.65 * pow(ridged(vec2((q.x - lean) * 46.0 + vnoise(vec2(q.y * 6.0, 1.0)) * 3.0, q.y * 3.0)), 2.0);

  // Crown. Boughs leave the head of the trunk and bend as they climb, so they are traced in a
  // warped polar frame: straight spokes would read as rays of light, not wood.
  vec2 c = q - vec2(lean, 0.5);
  c.x += (fbm(c * 3.0 + 4.0) - 0.5) * 0.16;
  c.y += (fbm(c * 3.0 + 9.0) - 0.5) * 0.12;
  float r = length(c * vec2(0.6, 1.0));
  float a = atan(c.x, c.y);
  // A wide, flat-topped dome, heavier at the sides, open underneath.
  float reach = 0.5 + 0.07 * sin(a * 3.0 + 1.0) + 0.05 * sin(a * 8.0 + 2.0);
  float env = smoothstep(reach, reach * 0.5, r) * smoothstep(2.35, 1.7, abs(a));
  float bend = a + r * 1.4 * sign(a) + fbm(vec2(a * 3.0, r * 5.0)) * 0.8;
  float boughs = pow(ridged(vec2(bend * 3.2, r * 2.0 + 1.0)), 12.0) * smoothstep(0.42, 0.02, r);
  float limbs2 = pow(ridged(vec2(bend * 9.0 + 5.0, r * 5.0)), 9.0) * smoothstep(0.03, 0.14, r);
  float twigs = pow(ridged(vec2(bend * 26.0, r * 13.0 + fbm(c * 20.0) * 2.0)), 5.0) * smoothstep(0.12, 0.3, r);
  float wood = (boughs * 1.2 + limbs2 * 0.7 + twigs * 0.3) * env;
  // Leaves: clumps of small bright points gathered along the outer canopy.
  float clump = smoothstep(0.42, 0.72, fbm(c * 7.0 + vec2(0.0, t * 0.01)));
  float sparkle = pow(vnoise(c * 150.0 + t * 0.2), 3.0);
  float leaves = clump * env * smoothstep(0.08, 0.3, r) * (0.35 + 1.6 * sparkle);

  mask = clamp(trunk + wood, 0.0, 1.0);
  vec3 col = vec3(1.0, 0.8, 0.42) * (trunk * bark * 1.4 + wood * 1.5);
  col += vec3(1.0, 0.74, 0.3) * leaves * 0.55;
  // The light it gives off: a tight core, and a wide faint halo.
  col += GOLD * (exp(-r * r * 16.0) * 0.3 + exp(-r * 3.2) * 0.12) * smoothstep(-0.25, 0.1, q.y);
  return col;
}

// The rider in profile, facing right. Units: hooves at y = 0, withers at about 0.44.
float rider(vec2 p, float t) {
  float breathe = sin(t * 1.3) * 0.003;
  // Barrel, hindquarters, shoulder.
  float d = sdEllipse(p - vec2(0.0, 0.335 + breathe), vec2(0.2, 0.098));
  d = smin(d, length(p - vec2(-0.15, 0.35)) - 0.105, 0.05);
  d = smin(d, length(p - vec2(0.15, 0.34)) - 0.095, 0.05);
  // Neck, arched; head and muzzle.
  d = smin(d, sdSeg(p, vec2(0.17, 0.39), vec2(0.265, 0.53)) - mix(0.075, 0.045, smoothstep(0.39, 0.53, p.y)), 0.04);
  d = smin(d, sdSeg(p, vec2(0.27, 0.545), vec2(0.36, 0.47)) - 0.037, 0.025);
  d = smin(d, sdSeg(p, vec2(0.35, 0.475), vec2(0.385, 0.43)) - 0.026, 0.02);
  // Ears, and two horns swept back.
  d = min(d, sdSeg(p, vec2(0.262, 0.575), vec2(0.256, 0.615)) - 0.009);
  d = min(d, sdSeg(p, vec2(0.28, 0.57), vec2(0.24, 0.625)) - 0.008);
  d = min(d, sdSeg(p, vec2(0.24, 0.625), vec2(0.195, 0.62)) - 0.0055);
  // Mane along the crest.
  d = smin(d, sdSeg(p, vec2(0.245, 0.555), vec2(0.15, 0.44)) - 0.03, 0.025);
  // Forelegs: one planted, one lifted. Thick forearm, slim cannon, hoof.
  d = smin(d, sdSeg(p, vec2(0.165, 0.3), vec2(0.172, 0.165)) - 0.034, 0.03);
  d = smin(d, sdSeg(p, vec2(0.172, 0.165), vec2(0.168, 0.03)) - 0.019, 0.01);
  d = smin(d, sdSeg(p, vec2(0.13, 0.3), vec2(0.215, 0.2)) - 0.032, 0.03);
  d = smin(d, sdSeg(p, vec2(0.215, 0.2), vec2(0.2, 0.09)) - 0.018, 0.01);
  d = min(d, sdBox(p - vec2(0.2, 0.078), vec2(0.022, 0.014)) - 0.004);
  // Hind legs, with the hock bending back.
  d = smin(d, sdSeg(p, vec2(-0.16, 0.31), vec2(-0.2, 0.175)) - 0.044, 0.03);
  d = smin(d, sdSeg(p, vec2(-0.2, 0.175), vec2(-0.172, 0.03)) - 0.02, 0.012);
  d = smin(d, sdSeg(p, vec2(-0.115, 0.3), vec2(-0.138, 0.165)) - 0.04, 0.03);
  d = smin(d, sdSeg(p, vec2(-0.138, 0.165), vec2(-0.112, 0.03)) - 0.019, 0.012);
  d = min(d, sdBox(p - vec2(0.17, 0.014), vec2(0.024, 0.014)) - 0.004);
  d = min(d, sdBox(p - vec2(-0.168, 0.014), vec2(0.025, 0.014)) - 0.004);
  d = min(d, sdBox(p - vec2(-0.108, 0.014), vec2(0.024, 0.014)) - 0.004);
  // Tail, full, moving in the wind.
  float sway = sin(t * 1.4) * 0.02;
  d = smin(d, sdSeg(p, vec2(-0.24, 0.39), vec2(-0.31 + sway * 0.4, 0.26)) - 0.034, 0.03);
  d = smin(d, sdSeg(p, vec2(-0.31 + sway * 0.4, 0.26), vec2(-0.325 + sway, 0.09)) - 0.022, 0.03);
  // The rider: thigh and boot, armoured torso, pauldron, arm to the reins, helm with a crest.
  d = smin(d, sdSeg(p, vec2(-0.01, 0.44), vec2(0.045, 0.3)) - 0.032, 0.02);
  d = smin(d, sdSeg(p, vec2(0.045, 0.3), vec2(0.06, 0.225)) - 0.022, 0.012);
  d = smin(d, sdSeg(p, vec2(-0.025, 0.45), vec2(-0.005, 0.6)) - 0.055, 0.025);
  d = smin(d, length(p - vec2(-0.01, 0.615)) - 0.05, 0.015);
  d = smin(d, sdSeg(p, vec2(0.012, 0.59), vec2(0.085, 0.5)) - 0.022, 0.01);
  d = smin(d, sdSeg(p, vec2(0.085, 0.5), vec2(0.145, 0.485)) - 0.016, 0.01);
  d = smin(d, length(p - vec2(0.01, 0.69)) - 0.037, 0.008);
  d = min(d, sdSeg(p, vec2(0.0, 0.72), vec2(-0.035, 0.755)) - 0.007);
  // The reins.
  d = min(d, sdSeg(p, vec2(0.145, 0.485), vec2(0.34, 0.47)) - 0.003);
  // A heavy cloak, falling over the horse's back and lifting at its hem.
  float lift = sin(t * 1.8 + p.x * 14.0) * 0.012;
  vec2 cq = p - vec2(-0.12, 0.47 + lift * smoothstep(-0.05, -0.25, p.x));
  float cloak = sdBox(vec2(cq.x, cq.y + cq.x * 0.55), vec2(0.105, 0.1 + cq.x * 0.25)) - 0.02;
  cloak += (vnoise(vec2(p.y * 40.0, t * 1.5)) - 0.5) * 0.014 * smoothstep(-0.1, -0.24, p.x);
  d = smin(d, cloak, 0.02);
  // The pommel and grip of a greatsword behind the shoulder.
  d = min(d, sdSeg(p, vec2(-0.03, 0.63), vec2(-0.085, 0.735)) - 0.007);
  d = min(d, sdSeg(p, vec2(-0.075, 0.69), vec2(-0.045, 0.705)) - 0.006);
  return d;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float aspect = uRes.x / uRes.y;
  float t = uTime;
  float pan = (uQ - 0.25) * 1.2 + uPointer.x * 0.04;
  vec3 ro = vec3(pan, 1.15, -0.5);
  vec3 ta = ro + vec3(0.12 - pan * 0.02, 0.06 + uPointer.y * -0.01, 1.0);
  mat3 cam = lookAt(ro, ta);
  vec3 rd = cam * normalize(vec3(uv, FOCAL));

  // Where the tree is on screen, and the direction to it.
  vec3 tw = TREE - ro;
  float tz = dot(tw, cam[2]);
  vec2 foot = vec2(dot(tw, cam[0]), dot(tw, cam[1])) / tz * FOCAL;
  float treeScale = 0.6;
  vec2 q = (uv - foot) / treeScale;
  vec3 toTree = normalize(vec3(TREE.x - ro.x, 14.0, TREE.z));
  float facing = max(dot(rd, toTree), 0.0);

  // ── Sky: heavy cloud, lit from within by the tree ──
  vec3 col = mix(vec3(0.055, 0.07, 0.085), vec3(0.02, 0.028, 0.045), smoothstep(-0.1, 0.6, uv.y));
  vec2 cp = rd.xz / max(rd.y + 0.12, 0.05);
  float cl = fbm(cp * 0.55 + vec2(t * 0.006, 0.0));
  float cl2 = fbm(cp * 1.4 - vec2(t * 0.01, 3.0));
  float clouds = smoothstep(0.35, 0.8, cl * 0.7 + cl2 * 0.4);
  vec3 cloudCol = mix(vec3(0.06, 0.075, 0.09), vec3(0.2, 0.2, 0.19), cl2);
  // Only the cloud nearest the crown takes its light.
  cloudCol += GOLD * exp(-dot(q - vec2(0.0, 0.62), q - vec2(0.0, 0.62)) * 2.2) * (0.3 + cl2) * 0.5;
  col = mix(col, cloudCol, clouds * 0.9);
  // A few stars in the gaps.
  vec2 sg = floor(uv * 190.0);
  col += vec3(0.7, 0.8, 1.0) * step(0.9965, hash21(sg)) * (1.0 - clouds) * smoothstep(0.1, 0.4, uv.y) * 0.6;

  // The tree itself, behind the land.
  float tmask;
  vec3 treeCol = tree(q, t, tmask);
  col = col * (1.0 - tmask * 0.85) + treeCol;
  // Shafts of light breaking out of the crown.
  vec2 cr = q - vec2(0.03, 0.5);
  float ang = atan(cr.x, cr.y);
  float shafts = pow(vnoise(vec2(ang * 7.0, t * 0.04)), 4.0) * exp(-length(cr) * 2.6) * smoothstep(0.3, 0.6, length(cr));
  col += GOLD * shafts * 0.22;

  // ── March the land ──
  float tt = 0.4, hit = -1.0;
  for (int i = 0; i < 90; i++) {
    vec3 p = ro + rd * tt;
    float d = p.y - height(p.xz, 5);
    if (d < 0.0015 * tt) { hit = tt; break; }
    tt += max(d * 0.42, 0.01);
    if (tt > 60.0) break;
  }
  // Fog is cold and grey, warming only in the direction of the tree.
  vec3 fogCol = mix(vec3(0.04, 0.055, 0.07), vec3(0.3, 0.22, 0.1), pow(facing, 16.0));
  if (hit > 0.0) {
    vec3 p = ro + rd * hit;
    float e = 0.0025 * hit;
    float h0 = height(p.xz, 8);
    vec3 n = normalize(vec3(h0 - height(p.xz + vec2(e, 0.0), 8), e, h0 - height(p.xz + vec2(0.0, e), 8)));
    // Sour grass and bare stone.
    vec3 grass = mix(vec3(0.07, 0.075, 0.03), vec3(0.17, 0.15, 0.06), fbm(p.xz * 1.3));
    grass = mix(grass, vec3(0.22, 0.16, 0.07), smoothstep(0.55, 0.8, fbm(p.xz * 3.1 + 5.0)) * 0.6);
    vec3 rock = mix(vec3(0.06, 0.06, 0.065), vec3(0.17, 0.16, 0.15), fbm(p.xz * 5.0 + p.y * 4.0));
    vec3 mat = mix(rock, grass, smoothstep(0.6, 0.82, n.y));
    // The only light is the tree's, low and warm, with a cold fill from the sky.
    float dif = max(dot(n, toTree), 0.0);
    float sh = 1.0, st = 0.1;
    for (int i = 0; i < 10; i++) {
      vec3 sp = p + toTree * st;
      float d = sp.y - height(sp.xz, 4);
      sh = min(sh, 8.0 * d / st);
      st += max(d, 0.1);
      if (sh < 0.02) break;
    }
    vec3 light = GOLD * dif * clamp(sh, 0.0, 1.0) * 1.5 + vec3(0.1, 0.15, 0.22) * (0.35 + 0.65 * n.y);
    vec3 land = mat * light;
    // Fog: thick, and glowing where you look toward the tree.
    float fog = 1.0 - exp(-hit * 0.045);
    land = mix(land, fogCol, fog);
    // Ground mist lying in the hollows.
    float mist = exp(-max(p.y - 0.05, 0.0) * 3.0) * (1.0 - exp(-hit * 0.12)) * (0.4 + 0.6 * fbm(p.xz * 0.6 + vec2(t * 0.03, 0.0)));
    land = mix(land, fogCol * 1.25 + vec3(0.03), mist * 0.75);
    // The tree's glow hangs in the air in front of the far hills.
    col = land + treeCol * fog * fog * 0.1;
  }
  float depth = hit > 0.0 ? hit : 1e5;

  // ── Ruins on a rise: what is left of an arcade, black against the fog ──
  vec3 rw = vec3(4.4, height(vec2(4.4, 8.0), 4) - 0.04, 8.0) - ro;
  float rz = dot(rw, cam[2]);
  vec2 rp = (uv - vec2(dot(rw, cam[0]), dot(rw, cam[1])) / rz * FOCAL) / (2.6 / rz);
  if (rz < depth + 1.5 && abs(rp.x) < 0.8 && rp.y > -0.06 && rp.y < 0.9) {
    float cell = 0.3;
    float x = rp.x + 0.75;
    float id = floor(x / cell);
    float cx = mod(x, cell) - cell * 0.5;
    // Piers of uneven height, some broken off short.
    float tall = 0.42 + 0.34 * step(0.45, hash11(id + 3.0)) * hash11(id + 6.0);
    tall *= mix(0.45, 1.0, step(0.25, hash11(id + 11.0)));
    float pier = sdBox(vec2(cx, rp.y - tall * 0.5), vec2(0.045 - rp.y * 0.012, tall * 0.5));
    // A capital on each, and round arches springing between neighbours where both still stand.
    pier = min(pier, sdBox(vec2(cx, rp.y - 0.42), vec2(0.06, 0.016)));
    float bay = floor((x + cell * 0.5) / cell);
    float archR = length(vec2(cell * 0.5 - abs(cx), rp.y - 0.42));
    float arch = max(abs(archR - cell * 0.4) - 0.032, 0.42 - rp.y);
    arch += step(hash11(bay + 20.0), 0.45) * 10.0;
    // A course of wall above the arches, mostly fallen.
    float wall = sdBox(vec2(cx, rp.y - 0.585), vec2(cell * 0.5, 0.03)) + step(hash11(bay + 31.0), 0.6) * 10.0 + arch * 0.0;
    float k = min(min(pier, arch), wall) + (fbm(rp * 24.0) - 0.5) * 0.022;
    float m = smoothstep(0.005, -0.005, k);
    vec3 stone = vec3(0.03, 0.032, 0.036) + vec3(0.1, 0.09, 0.07) * fbm(rp * 40.0);
    stone += GOLD * smoothstep(0.02, 0.0, -k) * 0.18;
    float fogR = 1.0 - exp(-rz * 0.045);
    col = mix(col, mix(stone, fogCol, fogR * 0.85), m);
  }

  // ── Foreground: a cliff, black with wet stone catching gold ──
  float gx = uv.x + 0.5 * aspect;
  float top = -0.26 - smoothstep(0.62, 0.9, gx / aspect) * 0.42 + (fbm(vec2(gx * 4.0, 2.0)) - 0.5) * 0.05;
  float cd = top - uv.y;
  float cm = smoothstep(0.003, -0.003, -cd);
  float strata = fbm(vec2(gx * 5.0 + uv.y * 2.0, uv.y * 22.0));
  vec3 cliff = mix(vec3(0.012, 0.013, 0.016), vec3(0.07, 0.065, 0.06), strata);
  // The lip of the cliff and every ledge facing the tree picks up its light.
  cliff += GOLD * exp(-cd * 26.0) * (0.25 + 0.5 * strata) * 0.55;
  cliff += GOLD * smoothstep(0.55, 0.75, strata) * smoothstep(0.5, 0.9, gx / aspect) * 0.1;
  col = mix(col, cliff, cm);
  // Dry grass on the edge.
  {
    float id = floor(gx * 190.0);
    float bh = 0.014 + hash11(id) * 0.034;
    float by = uv.y - top;
    float bx = fract(gx * 190.0) - 0.5 - (sin(t * 1.5 + gx * 5.0) * 0.6 + sin(t * 2.9 + id) * 0.2) * by * 16.0;
    float blade = smoothstep(0.4, 0.0, abs(bx) + by / bh * 0.45) * step(-0.004, by) * step(by, bh);
    col = mix(col, mix(vec3(0.02, 0.02, 0.015), vec3(0.5, 0.36, 0.14), pow(by / bh, 2.0)), blade);
  }

  // ── The rider ──
  float rx = 0.36 * aspect;
  float ground = -0.26 - smoothstep(0.62, 0.9, rx / aspect) * 0.42 + (fbm(vec2(rx * 4.0, 2.0)) - 0.5) * 0.05;
  float rs = 0.5;
  vec2 hp = vec2(gx - rx, uv.y - ground + 0.006) / rs;
  float rdist = rider(hp, t) * rs;
  float rm = smoothstep(0.002, -0.002, rdist);
  // Almost a silhouette: the tree rims the side that faces it.
  vec3 riderCol = vec3(0.014, 0.014, 0.018);
  // Only edges turned toward the tree, up and to the right, catch it.
  float e2 = 0.01;
  vec2 grad = vec2(rider(hp + vec2(e2, 0.0), t) - rider(hp - vec2(e2, 0.0), t), rider(hp + vec2(0.0, e2), t) - rider(hp - vec2(0.0, e2), t));
  float toward = max(dot(normalize(grad + 1e-5), normalize(vec2(0.75, 0.66))), 0.0);
  float rim = smoothstep(0.007, 0.0, -rdist) * pow(toward, 3.0);
  riderCol += GOLD * rim * 0.9;
  col = mix(col, riderCol, rm);

  // ── A wisp of guiding light on the grass, with its thread pointing toward the tree ──
  vec2 gpos = vec2(0.14 * aspect, -0.26 - smoothstep(0.62, 0.9, 0.2) * 0.42 + 0.03);
  vec2 gg = vec2(gx, uv.y) - gpos;
  float flick = 0.8 + 0.2 * sin(t * 6.0) * sin(t * 2.3);
  col += vec3(1.0, 0.82, 0.4) * (exp(-dot(gg, gg) * 900.0) * 1.6 + exp(-dot(gg, gg) * 60.0) * 0.22) * flick;
  float thread = smoothstep(0.004, 0.0, abs(gg.y - gg.x * 0.55 - sin(gg.x * 22.0 + t) * 0.008 - 0.01)) * smoothstep(0.0, 0.04, gg.x) * smoothstep(0.26, 0.05, gg.x);
  col += vec3(1.0, 0.8, 0.4) * thread * 0.75;

  // ── Golden leaves coming down on the wind ──
  for (int i = 0; i < 26; i++) {
    float fi = float(i);
    float sp = 0.02 + hash11(fi) * 0.035;
    float life = fract(t * sp + hash11(fi + 5.0));
    vec2 lp = vec2((hash11(fi + 2.0) - 0.5) * aspect * 1.2 - life * 0.3 + sin(t * 0.8 + fi) * 0.02, mix(0.55, -0.55, life));
    float size = 0.003 + hash11(fi + 8.0) * 0.004;
    vec2 dl = uv - lp;
    float spin = t * (1.0 + hash11(fi) * 2.0) + fi;
    dl = vec2(cos(spin) * dl.x - sin(spin) * dl.y, (sin(spin) * dl.x + cos(spin) * dl.y) * 2.2);
    col += vec3(1.0, 0.78, 0.32) * smoothstep(size, size * 0.3, length(dl)) * sin(life * 3.1416) * 0.9;
  }

  // Grade: filmic, a touch of bloom-like lift toward the tree, vignette, grain.
  col = aces(col * 1.15);
  col = mix(vec3(dot(col, vec3(0.3, 0.59, 0.11))), col, 0.9);
  col *= 1.0 - 0.42 * dot(uv * vec2(0.72, 1.0), uv * vec2(0.72, 1.0));
  col += (hash21(gl_FragCoord.xy + t * 60.0) - 0.5) * 0.03;
  outColor = vec4(col, 1.0);
}`;
