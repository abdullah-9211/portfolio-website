"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Neutral desk-object tones, shared across pieces.
const DESK = "#1b1712"; // warm-dark neutral surface, doesn't borrow any topic palette
const METAL = "#c9cdd1"; // brushed neutral — pen barrel, laptop hinge shading
const NEAR_VOID = "#14161b"; // laptop bezel / keyboard deck — sits right against the laptop's own paper body, so near-black still reads as a deliberate deck/bezel there

// Laptop
const LAPTOP_BODY = "#f5f3ee"; // paper — same neutral the retired lock used for its body
const LAPTOP_SHADE = "#d9d6cd";
const LAPTOP_EDGE = "#b8b4a8"; // darker shade strip along the keyboard deck's front lip — a sharper, bevel-like edge instead of the deck reading as one flat slab
const SCREEN_GLOW = "#35e8b8"; // signal mint — this site's own "Engineer" hero-glow color
const SCREEN_BG = "#0a0f0d";
// Bright near-white mint used ONLY for the code lines/cursor — distinct from
// SCREEN_GLOW so "text" actually contrasts against the screen's own glow
// instead of being two shades of the identical color sitting at similar
// intensity (the previous failure: both the screen backdrop and its "code"
// used SCREEN_GLOW, so lines only ever read as faint darker streaks — see
// the click-reaction diagnosis below).
const CODE_TEXT = "#e3fff3";

// Coffee mug
const MUG_BODY = "#e4c9a0"; // crema — this site's own "Coffee Guy" hero-glow color
const MUG_RIM = "#f2e2c4"; // lighter crema — thin lip-highlight ring at the mug's rim, so the opening reads as a bevelled edge rather than the cylinder just stopping
const COFFEE_SURFACE = "#2b1810"; // espresso
const STEAM = "#f5f3ee"; // soft paper-white wisp, not a new color, borrowed from the page tone

// Console (was a generic gamepad; client follow-up: "replace the gaming
// controller with a nintendo switch") — a lighter slate chassis, not
// near-void, so its silhouette actually separates from the near-black
// desk/background instead of disappearing into it (a near-void body was
// tried and vanished at true render size — only the accent details stayed
// visible, floating with no recognizable shape underneath). Lightened
// again this pass (#4a5058 → #5c636c) — the third-pass lighting rig's key
// light sits on the laptop/mug side of the scene and this object's own
// -0.32 rad yaw turns its face further from it, so under the new rig the
// old tone sat noticeably darker/less legible than the other three
// objects when screenshotted at true render size; a lighter base tone
// keeps it legible regardless of which way any given light rig happens to
// graze it, rather than depending on getting the angle exactly right.
const CTRL_BODY = "#5c636c";
const CTRL_PANEL = "#454b53"; // darker recessed screen panel the d-pad/buttons sit either side of — a real screen bezel is its own sunken/flush region, not the same plastic as the chassis
const CTRL_ACCENT = "#4cd3ff"; // console cyan — this site's own "Gamer" hero-glow color, used for the screen's power/click glow
// Joy-Con rail colors — this site's own established Switch homage palette
// (same SWITCH_RED/SWITCH_BLUE OffDuty's GamingPlatformMarks.tsx badge
// already uses), reused here so both nods to the same console agree.
const SWITCH_BLUE = "#0ab9e6";
const SWITCH_RED = "#e60012";

// Notebook (founder — notes/planning, distinct from the laptop's "engineer" role)
const NOTEBOOK_COVER = "#a85de8"; // Valkrix violet — this site's own "Founder" hero-glow color
const NOTEBOOK_SPINE = "#8a3fc9"; // darker violet — center crease/fold line down the cover, so it reads as bound card stock rather than a flat slab
const NOTEBOOK_PAGES = "#f5f3ee";
const PAGE_LINE = "#c9c5ba"; // faint ruled line, a shade darker than the page paper

// ── Hover feedback — third-pass rebuild ─────────────────────────────────
// Client, on the SECOND pass (which had already tried "more detail" and
// "bigger/clearer click reactions"): "They only get up on click and you
// cant do anything with them 0 interaction." Hover-lift-and-brighten
// already existed at that point (HOVER_LIFT=0.035, HOVER_SCALE=1.07) — the
// diagnosis isn't "add hover," it's that this hover was too small to ever
// register as "the scene responded to me" to someone just moving a mouse
// across it. Fix: hover now stacks three coarse, unmissable signals, the
// same "stack multiple coarse signals" principle the click-legibility pass
// already validated for click reactions —
//  1. A much bigger instant lift + scale pop (still a discrete state swap,
//     not a new continuous animation, so it stays correct verbatim under
//     reduced motion).
//  2. A soft colored glow halo blooming in around the object's silhouette
//     (new this pass) — the same "second, larger, transparent, emissive
//     shape" trick this file's own LED/button-ripple halos already use for
//     click payoffs, applied here to hover instead. Paired with the Bloom
//     post-processing added in AboutVisual.tsx, this is the single most
//     "this object is now interactive" signal in the whole scene: a
//     visible glow that only exists while the pointer is over that object.
//  3. A quick spring "wake" bounce fired the instant the pointer enters
//     (animate-only — reduced motion still gets the instant lift/scale/
//     glow, just without the springy overshoot), giving hover its own
//     small burst of motion instead of relying purely on a static pose
//     change.
const HOVER_LIFT = 0.085; // was 0.035 — roughly 2.4x
const HOVER_SCALE = 1.16; // was 1.07
const HOVER_GLOW_OPACITY = 0.42;
const HOVER_BOUNCE_DURATION = 0.5; // seconds — spring settles out within this window
const HOVER_BOUNCE_AMOUNT = 0.1; // extra scale overshoot layered on top of HOVER_SCALE, decaying to 0

/** A short spring overshoot-and-settle bump, fired once from a hover-enter
 * timestamp: swings past 0 a couple of times with decaying amplitude, the
 * "wake up" pop layered on top of the steady HOVER_SCALE. */
function hoverBounce01(elapsed: number) {
  if (elapsed < 0 || elapsed > HOVER_BOUNCE_DURATION) return 0;
  const decay = 1 - elapsed / HOVER_BOUNCE_DURATION;
  return Math.sin((elapsed / HOVER_BOUNCE_DURATION) * Math.PI * 2.4) * decay;
}

// ── Ambient idle life ────────────────────────────────────────────────────
// Client asked for the scene to look and feel alive; a scene that's
// perfectly still until touched reads as inert even with strong hover/click
// response layered on top. Each object gets its own small, independent,
// out-of-phase vertical breathing bob — deliberately not synchronized
// (four different phase offsets below), so the desk reads as four separate
// living things quietly breathing rather than one mechanism pulsing in
// lockstep. Amplitude is small enough to never look like the click lift.
const IDLE_BOB_AMP = 0.012;
const IDLE_BOB_FREQ = 0.9;
const IDLE_PHASE_LAPTOP = 0;
const IDLE_PHASE_MUG = 1.7;
const IDLE_PHASE_CTRL = 3.4;
const IDLE_PHASE_NOTEBOOK = 5.1;

// Reduced-motion click reaction: one instant on/off swap, not an eased
// loop — this is what keeps a click "meaningful and brief" instead of
// smuggling in a new continuous animation under the reduced-motion gate.
// 420ms (was 320ms) — long enough for the now-much-bigger reacted pose
// (see the "Escalated click reactions" tuning below) to actually register
// as a held pose instead of a flicker, still well inside "brief."
const CLICK_FLASH_MS = 420;

/** 0 → 1 → 0 bump used to shape every click reaction's rise-and-settle. */
function pulse01(elapsed: number, duration: number) {
  if (elapsed < 0 || elapsed > duration) return 0;
  return Math.sin((elapsed / duration) * Math.PI);
}

// ── Escalated click reactions ───────────────────────────────────────────
// Client follow-up on the first pass ("love it but make them do a little
// more interactive... I click the laptop it gets lifted and shows some
// coding or typing happening. Similar for all other objects"): the
// original click reactions (a brightness sweep, a steam puff, a thumbstick
// tilt, a pen wiggle) were all *material-only* — nothing physically moved.
// Every object below now gets two layered upgrades on click: (1) the
// object itself — or, for the laptop, its whole body — physically lifts
// and tilts, via its own dedicated inner `*GroupRef` (nested inside the
// existing hover/pointer-handler group so this never touches the hover
// lift/scale logic already established); and (2) an escalated "doing its
// thing" payoff specific to that object (a typing cursor + line flourish,
// a steam burst, a button-press ripple + power-on LED, an ink mark).
// CLICK_LIFT_DURATION is the shared eased rise-and-settle envelope for
// every object's physical lift/tilt (same pulse01 shape already used
// throughout this file); each payoff below layers its own timing on top.
// Reduced motion keeps the exact same convention CLICK_FLASH_MS already
// established elsewhere in this file: every one of these collapses to a
// single instant "lifted + mid-payoff" pose for CLICK_FLASH_MS, then back
// — never an eased travel animation — via the `*Click.flash` boolean.
// ── Legibility pass (client: "they just jump on click ... something actual
// should happen and more high definition") ─────────────────────────────
// Diagnosis, from actually screenshotting the previous numbers below at
// this canvas's true ~288px render size (before/after frames saved during
// this pass): the physical lift/tilt WAS technically present and even
// visible in a side-by-side diff, but two things sank its legibility —
// (1) every payoff detail meant to explain *what* the object was doing
// (the laptop's code lines, the button-press ripple, the ink mark) was
// rendered at 1-3px and, for the code lines specifically, in a color
// nearly identical in hue/intensity to its own background, so it was
// below the threshold a glancing viewer could ever read, even though the
// object visibly moved — which reads as exactly the client's complaint,
// motion with no legible cause, i.e. "jump"; (2) the magnitudes here were
// well under the register ForgeBeaverModel's confirmed-legible smile (a
// full ~54° swing) and MedalModel's pillar-flash (a ~2.4x brightness
// jump) establish as "actually reads as a deliberate reaction" at a small
// R3F canvas. Fix below is both: roughly 2.5x the lift/tilt magnitude
// (still short of looking physically unhinged — these are lift+tilt on
// objects resting on a desk, not free rotation) PLUS a shared scale pop
// (CLICK_SCALE_BUMP) layered on top, since a silhouette-size change is the
// single most reliable "something happened" signal at this render size
// (the same reason HOVER_SCALE already exists) — three stacked, coarse
// signals (lift + tilt + scale) so the base motion alone is unmistakable
// even before a viewer registers any fine payoff detail. Duration
// stretched from 0.6s to 1.0s (peaking at 0.5s) so the motion is slow
// enough for an eye to actually track the rise, matching the pace
// ForgeBeaverModel's own confirmed-legible smile pulse (0.9s) settled on.
const CLICK_LIFT_DURATION = 1.0;
const CLICK_SCALE_BUMP = 0.16; // shared scale pop at the envelope's peak, layered on every object's own lift/tilt
const LAPTOP_CLICK_LIFT = 0.2;
// Client follow-up: "the laptop needs to tilt the other way (downward)."
// Was `-laptopLiftEnvelope * LAPTOP_CLICK_TILT` (tipped back toward the
// viewer, screen leaning in); the minus sign is now dropped at both call
// sites below so the same magnitude tips the opposite way (screen dips
// down/away) instead of flipping this constant negative, matching the
// sign convention MUG_CLICK_TILT_X and NOTEBOOK_CLICK_TILT already use
// for their own "which way does positive rotation.x read" cases.
const LAPTOP_CLICK_TILT = 0.46; // rad (~26°)
const MUG_CLICK_LIFT = 0.16;
const MUG_CLICK_TILT_X = -0.2; // tips forward slightly
const MUG_CLICK_TILT_Z = 0.44; // rad (~25°) — leans, as if a hand were closing on the handle
const CTRL_CLICK_LIFT = 0.22;
// Same follow-up, same fix as the laptop above: was
// `-ctrlLiftEnvelope * CTRL_CLICK_TILT` (far edge lifted toward the
// viewer); minus sign dropped at both call sites so it dips down instead.
const CTRL_CLICK_TILT = 0.44; // rad (~25°)
const NOTEBOOK_CLICK_LIFT = 0.2;
// Same follow-up: was -0.44 (cover tipped open toward the viewer). Flipped
// to positive so the cover tips the other way (down/away) instead — this
// constant's own sign already carries the direction at both call sites
// (unlike laptop/controller above, which negate in the formula instead),
// so flipping the sign here is the complete fix for this one.
const NOTEBOOK_CLICK_TILT = 0.44; // rad (~25°)

// Code "lines" on the laptop screen — fixed widths/positions/base-glow so
// the screen reads as a real editor (ragged left-aligned line lengths)
// instead of the single flat glow rectangle it used to be.
// `glow` is now an emissiveIntensity multiplier read against CODE_TEXT
// (bright near-white mint) rather than SCREEN_GLOW — the previous version
// used the SAME color as the screen's own background glow at a SIMILAR
// intensity, so lines only ever showed up as faint darker streaks
// (confirmed by screenshot-zooming the rendered screen during this pass).
// Taller (0.032 vs 0.018) too, so a line reads as a real text bar instead
// of a hairline at this canvas's true render size.
const CODE_LINES = [
  { w: 0.3, yOff: 0.11, glow: 0.85 },
  { w: 0.4, yOff: 0.065, glow: 1.3 },
  { w: 0.2, yOff: 0.02, glow: 0.7 },
  { w: 0.34, yOff: -0.025, glow: 1.1 },
  { w: 0.16, yOff: -0.07, glow: 0.8 },
  { w: 0.28, yOff: -0.115, glow: 1.0 },
];
// The bottom line reads as "the line currently being typed" — it's the
// one the blinking cursor sits at the end of.
const ACTIVE_LINE_INDEX = CODE_LINES.length - 1;
const CODE_LINE_HEIGHT = 0.032; // was 0.018 — thick enough to read as a text bar, not a hairline, at true render size
const CURSOR_BLINK_HZ = 3; // on/off cycles per second while the click envelope is active — slowed from 4.5 so each on/off state actually holds long enough to register

// Steam wisps above the mug — resting y/x/z laid out once; only their
// height/opacity animate.
const STEAM_WISPS = [
  { x: -0.015, yBase: 0.3, z: 0.0 },
  { x: 0.025, yBase: 0.34, z: 0.012 },
  { x: -0.008, yBase: 0.38, z: -0.008 },
];
// Extra "burst" wisps that only exist during a click — layered on top of
// the always-present idle STEAM_WISPS loop above for a visibly bigger
// puff. A third wisp and a bigger travel/scale (see the click.flash JSX
// defaults + useFrame math below) than the original two-wisp version,
// which barely read as "more" steam over the idle drift at true size.
const STEAM_BURST = [
  { x: -0.028, yBase: 0.26, z: 0.014 },
  { x: 0.026, yBase: 0.29, z: -0.017 },
  { x: 0.0, yBase: 0.24, z: 0.004 },
];

// Face buttons — shared between rendering and the click-ripple refs so the
// two stay in sync by construction. Repositioned this pass onto the right
// Joy-Con rail (centered on its x = 0.195) for the Switch swap below.
const FACE_BUTTONS: [number, number][] = [
  [0.195, -0.03],
  [0.195, 0.03],
  [0.165, 0],
  [0.225, 0],
];

const INK_MARK_DURATION = 1.1; // seconds — grow-then-fade envelope for the notebook's "just written" mark (was 0.9, stretched to match the slower overall click pacing)

type ClickReaction = {
  clickT: React.RefObject<number | null>;
  flash: boolean;
  trigger: () => void;
};

/**
 * One reaction per interactive object: a click either arms a `useFrame`
 * pulse (animate=true — read by the object's own useFrame math below) or,
 * under reduced motion, flips a plain boolean on for CLICK_FLASH_MS
 * (animate=false — a single discrete pose swap, not a per-frame loop).
 * Never both at once, so there's no path where reduced motion still ends
 * up driving a continuous animation.
 */
function useClickReaction(animate: boolean, t: React.RefObject<number>): ClickReaction {
  const clickT = useRef<number | null>(null);
  const [flash, setFlash] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const trigger = () => {
    if (animate) {
      clickT.current = t.current;
    } else {
      setFlash(true);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setFlash(false), CLICK_FLASH_MS);
    }
  };

  return { clickT, flash, trigger };
}

/**
 * A small desk still-life: laptop, coffee mug, game controller and a
 * notebook+pen, grounded on a shared desk slab. Each object is a direct,
 * literal answer to one of the four things the client named himself by
 * ("founder, engineer, coffee gamer") rather than a single abstract
 * metaphor for his job function — that abstraction (a padlock standing in
 * for "access control work") was exactly the client's complaint. Together
 * the four objects read as "this is what my desk looks like," not as one
 * isolated emblem.
 *
 * Accent colors are deliberately not invented fresh — they're pulled
 * straight from this site's own hero-glow word-cycle palette
 * (globals.css: Engineer=mint, Founder=violet, Coffee Guy=crema,
 * Gamer=cyan), so this visual echoes a system the site already
 * established for exactly these four facets instead of introducing an
 * unrelated color language.
 *
 * Every object now carries a second layer of detail (laptop key rows +
 * trackpad + code-line screen, steam wisps, controller recessed face-plate
 * + dpad/face buttons, notebook spine crease + page lines + a lifted
 * corner) and is individually pointer-interactive: hovering lifts/brightens
 * it, clicking fires a dedicated per-object reaction with real physical
 * payoff — see the "Escalated click reactions" block above for the client
 * follow-up this answers, and the "Legibility pass" comment further below
 * for the *second* follow-up ("they just jump on click... something
 * actual should happen") this file now also answers: the physical
 * lift/tilt on every object is roughly 2.5x its original magnitude, every
 * object now also pops in scale at the click's peak (CLICK_SCALE_BUMP,
 * the same coarse "size changed" signal HOVER_SCALE already relies on),
 * and every fine payoff detail (code lines/cursor, steam burst, button
 * ripple, ink mark) was rebuilt for actual contrast/size at this canvas's
 * true ~288px render size rather than just being "technically present."
 * In short: laptop lifts+tilts+scales and its screen shows an elaborated
 * "actively typing" sequence (per-line width flourish + blinking
 * end-of-line cursor, both now in a bright CODE_TEXT tone with real
 * contrast against the screen, on top of the original brightness sweep);
 * mug lifts+tilts+scales as if being picked up and puffs a bigger,
 * swirling three-wisp steam burst; controller lifts+tilts+scales with a
 * button-press ripple (now with a bloom halo per button) across the face
 * buttons and a power-on LED pulse (now with its own halo), on top of the
 * original thumbstick press-tilt; notebook lifts+tilts+scales open and the
 * pen taps/bounces through a bigger, more visible writing motion that
 * leaves a bolder ink mark on the page. The whole group also gives a
 * restrained look-toward-cursor parallax on top of its idle sway
 * (unchanged).
 *
 * Default/static frame (`animate={false}`): every object sits at its
 * resting pose — screen glow, steam opacity, thumbstick pose and pen
 * angle all at fixed values — a complete, correct "desk at rest" image,
 * not a paused mid-animation frame. That's what no-JS visitors see, and
 * it's also the calm baseline reduced-motion visitors sit on. Hover and
 * click still work under reduced motion (a cursor is still a JS-only
 * enhancement layered on top of a complete static scene either way), but
 * every reaction that would otherwise be a continuous per-frame animation
 * collapses to one instant, timed pose-swap instead — see
 * `useClickReaction` above and the `animate ? … : flash` branches below.
 *
 * Animated (`animate={true}`): the existing slow whole-scene presentation
 * sway and screen-glow breathe, now joined by a cursor-parallax tilt, an
 * idle steam drift, and per-object click lift/tilt + payoff pulses — all
 * driven off `useFrame` deltas only, gated the same way the original
 * sway/breathe always were.
 *
 * ── THIRD PASS: full rebuild ─────────────────────────────────────────
 * Client, after the second pass above (which had already escalated click
 * magnitudes and legibility): "The animation in who I am are still so bad
 * ... They only get up on click and you cant do anything with them 0
 * interaction." Asked whether to abandon the desk-objects concept or
 * rebuild it at a much higher bar, the client chose: same concept (this
 * literally is "founder, engineer, coffee, gamer," his own words), full
 * rebuild, much higher bar. Two problems, both addressed, independently:
 *
 * "0 interaction" (hover was never legible on its own): see the
 * "Hover feedback — third-pass rebuild" comment above HOVER_LIFT/
 * HOVER_SCALE. In short — hover already existed before this pass but was
 * too small a delta to ever register; it's now a stacked, three-signal
 * response (bigger instant lift+scale, a new colored glow halo per
 * object, a spring "wake" bounce on entry) that's unmistakable without
 * any click, verified by screenshotting hover-alone against resting.
 * Every object also now has its own small always-on idle breathing bob
 * (IDLE_BOB_*), independent of both hover and click, so the scene has
 * ambient life even with no cursor anywhere near it.
 *
 * "Ugly" (material/lighting quality, independent of interactivity):
 * addressed partly in AboutVisual.tsx (a real key/hemisphere/rim lighting
 * rig replacing the old flat ambient+2-directional setup, plus Bloom
 * post-processing on the scene's emissive elements) and partly here —
 * curved/reflective surfaces that were flat-shaded low-poly (the mug
 * body/rim/handle, the controller's face buttons/thumbsticks, the pen
 * barrel/tip) had `flatShading` dropped and roughness/metalness retuned,
 * following the same logic this codebase's own best-received pieces
 * (MedalModel, ForgeBeaverModel) already use: flat shading stays on flat
 * matte panels (laptop deck/lid, notebook cover/pages, controller shell)
 * where it reads as intentional low-poly charm, and comes off curved
 * glossy surfaces where it previously read as unfinished faceting. A
 * handful of new small identity-defining details were added for the same
 * "real detail" bar those two pieces set — a saucer under the mug,
 * controller shoulder bumpers (L1/R1), a notebook bookmark ribbon, and a
 * laptop power LED — each a small, cheap addition in this file's existing
 * primitive vocabulary, not a geometry overhaul.
 */
export function DeskSetupModel({ animate }: { animate: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const screenMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const codeLineRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const codeLineGroupRefs = useRef<(THREE.Group | null)[]>([]);
  const cursorMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const laptopGroupRef = useRef<THREE.Group>(null);
  const laptopHaloMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const laptopHoverEnterT = useRef<number | null>(null);

  const steamMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const steamMatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const steamBurstMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const steamBurstMatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const mugGroupRef = useRef<THREE.Group>(null);
  const mugHaloMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const mugHoverEnterT = useRef<number | null>(null);

  const thumbstickRefs = useRef<(THREE.Mesh | null)[]>([]);
  const faceButtonRefs = useRef<(THREE.Mesh | null)[]>([]);
  const faceButtonMatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const faceButtonHaloRefs = useRef<(THREE.Mesh | null)[]>([]);
  const faceButtonHaloMatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const ledMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const ledHaloMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const controllerGroupRef = useRef<THREE.Group>(null);
  const controllerHaloMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const controllerHoverEnterT = useRef<number | null>(null);

  const penGroupRef = useRef<THREE.Group>(null);
  const inkMarkGroupRef = useRef<THREE.Group>(null);
  const inkMarkMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const notebookGroupRef = useRef<THREE.Group>(null);
  const notebookHaloMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const notebookHoverEnterT = useRef<number | null>(null);

  const t = useRef(0);

  const { pointer, gl } = useThree();
  const overCanvas = useRef(false);
  const parallax = useRef({ x: 0, y: 0 });

  // Hover state — one flag per object, driving instant (non-eased) JSX
  // prop deltas, so hovering behaves identically whether or not `animate`
  // is on: it's a highlight snap, never a continuous transition.
  const [hoverLaptop, setHoverLaptop] = useState(false);
  const [hoverMug, setHoverMug] = useState(false);
  const [hoverController, setHoverController] = useState(false);
  const [hoverNotebook, setHoverNotebook] = useState(false);

  const laptopClick = useClickReaction(animate, t);
  const mugClick = useClickReaction(animate, t);
  const controllerClick = useClickReaction(animate, t);
  const notebookClick = useClickReaction(animate, t);

  // Cursor-parallax tracking: only meaningful while the pointer is
  // actually over this canvas, otherwise the group would stay tilted
  // toward wherever the pointer last was.
  useEffect(() => {
    const el = gl.domElement;
    const onEnter = () => {
      overCanvas.current = true;
    };
    const onLeave = () => {
      overCanvas.current = false;
      el.style.cursor = "auto";
      setHoverLaptop(false);
      setHoverMug(false);
      setHoverController(false);
      setHoverNotebook(false);
    };
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [gl]);

  useFrame((_, delta) => {
    if (!animate || !groupRef.current) return;
    t.current += delta;

    // Ambient presentation sway, plus a restrained look-toward-cursor
    // parallax layered on top (only while the pointer is over the
    // canvas — otherwise it eases back to the plain sway).
    const targetX = overCanvas.current ? pointer.x : 0;
    const targetY = overCanvas.current ? pointer.y : 0;
    const ease = Math.min(1, delta * 4);
    parallax.current.x += (targetX - parallax.current.x) * ease;
    parallax.current.y += (targetY - parallax.current.y) * ease;

    groupRef.current.rotation.y = Math.sin(t.current * 0.32) * 0.22 + parallax.current.x * 0.16;
    groupRef.current.rotation.x = parallax.current.y * -0.08;

    // ── Laptop: click lifts+tilts+scales the whole laptop and drives an
    // escalated "actively typing" screen payoff — brightness sweep (kept,
    // now against a dimmer resting screen so the swing itself reads
    // bigger) plus a per-line width flourish (deeper dip, brighter
    // CODE_TEXT color instead of the old same-as-background SCREEN_GLOW)
    // plus a blinking end-of-line cursor, so the screen unmistakably reads
    // as "someone is typing on this" rather than "the screen changed
    // color." ────────────────────────────────────────────────────────────
    const laptopElapsed = laptopClick.clickT.current == null ? -1 : t.current - laptopClick.clickT.current;
    const laptopLiftEnvelope =
      laptopClick.clickT.current == null ? 0 : pulse01(laptopElapsed, CLICK_LIFT_DURATION);
    // Hover "wake" bounce — a short spring overshoot fired from the
    // moment the pointer entered, layered on top of the steady
    // HOVER_SCALE the outer group already applies via JSX.
    const laptopHoverElapsed =
      laptopHoverEnterT.current == null ? -1 : t.current - laptopHoverEnterT.current;
    const laptopHoverBounce = HOVER_BOUNCE_AMOUNT * hoverBounce01(laptopHoverElapsed);
    // Ambient idle bob — always on while animated, independent of
    // hover/click, so the laptop has a quiet breathing presence at rest.
    const laptopIdleBob = Math.sin(t.current * IDLE_BOB_FREQ + IDLE_PHASE_LAPTOP) * IDLE_BOB_AMP;
    if (laptopGroupRef.current) {
      laptopGroupRef.current.position.y = laptopLiftEnvelope * LAPTOP_CLICK_LIFT + laptopIdleBob;
      laptopGroupRef.current.rotation.x = laptopLiftEnvelope * LAPTOP_CLICK_TILT;
      laptopGroupRef.current.scale.setScalar(1 + laptopLiftEnvelope * CLICK_SCALE_BUMP + laptopHoverBounce);
    }
    if (laptopHaloMatRef.current) {
      const target = hoverLaptop ? HOVER_GLOW_OPACITY + Math.sin(t.current * 4) * 0.08 : 0;
      laptopHaloMatRef.current.opacity += (target - laptopHaloMatRef.current.opacity) * Math.min(1, delta * 10);
    }
    const laptopPulse = laptopClick.clickT.current == null ? 0 : pulse01(laptopElapsed, 0.8);
    if (screenMatRef.current) {
      // Resting intensity dropped from 0.75 to 0.4 — the screen now reads
      // as a dim, real IDE background at rest, so the click's brightness
      // swing (+0.7, was +0.45) and the CODE_TEXT lines against it both
      // have real contrast to swing through instead of everything already
      // sitting near-saturated.
      screenMatRef.current.emissiveIntensity =
        0.4 + Math.sin(t.current * 1.1) * 0.12 + (hoverLaptop ? 0.2 : 0) + laptopPulse * 0.7;
    }
    codeLineRefs.current.forEach((mat, i) => {
      if (!mat) return;
      const stagger = laptopClick.clickT.current == null ? 0 : pulse01(laptopElapsed - i * 0.07, 0.55);
      mat.emissiveIntensity = CODE_LINES[i].glow + (hoverLaptop ? 0.25 : 0) + stagger * 1.4;
    });
    codeLineGroupRefs.current.forEach((grp, i) => {
      if (!grp) return;
      // A left-anchored width dip-and-regrow, staggered left to right
      // across the lines — reads as each line being "retyped" in
      // sequence. Deeper dip than the original pass (down to 12% width,
      // was 45%) so the regrow is an unmistakable reveal rather than a
      // subtle narrowing.
      const stagger = laptopClick.clickT.current == null ? 0 : pulse01(laptopElapsed - i * 0.07, 0.55);
      grp.scale.x = 1 - stagger * 0.88;
    });
    if (cursorMatRef.current) {
      const active = laptopLiftEnvelope > 0.02;
      const blinkOn = active && Math.sin(t.current * CURSOR_BLINK_HZ * Math.PI * 2) > 0;
      cursorMatRef.current.emissiveIntensity = blinkOn ? 2.4 : 0.05;
    }

    // ── Mug: click lifts+tilts+scales the mug (as if a hand is closing on
    // the handle and picking it up) and puffs a bigger, swirling steam
    // burst on top of the idle drift.
    const mugElapsed = mugClick.clickT.current == null ? -1 : t.current - mugClick.clickT.current;
    const mugLiftEnvelope = mugClick.clickT.current == null ? 0 : pulse01(mugElapsed, CLICK_LIFT_DURATION);
    const mugHoverElapsed = mugHoverEnterT.current == null ? -1 : t.current - mugHoverEnterT.current;
    const mugHoverBounce = HOVER_BOUNCE_AMOUNT * hoverBounce01(mugHoverElapsed);
    const mugIdleBob = Math.sin(t.current * IDLE_BOB_FREQ + IDLE_PHASE_MUG) * IDLE_BOB_AMP;
    if (mugGroupRef.current) {
      mugGroupRef.current.position.y = mugLiftEnvelope * MUG_CLICK_LIFT + mugIdleBob;
      mugGroupRef.current.rotation.x = mugLiftEnvelope * MUG_CLICK_TILT_X;
      mugGroupRef.current.rotation.z = mugLiftEnvelope * MUG_CLICK_TILT_Z;
      mugGroupRef.current.scale.setScalar(1 + mugLiftEnvelope * CLICK_SCALE_BUMP + mugHoverBounce);
    }
    if (mugHaloMatRef.current) {
      const target = hoverMug ? HOVER_GLOW_OPACITY + Math.sin(t.current * 4) * 0.08 : 0;
      mugHaloMatRef.current.opacity += (target - mugHaloMatRef.current.opacity) * Math.min(1, delta * 10);
    }
    const mugPulse = mugClick.clickT.current == null ? 0 : pulse01(mugElapsed, 1.2);
    steamMeshRefs.current.forEach((mesh, i) => {
      const mat = steamMatRefs.current[i];
      if (!mesh || !mat) return;
      const cycle = (t.current * 0.45 + i * 0.6) % 1.6;
      const progress = cycle / 1.6;
      mesh.position.y = STEAM_WISPS[i].yBase + cycle * 0.16;
      // A gentle swirl kicks in only while the click puff is active, so
      // the burst reads as agitated/rising rather than just brighter.
      mesh.position.x = STEAM_WISPS[i].x + Math.sin(t.current * 3.2 + i * 2) * 0.012 * mugPulse;
      mat.opacity = Math.sin(progress * Math.PI) * 0.42 + (hoverMug ? 0.12 : 0) + mugPulse * 0.4;
    });
    steamBurstMeshRefs.current.forEach((mesh, i) => {
      const mat = steamBurstMatRefs.current[i];
      if (!mesh || !mat) return;
      const localElapsed = mugElapsed - i * 0.1;
      const burst = mugClick.clickT.current == null ? 0 : pulse01(localElapsed, 1.0);
      // Bigger, higher travel than the original pass (0.55, was 0.34) —
      // the old burst rose barely past the idle wisps' own drift, so the
      // "extra puff" was indistinguishable from the loop already running.
      mesh.position.y = STEAM_BURST[i].yBase + burst * 0.55;
      mesh.position.x = STEAM_BURST[i].x + Math.sin(t.current * 3.6 + i * 3) * 0.036 * burst;
      mat.opacity = burst * 0.8;
    });

    // ── Controller: click lifts+tilts+scales the whole controller (like
    // being picked up to play), rings a press ripple across the four face
    // buttons, and pulses the power LED — on top of the original
    // thumbstick press-spin. ─────────────────────────────────────────
    const ctrlElapsed =
      controllerClick.clickT.current == null ? -1 : t.current - controllerClick.clickT.current;
    const ctrlLiftEnvelope =
      controllerClick.clickT.current == null ? 0 : pulse01(ctrlElapsed, CLICK_LIFT_DURATION);
    const ctrlHoverElapsed =
      controllerHoverEnterT.current == null ? -1 : t.current - controllerHoverEnterT.current;
    const ctrlHoverBounce = HOVER_BOUNCE_AMOUNT * hoverBounce01(ctrlHoverElapsed);
    const ctrlIdleBob = Math.sin(t.current * IDLE_BOB_FREQ + IDLE_PHASE_CTRL) * IDLE_BOB_AMP;
    if (controllerGroupRef.current) {
      controllerGroupRef.current.position.y = ctrlLiftEnvelope * CTRL_CLICK_LIFT + ctrlIdleBob;
      controllerGroupRef.current.rotation.x = ctrlLiftEnvelope * CTRL_CLICK_TILT;
      controllerGroupRef.current.scale.setScalar(1 + ctrlLiftEnvelope * CLICK_SCALE_BUMP + ctrlHoverBounce);
    }
    if (controllerHaloMatRef.current) {
      const target = hoverController ? HOVER_GLOW_OPACITY + Math.sin(t.current * 4) * 0.08 : 0;
      controllerHaloMatRef.current.opacity +=
        (target - controllerHaloMatRef.current.opacity) * Math.min(1, delta * 10);
    }
    // Note: these caps are cylinders, radially symmetric about their own
    // Y axis — spinning them about Y would be a no-op (nothing to read as
    // motion). Tilting about X/Z instead, on a rotating phase, makes the
    // cap visibly precess/circle in its socket while it presses down, so
    // "spin" actually reads as a spin here.
    thumbstickRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const localElapsed = ctrlElapsed - i * 0.06;
      const press = controllerClick.clickT.current == null ? 0 : pulse01(localElapsed, 0.45);
      mesh.scale.y = 1 - press * 0.5;
      mesh.rotation.x = Math.sin(localElapsed * 16) * press * 0.5;
      mesh.rotation.z = Math.cos(localElapsed * 16) * press * 0.5;
    });
    faceButtonRefs.current.forEach((mesh, i) => {
      const mat = faceButtonMatRefs.current[i];
      if (!mesh || !mat) return;
      const localElapsed = ctrlElapsed - i * 0.07;
      const press = controllerClick.clickT.current == null ? 0 : pulse01(localElapsed, 0.4);
      // Deeper dip (0.55, was 0.35) plus a much bigger emissive swing
      // (1.8, was 0.9) — the original 2px-radius spheres barely changed
      // shade at this canvas's true render size, so the "ripple" was
      // invisible even though the math was firing correctly.
      mesh.scale.setScalar(1 - press * 0.55);
      mat.emissiveIntensity = press * 1.8;
    });
    faceButtonHaloRefs.current.forEach((mesh, i) => {
      const mat = faceButtonHaloMatRefs.current[i];
      if (!mesh || !mat) return;
      const localElapsed = ctrlElapsed - i * 0.07;
      const press = controllerClick.clickT.current == null ? 0 : pulse01(localElapsed, 0.4);
      // A soft bloom ring, nested just outside each face button (same
      // "second, bigger, transparent shape" trick MedalModel's sparkles
      // and ForgeBeaverModel's eye-shine use) — gives the press a visible
      // glow halo instead of relying only on the tiny button sphere
      // itself changing shade.
      mat.opacity = press * 0.6;
    });
    if (ledMatRef.current) {
      ledMatRef.current.emissiveIntensity = 0.2 + ctrlLiftEnvelope * 2.6;
    }
    if (ledHaloMatRef.current) {
      ledHaloMatRef.current.opacity = ctrlLiftEnvelope * 0.55;
    }

    // ── Notebook + pen: click lifts+tilts+scales the notebook open, the
    // pen taps/bounces through a more visible writing motion (real
    // vertical travel, not just a rotation wiggle), and leaves a brief,
    // bolder ink mark on the page that grows in and fades. ──────────────
    const noteElapsed =
      notebookClick.clickT.current == null ? -1 : t.current - notebookClick.clickT.current;
    const noteLiftEnvelope =
      notebookClick.clickT.current == null ? 0 : pulse01(noteElapsed, CLICK_LIFT_DURATION);
    const noteHoverElapsed =
      notebookHoverEnterT.current == null ? -1 : t.current - notebookHoverEnterT.current;
    const noteHoverBounce = HOVER_BOUNCE_AMOUNT * hoverBounce01(noteHoverElapsed);
    const noteIdleBob = Math.sin(t.current * IDLE_BOB_FREQ + IDLE_PHASE_NOTEBOOK) * IDLE_BOB_AMP;
    if (notebookGroupRef.current) {
      notebookGroupRef.current.position.y = noteLiftEnvelope * NOTEBOOK_CLICK_LIFT + noteIdleBob;
      notebookGroupRef.current.rotation.x = noteLiftEnvelope * NOTEBOOK_CLICK_TILT;
      notebookGroupRef.current.scale.setScalar(1 + noteLiftEnvelope * CLICK_SCALE_BUMP + noteHoverBounce);
    }
    if (notebookHaloMatRef.current) {
      const target = hoverNotebook ? HOVER_GLOW_OPACITY + Math.sin(t.current * 4) * 0.08 : 0;
      notebookHaloMatRef.current.opacity +=
        (target - notebookHaloMatRef.current.opacity) * Math.min(1, delta * 10);
    }
    if (penGroupRef.current) {
      const tapEnvelope = notebookClick.clickT.current == null ? 0 : pulse01(noteElapsed, 1.05);
      // Bigger vertical travel (0.09, was 0.055) and wiggle (0.36, was
      // 0.22) — the pen is a large, easy-to-track shape compared to the
      // ink mark, so making ITS motion bigger is the more reliable
      // legibility fix than relying on the ink mark alone.
      penGroupRef.current.position.y = tapEnvelope * 0.09 * Math.abs(Math.sin(noteElapsed * 11));
      penGroupRef.current.rotation.z = Math.sin(noteElapsed * 18) * tapEnvelope * 0.36;
    }
    if (inkMarkGroupRef.current) {
      const growWindow = INK_MARK_DURATION * 0.4;
      inkMarkGroupRef.current.scale.x =
        notebookClick.clickT.current == null ? 0 : Math.min(1, Math.max(0, noteElapsed) / growWindow);
    }
    if (inkMarkMatRef.current) {
      const inkFade = notebookClick.clickT.current == null ? 0 : pulse01(noteElapsed, INK_MARK_DURATION);
      inkMarkMatRef.current.opacity = inkFade * 0.95;
    }
  });

  return (
    <group ref={groupRef} scale={1.05} position={[0, 0.02, 0]}>
      {/* desk slab — grounds the whole composition as one scene, not four
          floating objects */}
      <mesh position={[0, -0.55, 0]}>
        <boxGeometry args={[1.9, 0.07, 1.15]} />
        <meshStandardMaterial color={DESK} flatShading roughness={0.9} />
      </mesh>

      {/* ── Laptop — engineer ─────────────────────────────────────────── */}
      <group
        position={[0.02, -0.475 + (hoverLaptop ? HOVER_LIFT : 0), -0.16]}
        scale={hoverLaptop ? HOVER_SCALE : 1}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoverLaptop(true);
          laptopHoverEnterT.current = t.current;
          gl.domElement.style.cursor = "pointer";
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHoverLaptop(false);
          gl.domElement.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          laptopClick.trigger();
        }}
      >
        {/* click lift/tilt/scale group — the whole laptop rises, tips back
            toward the viewer, and pops slightly bigger on click, nested
            inside the hover group above so it never fights the hover
            lift/scale */}
        <group
          ref={laptopGroupRef}
          position={[0, laptopClick.flash ? LAPTOP_CLICK_LIFT : 0, 0]}
          rotation={[laptopClick.flash ? LAPTOP_CLICK_TILT : 0, 0, 0]}
          scale={laptopClick.flash ? 1 + CLICK_SCALE_BUMP : 1}
        >
          {/* keyboard deck */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.62, 0.045, 0.42]} />
            <meshStandardMaterial color={LAPTOP_BODY} flatShading roughness={0.7} />
          </mesh>
          {/* front-edge bevel strip — a darker shade along the deck's front
              lip so the slab reads as having a defined edge rather than
              being one flat paper-colored block ("more high definition"
              pass; same "add a shadow-tone strip at the edge" move the
              file's own METAL/NEAR_VOID pairing already uses elsewhere) */}
          <mesh position={[0, -0.0175, 0.209]}>
            <boxGeometry args={[0.62, 0.01, 0.006]} />
            <meshStandardMaterial color={LAPTOP_EDGE} flatShading roughness={0.65} />
          </mesh>
          {/* key rows — a few raised strips rather than a full keycap grid,
              which just turns to noise at this canvas's true render size */}
          {[-0.175, -0.135, -0.095, -0.055].map((z) => (
            <mesh key={z} position={[0, 0.026, z]}>
              <boxGeometry args={[0.5, 0.006, 0.028]} />
              <meshStandardMaterial color={LAPTOP_SHADE} flatShading roughness={0.6} />
            </mesh>
          ))}
          <mesh position={[0, -0.005, 0.07]}>
            <boxGeometry args={[0.52, 0.01, 0.24]} />
            <meshStandardMaterial color={NEAR_VOID} flatShading roughness={0.6} />
          </mesh>
          {/* trackpad — a small recessed rectangle below the key rows, the
              detail that reads "this is the deck of a laptop" rather than
              a plain slab with some stripes on it. flatShading dropped
              (this pass) and roughness lowered — a real trackpad is a
              smooth glass/glass-like surface, distinct from the matte
              keyboard deck around it. */}
          <mesh position={[0, 0.001, 0.155]}>
            <boxGeometry args={[0.2, 0.004, 0.11]} />
            <meshStandardMaterial color={LAPTOP_EDGE} roughness={0.25} />
          </mesh>
          {/* power LED — a small always-on indicator dot on the deck, the
              same "small lit accent" language the controller's power LED
              already uses, tying the laptop into that vocabulary and
              giving the deck one more point of considered detail. */}
          <mesh position={[0.29, 0.026, -0.19]}>
            <sphereGeometry args={[0.008, 8, 8]} />
            <meshStandardMaterial
              color="#0d1410"
              emissive={SCREEN_GLOW}
              emissiveIntensity={hoverLaptop ? 1.6 : 0.7}
            />
          </mesh>
          {/* screen, hinged up and tilted slightly back */}
          <group position={[0, 0.02, -0.205]} rotation={[-1.32, 0, 0]}>
            <mesh position={[0, 0.21, 0]}>
              <boxGeometry args={[0.62, 0.42, 0.025]} />
              <meshStandardMaterial color={LAPTOP_SHADE} flatShading roughness={0.6} />
            </mesh>
            {/* thin bezel frame, a shade darker than the lid, sitting just
                behind the glowing screen plane — gives the screen a real
                edge/border instead of the mint glow simply stopping mid-lid */}
            <mesh position={[0, 0.21, 0.0135]}>
              <planeGeometry args={[0.56, 0.36]} />
              <meshStandardMaterial color={NEAR_VOID} flatShading roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.21, 0.014]}>
              <planeGeometry args={[0.52, 0.32]} />
              <meshStandardMaterial
                ref={screenMatRef}
                color={SCREEN_BG}
                emissive={SCREEN_GLOW}
                emissiveIntensity={0.4 + (hoverLaptop ? 0.2 : 0) + (laptopClick.flash ? 0.7 : 0)}
                roughness={0.3}
              />
            </mesh>
            {/* code lines — each wrapped in its own pivot group anchored at
                the shared left margin, so a click can grow/shrink a line's
                width from that fixed left edge (reading as "being
                retyped") instead of scaling from its center. Click also
                sweeps a brightness wave down them (or, under reduced
                motion, an instant single flash). Rendered in CODE_TEXT (a
                bright near-white mint) rather than the screen's own
                SCREEN_GLOW — the previous same-color-as-background choice
                made the lines nearly unreadable even at full brightness,
                confirmed by screenshot-zooming the rendered screen. */}
            {CODE_LINES.map((line, i) => (
              <group
                key={i}
                ref={(el) => {
                  codeLineGroupRefs.current[i] = el;
                }}
                position={[-0.21, 0.21 + line.yOff, 0.016]}
              >
                <mesh position={[line.w / 2, 0, 0]}>
                  <planeGeometry args={[line.w, CODE_LINE_HEIGHT]} />
                  <meshStandardMaterial
                    ref={(el) => {
                      codeLineRefs.current[i] = el;
                    }}
                    color={SCREEN_BG}
                    emissive={CODE_TEXT}
                    emissiveIntensity={
                      line.glow + (hoverLaptop ? 0.3 : 0) + (laptopClick.flash ? 1.4 : 0)
                    }
                    roughness={0.3}
                  />
                </mesh>
              </group>
            ))}
            {/* blinking cursor block at the end of the active (bottom)
                line — the clearest single tell that this is "typing right
                now," not just a brightness sweep. Lit continuously (not
                blinking) during the reduced-motion flash pose, and
                blinking on a fast cycle for the animated click envelope. */}
            <mesh
              position={[
                -0.21 + CODE_LINES[ACTIVE_LINE_INDEX].w + 0.02,
                0.21 + CODE_LINES[ACTIVE_LINE_INDEX].yOff,
                0.017,
              ]}
            >
              {/* Nearly 2x bigger than the original 0.016x0.02 block, and in
                  CODE_TEXT rather than SCREEN_GLOW, for the same contrast
                  fix the code lines above got — this was the single
                  smallest, lowest-contrast element in the whole scene. */}
              <planeGeometry args={[0.03, 0.036]} />
              <meshStandardMaterial
                ref={cursorMatRef}
                color={SCREEN_BG}
                emissive={CODE_TEXT}
                emissiveIntensity={laptopClick.flash ? 2.4 : 0.05}
                roughness={0.3}
              />
            </mesh>
          </group>
        </group>
        {/* hover glow halo — invisible at rest (opacity 0 both as JSX
            default and, under reduced motion, permanently), fades/blooms
            in around the laptop's silhouette purely on hover, no click
            required. Additive blending + depthWrite=false (same "soft
            glow shape nested around the real geometry" trick this file's
            own LED/button halos already use for click payoffs) reads as a
            genuine light bloom rather than a flat sticker, especially
            paired with the Bloom post-processing pass added in
            AboutVisual.tsx. */}
        <mesh position={[0, 0.12, -0.05]} scale={[0.62, 0.55, 0.42]}>
          <sphereGeometry args={[0.6, 14, 12]} />
          <meshBasicMaterial
            ref={laptopHaloMatRef}
            color={SCREEN_GLOW}
            transparent
            opacity={hoverLaptop ? HOVER_GLOW_OPACITY : 0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* ── Coffee mug — coffee ──────────────────────────────────────── */}
      <group
        position={[-0.6, -0.515 + (hoverMug ? HOVER_LIFT : 0), 0.33]}
        scale={hoverMug ? HOVER_SCALE : 1}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoverMug(true);
          mugHoverEnterT.current = t.current;
          gl.domElement.style.cursor = "pointer";
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHoverMug(false);
          gl.domElement.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          mugClick.trigger();
        }}
      >
        {/* click lift/tilt/scale group — the mug tips as if a hand is
            closing on the handle and lifting it, nested inside the hover
            group so it never fights the hover lift/scale */}
        <group
          ref={mugGroupRef}
          position={[0, mugClick.flash ? MUG_CLICK_LIFT : 0, 0]}
          rotation={[mugClick.flash ? MUG_CLICK_TILT_X : 0, 0, mugClick.flash ? MUG_CLICK_TILT_Z : 0]}
          scale={mugClick.flash ? 1 + CLICK_SCALE_BUMP : 1}
        >
          {/* saucer — grounds the mug as a real tabletop object rather
              than a cylinder floating flush against the desk, and gives a
              second distinct matte material (unglazed stoneware, flat-
              shaded) to sit the glossier ceramic mug body against — new
              this pass, part of the "ugly" material-variety fix. */}
          <mesh position={[0, -0.018, 0]}>
            <cylinderGeometry args={[0.21, 0.2, 0.014, 22]} />
            <meshStandardMaterial color={LAPTOP_EDGE} flatShading roughness={0.85} />
          </mesh>
          {/* more radial segments (20, was 12) for a rounder cylinder
              silhouette at true render size — same move MedalModel's own
              "more well defined" pass used on its disc/rim. flatShading
              dropped (this pass) — a mug is glazed ceramic, a genuinely
              curved reflective surface, and smooth shading plus a lower
              roughness reads as real ceramic sheen instead of the faceted
              low-poly look that suits the laptop/notebook's flat panels
              but reads cheap on a rounded, glossy object like this one. */}
          <mesh position={[0, 0.13, 0]}>
            <cylinderGeometry args={[0.15, 0.13, 0.26, 24]} />
            <meshStandardMaterial color={MUG_BODY} roughness={0.32} />
          </mesh>
          {/* rim highlight — a thin lighter ring right at the opening's
              edge, so the mug reads as having a defined lip/bevel instead
              of the body cylinder just stopping */}
          <mesh position={[0, 0.263, 0]}>
            <torusGeometry args={[0.15, 0.008, 8, 24]} />
            <meshStandardMaterial color={MUG_RIM} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.262, 0]}>
            <cylinderGeometry args={[0.135, 0.135, 0.02, 24]} />
            <meshStandardMaterial color={COFFEE_SURFACE} roughness={0.3} />
          </mesh>
          {/* handle — a full, camera-facing torus embedded halfway into the
              body so only its outer loop reads past the mug's silhouette;
              avoids the half-torus-arc orientation problems noted in the
              retired lock model by not using a partial sweep at all */}
          <mesh position={[-0.155, 0.13, 0]} rotation={[0, Math.PI / 2.3, 0]}>
            <torusGeometry args={[0.09, 0.026, 12, 24]} />
            <meshStandardMaterial color={MUG_BODY} roughness={0.32} />
          </mesh>
          {/* steam — resting as a few soft static wisps; when animated they
              drift and fade in a slow loop, and a click puffs them brighter
              with a small swirl for a moment (an instant opacity bump under
              reduced motion) */}
          {STEAM_WISPS.map((wisp, i) => (
            <mesh
              key={i}
              position={[wisp.x, wisp.yBase, wisp.z]}
              scale={[1, 1.6, 1]}
              ref={(el) => {
                steamMeshRefs.current[i] = el;
              }}
            >
              <sphereGeometry args={[0.032, 6, 6]} />
              <meshStandardMaterial
                ref={(el) => {
                  steamMatRefs.current[i] = el;
                }}
                color={STEAM}
                // A little self-emissive on top of the alpha blend — at low
                // opacity, plain diffuse white blended over the near-void
                // background just reads as a dark-gray fleck. The emissive
                // term keeps it reading as a pale, lit wisp instead.
                emissive={STEAM}
                emissiveIntensity={0.9}
                transparent
                opacity={0.48 + (hoverMug ? 0.1 : 0) + (mugClick.flash ? 0.3 : 0)}
                roughness={0.9}
              />
            </mesh>
          ))}
          {/* burst wisps — only visible during a click, bigger/swirlier
              than the idle wisps above, for a puff that's unmistakably
              "more" rather than just a brightness bump. Scaled up further
              (1.8/2.8/1.8, was 1.3/2/1.3) and a third wisp added — the
              original two-wisp burst barely read as "more" over the idle
              loop already running, confirmed by screenshot. */}
          {STEAM_BURST.map((wisp, i) => (
            <mesh
              key={i}
              position={[wisp.x, wisp.yBase, wisp.z]}
              scale={[1.8, 2.8, 1.8]}
              ref={(el) => {
                steamBurstMeshRefs.current[i] = el;
              }}
            >
              <sphereGeometry args={[0.032, 6, 6]} />
              <meshStandardMaterial
                ref={(el) => {
                  steamBurstMatRefs.current[i] = el;
                }}
                color={STEAM}
                emissive={STEAM}
                emissiveIntensity={1.2}
                transparent
                opacity={mugClick.flash ? 0.8 : 0}
                roughness={0.9}
              />
            </mesh>
          ))}
        </group>
        {/* hover glow halo — see the laptop's identical comment above;
            crema-tinted to match the mug's own accent. */}
        <mesh position={[0, 0.13, 0]} scale={[0.42, 0.5, 0.42]}>
          <sphereGeometry args={[0.6, 14, 12]} />
          <meshBasicMaterial
            ref={mugHaloMatRef}
            color={MUG_BODY}
            transparent
            opacity={hoverMug ? HOVER_GLOW_OPACITY : 0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* ── Nintendo Switch — gamer ──────────────────────────────────── */}
      {/* Client follow-up: "replace the gaming controller with a nintendo
          switch." Swapped from a generic gamepad silhouette to a
          screen-plus-two-rails console: a flat chassis with a dark screen
          panel, flanked by a blue (left) and red (right) Joy-Con rail —
          this site's own established Switch homage palette, matching the
          SWITCH_BLUE/SWITCH_RED badge OffDuty's GamingPlatformMarks.tsx
          already uses. All of this object's interaction wiring
          (hover-scale/glow, click lift+tilt+bump, the face-button ripple,
          d-pad, thumbstick press-spin, and the power LED bloom) is kept
          exactly as built and proven — only the static geometry these refs
          drive was redecorated, so the click/hover reactions below still
          fire on the same schedule they did as a gamepad. Overall x/y/z
          footprint (0.44 × 0.075 × 0.17) is unchanged from the old
          controller so the hover-hitbox separation from the notebook,
          tuned in the previous pass, still holds. */}
      {/* Position nudged this pass (x 0.56→0.6, z -0.22→-0.12 — pulled
          forward) alongside the notebook's own reposition below: at the
          much bigger HOVER_SCALE this pass introduces, the two objects'
          hover hitboxes/silhouettes were overlapping enough that hovering
          near their shared boundary sometimes registered the wrong
          object (confirmed by screenshotting the hover state at several
          points along that boundary during verification). Pulling the
          console forward and the notebook further right gives each its
          own clearly separated hover region. */}
      <group
        position={[0.6, -0.47 + (hoverController ? HOVER_LIFT : 0), -0.12]}
        rotation={[0, -0.32, 0]}
        scale={hoverController ? HOVER_SCALE : 1}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoverController(true);
          controllerHoverEnterT.current = t.current;
          gl.domElement.style.cursor = "pointer";
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHoverController(false);
          gl.domElement.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          controllerClick.trigger();
        }}
      >
        {/* click lift/tilt/scale group — the whole console rises, now tips
            away/downward on click (client follow-up: "tilt the gaming
            controller the other way too (downward)" — see CTRL_CLICK_TILT's
            own comment above), and pops slightly bigger, nested inside the
            hover group so it never fights the hover lift/scale */}
        <group
          ref={controllerGroupRef}
          position={[0, controllerClick.flash ? CTRL_CLICK_LIFT : 0, 0]}
          rotation={[controllerClick.flash ? CTRL_CLICK_TILT : 0, 0, 0]}
          scale={controllerClick.flash ? 1 + CLICK_SCALE_BUMP : 1}
        >
          {/* chassis */}
          <mesh>
            <boxGeometry args={[0.34, 0.05, 0.17]} />
            <meshStandardMaterial color={CTRL_BODY} flatShading roughness={0.5} />
          </mesh>
          {/* screen — a darker inset panel, same "second distinct material
              region" move MedalModel's engraved rings use, so the display
              reads as its own sunken glass rather than flush chassis
              plastic. The power LED beneath lights it on click. */}
          <mesh position={[0, 0.027, 0]}>
            <boxGeometry args={[0.26, 0.003, 0.12]} />
            <meshStandardMaterial color={CTRL_PANEL} flatShading roughness={0.55} />
          </mesh>
          {/* Joy-Con rails, flanking the screen — blue on the left, red on
              the right, the same pairing this site's OffDuty badge already
              established for "this is a Switch," not a generic console. */}
          <mesh position={[-0.195, 0, 0]}>
            <boxGeometry args={[0.05, 0.05, 0.17]} />
            <meshStandardMaterial color={SWITCH_BLUE} flatShading roughness={0.45} />
          </mesh>
          <mesh position={[0.195, 0, 0]}>
            <boxGeometry args={[0.05, 0.05, 0.17]} />
            <meshStandardMaterial color={SWITCH_RED} flatShading roughness={0.45} />
          </mesh>
          {/* ZL/ZR shoulder buttons — a real Joy-Con's top edge always
              carries these; the single most missing "unmistakably a
              handheld console, not a plain slab" cue at true render size. */}
          <mesh position={[-0.195, 0.032, -0.07]} rotation={[0.32, 0, 0]}>
            <boxGeometry args={[0.045, 0.018, 0.04]} />
            <meshStandardMaterial color={NEAR_VOID} flatShading roughness={0.45} />
          </mesh>
          <mesh position={[0.195, 0.032, -0.07]} rotation={[0.32, 0, 0]}>
            <boxGeometry args={[0.045, 0.018, 0.04]} />
            <meshStandardMaterial color={NEAR_VOID} flatShading roughness={0.45} />
          </mesh>
          {/* d-pad, on the left rail — a simple cross reads as "d-pad" at
              true render size far more reliably than four separate tiny
              arrow keys would */}
          <mesh position={[-0.195, 0.03, -0.03]}>
            <boxGeometry args={[0.032, 0.012, 0.011]} />
            <meshStandardMaterial color={NEAR_VOID} flatShading roughness={0.6} />
          </mesh>
          <mesh position={[-0.195, 0.03, -0.03]}>
            <boxGeometry args={[0.011, 0.012, 0.032]} />
            <meshStandardMaterial color={NEAR_VOID} flatShading roughness={0.6} />
          </mesh>
          {/* power/screen LED — a small always-present indicator that
              pulses brighter on click, reinforcing "this just powered
              on/reacted". Plus a soft transparent halo nested just outside
              it (same nested-sphere trick MedalModel's sparkles use) that
              blooms visibly on click — together these read as the screen
              lighting up rather than a literal separate bulb. */}
          <mesh position={[0, 0.03, 0]}>
            <sphereGeometry args={[0.016, 10, 10]} />
            <meshStandardMaterial
              ref={ledMatRef}
              color="#0d1410"
              emissive={CTRL_ACCENT}
              emissiveIntensity={controllerClick.flash ? 2.6 : 0.2}
              transparent
              opacity={0.95}
            />
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <sphereGeometry args={[0.032, 10, 10]} />
            <meshStandardMaterial
              ref={ledHaloMatRef}
              color={CTRL_ACCENT}
              emissive={CTRL_ACCENT}
              emissiveIntensity={1.4}
              transparent
              opacity={controllerClick.flash ? 0.55 : 0}
              depthWrite={false}
            />
          </mesh>
          {/* face buttons (A/B/X/Y), on the right rail — click sends a
              press ripple staggered across them (scale dip + emissive
              flash + a bloom halo), left-to-right by array order, on top
              of the thumbstick press below. */}
          {FACE_BUTTONS.map(([x, z], i) => (
            <group key={`${x}-${z}`}>
              <mesh
                ref={(el) => {
                  faceButtonRefs.current[i] = el;
                }}
                position={[x, 0.03, z]}
              >
                <sphereGeometry args={[0.014, 10, 10]} />
                <meshStandardMaterial
                  ref={(el) => {
                    faceButtonMatRefs.current[i] = el;
                  }}
                  color={METAL}
                  emissive={CTRL_ACCENT}
                  emissiveIntensity={controllerClick.flash ? 1.8 : 0}
                  roughness={0.35}
                  metalness={0.3}
                />
              </mesh>
              {/* bloom halo — nested just outside the button, same trick as
                  the LED halo above */}
              <mesh
                ref={(el) => {
                  faceButtonHaloRefs.current[i] = el;
                }}
                position={[x, 0.03, z]}
              >
                <sphereGeometry args={[0.026, 10, 10]} />
                <meshStandardMaterial
                  ref={(el) => {
                    faceButtonHaloMatRefs.current[i] = el;
                  }}
                  color={CTRL_ACCENT}
                  emissive={CTRL_ACCENT}
                  emissiveIntensity={1.2}
                  transparent
                  opacity={controllerClick.flash ? 0.55 : 0}
                  depthWrite={false}
                />
              </mesh>
            </group>
          ))}
          {/* analog sticks — one per rail, click gives them a quick
              press-and-spin (an instant pressed pose under reduced
              motion) */}
          <mesh
            ref={(el) => {
              thumbstickRefs.current[0] = el;
            }}
            position={[-0.195, 0.03, 0.055]}
            scale={controllerClick.flash ? [1, 0.5, 1] : [1, 1, 1]}
            rotation={controllerClick.flash ? [0.45, 0, 0.45] : [0, 0, 0]}
          >
            <cylinderGeometry args={[0.026, 0.026, 0.024, 14]} />
            <meshStandardMaterial
              color={CTRL_ACCENT}
              emissive={CTRL_ACCENT}
              emissiveIntensity={hoverController ? 0.5 : 0}
              roughness={0.32}
            />
          </mesh>
          <mesh
            ref={(el) => {
              thumbstickRefs.current[1] = el;
            }}
            position={[0.15, 0.03, -0.055]}
            scale={controllerClick.flash ? [1, 0.5, 1] : [1, 1, 1]}
            rotation={controllerClick.flash ? [-0.45, 0, 0.45] : [0, 0, 0]}
          >
            <cylinderGeometry args={[0.026, 0.026, 0.024, 14]} />
            <meshStandardMaterial
              color={CTRL_ACCENT}
              emissive={CTRL_ACCENT}
              emissiveIntensity={hoverController ? 0.5 : 0}
              roughness={0.32}
            />
          </mesh>
        </group>
        {/* hover glow halo — see the laptop's identical comment above;
            cyan-tinted to match this console's own accent. */}
        <mesh position={[0, -0.01, 0]} scale={[0.52, 0.3, 0.32]}>
          <sphereGeometry args={[0.6, 14, 12]} />
          <meshBasicMaterial
            ref={controllerHaloMatRef}
            color={CTRL_ACCENT}
            transparent
            opacity={hoverController ? HOVER_GLOW_OPACITY : 0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* ── Notebook + pen — founder ─────────────────────────────────── */}
      {/* Position nudged this pass (x 0.68→0.88, z 0.38→0.36 — pushed
          right) — see the controller's identical comment above for why;
          the camera (AboutVisual.tsx) was pulled back correspondingly so
          the notebook's own bigger HOVER_SCALE silhouette still fits
          fully in frame instead of clipping the canvas edge on hover, a
          real regression caught by screenshotting hover on this specific
          object during verification. */}
      <group
        position={[0.88, -0.5 + (hoverNotebook ? HOVER_LIFT : 0), 0.36]}
        rotation={[0, 0.28, 0]}
        scale={hoverNotebook ? HOVER_SCALE : 1}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoverNotebook(true);
          notebookHoverEnterT.current = t.current;
          gl.domElement.style.cursor = "pointer";
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHoverNotebook(false);
          gl.domElement.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          notebookClick.trigger();
        }}
      >
        {/* click lift/tilt/scale group — the notebook rises, tips open
            toward the viewer like being picked up to write in, and pops
            slightly bigger on click, nested inside the hover group so it
            never fights the hover lift/scale */}
        <group
          ref={notebookGroupRef}
          position={[0, notebookClick.flash ? NOTEBOOK_CLICK_LIFT : 0, 0]}
          rotation={[notebookClick.flash ? NOTEBOOK_CLICK_TILT : 0, 0, 0]}
          scale={notebookClick.flash ? 1 + CLICK_SCALE_BUMP : 1}
        >
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.4, 0.055, 0.3]} />
            <meshStandardMaterial color={NOTEBOOK_COVER} flatShading roughness={0.6} />
          </mesh>
          {/* spine crease — a darker violet line down the cover's bound
              edge, so it reads as a folded cover rather than a flat slab
              ("more high definition" pass) */}
          <mesh position={[-0.15, 0.028, 0]}>
            <boxGeometry args={[0.02, 0.004, 0.3]} />
            <meshStandardMaterial color={NOTEBOOK_SPINE} flatShading roughness={0.55} />
          </mesh>
          <mesh position={[0, 0.035, 0]}>
            <boxGeometry args={[0.36, 0.02, 0.26]} />
            <meshStandardMaterial color={NOTEBOOK_PAGES} flatShading roughness={0.85} />
          </mesh>
          {/* ruled page lines — the detail that turns "a paper-colored block"
              into a legibly open notebook at true render size */}
          {[-0.09, -0.045, 0, 0.045, 0.09].map((z) => (
            <mesh key={z} position={[0, 0.046, z]}>
              <boxGeometry args={[0.28, 0.004, 0.012]} />
              <meshStandardMaterial color={PAGE_LINE} flatShading roughness={0.8} />
            </mesh>
          ))}
          {/* ink mark — a brief "just written" stroke that grows in from
              the left and fades away, giving the pen's writing motion a
              visible result instead of just wiggling in place. Bolder
              (0.024 tall x 0.02 deep, was 0.009x0.016 — roughly 2.5x) so
              it reads as a deliberate marker stroke instead of a hairline
              that only "technically" changes opacity. */}
          <group ref={inkMarkGroupRef} position={[-0.1, 0.052, 0.02]}>
            <mesh position={[0.09, 0, 0]}>
              <boxGeometry args={[0.18, 0.024, 0.02]} />
              <meshStandardMaterial
                ref={inkMarkMatRef}
                color={NEAR_VOID}
                transparent
                opacity={notebookClick.flash ? 0.95 : 0}
                roughness={0.7}
              />
            </mesh>
          </group>
          {/* lifted corner — a small tilted chip catching light differently
              than the flat page, reading as a curled corner without the
              cost/risk of custom triangle geometry at this scale */}
          <mesh position={[0.15, 0.05, 0.105]} rotation={[0.5, 0, -0.3]}>
            <boxGeometry args={[0.055, 0.004, 0.05]} />
            <meshStandardMaterial color={NOTEBOOK_PAGES} flatShading roughness={0.85} />
          </mesh>
          {/* spiral binding along the left edge — the detail that reads as
              "notebook/pad" rather than just "a purple block" at small
              size; more segments (16, was 10) for a smoother ring */}
          {[-0.11, -0.037, 0.037, 0.11].map((z) => (
            <mesh key={z} position={[-0.185, 0.03, z]} rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[0.022, 0.008, 8, 16]} />
              <meshStandardMaterial color={METAL} flatShading roughness={0.4} metalness={0.4} />
            </mesh>
          ))}
          {/* pen resting diagonally across the pages — thicker and lifted
              slightly proud of the cover so its full length reads as a
              distinct object rather than thinning away to nothing at true
              render size. Wrapped in its own group so a click can bounce
              it through a taps-while-writing motion (real vertical travel
              plus a wiggle) without touching its resting position/rotation.
              More segments (10, was 7) on both the barrel and tip for a
              rounder profile. */}
          <group
            ref={penGroupRef}
            position={[0, notebookClick.flash ? 0.065 : 0, 0]}
            rotation={[0, 0, notebookClick.flash ? 0.3 : 0]}
          >
            {/* pen barrel — flatShading dropped (this pass), same "genuine
                curved metal reads better smooth" call as the mug body:
                metalness kept modest (0.35, matching MedalModel's own
                documented reasoning for why metal without an environment
                map should stay a bright diffuse base plus tightened
                specular rather than pushed toward "physically correct"
                metalness) so the pen reads as polished metal instead of
                going dark under this scene's plain directional lights. */}
            <mesh position={[0.02, 0.058, 0.01]} rotation={[0, 0.5, 1.02]}>
              <cylinderGeometry args={[0.022, 0.022, 0.38, 12]} />
              <meshStandardMaterial color={METAL} roughness={0.28} metalness={0.35} />
            </mesh>
            <mesh position={[0.155, 0.072, -0.09]} rotation={[0, 0.5, 1.02]}>
              <coneGeometry args={[0.022, 0.05, 12]} />
              <meshStandardMaterial color={LAPTOP_BODY} roughness={0.3} />
            </mesh>
          </group>
          {/* bookmark ribbon — a thin strip hanging out from between the
              pages along the bound edge, a small charm/definition detail
              new this pass (the same "one more small identifying prop"
              move the mug's saucer and controller's shoulder bumpers use)
              that also reads as a nice spot of warm color against the
              violet cover. */}
          <mesh position={[-0.06, -0.01, -0.148]} rotation={[0.08, 0, 0]}>
            <boxGeometry args={[0.03, 0.09, 0.006]} />
            <meshStandardMaterial color={MUG_RIM} flatShading roughness={0.6} />
          </mesh>
        </group>
        {/* hover glow halo — see the laptop's identical comment above;
            violet-tinted to match the notebook's own accent. */}
        <mesh position={[0, 0.03, 0]} scale={[0.42, 0.24, 0.36]}>
          <sphereGeometry args={[0.6, 14, 12]} />
          <meshBasicMaterial
            ref={notebookHaloMatRef}
            color={NOTEBOOK_COVER}
            transparent
            opacity={hoverNotebook ? HOVER_GLOW_OPACITY : 0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
    </group>
  );
}
