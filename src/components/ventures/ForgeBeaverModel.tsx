"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

const FUR = "#8b5a2b";
const FUR_DARK = "#6b4520";
// A third, lighter fur tone (distinct from FUR/FUR_DARK) used for a small
// forehead patch — per client feedback ("make the beaver a little more
// defined"), so the head isn't one flat block of color.
const FUR_LIGHT = "#a4703b";
const BELLY = "#c9a227"; // Forge's own gold, doubling as the beaver's belly/chest tone
const TOOTH = "#f5f3ee";
const EYE = "#1a1310";
const EYE_SHINE = "#f5f3ee";
const MOUTH = "#3d2812"; // dark mouth line — reads against the fur without needing new geometry types
const WHISKER = "#efe6d2"; // pale, distinct from every fur tone so 3 thin strands still register at true size
// A dedicated nose-leather tone (distinct from EYE's pure near-black) plus a
// touch of extra sheen (lower roughness) so the nose reads as a small damp
// beaver nose rather than a third eye — added per client feedback ("more
// detail on the beaver"): the snout previously had no nose at all, just a
// smooth ball with teeth stuck on the front of it.
const NOSE = "#2b1810";
// ── "Forge Beaver" accessory tones ─────────────────────────────────────
// Added per client-supplied reference image: a builder/craftsman beaver
// wearing goggles pushed up on its forehead and a leather work apron with
// front pockets, arms crossed. The client cannot attach the actual
// reference asset to this codebase, so these accessories are built from
// this repo's existing low-poly primitive vocabulary (spheres/boxes/
// cylinders/tori, flat-shaded) rather than an attempt at photorealistic
// fidelity to the reference at ~112-144px — see the file-level doc below.
const APRON = "#5a3018"; // warm leather brown — deliberately distinct from FUR/FUR_DARK/FUR_LIGHT (all yellow-brown fur tones) so the apron reads as a separate material, not more fur
const APRON_TRIM = "#3e2110"; // darker leather tone for the pocket panels
const APRON_EDGE = "#8a5a30"; // lighter leather tone for a stitched-edge outline behind each pocket, giving it real contrast at badge size instead of two close-toned browns blurring together
const GOGGLE_FRAME = "#c7ccd2"; // chrome/silver goggle frame
// Lens tint changed from near-black (#1b2430, visually indistinguishable
// from EYE's own #1a1310 at badge size — read as "a second pair of eyes,"
// the client's exact complaint) to a distinct saturated cyan-blue glass
// tone, the same amber/cyan-goggle-glass convention real safety/aviator
// goggles use, so the lenses are unmistakably tinted GLASS, not more eye.
const GOGGLE_LENS = "#2f7fa8";
// A genuinely warm, light wood tone — the previous #6b4020 was one digit
// off FUR_DARK's #6b4520, essentially the same color, so the hammer
// handle disappeared into the crossed arms (client: "hard to distinguish
// between its arms and wood"). This sits clearly lighter/more orange than
// every fur tone (FUR #8b5a2b, FUR_DARK #6b4520, FUR_LIGHT #a4703b).
const HAMMER_HANDLE = "#c98a3f";
const HAMMER_HEAD = "#888e96"; // steel head

// Vertical resting offset for the whole model group — shared by the JSX
// default position below and the per-frame bob baseline in useFrame, so
// the two can't drift out of sync (same value either has to move
// together). Previously -0.42, tuned for a head-only crop; raised toward
// 0 for the goggles/apron/crossed-arms redesign so more of the torso
// falls inside the camera's (also widened, see ForgeBeaver.tsx) frame
// without needing an equally large pull-back on its own.
const BASE_Y = -0.16;

// ── Drag-to-rotate tuning ─────────────────────────────────────────────
const DRAG_SENSITIVITY = 0.02; // radians of rotation.y per px of horizontal drag
const CLICK_MOVE_THRESHOLD = 6; // px — below this, a pointer down+up is a click (smile), not a drag

// ── Click → smile tuning ──────────────────────────────────────────────
const SMILE_PULSE_DURATION = 0.9; // seconds — animate-mode eased rise-and-settle
const SMILE_FLASH_MS = 380; // reduced-motion instant pose duration, same convention as DeskSetupModel's CLICK_FLASH_MS
const MOUTH_SMILE_ANGLE = 0.95; // radians each corner pivot swings up to at full smile (~54°)

// ── Idle secondary-motion tuning ──────────────────────────────────────
const BLINK_PERIOD = 4.2; // seconds between blinks
const BLINK_DURATION = 0.16; // seconds eyes stay (mostly) shut
const EAR_TWITCH_PERIOD = 6.5;
const EAR_TWITCH_DURATION = 0.35;

/** 0 → 1 → 0 bump used to shape the click-driven smile's rise-and-settle
 * (same shape DeskSetupModel's click reactions use). */
function pulse01(elapsed: number, duration: number) {
  if (elapsed < 0 || elapsed > duration) return 0;
  return Math.sin((elapsed / duration) * Math.PI);
}

/** A brief 0→1→0 blip once every `period` seconds, held within a
 * `duration`-second window — drives blink / ear-twitch so they read as
 * occasional secondary motion instead of a constant metronomic wobble. */
function periodicBlip(t: number, period: number, duration: number, phaseOffset = 0) {
  const cycle = (t + phaseOffset) % period;
  if (cycle > duration) return 0;
  return Math.sin((cycle / duration) * Math.PI);
}

/**
 * A low-poly beaver, built from primitive geometry rather than a
 * photorealistic reconstruction of Valkrix's actual 3D mascot (which
 * isn't an asset we have access to — see the conversation this was
 * agreed in). Same "Forge builder" spirit via a gold chest tone tying to
 * the venture's own palette, not an attempt to copy the real render.
 *
 * Rendered small (a corner badge, not a hero prop), so proportions lean
 * cartoon-charming rather than naturalistic: bigger eyes, bigger ears,
 * head-forward framing — the identifying features (ears, big front
 * teeth, round eyes) read at a glance instead of dissolving into a blob.
 *
 * Interactive, per client follow-up ("the beaver should also be
 * interactive maybe smile on clicking and rotatable... make the beaver a
 * little more defined... better animation"):
 *
 * - Click (a pointer down+up with under ~6px of movement) triggers a
 *   smile — the two mouth-corner tabs rotate upward in an eased
 *   rise-and-settle (or, under reduced motion, an instant brief pose
 *   swap — same convention as DeskSetupModel's click reactions).
 * - Drag (down, move past that threshold, up) rotates the model about Y.
 *   Tracked via window pointermove/pointerup (not pointer capture) so it
 *   keeps following even if the cursor slips outside this small ~112–
 *   144px canvas mid-drag. The idle sway is paused for the duration of
 *   the drag and resumes from wherever the user left it afterward — see
 *   `rotationOffsetRef` below — rather than snapping back to the sway
 *   formula's own absolute angle. Under reduced motion this still works
 *   (it's a direct user action, not autoplay) but there's no sway to
 *   resume into and no momentum/coast after release — it just stops
 *   exactly where dropped.
 * - New geometry: mouth (center bar + two corner tabs), three whiskers
 *   per side, brow ridges for a touch of expressiveness, a neck-blend
 *   sphere smoothing the head/body seam, and a lighter forehead patch so
 *   the head isn't one flat fur tone.
 * - New secondary idle motion (animate-only): an occasional blink and a
 *   single-ear twitch, plus a second sway frequency blended into the
 *   body bob and a small head-tilt on a third axis, so the resting loop
 *   reads less metronomic than the original single-sine sway.
 *
 * "More detail on the beaver" pass (client follow-up; also asked to check
 * forge.pk for reference — confirmed with the client that forge.pk's own
 * mark is an anvil/spark icon with no beaver anywhere on it, so this pass
 * pushes the existing low-poly beaver's own fidelity rather than copying
 * anything from there):
 * - A dedicated nose tip (NOSE tone, slight sheen) at the front of the
 *   snout — previously the snout was a smooth ball with teeth stuck on
 *   and no nose at all, the single biggest missing "reads as a beaver,
 *   not a blob" cue at this size.
 * - A lighter FUR_LIGHT muzzle patch hugging the lower snout (same
 *   "second sphere scaled to hug the surface" technique the forehead
 *   patch already uses) so the mouth/nose sit inside their own shaded
 *   region instead of the flat FUR_DARK snout continuing all the way
 *   round.
 * - A small lighter inner-ear disc nested just inside each ear sphere
 *   (same nested-sphere trick the eye-shine highlight already uses) for
 *   a two-tone ear instead of one flat lump.
 * - More segments on the head/body/snout/ear spheres for a rounder
 *   silhouette at true render size (same "more segments for a smoother
 *   silhouette" move MedalModel's own "more well defined" pass used),
 *   and a small roughness pass — main fur nudged glossier (0.8 → 0.72)
 *   and the light patches glossier still (→ ~0.6-0.65) so they read as
 *   catching more light than the dark shadow-toned fur, instead of every
 *   surface having identical flat plastic response.
 * Whiskers were reported as backwards by the client; that was found and
 * fixed independently before this pass (see the whisker comment below) —
 * re-confirmed by screenshot here to still read as a clean outward fan,
 * left untouched otherwise.
 *
 * "Forge Beaver" redesign pass (client: "the forge beaver I said is
 * attached as image thats the inspiration" — a reference render of a
 * beaver character wearing aviator-style goggles pushed up on its
 * forehead, a brown leather work apron with two front pockets, and arms
 * crossed confidently, hammer tucked at the hip). That reference asset
 * isn't available to read directly in this environment, so it was worked
 * from a detailed written description rather than the image itself. Not
 * an attempt at photorealistic fidelity to that reference at this badge's
 * ~112-144px size — the goal is the structural, iconic cues that make it
 * read as "a builder/craftsman beaver" at a glance:
 * - Goggles: two lens discs (GOGGLE_LENS) ringed with chrome tori
 *   (GOGGLE_FRAME) plus a small bridge, resting on the upper
 *   forehead/head surface, above the eyes rather than covering them —
 *   "took a break from work," not "mid-task."
 * - Apron: a flattened sphere (same "scale a sphere to hug the front
 *   surface" technique the forehead/muzzle patches already use) in a new
 *   dedicated leather tone (APRON, distinct from every fur tone) layered
 *   over the existing belly/chest geometry, plus two small darker
 *   (APRON_TRIM) patch-pocket rectangles at lower-chest height.
 * - Crossed arms: this beaver had no arm geometry at all before this
 *   pass. Two capsules (this file's first use of capsuleGeometry — same
 *   primitive-geometry spirit as the rest of the model, just the one
 *   three.js built-in that gives a clean pill shape without stacking
 *   spheres+cylinders) angled into an X over the chest, each ending in a
 *   small paw sphere resting on the opposite shoulder.
 * - Hammer: a small cylinder+box prop tucked at hip level against the
 *   apron, per the reference's hammer-in-a-belt-loop detail — kept small
 *   since it's a nice-to-have, not as identity-critical as the other
 *   three.
 *
 * This required reframing the camera (see ForgeBeaver.tsx) to pull back
 * from the previous tight head-only crop — goggles-on-head + an apron +
 * crossed arms can't read if the camera only frames the head — while
 * keeping the head as the largest, most central element so this still
 * reads primarily as a face badge, not a full character shot.
 */
export function ForgeBeaverModel({ animate }: { animate: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const t = useRef(0);
  const { gl, invalidate } = useThree();

  // ── Drag-to-rotate state ─────────────────────────────────────────────
  const draggingRef = useRef(false);
  const dragStartClientX = useRef(0);
  const dragStartClient = useRef({ x: 0, y: 0 });
  const dragStartRotY = useRef(0);
  const dragMoved = useRef(0);
  // Accumulated rotation the user has dragged in, layered on top of idle
  // sway. Updated continuously during a drag (see the pointermove handler
  // below) so sway can resume seamlessly after release with no jump.
  const rotationOffsetRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  // ── Click → smile state ──────────────────────────────────────────────
  const smileT = useRef<number | null>(null);
  const [smileFlash, setSmileFlash] = useState(false);
  const smileTimeout = useRef<number | null>(null);

  // Refs mutated per-frame while animate=true; their JSX default props
  // (below, using `smileFlash`) are what reduced-motion visitors see.
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const leftEarRef = useRef<THREE.Group>(null);
  // Mouth corners are pivot GROUPS (not meshes) so rotation swings the
  // whole tab's length through its arc instead of just half of it (a
  // mesh rotating about its own center only moves its free tip by
  // half-length·sinθ; pivoting from the inner edge doubles that lever) —
  // needed to make "smile on click" actually read at this badge's true
  // ~112–144px render size instead of shifting by a couple of pixels.
  const mouthLeftRef = useRef<THREE.Group>(null);
  const mouthRightRef = useRef<THREE.Group>(null);

  useEffect(() => {
    return () => {
      if (smileTimeout.current != null) window.clearTimeout(smileTimeout.current);
    };
  }, []);

  function triggerSmile() {
    if (animate) {
      smileT.current = t.current;
    } else {
      setSmileFlash(true);
      if (smileTimeout.current != null) window.clearTimeout(smileTimeout.current);
      smileTimeout.current = window.setTimeout(() => setSmileFlash(false), SMILE_FLASH_MS);
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
      const newRotY = dragStartRotY.current + dx * DRAG_SENSITIVITY;
      const swayNow = animate ? Math.sin(t.current * 0.55) * 0.4 : 0;
      rotationOffsetRef.current = newRotY - swayNow;
      if (groupRef.current) groupRef.current.rotation.y = newRotY;
      invalidate();
    };
    const onUp = () => {
      draggingRef.current = false;
      setIsDragging(false);
      gl.domElement.style.cursor = "grab";
      if (dragMoved.current < CLICK_MOVE_THRESHOLD) {
        triggerSmile();
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
    dragStartRotY.current = groupRef.current?.rotation.y ?? 0;
    gl.domElement.style.cursor = "grabbing";
  };

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    t.current += delta;

    // Rotation: idle sway (animate-only, paused mid-drag) layered with
    // whatever the user has dragged in — see `rotationOffsetRef` above.
    if (!draggingRef.current) {
      const sway = animate ? Math.sin(t.current * 0.55) * 0.4 : 0;
      groupRef.current.rotation.y = sway + rotationOffsetRef.current;
    }

    if (!animate) return;

    // Softer, less metronomic bob (two blended frequencies) plus a small
    // slow head-tilt on a third axis — "better animation" per client
    // feedback, layered onto the original single-sine bob rather than
    // replacing its overall character.
    groupRef.current.position.y =
      BASE_Y + Math.sin(t.current * 1.4) * 0.035 + Math.sin(t.current * 0.53) * 0.014;
    groupRef.current.rotation.z = Math.sin(t.current * 0.45) * 0.045;

    // Blink — brief eye scale-down on an occasional cycle.
    const blink = periodicBlip(t.current, BLINK_PERIOD, BLINK_DURATION);
    const eyeScaleY = 1 - blink * 0.85;
    if (leftEyeRef.current) leftEyeRef.current.scale.y = eyeScaleY;
    if (rightEyeRef.current) rightEyeRef.current.scale.y = eyeScaleY;

    // Ear twitch — one ear flicks occasionally, phase-offset from the
    // blink cycle so the two never coincide.
    const twitch = periodicBlip(t.current, EAR_TWITCH_PERIOD, EAR_TWITCH_DURATION, 2.1);
    if (leftEarRef.current) leftEarRef.current.rotation.z = twitch * 0.5;

    // Smile — corners lift on click, an eased rise-and-settle bump (not a
    // toggle), so it reads as a reaction rather than a new permanent
    // expression. Resting angle is flat (0) so the click's full swing to
    // ±MOUTH_SMILE_ANGLE reads as a clear, deliberate expression change,
    // not a subtle nudge on an already-curved rest pose.
    const smileElapsed = smileT.current == null ? -1 : t.current - smileT.current;
    const smileAmount = smileT.current == null ? 0 : pulse01(smileElapsed, SMILE_PULSE_DURATION);
    if (mouthLeftRef.current) {
      mouthLeftRef.current.rotation.z = -smileAmount * MOUTH_SMILE_ANGLE;
    }
    if (mouthRightRef.current) {
      mouthRightRef.current.rotation.z = smileAmount * MOUTH_SMILE_ANGLE;
    }
  });

  // Reduced-motion / pre-hydration fallback pose: a plain 0/1 swap driven
  // by React state instead of the eased per-frame pulse above.
  const smileAmountStatic = smileFlash ? 1 : 0;

  return (
    // Offset so the head sits near the camera's natural look-at point
    // (world origin). Previously this was tuned as a pure face badge with
    // the body/tail below "just needs to be present, not framed" — that
    // changed with the goggles/apron/crossed-arms redesign above, which
    // needs the upper torso visible too. Rather than re-deriving this
    // offset, the camera itself was pulled back in ForgeBeaver.tsx (wider
    // vertical fov coverage at the same relative framing) so the head
    // stays anchored at this same local offset/scale while more of the
    // frame around it becomes visible — one fewer coordinate system to
    // keep in sync between the two files.
    <group
      ref={groupRef}
      position={[0, BASE_Y, 0]}
      scale={1.3}
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
      {/* body */}
      <mesh position={[0, -0.55, -0.05]}>
        <sphereGeometry args={[0.5, 9, 8]} />
        <meshStandardMaterial color={FUR} flatShading roughness={0.72} />
      </mesh>
      {/* neck blend — a small in-between sphere so the head doesn't meet
          the body as a hard seam ("better ear/head blending" per client
          feedback extended to the head/body join too) */}
      <mesh position={[0, -0.16, 0.06]}>
        <sphereGeometry args={[0.32, 8, 7]} />
        <meshStandardMaterial color={FUR} flatShading roughness={0.72} />
      </mesh>
      {/* belly/chest */}
      <mesh position={[0, -0.58, 0.34]}>
        <sphereGeometry args={[0.28, 7, 6]} />
        <meshStandardMaterial color={BELLY} flatShading roughness={0.7} />
      </mesh>
      {/* apron — a flattened sphere hugging the belly/chest's front surface
          (same "scale a sphere to the surface" technique the forehead and
          muzzle patches use above), a bib-style leather work apron layered
          over the belly. Per client reference: "the forge beaver ... image
          thats the inspiration" — a builder beaver in a leather apron with
          front pockets. Positioned/scaled to cover chest-to-lower-torso
          without reaching down into the tail, since this stays a compact
          badge rather than a full character shot. */}
      <mesh position={[0, -0.4, 0.44]} rotation={[0.12, 0, 0]} scale={[0.62, 0.76, 0.34]}>
        <sphereGeometry args={[0.5, 9, 8]} />
        <meshStandardMaterial color={APRON} flatShading roughness={0.85} />
      </mesh>
      {/* apron pockets — two small patch pockets, lower-chest height, left
          and right, positioned BELOW the crossed arms (see arms below,
          centered higher up around y=-0.13) so they sit in their own clear
          band instead of fighting the arms for the same space. Each pocket
          is a darker (APRON_TRIM) panel backed by a slightly larger,
          lighter (APRON_EDGE) panel just behind it — the same
          "nested shape, one size up, one tone lighter" trick the
          eye-shine/inner-ear details use elsewhere in this file — reading
          as a stitched border instead of two same-toned browns blurring
          into one shape at badge size. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.19, -0.48, 0.6]} rotation={[0.08, side * 0.12, 0]}>
          <mesh position={[0, 0, -0.006]}>
            <boxGeometry args={[0.2, 0.18, 0.02]} />
            <meshStandardMaterial color={APRON_EDGE} flatShading roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.01, 0.014]}>
            <boxGeometry args={[0.16, 0.14, 0.03]} />
            <meshStandardMaterial color={APRON_TRIM} flatShading roughness={0.9} />
          </mesh>
        </group>
      ))}
      {/* hammer — small cylinder handle + box head, tucked at hip level
          against the apron's side, per the reference's hammer-in-a-loop
          detail. Kept small/simple — a nice-to-have accent, not as
          identity-critical as the goggles/apron/arms. Raised/pulled inward
          from an earlier position that hung too low, past the bottom edge
          of the (also reframed, see ForgeBeaver.tsx) camera's visible
          window — verified by screenshotting the canvas at true render
          size, not just checking coordinates on paper. */}
      <group position={[0.24, -0.42, 0.42]} rotation={[0, 0, -0.55]}>
        <mesh>
          <cylinderGeometry args={[0.022, 0.022, 0.26, 6]} />
          <meshStandardMaterial color={HAMMER_HANDLE} flatShading roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.11, 0.055, 0.06]} />
          <meshStandardMaterial color={HAMMER_HEAD} flatShading roughness={0.4} metalness={0.3} />
        </mesh>
      </group>
      {/* crossed arms — bug fix (found during my own verification screenshot,
          not reported by the client yet): the previous version rotated both
          arm capsules by only ±0.5 rad (≈29°) while leaving BOTH centered
          on the vertical midline (x=0) — a capsule that short, rotated that
          little, only spans about ±0.10 in X from its own center, nowhere
          near reaching the paw spheres parked out at x=±0.28. The result
          was a short diagonal stub near the chest with two paws floating
          disconnected off to the sides.
          Fixed by actually deriving each arm as a segment FROM a shoulder
          point TO a hand point resting on the opposite side of the chest,
          computing the real direction vector between those two points and
          rotating each capsule to match it (rotation.z = atan2(-dx, dy),
          the same "solve for the angle that sends the capsule's default
          +Y axis along this specific direction" approach used elsewhere in
          this codebase for edges/connectors), instead of guessing a small
          rotation and hoping the capsule was long enough to reach. Each
          paw sphere is now positioned at its own arm's actual computed
          hand-end point, so it sits attached, not floating. */}
      <mesh position={[0.09, -0.08, 0.58]} rotation={[0, 0, 2.2]}>
        <capsuleGeometry args={[0.075, 0.4, 3, 6]} />
        <meshStandardMaterial color={FUR_DARK} flatShading roughness={0.75} />
      </mesh>
      <mesh position={[-0.09, -0.11, 0.64]} rotation={[0, 0, -2.2]}>
        <capsuleGeometry args={[0.075, 0.4, 3, 6]} />
        <meshStandardMaterial color={FUR_DARK} flatShading roughness={0.75} />
      </mesh>
      {/* paws — each sits at its own arm's actual hand-end point (see fix
          note above), resting on the opposite side of the chest */}
      <mesh position={[-0.07, -0.2, 0.62]}>
        <sphereGeometry args={[0.085, 7, 6]} />
        <meshStandardMaterial color={FUR_DARK} flatShading roughness={0.75} />
      </mesh>
      <mesh position={[0.07, -0.23, 0.68]}>
        <sphereGeometry args={[0.085, 7, 6]} />
        <meshStandardMaterial color={FUR_DARK} flatShading roughness={0.75} />
      </mesh>
      {/* head */}
      <mesh position={[0, 0.32, 0.16]}>
        <sphereGeometry args={[0.44, 10, 9]} />
        <meshStandardMaterial color={FUR} flatShading roughness={0.72} />
      </mesh>
      {/* forehead patch — a second, lighter fur tone so the head reads as
          shaded fur rather than one flat-color block */}
      <mesh position={[0, 0.58, 0.08]} rotation={[0.3, 0, 0]} scale={[0.62, 0.34, 0.5]}>
        <sphereGeometry args={[0.44, 9, 8]} />
        <meshStandardMaterial color={FUR_LIGHT} flatShading roughness={0.62} />
      </mesh>
      {/* snout */}
      <mesh position={[0, 0.2, 0.54]}>
        <sphereGeometry args={[0.24, 9, 8]} />
        <meshStandardMaterial color={FUR_DARK} flatShading roughness={0.8} />
      </mesh>
      {/* muzzle patch — a lighter fur tone hugging the lower-front of the
          snout (same "second sphere scaled to hug the base surface"
          technique the forehead patch above uses), so the mouth/nose sit
          inside their own shaded region instead of the flat FUR_DARK
          snout wrapping all the way around with no variation. */}
      <mesh position={[0, 0.1, 0.64]} rotation={[0.25, 0, 0]} scale={[0.72, 0.48, 0.55]}>
        <sphereGeometry args={[0.24, 8, 7]} />
        <meshStandardMaterial color={FUR_LIGHT} flatShading roughness={0.65} />
      </mesh>
      {/* nose tip — small, slightly glossy ("wet nose") bump at the very
          front of the snout, nested forward of it the same way the eye
          shine below is nested forward of each eye. The single most
          missing beaver-identifying cue before this pass: the snout was a
          smooth fur ball with teeth on it and nothing marking a nose. */}
      <mesh position={[0, 0.19, 0.77]}>
        <sphereGeometry args={[0.055, 7, 6]} />
        <meshStandardMaterial color={NOSE} flatShading roughness={0.35} />
      </mesh>
      {/* ears — left ear is wrapped in its own group so an idle twitch can
          rotate it without disturbing its resting position. Slightly
          bigger than before (0.14 → 0.15 radius) for a cleaner silhouette
          against the head at true render size, and each now nests a
          smaller, lighter inner-ear sphere (same nested-sphere trick the
          nose/eye-shine use) so the ear reads as two-toned cartilage
          instead of one flat dark lump. */}
      <group ref={leftEarRef} position={[-0.33, 0.67, 0.1]}>
        <mesh>
          <sphereGeometry args={[0.15, 7, 6]} />
          <meshStandardMaterial color={FUR_DARK} flatShading roughness={0.9} />
        </mesh>
        <mesh position={[0.045, 0, 0.09]}>
          <sphereGeometry args={[0.075, 6, 5]} />
          <meshStandardMaterial color={FUR_LIGHT} flatShading roughness={0.7} />
        </mesh>
      </group>
      <mesh position={[0.33, 0.67, 0.1]}>
        <sphereGeometry args={[0.15, 7, 6]} />
        <meshStandardMaterial color={FUR_DARK} flatShading roughness={0.9} />
      </mesh>
      <mesh position={[0.285, 0.67, 0.19]}>
        <sphereGeometry args={[0.075, 6, 5]} />
        <meshStandardMaterial color={FUR_LIGHT} flatShading roughness={0.7} />
      </mesh>
      {/* goggles — pushed up on the forehead, resting above the eyes
          rather than covering them (per the client's reference image: the
          beaver wears aviator-style goggles up on its head, reading as
          "took a break from work" rather than mid-task).
          Fix (client: "they look like second eyes right now"): the near-
          black lens tint was nearly identical to the eyes' own color and
          the chrome frame ring was thin enough to read as a faint outline
          rather than real goggle hardware — together the whole assembly
          just looked like a smaller second eye pair sitting above the
          first. Fixed three ways: (1) lens tint swapped to a distinct
          saturated cyan-blue glass color (GOGGLE_LENS, no longer anywhere
          near EYE's near-black), (2) frame tube radius roughly doubled
          (0.022 → 0.042) so the rim itself is a real visible band of
          metal, not a hairline, and (3) added a strap arc running back
          over the crown of the head connecting the two frames — a strap
          is the single most "these are goggles, not eyes" cue a pair of
          floating dark discs doesn't have. */}
      <group rotation={[-0.55, 0, 0]} position={[0, 0.6, 0.4]}>
        <mesh position={[-0.19, 0, 0]} scale={[1, 1, 0.5]}>
          <sphereGeometry args={[0.1, 8, 7]} />
          <meshStandardMaterial color={GOGGLE_LENS} roughness={0.25} metalness={0.2} />
        </mesh>
        <mesh position={[0.19, 0, 0]} scale={[1, 1, 0.5]}>
          <sphereGeometry args={[0.1, 8, 7]} />
          <meshStandardMaterial color={GOGGLE_LENS} roughness={0.25} metalness={0.2} />
        </mesh>
        <mesh position={[-0.19, 0, 0.03]}>
          <torusGeometry args={[0.115, 0.042, 8, 16]} />
          <meshStandardMaterial
            color={GOGGLE_FRAME}
            flatShading
            roughness={0.3}
            metalness={0.5}
          />
        </mesh>
        <mesh position={[0.19, 0, 0.03]}>
          <torusGeometry args={[0.115, 0.042, 8, 16]} />
          <meshStandardMaterial
            color={GOGGLE_FRAME}
            flatShading
            roughness={0.3}
            metalness={0.5}
          />
        </mesh>
        {/* bridge connecting the two lenses across the top of the head */}
        <mesh position={[0, 0.05, 0.01]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.022, 0.022, 0.14, 6]} />
          <meshStandardMaterial
            color={GOGGLE_FRAME}
            flatShading
            roughness={0.3}
            metalness={0.5}
          />
        </mesh>
        {/* strap — a wide, flattened arc sweeping back and around the
            crown of the head from one frame to the other, the clearest
            "this is worn headgear" signal the assembly was missing */}
        <mesh position={[0, 0.02, -0.08]} rotation={[0.3, 0, 0]} scale={[1, 0.55, 1]}>
          <torusGeometry args={[0.19, 0.028, 6, 12, Math.PI]} />
          <meshStandardMaterial color={GOGGLE_FRAME} flatShading roughness={0.6} metalness={0.2} />
        </mesh>
      </group>
      {/* brow ridges — small dark ridges above each eye, adding a touch
          of expressiveness at true render size without needing a rig */}
      <mesh position={[-0.19, 0.49, 0.46]} rotation={[0.1, 0, -0.12]} scale={[1, 0.5, 0.6]}>
        <sphereGeometry args={[0.085, 6, 6]} />
        <meshStandardMaterial color={FUR_DARK} flatShading roughness={0.85} />
      </mesh>
      <mesh position={[0.19, 0.49, 0.46]} rotation={[0.1, 0, 0.12]} scale={[1, 0.5, 0.6]}>
        <sphereGeometry args={[0.085, 6, 6]} />
        <meshStandardMaterial color={FUR_DARK} flatShading roughness={0.85} />
      </mesh>
      {/* eyes — big and round for charm/legibility at small size */}
      <mesh ref={leftEyeRef} position={[-0.18, 0.38, 0.5]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color={EYE} roughness={0.25} />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.18, 0.38, 0.5]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color={EYE} roughness={0.25} />
      </mesh>
      {/* eye shine */}
      <mesh position={[-0.15, 0.41, 0.57]}>
        <sphereGeometry args={[0.025, 6, 6]} />
        <meshStandardMaterial color={EYE_SHINE} />
      </mesh>
      <mesh position={[0.21, 0.41, 0.57]}>
        <sphereGeometry args={[0.025, 6, 6]} />
        <meshStandardMaterial color={EYE_SHINE} />
      </mesh>
      {/* whiskers — three thin strands per side, fanned slightly, a small
          definition detail that doesn't compete with the bigger
          identifying features (ears/teeth/eyes).
          Second bug fix (client: "right whisker is still incorrect"): the
          first fix got the OUTWARD direction right on both sides (both
          point away from the face now), but left the per-strand vertical
          FAN mirrored wrong. `tilt` also sets each strand's Y position
          (0.22 + tilt*0.12) — the highest strand (tilt=+0.26) should angle
          upward and the lowest (tilt=-0.24) should angle downward, so the
          three strands visibly spread apart like a real whisker fan. On
          the left side (`Math.PI/2 - tilt`) that's exactly what happens.
          On the right side the old formula (`-Math.PI/2 - tilt`) had the
          opposite sign relationship, so its highest strand angled DOWN
          and its lowest angled UP — the two right-side whiskers crossed
          toward each other instead of fanning apart, an asymmetry visible
          even though the base outward direction was already correct.
          Fixed by flipping the right side to `-Math.PI/2 + tilt`, which
          mirrors the left side's up/down relationship — confirmed by
          re-deriving each strand's resulting direction vector by hand for
          both sides before applying, not just re-screenshotting. */}
      {[-1, 1].map((side) =>
        [0.26, 0, -0.24].map((tilt, i) => (
          <mesh
            key={`${side}-${i}`}
            position={[side * 0.35, 0.22 + tilt * 0.12, 0.58]}
            rotation={[0, 0, side > 0 ? -Math.PI / 2 + tilt : Math.PI / 2 - tilt]}
          >
            <cylinderGeometry args={[0.004, 0.008, 0.2, 5]} />
            <meshStandardMaterial color={WHISKER} roughness={0.4} />
          </mesh>
        ))
      )}
      {/*
        front teeth — the single most beaver-identifying feature, but per
        client feedback ("make the teeth of the beaver a lot shorter...
        wayyy too big for its face") shrunk from a dominant 0.16-tall
        block to a small accent — height ~half, width/depth trimmed to
        match, and shifted up slightly so the (now shorter) tooth still
        sits right at the mouth line instead of hanging lower on the chin.
      */}
      <mesh position={[-0.08, 0.06, 0.72]}>
        <boxGeometry args={[0.07, 0.08, 0.045]} />
        <meshStandardMaterial color={TOOTH} roughness={0.4} />
      </mesh>
      <mesh position={[0.08, 0.06, 0.72]}>
        <boxGeometry args={[0.07, 0.08, 0.045]} />
        <meshStandardMaterial color={TOOTH} roughness={0.4} />
      </mesh>
      {/* mouth — a flat center bar plus two corner tabs that rotate
          upward into a smile on click (or, at rest, sit flat/neutral).
          The client's explicit ask: "maybe smile on clicking" — there
          was no mouth/expression element before this. Sits BELOW the
          teeth (chin line, y=-0.01 vs the teeth's y=0.02 bottom edge) —
          placing it at the teeth's own height hid nearly all of the
          motion behind their much larger boxes, confirmed by
          screenshotting the two poses and diffing them pixel-by-pixel.

          Each corner tab is a mesh offset inside its own pivot GROUP so
          the group's rotation swings the tab's full length through its
          arc (pivoting from the inner edge) rather than just half of it
          — required for the motion to actually register at this badge's
          true small render size instead of shifting by a couple of
          pixels. */}
      <mesh position={[0, -0.01, 0.7]}>
        <boxGeometry args={[0.075, 0.016, 0.018]} />
        <meshStandardMaterial color={MOUTH} flatShading roughness={0.6} />
      </mesh>
      <group
        ref={mouthLeftRef}
        position={[-0.0375, -0.01, 0.693]}
        rotation={[0, 0, -smileAmountStatic * MOUTH_SMILE_ANGLE]}
      >
        <mesh position={[-0.045, 0, -0.006]}>
          <boxGeometry args={[0.09, 0.015, 0.016]} />
          <meshStandardMaterial color={MOUTH} flatShading roughness={0.6} />
        </mesh>
      </group>
      <group
        ref={mouthRightRef}
        position={[0.0375, -0.01, 0.693]}
        rotation={[0, 0, smileAmountStatic * MOUTH_SMILE_ANGLE]}
      >
        <mesh position={[0.045, 0, -0.006]}>
          <boxGeometry args={[0.09, 0.015, 0.016]} />
          <meshStandardMaterial color={MOUTH} flatShading roughness={0.6} />
        </mesh>
      </group>
      {/* tail — flattened paddle, mostly cropped out, just grounding the shape */}
      <mesh position={[0, -0.75, -0.55]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.42, 0.07, 0.46]} />
        <meshStandardMaterial color={FUR_DARK} flatShading roughness={0.6} />
      </mesh>
    </group>
  );
}
