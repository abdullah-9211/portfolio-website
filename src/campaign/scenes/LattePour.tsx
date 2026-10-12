"use client";

import { useEffect, useRef } from "react";
import { compile, createTarget, fullscreenTriangle, NOISE_GLSL, type Target } from "@/lib/gl";

/**
 * A stacked tulip being poured, seen from above, simulated.
 *
 * The surface of the cup is a fluid grid carrying how much milk foam is at
 * each point and how light the crema is. Milk landing on it pushes the
 * surface outward, so every new pour shoves the earlier ones away and bends
 * them around itself. Nothing in the pattern is drawn.
 *
 * The pour follows the real technique:
 *   1. From height, a thin stream dives under the crema and builds the base.
 *   2. The pitcher comes down to the surface, where foam floats.
 *   3. A leaf is poured, the stream is stopped, the pitcher moves back
 *      toward the pourer, and the next leaf is poured into the edge of the
 *      last. Each one drives the stack forward and wraps it wider.
 *   4. The last, small pour is the heart. The pitcher lifts and a thin
 *      stream is pulled forward through the whole stack, which draws the
 *      stem and puts the cleft in the heart.
 *
 * Scroll position is the clock, so it runs forward and back.
 */

const SIZE = 768;
const DT = 1 / 60;

type Pour = {
  x: number;
  y: number;
  /** Source strength. Surface area claimed per second is 2π × flow. */
  flow: number;
  /** 0 leaves the surface alone, 1 lays down whatever `milk` and `tone` say. */
  inject: number;
  milk: number;
  /** Crema lightness laid down when not pouring foam. */
  tone: number;
  radius: number;
  /** How strongly the moving stream drags the surface, and how wide that reach is. */
  drag: number;
  dragWidth: number;
  /** Stream thickness, 0 to 1. */
  stream: number;
  /** How far above the cup the spout is, 0 at the surface to 1 high. */
  height: number;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.min(1, Math.max(0, t));
const span = (t: number, a: number, b: number) => (t - a) / (b - a);
const ease = (t: number) => {
  const k = Math.min(1, Math.max(0, t));
  return k * k * (3 - 2 * k);
};

type Leaf = { start: number; end: number; y: number; push: number; flow: number; radius: number; breaks: boolean };

const CANVAS: [number, number] = [0.4, 2.7];
const LEAF_SECONDS = 0.95;
const REST_SECONDS = 0.5;
const PUSH = 0.12;
/** How much of the push the surface actually follows. */
const FOLLOW = 0.55;

/**
 * The leaves, far side first. Each one is placed on the near edge of the
 * one before, which is worked out from how much surface that leaf claimed
 * (area = 2π × flow × seconds) and how far its push carried it.
 */
const LEAVES: Leaf[] = (() => {
  const flows = [0.064, 0.058, 0.052, 0.044, 0.024];
  const out: Leaf[] = [];
  let y = 0.44;
  let start = 3.3;
  flows.forEach((flow, i) => {
    const last = i === flows.length - 1;
    const seconds = last ? LEAF_SECONDS * 0.8 : LEAF_SECONDS;
    out.push({ start, end: start + seconds, y, push: last ? PUSH * 0.6 : PUSH, flow, radius: last ? 0.06 : 0.075, breaks: i > 0 });
    const reach = Math.sqrt(2 * flow * seconds * 0.95);
    y = y + PUSH * FOLLOW - reach * (last ? 1 : 0.94);
    start += seconds + REST_SECONDS;
  });
  return out;
})();

const HEART = LEAVES[LEAVES.length - 1];
const CUT: [number, number] = [HEART.end + 0.35, HEART.end + 1.25];
const CUT_FROM = HEART.y - 0.2;
const CUT_TO = 0.9;
const DURATION = CUT[1] + 0.7;

const IDLE: Pour = { x: 0, y: 0.36, flow: 0, inject: 0, milk: 0, tone: 0.5, radius: 0.08, drag: 0, dragWidth: 0.02, stream: 0, height: 0.6 };

/** Where the pitcher is and what it is doing at simulated second `t`. The far side of the cup is +y. */
function pourAt(t: number): Pour {
  // 1. Build the base from height: a thin stream circling the middle. It sinks, so no white shows.
  if (t >= CANVAS[0] && t < CANVAS[1]) {
    const k = span(t, CANVAS[0], CANVAS[1]);
    const a = t * 3.2;
    return { ...IDLE, x: Math.cos(a) * 0.22, y: 0.1 + Math.sin(a) * 0.22, flow: 0.07, inject: 0.5, tone: lerp(0.56, 0.72, k), radius: 0.07, drag: 0.8, stream: 0.45, height: lerp(1, 0.8, k) };
  }
  // 2. Bring the pitcher down to the surface, over where the first leaf goes.
  if (t >= CANVAS[1] && t < LEAVES[0].start) {
    const k = ease(span(t, CANVAS[1], LEAVES[0].start));
    const a = CANVAS[1] * 3.2;
    return { ...IDLE, x: lerp(Math.cos(a) * 0.22, 0, k), y: lerp(0.1 + Math.sin(a) * 0.22, LEAVES[0].y, k), stream: k < 0.5 ? 0.4 : 0, height: lerp(0.8, 0.05, k) };
  }
  // 3. The leaves.
  for (let i = 0; i < LEAVES.length; i++) {
    const leaf = LEAVES[i];
    if (t >= leaf.start && t < leaf.end) {
      const k = span(t, leaf.start, leaf.end);
      // The first touch breaks the surface and folds a line of crema under the new leaf's
      // leading edge. That line is what separates one leaf from the next.
      const breaking = leaf.breaks && k < 0.12;
      return {
        ...IDLE,
        y: breaking ? leaf.y + 0.085 : lerp(leaf.y, leaf.y + leaf.push, ease((k - 0.45) / 0.55)),
        flow: breaking ? 0 : leaf.flow * (k < 0.9 ? 1 : (1 - k) * 10),
        inject: 1,
        milk: breaking ? 0 : 1,
        tone: 0.3,
        radius: breaking ? leaf.radius * 1.85 : leaf.radius,
        drag: breaking ? 0 : FOLLOW,
        stream: 0.9,
        height: 0.05,
      };
    }
    // Stop, lift a touch, move back toward the pourer.
    const next = LEAVES[i + 1];
    const restEnd = next ? next.start : CUT[0];
    if (t >= leaf.end && t < restEnd) {
      const k = ease(span(t, leaf.end, restEnd));
      return { ...IDLE, y: lerp(leaf.y + leaf.push, next ? next.y : CUT_FROM, k), height: 0.05 + Math.sin(k * Math.PI) * (next ? 0.12 : 0.3) + (next ? 0 : k * 0.3) };
    }
  }
  // 4. Pull through: lifted, thin and quick, straight up the middle to the far rim. Its reach is
  // narrow, so it folds the centre of each leaf forward without dragging the wings with it.
  if (t >= CUT[0] && t < CUT[1]) {
    const k = ease(span(t, CUT[0], CUT[1]));
    return { ...IDLE, y: lerp(CUT_FROM, CUT_TO, k), drag: 0.7, dragWidth: 0.005, stream: 0.3, height: 0.35 };
  }
  if (t < CANVAS[0]) return { ...IDLE, x: 0.22, y: 0.1, height: 1 };
  // Done: the pitcher is taken right away, so the cup is left clear.
  return { ...IDLE, y: CUT_TO, height: lerp(0.35, 2.2, ease(span(t, CUT[1], CUT[1] + 0.5))) };
}

/** How full the cup is, 0 to 1. */
const fillAt = (t: number) => lerp(0.35, 1, t / CUT[0]);

const INIT = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
${NOISE_GLSL}
void main() {
  vec2 x = vUv * 2.0 - 1.0;
  // Fresh espresso: dark, mottled crema with finer streaks in it.
  float tone = 0.22 + 0.2 * fbm(x * 3.2) + 0.12 * fbm(x * 11.0);
  outColor = vec4(0.0, tone, 0.0, 1.0);
}`;

const STEP = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uState;
uniform vec2 uP;
uniform vec2 uVel;
uniform float uFlow, uInject, uMilk, uTone, uRadius, uDrag, uDragW, uDt;
void main() {
  vec2 x = vUv * 2.0 - 1.0;
  float r = length(x);
  vec2 d = x - uP;
  float d2 = dot(d, d);
  // Liquid arriving spreads the surface away from where it lands.
  vec2 v = uFlow * d / (d2 + 0.005);
  // The stream drags the surface along with it as it moves.
  v += uVel * uDrag * exp(-d2 / uDragW);
  // The cup wall turns outward flow sideways, so the pattern wraps around the rim.
  vec2 n = x / max(r, 1e-4);
  v -= n * max(dot(v, n), 0.0) * smoothstep(0.72, 0.98, r);
  vec4 s = texture(uState, (x - v * uDt) * 0.5 + 0.5);
  float blob = smoothstep(uRadius, uRadius * 0.45, length(d)) * uInject;
  float milk = mix(s.r, uMilk, blob);
  float tone = mix(s.g, uTone, blob * (1.0 - uMilk));
  outColor = vec4(r > 1.0 ? 0.0 : milk, tone, 0.0, 1.0);
}`;

const SHOW = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uState;
uniform vec2 uRes;
uniform vec2 uP;
uniform float uStream, uHeight, uTime, uFill, uTexel;
${NOISE_GLSL}

vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }

float milkAt(vec2 uv) {
  float e = uTexel * 1.2;
  return (texture(uState, uv).r * 4.0 + texture(uState, uv + vec2(e, 0)).r + texture(uState, uv - vec2(e, 0)).r + texture(uState, uv + vec2(0, e)).r + texture(uState, uv - vec2(0, e)).r) / 8.0;
}

// White marble with grey and near-black veining.
vec3 marble(vec2 p) {
  vec2 w = p + vec2(fbm(p * 1.3), fbm(p * 1.3 + 7.0)) * 0.9;
  float cloud = fbm(w * 1.6);
  vec3 col = mix(vec3(0.9, 0.9, 0.89), vec3(0.72, 0.73, 0.74), smoothstep(0.35, 0.75, cloud));
  float vein = abs(fbm(w * 2.2 + 3.0) - 0.5);
  col = mix(col, vec3(0.2, 0.21, 0.23), smoothstep(0.035, 0.0, vein) * smoothstep(0.4, 0.62, fbm(w * 0.9 + 11.0)));
  float fine = abs(fbm(w * 5.0 + 20.0) - 0.5);
  col = mix(col, vec3(0.45, 0.46, 0.48), smoothstep(0.015, 0.0, fine) * 0.5);
  return col * (0.94 + 0.08 * vnoise(p * 90.0));
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  // Light comes from the upper right, as through a window.
  vec2 L = normalize(vec2(0.6, 0.8));

  vec3 col = marble(p * 2.2 + 4.0);
  col *= 0.86 + 0.2 * smoothstep(-0.6, 0.6, dot(p, L));

  vec2 c = vec2(0.06, -0.04);
  float R = 0.4;
  vec2 q = p - c;
  float r = length(q) / R;

  // The cup's shadow on the marble, falling away from the light.
  float sh = smoothstep(1.22, 0.9, length(q + L * 0.085) / R);
  col *= 1.0 - 0.62 * sh;

  // ── Handle: glazed blue, out to the right ──
  vec2 hq = q - vec2(R * 1.14, R * 0.12);
  float handle = sdBox(hq, vec2(R * 0.17, R * 0.07)) - R * 0.05;
  vec3 hcol = mix(vec3(0.06, 0.13, 0.26), vec3(0.2, 0.36, 0.56), fbm(hq * 26.0));
  hcol += vec3(0.7, 0.85, 1.0) * exp(-pow((hq.y - R * 0.05) / (R * 0.03), 2.0)) * 0.45;
  col = mix(col, hcol, smoothstep(0.004, -0.004, handle));

  // ── The cup: terracotta, thick rim, glazed ──
  if (r < 1.0) {
    float a = atan(q.y, q.x);
    vec3 clay = mix(vec3(0.42, 0.15, 0.07), vec3(0.6, 0.25, 0.11), fbm(vec2(a * 3.0, r * 9.0)));
    // The rim is a rounded lip: bright along the side facing the light.
    float lip = smoothstep(0.93, 0.965, r) * smoothstep(1.0, 0.975, r);
    clay += vec3(1.0, 0.75, 0.55) * lip * pow(max(dot(normalize(q), L), 0.0), 3.0) * 0.5;
    clay *= 0.75 + 0.3 * smoothstep(0.9, 0.97, r);
    col = mix(col, clay, smoothstep(1.0, 0.99, r));
  }

  // ── The surface. It is lower in the cup, and so looks smaller and darker, until the cup is full. ──
  float rs = mix(0.78, 0.925, uFill);
  vec2 X = q / (R * rs);
  float rr = length(X);
  if (rr < 1.0) {
    // Shown from the drinker's side: the heart at the top, the stem toward the bottom.
    vec2 uvS = vec2(X.x, -X.y) * 0.5 + 0.5;
    float m = milkAt(uvS);
    float tone = texture(uState, uvS).g;
    float e = uTexel * 2.5;
    vec2 g = vec2(milkAt(uvS + vec2(e, 0)) - milkAt(uvS - vec2(e, 0)), milkAt(uvS - vec2(0, e)) - milkAt(uvS + vec2(0, e)));
    float milk = smoothstep(0.42, 0.6, m);
    float fringe = smoothstep(0.08, 0.44, m) * (1.0 - milk);

    // Crema: bright orange-brown, its lightness carried and marbled by the flow.
    float speck = fbm(X * 30.0);
    vec3 crema = mix(vec3(0.5, 0.2, 0.05), vec3(0.87, 0.5, 0.18), clamp(tone * 1.3 + (speck - 0.5) * 0.16, 0.0, 1.0));
    crema = mix(crema, vec3(0.6, 0.27, 0.08), smoothstep(0.78, 1.0, rr) * 0.6);
    crema *= 0.93 + 0.14 * smoothstep(0.4, 0.75, fbm(X * 64.0));

    // Bubbles: a ring of them where the crema meets the cup, and a few strays.
    vec2 cell = floor(X * 52.0);
    vec2 bc = (cell + 0.25 + 0.5 * hash22(cell)) / 52.0;
    float chance = mix(0.985, 0.72, smoothstep(0.8, 0.97, rr));
    float isBub = step(chance, hash21(cell + 2.0)) * (1.0 - milk);
    float bd = length(X - bc) * 52.0;
    float brad = 0.12 + 0.2 * hash21(cell + 9.0);
    crema = mix(crema, crema * 0.6, smoothstep(brad + 0.06, brad, bd) * isBub);
    crema += vec3(1.0, 0.85, 0.65) * smoothstep(0.08, 0.0, length((X - bc) * 52.0 - L * brad * 0.5)) * isBub * 0.9;

    // Foam: warm white, its thin edges stained by the coffee.
    vec3 foam = mix(vec3(0.97, 0.9, 0.76), vec3(1.0, 0.985, 0.94), smoothstep(0.55, 0.95, m));
    foam *= 0.97 + 0.045 * fbm(X * 80.0);
    vec3 surf = mix(crema, vec3(0.93, 0.68, 0.38), fringe * 0.92);
    surf = mix(surf, foam, milk);

    // The foam stands a little proud of the crema, so its edges catch the light.
    float relief = dot(g, L * vec2(1.0, 1.0));
    surf += vec3(1.0, 0.96, 0.88) * max(-relief, 0.0) * 1.1;
    surf *= 1.0 - max(relief, 0.0) * 1.3;

    // Inside wall of the cup shades the edge of the liquid, more when the cup is low.
    surf *= 1.0 - (0.5 - 0.3 * uFill) * smoothstep(0.55, 1.0, length(X + L * (1.0 - uFill) * 0.5));
    surf *= 1.0 - 0.3 * smoothstep(0.94, 1.0, rr);
    // The window, reflected in the wet surface toward the upper right.
    vec2 hl = X - L * 0.62;
    surf += vec3(1.0, 0.97, 0.92) * exp(-dot(hl * vec2(1.6, 2.6), hl * vec2(1.6, 2.6)) * 3.2) * 0.3 * (0.6 + 0.6 * fbm(X * 9.0));

    // Rings running out from where the stream lands.
    vec2 dl = X - vec2(uP.x, -uP.y);
    surf *= 1.0 + sin(length(dl) * 64.0 - uTime * 15.0) * exp(-length(dl) * 8.0) * uStream * 0.1;

    col = mix(col, surf, smoothstep(1.0, 0.985, rr));
  }

  // ── The pitcher, from above. The pourer stands at the top of the picture. ──
  vec2 land = c + vec2(uP.x, -uP.y) * R * rs;
  // Seen from above, a higher pitcher sits further up the frame from where its stream lands, and looks bigger.
  float lift = uHeight;
  float size = R * (0.44 + 0.1 * min(lift, 1.0));
  vec2 spout = land + vec2(-0.03, 0.04) + vec2(-0.16, 0.3) * lift + vec2(-0.3, 0.5) * max(lift - 1.0, 0.0);
  vec2 dir = normalize(vec2(-0.62, 0.78));
  vec2 jc = spout + dir * size * 1.08;
  // Its shadow falls on the cup and table, further off the higher it is held.
  vec2 so = -L * (0.03 + 0.14 * lift);
  float jsh = smoothstep(size * 1.1, size * 0.8, length(p - jc - so));
  col *= 1.0 - 0.4 * jsh * (1.0 - 0.5 * lift);

  // The stream, foreshortened: a short bright line from the spout to the surface.
  if (uStream > 0.01 && lift < 1.2) {
    float sd = sdSeg(p, spout, land) - mix(0.005, 0.011, uStream);
    col = mix(col, vec3(1.0, 0.985, 0.95), smoothstep(0.003, -0.003, sd));
    col = mix(col, vec3(1.0, 0.985, 0.94), smoothstep(0.03, 0.01, length(p - land)) * uStream * (1.0 - lift) * 0.85);
  }

  vec2 j = rot(p - jc, -atan(dir.x, dir.y));
  float body = length(j) - size;
  // The spout: the rim drawn out to a point toward the cup.
  float beak = max(abs(j.x) - (size * 0.36) * clamp((j.y + size * 1.12) / (size * 0.5), 0.0, 1.0), -j.y - size * 1.12);
  beak = max(beak, j.y + size * 0.6);
  float jug = min(body, beak);
  if (jug < 0.01) {
    float jm = smoothstep(0.004, -0.004, jug);
    // Steel wall, seen edge-on as a ring, then the milk inside.
    float wall = smoothstep(size * 0.93, size * 0.96, length(j));
    float ang = atan(j.y, j.x);
    vec3 steel = mix(vec3(0.42, 0.45, 0.49), vec3(0.92, 0.94, 0.96), 0.5 + 0.5 * sin(ang * 2.0 + 1.2));
    steel *= 0.85 + 0.2 * vnoise(vec2(ang * 40.0, 1.0));
    vec3 inside = mix(vec3(0.5, 0.53, 0.57), vec3(0.78, 0.8, 0.83), smoothstep(-size, size, dot(j, vec2(0.6, 0.8))));
    // Milk pools toward the spout as the jug tips.
    float level = smoothstep(size * 0.35, size * 0.15, j.y + size * (0.15 + 0.35 * lift));
    vec3 milkIn = mix(vec3(0.93, 0.9, 0.82), vec3(1.0, 0.99, 0.96), fbm(j * 30.0));
    inside = mix(inside, milkIn, level);
    vec3 jcol = mix(inside, steel, max(wall, step(0.0, body)));
    // Milk runs down the spout while pouring.
    jcol = mix(jcol, vec3(1.0, 0.985, 0.95), step(body, 0.02) * 0.0 + smoothstep(size * 0.12, 0.0, abs(j.x)) * step(0.0, body) * uStream);
    // Handle at the back.
    col = mix(col, jcol, jm);
    float grip = sdBox(j - vec2(0.0, size * 1.3), vec2(size * 0.12, size * 0.34)) - size * 0.04;
    col = mix(col, vec3(0.6, 0.63, 0.67) * (0.8 + 0.3 * smoothstep(-0.02, 0.02, j.x)), smoothstep(0.004, -0.004, max(grip, -body)));
  }

  col *= 1.0 - 0.22 * dot(p * vec2(0.8, 1.0), p * vec2(0.8, 1.0));
  col += (hash21(gl_FragCoord.xy) - 0.5) * 0.012;
  outColor = vec4(col, 1.0);
}`;

export function LattePour() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
    if (!gl) return;
    const init = compile(gl, INIT);
    const step = compile(gl, STEP);
    const show = compile(gl, SHOW);
    const a = createTarget(gl, SIZE);
    const b = createTarget(gl, SIZE);
    if (!init || !step || !show || !a || !b) return;
    const vao = fullscreenTriangle(gl);
    const panel = canvas.closest<HTMLElement>("[data-panel]");

    const uniforms = (program: WebGLProgram, names: string[]) =>
      Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(program, n)])) as Record<string, WebGLUniformLocation | null>;
    const su = uniforms(step, ["uState", "uP", "uVel", "uFlow", "uInject", "uMilk", "uTone", "uRadius", "uDrag", "uDragW", "uDt"]);
    const du = uniforms(show, ["uState", "uRes", "uP", "uStream", "uHeight", "uTime", "uFill", "uTexel"]);

    let read: Target = a;
    let write: Target = b;
    let simTime = 0;
    let stream = 0;

    /** A fresh shot of espresso. */
    const reset = () => {
      gl.bindVertexArray(vao);
      gl.viewport(0, 0, SIZE, SIZE);
      gl.useProgram(init);
      for (const t of [a, b]) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, t.framebuffer);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      simTime = 0;
    };
    reset();

    /** Advance the surface one tick. */
    const tick = () => {
      const now = pourAt(simTime);
      const next = pourAt(simTime + DT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, write.framebuffer);
      gl.viewport(0, 0, SIZE, SIZE);
      gl.useProgram(step);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, read.texture);
      gl.uniform1i(su.uState, 0);
      gl.uniform2f(su.uP, now.x, now.y);
      // Only a running stream moves the surface.
      const moving = now.stream > 0 && next.stream > 0 ? 1 : 0;
      gl.uniform2f(su.uVel, ((next.x - now.x) / DT) * moving, ((next.y - now.y) / DT) * moving);
      gl.uniform1f(su.uFlow, now.flow);
      gl.uniform1f(su.uInject, now.inject);
      gl.uniform1f(su.uMilk, now.milk);
      gl.uniform1f(su.uTone, now.tone);
      gl.uniform1f(su.uRadius, now.radius);
      gl.uniform1f(su.uDrag, now.drag);
      gl.uniform1f(su.uDragW, now.dragWidth);
      gl.uniform1f(su.uDt, DT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      [read, write] = [write, read];
      simTime += DT;
    };

    let raf = 0;
    let onScreen = false;
    const start = performance.now();

    const draw = (nowMs: number) => {
      raf = 0;
      const q = panel ? parseFloat(panel.style.getPropertyValue("--q")) || 0 : 0;
      const target = Math.max(0, Math.min(1, (q - 0.04) / 0.84)) * DURATION;
      gl.bindVertexArray(vao);
      // Scrolled back: pull a fresh shot and pour up to here again.
      if (target < simTime - DT * 2) reset();
      // Catch up over a few frames if there is a lot to replay, so scrolling never stalls.
      let budget = 240;
      while (simTime < target && budget-- > 0) tick();
      const behind = simTime < target - DT;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(2, Math.round(rect.width * dpr));
      const h = Math.max(2, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const pour = pourAt(simTime);
      stream += (pour.stream - stream) * 0.3;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.useProgram(show);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, read.texture);
      gl.uniform1i(du.uState, 0);
      gl.uniform2f(du.uRes, w, h);
      gl.uniform2f(du.uP, pour.x, pour.y);
      gl.uniform1f(du.uStream, stream);
      gl.uniform1f(du.uHeight, pour.height);
      gl.uniform1f(du.uTime, (nowMs - start) / 1000);
      gl.uniform1f(du.uFill, fillAt(simTime));
      gl.uniform1f(du.uTexel, 1 / SIZE);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (behind || (onScreen && (!panel || panel.style.visibility !== "hidden"))) raf = requestAnimationFrame(draw);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const io = new IntersectionObserver((entries) => {
      onScreen = entries.some((e) => e.isIntersecting);
      if (onScreen) kick();
    });
    io.observe(canvas);
    const onScroll = () => {
      if (onScreen) kick();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    kick();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // The wrapper fixes the size; the canvas fills it without being able to stretch it.
  return (
    <div className="latte">
      <canvas ref={ref} role="img" aria-label="A stacked tulip being poured, seen from above: the base is built from height, the pitcher comes down, leaves are stacked one into the next, and the last is pulled through into a heart with a stem." />
    </div>
  );
}
