"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

// Medal — bright brushed silver, with a darker tone for the engraved
// recess/rim so the disc reads as struck metal rather than a flat gray
// coin (same "define an accent + a shadow tone of the same material"
// trick DeskSetupModel uses for the laptop body/shade).
const SILVER = "#e4e7eb";
const SILVER_MID = "#aeb4bc";
const SILVER_DARK = "#767c85";

// Ribbon — this site's own signal mint (globals.css --signal), the same
// color DeskSetupModel's laptop screen and CareerThreadModel's active
// checkpoint use, so the medal reads as *this site's* medal rather than
// an unrelated color borrowed from nowhere. A generic academic medal
// ribbon is red or blue; there's no real FAST NUCES ribbon color to be
// faithful to, so tying it to the site's own established palette is the
// more "content-grounded" choice available here.
const RIBBON = "#35e8b8";
const RIBBON_STRIPE = "#f5f3ee"; // --paper — the thin center stripe real medal ribbons carry

// Pedestal — eight equal pillars, one per semester of the Aug 2020–Aug
// 2024 degree, each capped with a lit tip. Deliberately kept UNIFORM in
// height rather than rising left-to-right: the copy this scene
// illustrates is "Dean's List every semester," a claim of *consistency*,
// not of improvement — eight equally-lit markers is the honest shape of
// that claim, a rising bar chart would overstate it.
const PEDESTAL_BASE = "#14161b"; // near-void, matches DeskSetupModel's NEAR_VOID
const PEDESTAL_PILLAR = "#20242b";
const PILLAR_COUNT = 8;

const SPARKLE_COUNT = 7;

// ── Drag-to-rotate tuning ─────────────────────────────────────────────
// Bounded, NOT a full 360° drag. The idle sway below already established
// why: this disc has real thickness but no environment map, so at a true
// edge-on angle it reads as a near-invisible sliver rather than "a coin,
// rotated" (a failure mode caught by screenshotting a full rotation, not
// just a start frame). Rather than fight that by re-engineering the rim
// into something that reads at 90° (a bigger, riskier lighting/geometry
// project for a "confirmed-loved, just refine it" ask), the drag is
// clamped to the exact same legible window the sway already swings
// through — dragging just hands the user direct control over the angle
// the medal was already going to settle at, instead of opening a new
// failure mode the client never asked to have fixed.
const ROTATION_MIN = THREE.MathUtils.degToRad(-3);
const ROTATION_MAX = THREE.MathUtils.degToRad(37);
const DRAG_SENSITIVITY = 0.0045; // radians of rotation.y per px of horizontal drag
const CLICK_MOVE_THRESHOLD = 6; // px — below this, a pointer down+up is a click (shine), not a drag
// How long, after release, the drag's resting angle takes to relax back
// into the normal idle-sway waveform (see `releaseOffsetRef` below) — a
// fixed offset kept forever would eventually clamp against one bound for
// most of every cycle; decaying it out over ~1s instead lets the medal
// keep swaying naturally shortly after a drag, with no snap and no jump.
const RELEASE_DECAY_DURATION = 1.0;

// ── Click → pillar shine tuning ────────────────────────────────────────
// A light additional touch beyond rotation: clicking the medal sends a
// bright pulse rippling across the eight pillars beneath it — the medal
// "announcing" the Dean's List streak it's suspended above, rather than
// an arbitrary unrelated flourish.
const PILLAR_FLASH_PEAK = 2.4;
const PILLAR_FLASH_DURATION = 0.45;
const PILLAR_FLASH_STAGGER = 0.055; // seconds between each pillar's pulse, left-to-right
const SHINE_FLASH_MS = 500; // reduced-motion: one instant simultaneous flash, no wave

/** 0 → 1 → 0 bump, same shape ForgeBeaverModel's click-smile pulse uses. */
function pulse01(elapsed: number, duration: number) {
  if (elapsed < 0 || elapsed > duration) return 0;
  return Math.sin((elapsed / duration) * Math.PI);
}

/**
 * The Education section's visual anchor: a large silver medal hanging
 * from a ribbon, slowly turning above a row of eight lit pillars.
 *
 * This is a literal rendering of the section's actual copy, not a
 * generic graduation trope — "Silver Medal, Fall '21" is a specific,
 * real object named in the text, so it gets built as that object (disc +
 * rim + engraved rings + laurel wreath + ribbon) rather than standing in
 * for it with a cap-and-diploma cliché. The eight pillars underneath are
 * the same move applied to "Dean's List every semester": eight equally
 * bright markers, one per semester, instead of an abstract dashboard
 * graph.
 *
 * Interactive, per client follow-up ("make it interactive and rotatable
 * and more well defined but I love it looks amazing"):
 *
 * - Drag rotates the medal+ribbon assembly about Y, window-tracked (not
 *   pointer-capture) so a fast drag keeps working even if the cursor
 *   slips outside this canvas's bounds — same technique as
 *   ForgeBeaverModel. Clamped to [-3°, +37°], the exact window the idle
 *   sway already swings through (see ROTATION_MIN/MAX above for why a
 *   full 360° drag isn't the safer choice here). The idle sway pauses the
 *   instant a drag starts and, on release, resumes smoothly from
 *   wherever the user left it — no snap-back — via a small offset that
 *   decays back into the normal waveform over ~1s (`releaseOffsetRef`).
 * - Click (a pointer down+up under ~6px of movement) sends a bright
 *   pulse rippling left-to-right across the eight pillars.
 * - Under `prefers-reduced-motion`, dragging still works (it's a direct
 *   user action, not autoplay) but never coasts after release — rotation
 *   stops exactly where dropped — and a click flashes all eight pillars
 *   at once instead of animating a wave, the same "instant pose swap"
 *   convention ForgeBeaverModel's reduced-motion smile uses.
 *
 * Reduced-motion / static frame: the medal group's own JSX defaults
 * (rotation.y = 0.3, a gentle turn that still shows the face, rim and
 * wreath clearly, not a flat front-on or edge-on angle) ARE the resting
 * frame — useFrame only ever overwrites them when `animate` is true, so
 * "no animation" and "mid-animation paused" can never be confused the
 * way a naive implementation might. Same for the pillar tips and
 * sparkles: their JSX default emissive/opacity values are already a
 * complete, correct "everything lit, nothing mid-twinkle" resting image.
 *
 * "More well defined" (client loves the look, this is refinement, not a
 * rebuild): the laurel wreath and engraved rings now use SILVER_DARK
 * instead of the closer-toned SILVER_MID, for real contrast against the
 * SILVER disc instead of a subtle tonal shift that mostly disappears at
 * render size; a second, smaller engraved ring was added inside the
 * first for a layered, struck-medal look; every curved surface (disc,
 * rim, boss, seal, rings, loop) got more segments for a smoother
 * silhouette; and the rim bevel is a little bolder. Metalness/roughness
 * were nudged slightly (not overhauled) toward a tighter specular
 * highlight — kept modest for the same reason the original comment
 * documents below: this scene has no environment map, and pushing metal
 * response too far without one goes dark rather than shiny, confirmed by
 * screenshotting the change.
 */
export function MedalModel({ animate }: { animate: boolean }) {
  const spinRef = useRef<THREE.Group>(null);
  const t = useRef(Math.random() * 6);
  const pillarGlowRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const sparkleMatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const { gl, invalidate } = useThree();

  // ── Drag-to-rotate state ─────────────────────────────────────────────
  const draggingRef = useRef(false);
  const dragStartClientX = useRef(0);
  const dragStartClient = useRef({ x: 0, y: 0 });
  const dragStartRotY = useRef(0.3);
  const lastDragRotY = useRef(0.3);
  const dragMoved = useRef(0);
  // Offset carried from the drag's release angle back into the normal
  // sway waveform, decaying to 0 over RELEASE_DECAY_DURATION seconds so
  // the resume is seamless at t=release and gently relaxes into the
  // ordinary bounded sway shortly after — see the tuning comment above.
  const releaseOffsetRef = useRef(0);
  const releaseTimeRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // ── Click → pillar shine state ───────────────────────────────────────
  const shineT = useRef<number | null>(null);
  const [pillarFlashOn, setPillarFlashOn] = useState(false);
  const shineTimeout = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (shineTimeout.current != null) window.clearTimeout(shineTimeout.current);
    };
  }, []);

  function triggerShine() {
    if (animate) {
      shineT.current = t.current;
    } else {
      setPillarFlashOn(true);
      if (shineTimeout.current != null) window.clearTimeout(shineTimeout.current);
      shineTimeout.current = window.setTimeout(() => setPillarFlashOn(false), SHINE_FLASH_MS);
    }
  }

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - dragStartClientX.current;
      dragMoved.current = Math.max(
        dragMoved.current,
        Math.abs(e.clientX - dragStartClient.current.x),
        Math.abs(e.clientY - dragStartClient.current.y)
      );
      const newRotY = THREE.MathUtils.clamp(
        dragStartRotY.current + dx * DRAG_SENSITIVITY,
        ROTATION_MIN,
        ROTATION_MAX
      );
      lastDragRotY.current = newRotY;
      if (spinRef.current) spinRef.current.rotation.y = newRotY;
      invalidate();
    };
    const onUp = () => {
      draggingRef.current = false;
      setIsDragging(false);
      gl.domElement.style.cursor = "grab";
      if (animate) {
        const swayNow = 0.3 + Math.sin(t.current * 0.35) * 0.32;
        releaseOffsetRef.current = lastDragRotY.current - swayNow;
        releaseTimeRef.current = t.current;
      }
      if (dragMoved.current < CLICK_MOVE_THRESHOLD) {
        triggerShine();
      }
      invalidate();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, animate]);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    draggingRef.current = true;
    setIsDragging(true);
    dragMoved.current = 0;
    dragStartClient.current = { x: e.clientX, y: e.clientY };
    dragStartClientX.current = e.clientX;
    const current = spinRef.current?.rotation.y ?? 0.3;
    dragStartRotY.current = current;
    lastDragRotY.current = current;
    gl.domElement.style.cursor = "grabbing";
  };

  const pillarXs = useMemo(
    () => Array.from({ length: PILLAR_COUNT }, (_, i) => (i - (PILLAR_COUNT - 1) / 2) * 0.42),
    []
  );

  // Sparkle motes ringing the medal at varying radius/height/phase —
  // fixed layout data computed once, only their opacity animates.
  const sparkles = useMemo(
    () =>
      Array.from({ length: SPARKLE_COUNT }, (_, i) => {
        const angle = (i / SPARKLE_COUNT) * Math.PI * 2;
        const radius = 1.55 + ((i * 37) % 3) * 0.14;
        return {
          x: Math.cos(angle) * radius,
          y: 0.55 + Math.sin(angle * 1.7) * 0.75,
          z: Math.sin(angle) * 0.5,
          phase: i * 0.9,
        };
      }),
    []
  );

  // Wreath leaves — three per side, arcing up from below the medal's
  // center like a laurel sprig engraved into the face. The laurel wreath
  // is the standard visual shorthand for "academic medal/honor," which is
  // exactly what this object needs to say without any text geometry.
  const wreathLeaves = useMemo(() => {
    const leaves: { x: number; y: number; rot: number; side: number }[] = [];
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const theta = (i + 1) * 0.42; // radians from straight-down
        const radius = 0.6;
        leaves.push({
          x: side * radius * Math.sin(theta),
          y: -radius * Math.cos(theta),
          rot: side * theta,
          side,
        });
      }
    }
    return leaves;
  }, []);

  useFrame((_, delta) => {
    if (!animate) return;
    t.current += delta;

    if (spinRef.current) {
      if (!draggingRef.current) {
        // Bounded sway, not a full 360° spin — see ROTATION_MIN/MAX above
        // for why. Swaying between roughly -3° and +37° keeps the face,
        // rim and wreath legible at every point in the cycle while still
        // reading as "slowly turning," and passes through the same 0.3
        // rad angle the static/reduced-motion frame below already uses.
        // Layered with a decaying offset so a just-finished drag resumes
        // from exactly where the user left it rather than snapping back.
        const sway = 0.3 + Math.sin(t.current * 0.35) * 0.32;
        const sinceRelease =
          releaseTimeRef.current == null ? Infinity : t.current - releaseTimeRef.current;
        const decay =
          sinceRelease >= RELEASE_DECAY_DURATION ? 0 : 1 - sinceRelease / RELEASE_DECAY_DURATION;
        const rotY = sway + releaseOffsetRef.current * decay;
        spinRef.current.rotation.y = THREE.MathUtils.clamp(rotY, ROTATION_MIN, ROTATION_MAX);
      }
      // Vertical bob runs independent of drag state (it's purely
      // vertical, never fights the user's horizontal drag) so it never
      // needs to pause/resume and can't introduce its own jump.
      spinRef.current.position.y = 0.55 + Math.sin(t.current * 0.8) * 0.05;
    }

    pillarGlowRefs.current.forEach((mat, i) => {
      if (!mat) return;
      const sway = 0.9 + Math.sin(t.current * 1.6 + i * 0.5) * 0.5;
      const shineElapsed =
        shineT.current == null ? -1 : t.current - shineT.current - i * PILLAR_FLASH_STAGGER;
      const shine = shineT.current == null ? 0 : pulse01(shineElapsed, PILLAR_FLASH_DURATION);
      mat.emissiveIntensity = sway + shine * (PILLAR_FLASH_PEAK - sway);
    });

    sparkleMatRefs.current.forEach((mat, i) => {
      if (!mat) return;
      mat.opacity = 0.5 + Math.sin(t.current * 1.8 + sparkles[i].phase) * 0.42;
    });
  });

  return (
    <group position={[0, -0.31, 0]}>
      {/* ── Pedestal — eight semesters, all equally lit ─────────────── */}
      <mesh position={[0, -1.55, 0]}>
        <boxGeometry args={[3.6, 0.12, 1] as [number, number, number]} />
        <meshStandardMaterial color={PEDESTAL_BASE} flatShading roughness={0.9} />
      </mesh>
      {pillarXs.map((x, i) => (
        <group key={i} position={[x, -1.24, 0]}>
          <mesh>
            <boxGeometry args={[0.26, 0.5, 0.26]} />
            <meshStandardMaterial color={PEDESTAL_PILLAR} flatShading roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <boxGeometry args={[0.26, 0.06, 0.26]} />
            <meshStandardMaterial
              ref={(el) => {
                pillarGlowRefs.current[i] = el;
              }}
              color="#0d1410"
              emissive={RIBBON}
              emissiveIntensity={pillarFlashOn ? PILLAR_FLASH_PEAK : 1.0}
              flatShading
              roughness={0.5}
            />
          </mesh>
        </group>
      ))}

      {/* ── Medal + ribbon assembly — slowly turning, drag-rotatable ── */}
      <group
        ref={spinRef}
        position={[0, 0.55, 0]}
        rotation={[0, 0.3, 0]}
        onPointerDown={handlePointerDown}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          if (!draggingRef.current) gl.domElement.style.cursor = "grab";
        }}
        onPointerOut={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          if (!draggingRef.current) gl.domElement.style.cursor = "auto";
        }}
      >
        {/* suspension loop */}
        <mesh position={[0, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.12, 0.035, 10, 18]} />
          <meshStandardMaterial color={SILVER_DARK} flatShading roughness={0.4} metalness={0.3} />
        </mesh>

        {/* ribbon straps, fanning up and outward from the loop */}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.17, 1.42, 0.04]} rotation={[0, 0, -side * 0.32]}>
            <mesh>
              <boxGeometry args={[0.36, 0.56, 0.09]} />
              <meshStandardMaterial color={RIBBON} flatShading roughness={0.75} />
            </mesh>
            <mesh position={[0, 0, 0.05]}>
              <boxGeometry args={[0.13, 0.56, 0.02]} />
              <meshStandardMaterial color={RIBBON_STRIPE} flatShading roughness={0.75} />
            </mesh>
          </group>
        ))}

        {/* main disc — a cylinder's flat caps are normal to its own Y axis
            by default, so it's rotated 90° about X here to turn that face
            toward the camera (+Z) instead of up/down (same fix
            CareerThreadModel's hex tokens use for the identical reason) */}
        {/* Metalness kept modest (0.3, up slightly from 0.25) despite this
            being "metal" — with no environment/reflection map in this
            scene, MeshStandardMaterial renders high-metalness surfaces
            almost black except at direct specular highlights (a
            well-known three.js gotcha: metals derive most of their
            brightness from reflected environment light, which doesn't
            exist here). A bright diffuse base color plus tightened
            specular (roughness nudged down) reads as "polished silver"
            far more reliably under plain directional lights than pushing
            metalness further toward "physically correct" would —
            confirmed by screenshotting both. */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.15, 1.15, 0.16, 48]} />
          <meshStandardMaterial color={SILVER} flatShading roughness={0.3} metalness={0.3} />
        </mesh>
        {/* rim, slightly proud of the disc's edge for a struck-metal bevel
            — a torus already lies flat in the XY plane by default, so no
            extra rotation is needed for it to trace the disc's edge.
            Bolder (0.065 vs the original 0.055) and higher-segment than
            before for a crisper, more defined edge. */}
        <mesh>
          <torusGeometry args={[1.15, 0.065, 14, 48]} />
          <meshStandardMaterial color={SILVER_DARK} flatShading roughness={0.38} metalness={0.26} />
        </mesh>

        {/* engraved rings — two concentric rings (was one) for a layered,
            struck-medal look, in SILVER_DARK against the SILVER disc for
            real contrast rather than the previous SILVER_MID's much
            closer, easy-to-miss tone */}
        <mesh position={[0, 0, 0.085]}>
          <torusGeometry args={[0.85, 0.026, 10, 40]} />
          <meshStandardMaterial color={SILVER_DARK} flatShading roughness={0.45} metalness={0.24} />
        </mesh>
        <mesh position={[0, 0, 0.086]}>
          <torusGeometry args={[0.62, 0.016, 8, 36]} />
          <meshStandardMaterial color={SILVER_DARK} flatShading roughness={0.45} metalness={0.24} />
        </mesh>

        {/* laurel wreath, engraved into the lower face — SILVER_DARK (was
            SILVER_MID) for the same contrast reason as the rings above,
            plus a touch more geometric resolution per leaf */}
        {wreathLeaves.map((leaf, i) => (
          <mesh
            key={i}
            position={[leaf.x, leaf.y, 0.09]}
            rotation={[0, 0, leaf.rot]}
            scale={[0.18, 0.062, 0.032]}
          >
            <sphereGeometry args={[1, 9, 7]} />
            <meshStandardMaterial color={SILVER_DARK} flatShading roughness={0.5} metalness={0.22} />
          </mesh>
        ))}

        {/* center boss + stamped seal mark — same Y-axis-to-camera rotation
            fix as the main disc above */}
        <mesh position={[0, 0, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.38, 0.38, 0.05, 24]} />
          <meshStandardMaterial color={SILVER_MID} flatShading roughness={0.35} metalness={0.28} />
        </mesh>
        <mesh position={[0, 0, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.02, 20]} />
          <meshStandardMaterial color={SILVER_DARK} flatShading roughness={0.45} metalness={0.22} />
        </mesh>
      </group>

      {/* ── Shine — small sparkle motes around the medal ─────────────── */}
      {sparkles.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]}>
          <sphereGeometry args={[0.045, 6, 6]} />
          <meshStandardMaterial
            ref={(el) => {
              sparkleMatRefs.current[i] = el;
            }}
            color="#0d1410"
            emissive={SILVER}
            emissiveIntensity={1.6}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
    </group>
  );
}
