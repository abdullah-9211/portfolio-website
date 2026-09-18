"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

// Node colors: a neutral paper start, then the exact five hero-glow /
// word-cycle colors (see globals.css @keyframes glow-color-cycle) in the
// same order they play on the hero — Engineer mint, Founder violet,
// Baller orange, Coffee Guy crema, Gamer cyan — cycling across the eight
// real sections. The very first thing a visitor saw on this site was
// those five colors cycling through a halo behind the hero text; the very
// last thing they see is the same five colors, walked once across the
// whole scroll, arriving back at pure signal mint for the burst — a
// deliberate bookend, not a new unrelated palette.
const PAPER = "#f5f3ee";
const CYCLE = ["#35e8b8", "#a85de8", "#e8720c", "#e4c9a0", "#4cd3ff"];
const SIGNAL = "#35e8b8";
const VOID_MAT = "#0d1410"; // near-black base so emissive color carries the visible brightness, same trick MedalModel/CareerThreadModel use

// 00 Hero + 01..08 (About through Off-duty) — the site's own real section
// count and order (see SectionHeading index props across the codebase).
const STOP_COUNT = 9;

function stopColor(i: number) {
  return i === 0 ? PAPER : CYCLE[(i - 1) % CYCLE.length];
}

// What each node actually IS, on the real page — the client's "make it
// user facing" ask, taken literally: this turns the constellation from a
// pure spectacle into a legible mini-map of the site. `id` matches every
// section's real anchor (SectionHeading's `id` prop / Hero's "#top", all
// of which already carry `scroll-mt-24` for the fixed nav), `label`
// mirrors the exact "NN — Title" convention SectionHeading itself uses,
// so a hovered node reads as "the same numbering you scrolled past,"
// not a new naming scheme invented just for this animation.
const NODE_META: { id: string; label: string }[] = [
  { id: "top", label: "Hero" },
  { id: "about-heading", label: "01 — Who I am" },
  { id: "experience-heading", label: "02 — Where I've worked" },
  { id: "ventures-heading", label: "03 — What I've built" },
  { id: "projects-heading", label: "04 — For fun" },
  { id: "skills-heading", label: "05 — Stack" },
  { id: "certifications-heading", label: "06 — Proof" },
  { id: "education-heading", label: "07 — School" },
  { id: "offduty-heading", label: "08 — Off duty" },
];

type Vec3 = [number, number, number];

// A gently rising path, left to right, decelerating toward the top — the
// literal shape of "progress" — landing near top-right at the last real
// section (Off-duty), then one final segment sweeps back to a centered
// arrival point above it all: the signal breaking off the path it just
// walked and converging on exactly where "LET'S BUILD." sits below.
// A gentle rise left-to-right with a light organic wobble layered on top
// (pure monotonic rise read as a flat ruler at true render size — caught
// by screenshotting — the sine term keeps the sequence still legibly
// left-to-right while breaking that straight-line look into something
// that actually reads as a constellation). Bounds are sized to fill a
// SQUARE canvas edge-to-edge with a small margin (see JourneyVisual's
// camera), not to sit small in a corner of a much bigger box — the exact
// failure mode this scene replaces.
//
// PATH_Y_OFFSET: the client's own words — "move it a little down its
// being cut from above." The path's highest points (the last real stops,
// and especially the arrival burst's outer halo/sparkles above them) sat
// close enough to the top of the camera's frustum that the outer bloom
// genuinely clipped against the render bounds, not just the DOM box —
// verified against JourneyVisual's camera math (fov 40 at the old
// z-distance gave less vertical headroom than the burst's own radius
// needed). Shifting every local Y coordinate down by a fixed amount, and
// separately pulling the camera back a bit in JourneyVisual, both move
// the same needle: this constant is the "move it down" half of that fix.
const PATH_Y_OFFSET = -0.65;

// Span widened from 3.9 to 5.7 (~1.46x) to match JourneyVisual's canvas
// going from a square to a landscape box (sm+ aspect ~1.4-1.5) — client
// follow-up: "animation needs to be horizontally bigger... every node too
// crammed together." The wider canvas alone doesn't help if the nodes
// still cluster in the old, narrower span; this uses the new room.
const STOPS: { pos: Vec3; color: string; radius: number }[] = Array.from(
  { length: STOP_COUNT },
  (_, i) => {
    const f = i / (STOP_COUNT - 1);
    const x = -2.85 + f * 5.7;
    const y =
      PATH_Y_OFFSET +
      -1.85 +
      Math.pow(f, 0.8) * 2.15 +
      Math.sin(f * Math.PI * 1.4) * 0.22;
    const radius = 0.1 + f * 0.075;
    return { pos: [x, y, 0] as Vec3, color: stopColor(i), radius };
  }
);

const ARRIVAL: { pos: Vec3; color: string } = {
  pos: [0.05, 1.65 + PATH_Y_OFFSET, 0.4],
  color: SIGNAL,
};

const PATH: Vec3[] = [...STOPS.map((s) => s.pos), ARRIVAL.pos];
const SEGMENTS = PATH.length - 1; // 9

const SEG_TIME = 0.42; // seconds per hop — the bead's whole crossing takes SEGMENTS * SEG_TIME
const PLAY_DURATION = SEGMENTS * SEG_TIME;
const POP_WINDOW = 0.22; // how long a node/segment takes to fade+pop in once the bead reaches it
const BURST_WINDOW = 0.65; // arrival core's own pop-in, after PLAY_DURATION
const SHOCK_WINDOW = 0.5; // how long the arrival shockwave ring takes to expand and fade
const SHOCK_BASE_SCALE = 0.6;
const SHOCK_GROWTH = 1.6; // kept modest on purpose — see the ring's own comment below on why
const SPARKLE_COUNT = 18;
const AMBIENT_LOOP_TIME = 7; // seconds for the slow post-arrival shimmer to re-walk the whole path

const STAR_COUNT = 60;

/** Standard "ease out back" — 0 at x=0, a slight overshoot, settles at 1. */
function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

function lerpVec(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Explicit no-op raycast — marks a mesh purely decorative so it can never
 * block, or accidentally double-fire, pointer events meant for the
 * actually-interactive nodes and arrival burst layered around it (stars,
 * nebula wash, thread segments, sparkles, the shockwave ring). Passed as
 * the `raycast` prop, which three.js calls per-object during hit
 * testing; doing nothing means the object is silently skipped. */
function noRaycast() {
  return;
}

/**
 * A quiet field of tiny fixed background dots — pure set-dressing so the
 * constellation reads as sitting in an actual night sky rather than
 * floating on flat void. Fully static (no refs, no useFrame): cheap, and
 * needs no reduced-motion handling since nothing about it ever moves.
 * Count bumped from the original 30 to 60 per the "add more detail, it's
 * too basic" feedback — a denser sky is the cheapest possible upgrade
 * that still costs nothing at render time.
 */
function StarField() {
  const stars = useMemo(
    () =>
      Array.from({ length: STAR_COUNT }, (_, i) => {
        // Deterministic pseudo-scatter (not Math.random) so the memoized
        // layout is stable across re-renders/remounts.
        const a = (i * 37.1) % 6.283;
        const r = 1.5 + ((i * 53) % 100) / 100 * 1.9;
        const x = Math.cos(a) * r;
        const y = Math.sin(a * 1.3) * 1.9 + 0.1 + PATH_Y_OFFSET * 0.3;
        const z = -1.1 - ((i * 17) % 100) / 100;
        const size = 0.012 + ((i * 29) % 100) / 100 * 0.022;
        const opacity = 0.18 + ((i * 41) % 100) / 100 * 0.26;
        return { pos: [x, y, z] as Vec3, size, opacity };
      }),
    []
  );

  return (
    <>
      {stars.map((s, i) => (
        <mesh key={i} position={s.pos} raycast={noRaycast}>
          <sphereGeometry args={[s.size, 5, 5]} />
          <meshStandardMaterial
            color={VOID_MAT}
            emissive={PAPER}
            emissiveIntensity={0.6}
            transparent
            opacity={s.opacity}
          />
        </mesh>
      ))}
    </>
  );
}

/**
 * A very faint two-color wash sitting well behind the star field — pure
 * ambient atmosphere, not a second focal point. Two large, low-opacity,
 * low-poly spheres in two of the hero's own cycle colors (violet + the
 * signal mint), off-center so the wash reads as asymmetric light rather
 * than a flat vignette. Deliberately restrained: opacity stays under 0.06
 * so it never competes with the burst for attention, only gives the void
 * behind the constellation a little more depth on closer inspection —
 * exactly the "rewards a closer look" brief. Static like StarField, for
 * the same reason: nothing here ever moves, so no reduced-motion gating
 * is needed, and raycast is disabled so it can never sit between the
 * cursor and an interactive node.
 */
function NebulaWash() {
  return (
    <>
      <mesh position={[-1.1, 0.3 + PATH_Y_OFFSET * 0.4, -1.7]} raycast={noRaycast}>
        <sphereGeometry args={[2.1, 16, 16]} />
        <meshStandardMaterial
          color={VOID_MAT}
          emissive={CYCLE[1]}
          emissiveIntensity={0.5}
          transparent
          opacity={0.055}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[1.3, -0.5 + PATH_Y_OFFSET * 0.4, -1.9]} raycast={noRaycast}>
        <sphereGeometry args={[1.9, 16, 16]} />
        <meshStandardMaterial
          color={VOID_MAT}
          emissive={SIGNAL}
          emissiveIntensity={0.5}
          transparent
          opacity={0.05}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

/**
 * The Contact section's visual centerpiece — a large 3D "journey map": a
 * traveling signal bead walks a connected path of nine markers (one per
 * site section, in the exact color the hero's own word-cycle used for
 * each), then breaks off toward one bright convergence point that bursts
 * right where the headline below resolves. This replaces the earlier
 * SignalArrival accent (a short static line + a single quiet pulsing dot)
 * per the client's explicit "almost no change... add something good...
 * good animation" feedback on this section — this is deliberately the
 * biggest, most orchestrated animation on the page, matching the scale of
 * the Education medal / Experience spaceship / Off-duty illustrations
 * rather than undercutting them with restraint again.
 *
 * Second round of client feedback — "amazing... but too basic, needs
 * detailing and interactive, also move it down it's being cut from
 * above" — is what everything below this point in the file answers:
 * - Clipping: see PATH_Y_OFFSET above, plus JourneyVisual's camera pull-
 *   back — both move the same needle, "down and with more headroom."
 * - More detail: a denser star field, a faint nebula wash behind it all,
 *   a thin halo ring per node, a one-shot shockwave ring at the moment of
 *   arrival, and more/varied-size sparkles in the burst.
 * - More interactive / "user facing": hovering a node reveals which real
 *   section it is (an actual mini-map of the site, not just a light
 *   show); clicking a node smooth-scrolls to that section; the whole
 *   scene leans subtly toward the cursor; hovering the arrival burst
 *   itself brightens it, inviting the existing click-to-replay. None of
 *   this replaces "click anywhere replays" — node clicks stop
 *   propagation so they don't also trigger it, but every other click
 *   (empty space, the thread, the burst) still does.
 *
 * Reduced-motion / pre-play / no-JS resting frame: every mesh's own JSX
 * default props (scale 1, opacity 1, full emissive) already equal the
 * animation's own settled end state — "arrived," not mid-journey — the
 * same convention every model in this codebase follows. `useFrame` only
 * ever overwrites those defaults when `animate` is true, and only once
 * `playToken` has actually incremented past its initial value; until
 * then (or whenever `animate` is false) nothing here is touched, so the
 * static output is always the complete, correct finished scene. The two
 * new interactions (hover tooltip, click-to-scroll) are discrete and
 * user-driven rather than autoplaying motion, so both stay available
 * under reduced motion; the one new *continuous* loop (cursor parallax)
 * is gated behind the same `animate` flag as everything else, so it
 * never runs when the visitor has asked for less motion.
 */
export function JourneyModel({
  animate,
  playToken,
  onArrive,
}: {
  animate: boolean;
  playToken: number;
  onArrive?: () => void;
}) {
  const sceneRef = useRef<THREE.Group>(null);
  const nodeGroupRefs = useRef<(THREE.Group | null)[]>([]);
  const nodeMatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const segMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const segMatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const beadRef = useRef<THREE.Mesh>(null);
  const beadMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const arrivalRef = useRef<THREE.Group>(null);
  const arrivalMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const arrivalHaloMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const arrivalOuterHaloMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const shockwaveMeshRef = useRef<THREE.Mesh>(null);
  const shockwaveMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const sparkleRefs = useRef<(THREE.Mesh | null)[]>([]);
  const sparkleMatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const ambientBeadRef = useRef<THREE.Mesh>(null);
  const ambientMatRef = useRef<THREE.MeshStandardMaterial>(null);

  const phase = useRef<"pre" | "playing" | "settled">(animate ? "pre" : "settled");
  const t = useRef(0);
  const idleT = useRef(Math.random() * 6);
  const firedArriveRef = useRef(false);
  const prevToken = useRef(playToken);

  // Hover state for the "mini-map" behavior: which node (by STOPS index)
  // is currently under the pointer, if any. Drives the floating <Html>
  // label; the node's own scale/glow bump is applied imperatively in the
  // handlers below (see their comments for why), not from this state.
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const prevEmissiveRef = useRef<number[]>([]);
  const arrivalHoverRef = useRef(false);
  const prevArrivalEmissiveRef = useRef(1.6);

  const sparkles = useMemo(
    () =>
      Array.from({ length: SPARKLE_COUNT }, (_, i) => {
        const angle = (i / SPARKLE_COUNT) * Math.PI * 2;
        const radius = 0.85 + ((i * 31) % 3) * 0.14;
        // Varied size per sparkle (deterministic, same pseudo-random
        // convention as StarField) — a uniform field of identical motes
        // reads as a sprite sheet; slightly uneven sizes read as debris.
        const size = 0.028 + ((i * 53) % 100) / 100 * 0.05;
        return {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius * 0.85,
          z: 0.2 + Math.sin(angle * 1.6) * 0.16,
          delay: (i / SPARKLE_COUNT) * 0.35,
          phase: i * 0.9,
          size,
        };
      }),
    []
  );

  // Segment quaternions/lengths are fixed layout data (the path never
  // changes shape) — computed once, same edge-math ValkrixNeuralNetModel
  // uses for its node-to-node connectors.
  const segGeometry = useMemo(
    () =>
      Array.from({ length: SEGMENTS }, (_, i) => {
        const a = PATH[i];
        const b = PATH[i + 1];
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const dz = b[2] - a[2];
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const dir = new THREE.Vector3(dx, dy, dz).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        const midpoint: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
        const color = i === SEGMENTS - 1 ? SIGNAL : STOPS[i + 1]?.color ?? SIGNAL;
        return { midpoint, quaternion: quat, length, color };
      }),
    []
  );

  // A new playToken (first scroll-into-view, or a replay click) starts a
  // fresh run from the very beginning.
  useEffect(() => {
    if (!animate) return;
    if (playToken === prevToken.current) return;
    prevToken.current = playToken;
    t.current = 0;
    firedArriveRef.current = false;
    phase.current = "playing";
  }, [playToken, animate]);

  // --- Node interaction handlers -------------------------------------
  // Hover: bump the node's own scale/glow directly (imperative, not via
  // React state) so it works identically whether `useFrame` is currently
  // running a phase loop or not — under reduced motion `animate` is
  // false and useFrame never executes at all, so an imperative set here
  // is the *only* way the hover feedback can show. `hoveredNode` state
  // exists purely to drive the <Html> label, which is a real React tree,
  // not an imperative mesh property.
  function handleNodePointerOver(i: number, e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    setHoveredNode(i);
    nodeGroupRefs.current[i]?.scale.setScalar(1.22);
    const mat = nodeMatRefs.current[i];
    if (mat) {
      prevEmissiveRef.current[i] = mat.emissiveIntensity;
      mat.emissiveIntensity = 1.9;
    }
  }

  function handleNodePointerOut(i: number, e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    setHoveredNode((cur) => (cur === i ? null : cur));
    nodeGroupRefs.current[i]?.scale.setScalar(1);
    const mat = nodeMatRefs.current[i];
    if (mat) mat.emissiveIntensity = prevEmissiveRef.current[i] ?? 1;
  }

  // Click: the "strongest possible user-facing" reading of this scene —
  // turn each node into a real jump-link to the section it represents.
  // `e.nativeEvent.stopPropagation()` stops the underlying DOM click from
  // bubbling up to JourneyVisual's own container, which listens for
  // clicks anywhere in the canvas to replay the whole sequence — without
  // this, clicking a node would navigate *and* immediately replay.
  // Anything that isn't a node (empty space, the thread, the burst) never
  // reaches this handler, so it still falls through to that replay
  // behavior untouched, exactly as the brief asks for.
  function handleNodeClick(i: number, e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    e.nativeEvent.stopPropagation();
    if (typeof document === "undefined") return;
    const target = document.getElementById(NODE_META[i].id);
    target?.scrollIntoView({ behavior: animate ? "smooth" : "auto", block: "start" });
  }

  // Arrival burst hover: a direct emissive nudge (not a new animation) so
  // the burst "invites the click" the client asked for — reset on
  // pointer-out. Under `animate`, the settled idle loop below folds this
  // same ref into its own per-frame brightness formula so the hover boost
  // keeps pulsing along with everything else instead of freezing it.
  function handleArrivalPointerOver(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    arrivalHoverRef.current = true;
    if (arrivalMatRef.current) {
      prevArrivalEmissiveRef.current = arrivalMatRef.current.emissiveIntensity;
      arrivalMatRef.current.emissiveIntensity = prevArrivalEmissiveRef.current + 0.9;
    }
  }

  function handleArrivalPointerOut(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    arrivalHoverRef.current = false;
    if (arrivalMatRef.current) {
      arrivalMatRef.current.emissiveIntensity = prevArrivalEmissiveRef.current;
    }
  }

  useFrame((state, delta) => {
    if (!animate) return;

    // Cursor-reactive parallax — applied to the *whole* scene rather than
    // any one element, so the piece as a whole reads as responding to the
    // visitor rather than just performing at them. Deliberately small (a
    // few degrees at most) so it never fights the burst's own framing.
    // This is a genuinely continuous per-frame loop, so it lives behind
    // the same `animate` gate as everything else here — under reduced
    // motion this whole block is simply never reached.
    if (sceneRef.current) {
      const targetRotY = state.pointer.x * 0.12;
      const targetRotX = -state.pointer.y * 0.07;
      const damp = Math.min(1, delta * 3.5);
      sceneRef.current.rotation.y += (targetRotY - sceneRef.current.rotation.y) * damp;
      sceneRef.current.rotation.x += (targetRotX - sceneRef.current.rotation.x) * damp;
    }

    if (phase.current === "pre") {
      // Nothing has walked the path yet — every marker, segment and the
      // arrival core sit fully hidden/collapsed, the true "before" frame.
      nodeGroupRefs.current.forEach((g) => g?.scale.setScalar(0));
      nodeMatRefs.current.forEach((m) => {
        if (m) m.opacity = 0;
      });
      segMatRefs.current.forEach((m) => {
        if (m) m.opacity = 0;
      });
      if (arrivalRef.current) arrivalRef.current.scale.setScalar(0);
      if (shockwaveMatRef.current) shockwaveMatRef.current.opacity = 0;
      if (beadRef.current) beadRef.current.visible = false;
      if (ambientBeadRef.current) ambientBeadRef.current.visible = false;
      return;
    }

    if (phase.current === "playing") {
      t.current += delta;
      const t0 = t.current;

      for (let i = 0; i < STOP_COUNT; i++) {
        const localT = clamp01((t0 - i * SEG_TIME) / POP_WINDOW);
        const raw = easeOutBack(localT);
        nodeGroupRefs.current[i]?.scale.setScalar(Math.max(0, raw));
        const mat = nodeMatRefs.current[i];
        if (mat) {
          mat.opacity = Math.min(1, raw);
          mat.emissiveIntensity = 0.9 + Math.min(1, raw) * 0.4;
        }
      }

      for (let i = 0; i < SEGMENTS; i++) {
        const localT = clamp01((t0 - i * SEG_TIME) / POP_WINDOW);
        const mat = segMatRefs.current[i];
        if (mat) {
          mat.opacity = localT * 0.85;
          mat.emissiveIntensity = 0.5 + localT * 1.1;
        }
      }

      if (beadRef.current) {
        const phaseFloat = clamp01(t0 / PLAY_DURATION) * SEGMENTS;
        const segIndex = Math.min(Math.floor(phaseFloat), SEGMENTS - 1);
        const localT = phaseFloat - segIndex;
        const pos = lerpVec(PATH[segIndex], PATH[segIndex + 1], localT);
        beadRef.current.visible = t0 < PLAY_DURATION;
        beadRef.current.position.set(pos[0], pos[1], pos[2]);
        if (beadMatRef.current) {
          beadMatRef.current.emissiveIntensity = 1.6 + Math.sin(t0 * 14) * 0.5;
        }
      }

      const arriveLocal = clamp01((t0 - PLAY_DURATION) / BURST_WINDOW);
      if (arrivalRef.current) {
        arrivalRef.current.scale.setScalar(Math.max(0, easeOutBack(arriveLocal)));
      }
      if (arrivalMatRef.current) {
        arrivalMatRef.current.emissiveIntensity = 1.3 + arriveLocal * 2.2;
      }
      if (arrivalHaloMatRef.current) {
        arrivalHaloMatRef.current.opacity = arriveLocal * 0.4;
      }
      if (arrivalOuterHaloMatRef.current) {
        arrivalOuterHaloMatRef.current.opacity = arriveLocal * 0.18;
      }

      // One-shot expanding-ring shockwave, timed to the same moment the
      // core pops in — the "brief shockwave-ring expansion at the moment
      // of arrival" from the brief. Growth is kept modest (see the ring's
      // own JSX comment) so even mid-expansion it stays inside the
      // camera's frustum rather than reintroducing the exact edge-
      // clipping this whole pass is meant to fix.
      if (t0 < PLAY_DURATION) {
        if (shockwaveMatRef.current) shockwaveMatRef.current.opacity = 0;
      } else {
        const shockLocal = clamp01((t0 - PLAY_DURATION) / SHOCK_WINDOW);
        shockwaveMeshRef.current?.scale.setScalar(SHOCK_BASE_SCALE + shockLocal * SHOCK_GROWTH);
        if (shockwaveMatRef.current) {
          shockwaveMatRef.current.opacity = (1 - shockLocal) * 0.5;
        }
      }

      sparkleRefs.current.forEach((mesh, i) => {
        if (!mesh) return;
        const s = sparkles[i];
        const localT = clamp01((t0 - PLAY_DURATION - s.delay) / (BURST_WINDOW * 0.8));
        const eased = easeOutBack(localT);
        mesh.position.set(s.x * eased, s.y * eased, ARRIVAL.pos[2] + s.z);
        const mat = sparkleMatRefs.current[i];
        if (mat) mat.opacity = Math.min(1, eased) * 0.9;
      });

      if (t0 >= PLAY_DURATION && !firedArriveRef.current) {
        firedArriveRef.current = true;
        onArrive?.();
      }

      if (t0 >= PLAY_DURATION + BURST_WINDOW) {
        phase.current = "settled";
      }
      return;
    }

    // phase === "settled" — everything stays fully arrived; only a
    // restrained idle life continues, same register as the ribbon-shimmer
    // / verified-seal precedents (ambient detail on an otherwise static
    // scene, not a second competing motion beat).
    idleT.current += delta;
    const arrivalHoverBoost = arrivalHoverRef.current ? 0.9 : 0;
    if (arrivalMatRef.current) {
      arrivalMatRef.current.emissiveIntensity =
        1.6 + Math.sin(idleT.current * 1.5) * 0.55 + arrivalHoverBoost;
    }
    if (arrivalHaloMatRef.current) {
      arrivalHaloMatRef.current.opacity = 0.32 + Math.sin(idleT.current * 1.5) * 0.1;
    }
    if (arrivalOuterHaloMatRef.current) {
      arrivalOuterHaloMatRef.current.opacity = 0.16 + Math.sin(idleT.current * 1.5) * 0.05;
    }
    sparkleMatRefs.current.forEach((mat, i) => {
      if (!mat) return;
      mat.opacity = 0.55 + Math.sin(idleT.current * 1.7 + sparkles[i].phase) * 0.35;
    });

    if (ambientBeadRef.current) {
      ambientBeadRef.current.visible = true;
      const phaseFloat = ((idleT.current % AMBIENT_LOOP_TIME) / AMBIENT_LOOP_TIME) * SEGMENTS;
      const segIndex = Math.min(Math.floor(phaseFloat), SEGMENTS - 1);
      const localT = phaseFloat - segIndex;
      const pos = lerpVec(PATH[segIndex], PATH[segIndex + 1], localT);
      ambientBeadRef.current.position.set(pos[0], pos[1], pos[2]);
      if (ambientMatRef.current) {
        ambientMatRef.current.opacity = 0.35 + Math.sin(idleT.current * 3) * 0.15;
      }
    }
  });

  return (
    <group ref={sceneRef}>
      <NebulaWash />
      <StarField />

      {segGeometry.map((seg, i) => (
        <mesh
          key={i}
          ref={(el) => {
            segMeshRefs.current[i] = el;
          }}
          position={seg.midpoint}
          quaternion={seg.quaternion}
          raycast={noRaycast}
        >
          <cylinderGeometry args={[0.03, 0.03, seg.length, 7]} />
          <meshStandardMaterial
            ref={(el) => {
              segMatRefs.current[i] = el;
            }}
            color={VOID_MAT}
            emissive={seg.color}
            emissiveIntensity={0.5}
            transparent
            opacity={1}
            roughness={0.6}
          />
        </mesh>
      ))}

      {STOPS.map((s, i) => {
        // Deterministic per-node tilt for the halo ring (same
        // pseudo-random convention as StarField/sparkles) — scattered
        // small angles so the rings read as loosely-faced halos rather
        // than a uniform row of identical coins.
        const ringTiltX = ((i * 47) % 10) / 10 * 0.5 - 0.25;
        const ringTiltY = ((i * 83) % 10) / 10 * 0.9 - 0.45;
        return (
          <group
            key={i}
            ref={(el) => {
              nodeGroupRefs.current[i] = el;
            }}
            position={s.pos}
          >
            <mesh
              onPointerOver={(e: ThreeEvent<PointerEvent>) => handleNodePointerOver(i, e)}
              onPointerOut={(e: ThreeEvent<PointerEvent>) => handleNodePointerOut(i, e)}
              onClick={(e: ThreeEvent<PointerEvent>) => handleNodeClick(i, e)}
            >
              <sphereGeometry args={[s.radius, 12, 12]} />
              <meshStandardMaterial
                ref={(el) => {
                  nodeMatRefs.current[i] = el;
                }}
                color={VOID_MAT}
                emissive={s.color}
                emissiveIntensity={1}
                transparent
                opacity={1}
                roughness={0.4}
              />
            </mesh>
            {/* Thin halo ring — pure detail, no separate animation of its
                own: it's a child of this same group, so it pops in and
                out in lockstep with the node's own scale for free. */}
            <mesh rotation={[ringTiltX, ringTiltY, 0]} raycast={noRaycast}>
              <ringGeometry args={[s.radius * 1.55, s.radius * 1.95, 24]} />
              <meshStandardMaterial
                color={VOID_MAT}
                emissive={s.color}
                emissiveIntensity={0.8}
                transparent
                opacity={0.4}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Hover label — the "mini-map" payoff: tells the visitor
                exactly which real section this marker represents, using
                the site's own "NN — Title" numbering so it reads as the
                same system, not a new one invented for this scene. */}
            {hoveredNode === i && (
              <Html
                position={[0, s.radius + 0.16, 0]}
                center
                occlude={false}
                style={{ pointerEvents: "none" }}
              >
                <div className="whitespace-nowrap rounded border border-line bg-void/85 px-2 py-1 font-mono text-[11px] text-paper backdrop-blur-sm">
                  {NODE_META[i].label}
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* traveling signal bead — the one thing that actually walks the
          whole path, only ever present mid-play (no single "correct"
          static position exists for it, same reasoning
          CareerThreadModel's TravelingSpaceship uses) */}
      <mesh ref={beadRef} visible={false} raycast={noRaycast}>
        <sphereGeometry args={[0.085, 12, 12]} />
        <meshStandardMaterial
          ref={beadMatRef}
          color={VOID_MAT}
          emissive={SIGNAL}
          emissiveIntensity={1.8}
        />
      </mesh>

      {/* slow post-arrival shimmer bead — only ever visible once settled */}
      <mesh ref={ambientBeadRef} visible={false} raycast={noRaycast}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial
          ref={ambientMatRef}
          color={VOID_MAT}
          emissive={SIGNAL}
          emissiveIntensity={1.4}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* one-shot arrival shockwave — a flat expanding ring, faded and
          essentially invisible by the time it's grown large; kept as a
          sibling of the arrival group (not nested in it) so its own
          scale animation doesn't compound with the burst's pop-in
          scale. */}
      <mesh ref={shockwaveMeshRef} position={ARRIVAL.pos} raycast={noRaycast}>
        <ringGeometry args={[0.3, 0.4, 48]} />
        <meshStandardMaterial
          ref={shockwaveMatRef}
          color={VOID_MAT}
          emissive={SIGNAL}
          emissiveIntensity={1.4}
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* arrival — the biggest, brightest point: where the whole path
          converges, directly above the closing headline. Hover handlers
          sit on the group so hovering any layer of the burst (mainly the
          big outer halo, which sits closest to camera along a central
          ray and so is what actually receives the pointer) brightens the
          whole thing and invites the existing click-to-replay. */}
      <group
        ref={arrivalRef}
        position={ARRIVAL.pos}
        onPointerOver={handleArrivalPointerOver}
        onPointerOut={handleArrivalPointerOut}
      >
        {/* outermost, faintest halo — widest bloom */}
        <mesh>
          <sphereGeometry args={[0.95, 16, 16]} />
          <meshStandardMaterial
            ref={arrivalOuterHaloMatRef}
            color={VOID_MAT}
            emissive={SIGNAL}
            emissiveIntensity={1}
            transparent
            opacity={0.16}
            depthWrite={false}
          />
        </mesh>
        {/* mid halo — a larger, low-opacity sphere behind the core; the
            cheap "no postprocessing" glow trick this codebase already uses
            for shine (MedalModel's sparkle motes are the same idea). */}
        <mesh raycast={noRaycast}>
          <sphereGeometry args={[0.55, 16, 16]} />
          <meshStandardMaterial
            ref={arrivalHaloMatRef}
            color={VOID_MAT}
            emissive={SIGNAL}
            emissiveIntensity={1.2}
            transparent
            opacity={0.32}
            depthWrite={false}
          />
        </mesh>
        <mesh raycast={noRaycast}>
          <sphereGeometry args={[0.26, 18, 18]} />
          <meshStandardMaterial
            ref={arrivalMatRef}
            color={VOID_MAT}
            emissive={SIGNAL}
            emissiveIntensity={1.6}
            roughness={0.3}
          />
        </mesh>
        {sparkles.map((s, i) => (
          <mesh
            key={i}
            ref={(el) => {
              sparkleRefs.current[i] = el;
            }}
            position={[s.x, s.y, s.z]}
            raycast={noRaycast}
          >
            <sphereGeometry args={[s.size, 6, 6]} />
            <meshStandardMaterial
              ref={(el) => {
                sparkleMatRefs.current[i] = el;
              }}
              color={VOID_MAT}
              emissive={PAPER}
              emissiveIntensity={1.5}
              transparent
              opacity={0.85}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
