"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

// ── Materials ──────────────────────────────────────────────────────────
// Same palette CareerThreadModel proved out (see its own comments on why
// these exact tones survive at true small render size) — reused verbatim,
// plus SIGNAL kept as the ship's own weapon color so every laser bolt
// reads as "one consistent ship," while each checkpoint detonates in its
// OWN section's accent (see SECTION_COLORS in JourneySpine.tsx) rather
// than a uniform green, tying this piece into the site-wide per-section
// color language the `.wash-*` classes already established.
const LINE = "#2a2e35";
const NODE = "#888d92";
const SIGNAL = "#35e8b8";
const SHIP_HULL = "#f5f3ee";
const SHIP_ACCENT = "#c7ccd4";

const CLICK_FLASH_MS = 320;
const BURST_FLASH_SCALE = 1.35;

const BURST_DURATION = 0.55;
const BURST_PARTICLE_COUNT = 6;
const BURST_MAX_RADIUS = 12;

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

/**
 * Small radial "explosion" overlay for one checkpoint — identical
 * mechanics to CareerThreadModel's CheckpointBurst (a flash disc plus a
 * handful of spark particles, driven off a shared `hitTimes` timestamp
 * array read against the Canvas's own clock), just generalized to accept
 * the checkpoint's own section color instead of a hardcoded signal-mint,
 * so each section's checkpoint detonates in its own accent.
 */
function CheckpointBurst({
  index,
  hitTimes,
  color,
}: {
  index: number;
  hitTimes: React.RefObject<number[]>;
  color: string;
}) {
  const flashRef = useRef<THREE.Mesh>(null);
  const flashMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const particleRefs = useRef<(THREE.Mesh | null)[]>([]);
  const particleMatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const angles = useRef<number[]>(
    Array.from(
      { length: BURST_PARTICLE_COUNT },
      (_, i) => (i / BURST_PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.4
    )
  );

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime - hitTimes.current[index];
    const active = elapsed >= 0 && elapsed <= BURST_DURATION;
    const p = active ? elapsed / BURST_DURATION : 1;
    const eased = 1 - (1 - p) * (1 - p);

    if (flashRef.current && flashMatRef.current) {
      flashRef.current.visible = active;
      flashRef.current.scale.setScalar(1 + eased * 2.2);
      flashMatRef.current.opacity = active ? (1 - p) * 0.85 : 0;
    }
    angles.current.forEach((angle, i) => {
      const mesh = particleRefs.current[i];
      const mat = particleMatRefs.current[i];
      if (!mesh || !mat) return;
      mesh.visible = active;
      if (!active) return;
      const r = eased * BURST_MAX_RADIUS;
      mesh.position.set(Math.cos(angle) * r, Math.sin(angle) * r, 0);
      mat.opacity = 1 - p;
    });
  });

  return (
    <group>
      <mesh ref={flashRef} visible={false}>
        <circleGeometry args={[3.2, 16]} />
        <meshStandardMaterial
          ref={flashMatRef}
          color="#0d1410"
          emissive={color}
          emissiveIntensity={1.8}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      {angles.current.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            particleRefs.current[i] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[1, 6, 6]} />
          <meshStandardMaterial
            ref={(el) => {
              particleMatRefs.current[i] = el;
            }}
            color="#0d1410"
            emissive={color}
            emissiveIntensity={1.8}
            transparent
            opacity={0}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * One "checkpoint" — the same hexagonal-prism token language as
 * CareerThreadModel's ThreadNode, generalized from "career row" to "page
 * section": no more active/merge row-kinds, just a token tinted in the
 * section's own accent color that breathes brighter while its section is
 * the one currently centered in the viewport (`currentIndexRef`), and
 * every other token keeps a faint idle shimmer (index-offset sine) so the
 * whole spine reads as one continuously-alive thread rather than eight
 * dead tokens plus one lit one.
 *
 * `currentIndexRef`/`animate` drive the continuous case via `useFrame`
 * reading the ref directly (no prop change, no re-render — the scroll
 * handler in JourneySpine.tsx never touches React state for this).
 * `activeStatic` is the one-time, already-resolved value used for the
 * reduced-motion resting frame, where no per-frame updates ever run.
 */
export function CheckpointNode({
  y,
  color,
  animate,
  index,
  hitTimes,
  scaleFactor,
  currentIndexRef,
  activeStatic = false,
  sectionId,
  label,
  htmlPortalRef,
}: {
  y: number;
  color: string;
  animate: boolean;
  index: number;
  hitTimes: React.RefObject<number[]>;
  scaleFactor: number;
  currentIndexRef?: React.RefObject<number>;
  activeStatic?: boolean;
  sectionId: string;
  label: string;
  htmlPortalRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { gl, clock } = useThree();
  const spinRef = useRef<THREE.Group>(null);
  const glowMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const t = useRef(Math.random() * 10);
  const [flash, setFlash] = useState(false);
  const flashTimeout = useRef<number | null>(null);
  // Client follow-up: "the circles of each section on the spaceship path,
  // if hovered on should show a label which section is this." Discrete,
  // user-driven — not a continuous animation — so it stays available even
  // under reduced motion, same reasoning contact/JourneyModel.tsx's own
  // node hover tooltip uses.
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    return () => {
      if (flashTimeout.current != null) window.clearTimeout(flashTimeout.current);
    };
  }, []);

  useFrame((_, delta) => {
    if (!animate) return;
    t.current += delta;
    const active = currentIndexRef?.current === index;

    if (spinRef.current) {
      spinRef.current.rotation.z = t.current * 0.4;
    }
    if (glowMatRef.current) {
      glowMatRef.current.emissiveIntensity = active
        ? 0.9 + Math.sin(t.current * 1.6) * 0.7
        : 0.15 + Math.sin(t.current * 1.1 + index) * 0.1;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (animate) {
      hitTimes.current[index] = clock.elapsedTime;
    } else {
      setFlash(true);
      if (flashTimeout.current != null) window.clearTimeout(flashTimeout.current);
      flashTimeout.current = window.setTimeout(() => setFlash(false), CLICK_FLASH_MS);
    }
    // Client follow-up: "clicking any circle on the path takes us to that
    // section" — same document.getElementById(...).scrollIntoView(...)
    // pattern contact/JourneyModel.tsx's own node click already proved
    // out, additive to the burst/flash reaction above rather than
    // replacing it.
    if (typeof document !== "undefined") {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: animate ? "smooth" : "auto", block: "start" });
    }
  };
  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    gl.domElement.style.cursor = "pointer";
    setHovered(true);
  };
  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    gl.domElement.style.cursor = "auto";
    setHovered(false);
  };

  // Same reasoning as CareerThreadModel: rotate the cylinder's flat hex
  // faces to point straight at the camera instead of showing their thin
  // lateral edge.
  const FACE_CAMERA: [number, number, number] = [Math.PI / 2, 0, 0];

  const staticScale = scaleFactor * (!animate && flash ? BURST_FLASH_SCALE : 1);
  const restingIntensity = activeStatic ? 1.1 : flash ? 0.9 : 0.15;

  return (
    <group
      position={[0, y, 0]}
      scale={staticScale}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <group ref={spinRef}>
        <mesh rotation={FACE_CAMERA}>
          <cylinderGeometry args={[6.5, 6.5, 4, 6]} />
          <meshStandardMaterial
            ref={glowMatRef}
            color={activeStatic ? "#11151a" : NODE}
            emissive={color}
            emissiveIntensity={restingIntensity}
            flatShading
            roughness={0.7}
          />
        </mesh>
      </group>
      {animate && <CheckpointBurst index={index} hitTimes={hitTimes} color={color} />}
      {/* Hover label — client follow-up: "if hovered on should show a
          label which section is this." Anchored at the checkpoint's own
          origin, then shifted fully to its left (plus a fixed pixel gap)
          and vertically centered via a CSS transform rather than a tuned
          3D offset — this strip is narrow and pinned to the right edge, so
          a label anchored any other way risks running off-screen or
          overlapping the next checkpoint up/down the cable; growing
          leftward, into the page's own content margin, is the one
          direction with real room at every breakpoint this strip renders
          at. `portal={htmlPortalRef}` escapes the Canvas's own internal
          overflow-hidden wrapper (see its comment in JourneySpine.tsx) —
          without it, that leftward growth got clipped by the strip's own
          ~56px width, which is exactly why "Where I've worked" was only
          ever showing "worked". */}
      {hovered && (
        <Html
          position={[0, 0, 0]}
          center={false}
          occlude={false}
          portal={htmlPortalRef as React.RefObject<HTMLElement>}
          style={{ pointerEvents: "none", transform: "translate(calc(-100% - 14px), -50%)" }}
        >
          <div className="whitespace-nowrap rounded border border-line bg-void/85 px-2 py-1 font-mono text-[11px] text-paper backdrop-blur-sm">
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

/** The connecting cable — one thin cylinder spanning the first stop to the last. */
function ThreadCable({ top, bottom }: { top: number; bottom: number }) {
  const height = Math.max(top - bottom, 0.001);
  return (
    <mesh position={[0, (top + bottom) / 2, 0]}>
      <cylinderGeometry args={[1.5, 1.5, height, 8]} />
      <meshStandardMaterial color={LINE} flatShading roughness={0.9} />
    </mesh>
  );
}

const SHIP_BASE_SCALE = 1.7; // bumped from CareerThreadModel's 1.6 — the wider strip has real room for "bigger... a lot bigger" per the client's ask; further scaled by `scaleFactor` (derived from the canvas's own measured width) so it stays proportionate at every breakpoint instead of one fixed size that's right at only one width.
const HALF_LEN = 7;
const LASER_COUNT = 4;
const LASER_SPEED = 60; // world units/sec at scaleFactor=1 — a FIXED intrinsic speed, unlike CareerThreadModel's bolts (which derived speed from the ship's own constant loop speed): this ship's speed now varies with the user's scroll velocity, so bolts need their own independent, constant travel speed instead.
const LASER_FADE_IN = 0.08;
const GLIDE_RATE = 4.5; // how quickly the ship's rendered position eases toward the latest scroll-driven target — a glide, not a teleport, so it reads as "accompanying" the scroll rather than snapping to it.

/**
 * The traveling ship — same primitive-only geometry CareerThreadModel
 * proved out (nose cone + fuselage + swept wings + tail fin + engine
 * bulb, flat-emissive materials so the silhouette reads at small size
 * regardless of which way each face happens to point), but its motion is
 * now SCROLL-LINKED instead of an auto-playing timed loop: every frame it
 * eases toward `progressRef.current` (0 = top of About, 1 = bottom of
 * Contact, written imperatively by JourneySpine's scroll handler — never
 * through React state, so scrolling never triggers a re-render here).
 *
 * Laser bolts are event-driven, not interval-driven: firing "at each
 * checkpoint it passes" (the literal client ask) means detecting the
 * frame the ship's smoothed progress crosses a checkpoint's own fraction
 * — in EITHER direction, since scroll (unlike the old fixed downward
 * loop) can go both ways — and firing one real bolt that visually travels
 * to that checkpoint before writing its hit timestamp, exactly the same
 * "travel then contact" mechanic CareerThreadModel's TravelingSpaceship
 * used, just re-triggered by real scroll position instead of a timer.
 */
function TravelingShip({
  top,
  bottom,
  stops,
  hitTimes,
  progressRef,
  scaleFactor,
}: {
  top: number;
  bottom: number;
  stops: { frac: number; color: string }[];
  hitTimes: React.RefObject<number[]>;
  progressRef: React.RefObject<number>;
  scaleFactor: number;
}) {
  const { gl } = useThree();
  const shipRef = useRef<THREE.Group>(null);
  const engineMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const span = top - bottom;
  const t = useRef(0);

  const smoothedProgress = useRef(0);
  const initialized = useRef(false);

  const shipClickT = useRef<number | null>(null);

  const boltRefs = useRef<(THREE.Mesh | null)[]>([]);
  const boltMatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const boltSpawnY = useRef<number[]>(new Array(LASER_COUNT).fill(0));
  const boltSpawnT = useRef<number[]>(new Array(LASER_COUNT).fill(-Infinity));
  const boltTargetIdx = useRef<number[]>(new Array(LASER_COUNT).fill(-1));
  const boltDir = useRef<number[]>(new Array(LASER_COUNT).fill(1));
  const boltDormant = useRef<boolean[]>(new Array(LASER_COUNT).fill(true));
  const nextBolt = useRef(0);

  const fireBolt = (fromY: number, targetIdx: number) => {
    const i = nextBolt.current;
    nextBolt.current = (i + 1) % LASER_COUNT;
    const targetY = top - stops[targetIdx].frac * span;
    boltSpawnY.current[i] = fromY;
    boltSpawnT.current[i] = t.current;
    boltTargetIdx.current[i] = targetIdx;
    boltDir.current[i] = Math.sign(targetY - fromY) || 1;
    boltDormant.current[i] = false;
  };

  useFrame((state, delta) => {
    t.current += delta;

    const target = clamp01(progressRef.current ?? 0);
    if (!initialized.current) {
      // First frame: snap straight to wherever the visitor already scrolled
      // to (e.g. a mid-page reload/anchor jump) without treating every
      // checkpoint between 0 and that point as freshly "passed" — a burst
      // storm on load would read as a glitch, not a journey.
      smoothedProgress.current = target;
      initialized.current = true;
    }
    const prev = smoothedProgress.current;
    const damp = Math.min(1, delta * GLIDE_RATE);
    const next = prev + (target - prev) * damp;
    smoothedProgress.current = next;

    const shipY = top - next * span;

    const clickElapsed = shipClickT.current == null ? -1 : t.current - shipClickT.current;
    const clickPulse =
      clickElapsed < 0 || clickElapsed > 0.5 ? 0 : Math.sin((clickElapsed / 0.5) * Math.PI);

    if (shipRef.current) {
      shipRef.current.position.y = shipY;
      shipRef.current.rotation.z = Math.sin(t.current * 2.2) * 0.12;
      shipRef.current.scale.setScalar(SHIP_BASE_SCALE * scaleFactor * (1 + clickPulse * 0.25));
    }
    if (engineMatRef.current) {
      engineMatRef.current.emissiveIntensity = 1.4 + Math.sin(t.current * 9) * 0.6 + clickPulse * 1.6;
    }

    // Crossing detection — fire toward the NEXT checkpoint in the
    // direction of travel whenever the ship's smoothed position sweeps
    // past any checkpoint's fraction this frame.
    //
    // Client follow-up: "the spaceship fires backwards instead of on the
    // next circle... make sure it fires fully till the next circle never
    // backwards... the laser at times does not reach the next circle."
    // Root cause: this used to target the checkpoint index just crossed
    // (`i`) and fire from the ship's own position — but the instant a
    // crossing is detected, the ship's position IS essentially that
    // checkpoint's own position, so targetY-fromY was a near-zero
    // distance. `boltDir` (below, via `Math.sign(targetY - fromY) || 1`)
    // is then effectively reading floating-point noise off that near-zero
    // gap: sometimes it resolves to "backward" (opposite the direction of
    // travel), and because a bolt can end up flying AWAY from its own
    // target, it never satisfies `reached` below and so never visibly
    // makes contact/detonates. Targeting the checkpoint AHEAD in the
    // scroll direction instead gives every bolt a real, non-trivial
    // distance to cover, with its direction coming from the scroll's own
    // robust sign (`scrollDir`) rather than a tiny noisy position delta —
    // so it always fires forward and always eventually reaches and
    // detonates the next circle.
    const scrollDir = next > prev ? 1 : next < prev ? -1 : 0;
    if (scrollDir !== 0) {
      for (let i = 0; i < stops.length; i++) {
        const f = stops[i].frac;
        const prevSide = prev - f;
        const curSide = next - f;
        if (prevSide !== 0 && Math.sign(prevSide) !== Math.sign(curSide)) {
          const targetIdx = i + scrollDir;
          if (targetIdx >= 0 && targetIdx < stops.length) {
            fireBolt(shipY, targetIdx);
          }
        }
      }
    }

    for (let i = 0; i < LASER_COUNT; i++) {
      const mesh = boltRefs.current[i];
      const mat = boltMatRefs.current[i];
      if (!mesh || !mat) continue;
      if (boltDormant.current[i]) {
        mesh.visible = false;
        continue;
      }
      const targetIdx = boltTargetIdx.current[i];
      const targetY = top - stops[targetIdx].frac * span;
      const dir = boltDir.current[i];
      const elapsed = t.current - boltSpawnT.current[i];
      const currentY = boltSpawnY.current[i] + dir * elapsed * LASER_SPEED * scaleFactor;
      const reached = dir > 0 ? currentY >= targetY : currentY <= targetY;

      if (reached) {
        hitTimes.current[targetIdx] = state.clock.elapsedTime;
        mesh.visible = false;
        boltDormant.current[i] = true;
        continue;
      }
      mesh.visible = true;
      mesh.position.y = currentY;
      const fadeIn = Math.min(1, elapsed / LASER_FADE_IN);
      mat.opacity = fadeIn;
      mat.emissiveIntensity = 1.2 + fadeIn * 2;
    }
  });

  return (
    <>
      <group ref={shipRef} position={[0, top, 0]}>
        <group
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            shipClickT.current = t.current;
            // Client follow-up: "when spaceship is clicked... it shoots a
            // laser." This used to just set hitTimes directly — an instant
            // flash at the nearest checkpoint with no visible travel. Now
            // it fires a real bolt via the same fireBolt/bolt-travel
            // mechanic the auto-fire-on-crossing loop below uses (aimed at
            // whichever checkpoint the ship currently sits nearest), so a
            // click produces the same kind of shot a crossing does, not a
            // different instant-teleport effect.
            let nearest = 0;
            let nearestDist = Infinity;
            stops.forEach((s, i) => {
              const d = Math.abs(s.frac - smoothedProgress.current);
              if (d < nearestDist) {
                nearestDist = d;
                nearest = i;
              }
            });
            const shipY = top - smoothedProgress.current * span;
            fireBolt(shipY, nearest);
          }}
          onPointerOver={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            gl.domElement.style.cursor = "pointer";
          }}
          onPointerOut={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            gl.domElement.style.cursor = "auto";
          }}
        >
          <mesh position={[0, -4, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[2.8, 6, 6]} />
            <meshStandardMaterial
              color={SHIP_HULL}
              emissive={SHIP_HULL}
              emissiveIntensity={0.3}
              flatShading
              roughness={0.55}
            />
          </mesh>
          <mesh position={[0, 3, 0]}>
            <cylinderGeometry args={[2.8, 2.6, 8, 6]} />
            <meshStandardMaterial
              color={SHIP_HULL}
              emissive={SHIP_HULL}
              emissiveIntensity={0.3}
              flatShading
              roughness={0.55}
            />
          </mesh>
          <mesh position={[5.2, 3.2, 0]} rotation={[0, 0, -0.42]}>
            <boxGeometry args={[6, 1, 4.2]} />
            <meshStandardMaterial
              color={SHIP_ACCENT}
              emissive={SHIP_ACCENT}
              emissiveIntensity={0.3}
              flatShading
              roughness={0.6}
            />
          </mesh>
          <mesh position={[-5.2, 3.2, 0]} rotation={[0, 0, 0.42]}>
            <boxGeometry args={[6, 1, 4.2]} />
            <meshStandardMaterial
              color={SHIP_ACCENT}
              emissive={SHIP_ACCENT}
              emissiveIntensity={0.3}
              flatShading
              roughness={0.6}
            />
          </mesh>
          <mesh position={[0, 6.5, 0]}>
            <boxGeometry args={[1, 3.4, 2]} />
            <meshStandardMaterial
              color={SHIP_ACCENT}
              emissive={SHIP_ACCENT}
              emissiveIntensity={0.3}
              flatShading
              roughness={0.6}
            />
          </mesh>
          <mesh position={[0, 7.6, 0.3]}>
            <sphereGeometry args={[1.9, 8, 8]} />
            <meshStandardMaterial ref={engineMatRef} color="#0d1410" emissive={SIGNAL} emissiveIntensity={1.4} />
          </mesh>
          <mesh position={[0, 3, 0]} visible={false}>
            <sphereGeometry args={[6, 8, 8]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        </group>
      </group>
      {Array.from({ length: LASER_COUNT }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            boltRefs.current[i] = el;
          }}
          visible={false}
        >
          <cylinderGeometry args={[1.9, 1.9, 8, 6]} />
          <meshStandardMaterial
            ref={(el) => {
              boltMatRefs.current[i] = el;
            }}
            color="#0d1410"
            emissive={SIGNAL}
            emissiveIntensity={1.2}
            transparent
            opacity={0}
          />
        </mesh>
      ))}
    </>
  );
}

/**
 * Fills the spine's full canvas height with the cable + nine section
 * checkpoints (+ the traveling ship, while animating). `stops` are
 * fractions (0..1, top to bottom of the whole About→Contact span)
 * measured by the parent from real section `getBoundingClientRect`s —
 * same technique CareerThreadModel's parent used for experience rows,
 * just applied page-wide. `progressRef`/`currentIndexRef` are refs (not
 * props) written directly by JourneySpine's rAF-throttled scroll handler,
 * so scrolling never causes a React re-render here — only `useFrame`
 * reads them, every render frame, cheaply.
 */
export function JourneySpineScene({
  stops,
  animate,
  progressRef,
  currentIndexRef,
  staticCurrentIndex = null,
  htmlPortalRef,
}: {
  stops: { frac: number; color: string; id: string; label: string }[];
  animate: boolean;
  progressRef: React.RefObject<number>;
  currentIndexRef: React.RefObject<number>;
  staticCurrentIndex?: number | null;
  htmlPortalRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { viewport } = useThree();
  const h = viewport.height;
  // A small inset margin so frac=0 (About) and frac=1 (Contact) render as
  // fully visible tokens instead of sitting exactly on the canvas's own
  // top/bottom edge (where half the hex would be clipped by the frustum
  // boundary — caught by screenshotting at true canvas size).
  const EDGE_MARGIN = 0.06;
  const positions = stops.map((s) => h / 2 - (EDGE_MARGIN + s.frac * (1 - 2 * EDGE_MARGIN)) * h);
  const top = positions[0] ?? h / 2;
  const bottom = positions[positions.length - 1] ?? -h / 2;

  // Scales every size-sensitive constant (ship, checkpoint tokens, burst
  // radius via the group hierarchy) against the canvas's own measured
  // width instead of one fixed number — 80 was the old rail's px width,
  // so a canvas at that same width renders identically to the old rail,
  // while the new wider xl/2xl strips render a genuinely bigger ship and
  // checkpoints, per the client's "bigger... a lot bigger" ask. Clamped
  // so an unexpectedly narrow or huge canvas can't produce a broken scale.
  const scaleFactor = Math.max(0.6, Math.min(2.4, viewport.width / 80));

  const hitTimes = useRef<number[]>(new Array(stops.length).fill(-Infinity));
  if (hitTimes.current.length !== stops.length) {
    hitTimes.current = new Array(stops.length).fill(-Infinity);
  }

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[6, 8, 10]} intensity={0.7} />
      <directionalLight position={[-4, -2, -4]} intensity={0.25} color={SIGNAL} />
      <ThreadCable top={top} bottom={bottom} />
      {stops.map((s, i) => (
        <CheckpointNode
          key={i}
          y={positions[i]}
          color={s.color}
          animate={animate}
          index={i}
          hitTimes={hitTimes}
          scaleFactor={scaleFactor}
          currentIndexRef={currentIndexRef}
          activeStatic={staticCurrentIndex === i}
          sectionId={s.id}
          label={s.label}
          htmlPortalRef={htmlPortalRef}
        />
      ))}
      {animate && (
        <TravelingShip
          top={top}
          bottom={bottom}
          stops={stops}
          hitTimes={hitTimes}
          progressRef={progressRef}
          scaleFactor={scaleFactor}
        />
      )}
    </>
  );
}
