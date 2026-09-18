"use client";

import { useId } from "react";
import clsx from "clsx";

// Three nested, smoothly-rounded hearts stacked base-to-tip, connected by
// a thin stem — redesigned again per the client's follow-up ("tulip is a
// little off... looks a little improper and bad"). The previous pass's
// rippled/scalloped layers had two small wave-bumps meeting at each
// layer's own center, which read as a pinched "bowtie" dimple rather than
// a smooth petal — a real flaw, not just a matter of taste. Every layer
// here is now the SAME proven heart curve the tip bud already used
// (confirmed clean in the prior screenshot), just uniformly scaled up
// (1x / 1.1x / 1.25x) and re-centered so each larger heart's top dip
// lands exactly on the smaller heart above it's own point — nested dolls,
// not a chain of separate rippled rings, which is both the structurally
// correct way real tulip pours nest and the more reliable shape to render
// cleanly at this size.
// Rescaled 0.75x around the coffee surface ellipse's own center (29,23) —
// client follow-up: "latte art not fitting in cup, maybe fit it in
// there." The un-scaled stack spanned y=9 to y=35.8, and the coffee
// surface ellipse (below) only spans y=10 to y=36 — the pattern's tip and
// base were touching/just past the ellipse's own top and bottom edges,
// reading as spilling past the coffee surface rather than sitting inside
// it. This version spans y=12.5 to y=32.6, a comfortable margin inside
// the ellipse on every side, while still filling most of its height so
// the coffee-brown surface stays visible as a ring around the pattern
// (the "visible there's coffee underneath" ask) rather than the pattern
// crowding the whole cup. Same nested-heart shape/proportions as before
// (that structure itself wasn't the complaint), just resized to actually
// fit the vessel it's poured into.
const STROKES: { d: string; delay: number; width: number }[] = [
  { d: "M29 32.6 L29 18.5", delay: 0, width: 2.1 }, // stem connecting every heart
  // heart 1 — base of the pour, largest
  { d: "M29 32.6 Q23.38 29.32 24.79 25.57 Q26.66 23.69 29 25.1", delay: 0.12, width: 2.1 },
  { d: "M29 32.6 Q34.62 29.32 33.21 25.57 Q31.34 23.69 29 25.1", delay: 0.2, width: 2.1 },
  // heart 2 — middle, its top dip lands on heart 1's own point
  { d: "M29 25.1 Q24.05 22.21 25.29 18.91 Q26.94 17.26 29 18.5", delay: 0.34, width: 1.85 },
  { d: "M29 25.1 Q33.95 22.21 32.71 18.91 Q31.06 17.26 29 18.5", delay: 0.42, width: 1.85 },
  // heart 3 — finishing bud at the tip
  { d: "M29 18.5 Q24.5 15.88 25.62 12.88 Q27.12 11.38 29 12.5", delay: 0.56, width: 1.5 },
  { d: "M29 18.5 Q33.5 15.88 32.38 12.88 Q30.88 11.38 29 12.5", delay: 0.64, width: 1.5 },
];

const STROKE_DURATION = "0.4s";

// pathLength=1 + strokeDasharray="1 4" (rather than a bare "1", i.e. dash
// 1 / gap 1) is the same draw-in technique with extra dash/gap margin: at
// full pathLength scale a "1 1" pattern leaves only a razor-thin margin
// between "fully drawn" and "fully hidden," which at this banner's much
// bigger render size was visible as a stray sliver at each stroke's
// round-capped tip even at stroke-dashoffset:1. A "1 4" pattern keeps the
// same drawn/hidden endpoints and the same stem-to-tip draw direction,
// just with three extra units of gap margin so no rounding sliver peeks
// through in the hidden state.
const STROKE_DASHARRAY = "1 4";

// The rosetta now draws in mid-scene — once the pour stream lands in the
// cup, partway through the shared coffee-pitcher-motion timeline — rather
// than immediately on reveal, so it reads as "the pour is creating the
// pattern" instead of two disconnected animations. Every stroke's own
// relative delay (above, unchanged) is added on top of this offset.
const POUR_LAND_OFFSET = 1.36;

// ── Cup group ────────────────────────────────────────────────────────
// The exact previous-pass cup + rosetta artwork (saucer, tapered body,
// handle, coffee surface, crema sheen, rosetta linework) — the two
// elements the client explicitly praised ("the cup looks more like a
// cup", "latte art is amazing") — authored in its original 64x64 local
// space and reused completely unchanged below, only wrapped in a
// scale/position transform so it reads as a big, detailed centerpiece
// filling most of the banner's height instead of a small corner icon.
const CUP_SCALE = 2.35;
const CUP_TX = 190;
const CUP_TY = 53.45;
// Where the pour stream lands — the same point the heart stack's stem
// starts from (CUP_TX/TY plus the stem's own local base at 29,32.6), so
// the stream visually feeds directly into the linework.
const POUR_LANDING = { x: CUP_TX + CUP_SCALE * 29, y: CUP_TY + CUP_SCALE * 32.6 };

// ── Hand + pitcher rig ──────────────────────────────────────────────
// A simplified, pictogram-style mitten hand gripping a pitcher, built
// entirely in the coffee card's own established palette (crema hand,
// roast ceramic pitcher, espresso linework) rather than introducing new
// colors. Its own local (0,0) is the grip point on the handle — the
// natural pivot for tilting a pour — positioned in world space by a
// static SVG `translate`, with all tilt/travel animated as a CSS
// `transform` on an inner group (the same static-wrapper/animated-inner
// split BasketballAnimation.tsx uses for its limb rig). The static
// translate below is deliberately the settled, lifted-away-from-the-cup
// pose with the pitcher held upright — the resting artwork needs no
// additional rotation on top of it, so an identity CSS transform (i.e.
// no class/style at all) already equals the finished shot, exactly
// mirroring hoop-root's "0,0,0deg = landed pose" convention.
const PITCHER_X = 100;
const PITCHER_Y = 36;
// The shapes below are authored at their own natural size, then scaled up
// as a group — pulls the whole hand+pitcher rig up to a visual weight
// that matches the now much bigger cup, instead of reading as a small
// prop floating next to it.
const PITCHER_ART_SCALE = 1.5;

/**
 * A hand pouring a pitcher into the (existing, kept-as-is) coffee cup,
 * the pour itself forming the rosetta — rebuilt to clear the client's
 * "show a person pouring it properly... a proper animation again not
 * scribble... make these a lot bigger" bar for this round.
 *
 * Sequence (all driven by one shared ~3.4s timeline once `revealed`):
 *  1. Hand + pitcher, held above and to the side, settle into position
 *     over the cup, upright.
 *  2. The pitcher tilts into a full pour over the rim.
 *  3. A thin stream draws in from the spout down into the cup, lands,
 *     and — right as it lands — the rosetta draws itself in using the
 *     cup's existing stroke-dasharray technique, unchanged, so the pour
 *     visibly *becomes* the linework rather than two separate beats.
 *  4. The pitcher untilts, lifts away, and settles back to its resting
 *     pose, clear of the now-finished cup.
 *
 * `animate`/`revealed` are driven centrally by OffDutyCard's
 * useCardAnimation — see that hook for the full contract. In short:
 * `animate` false (SSR, no-JS, pre-hydration, reduced motion) always
 * renders the complete, correct resting scene — finished cup with full
 * rosetta, pitcher already lifted away and settled — with no inline
 * hiding styles anywhere. Only once `animate` is true does everything
 * reset to a pre-pour state and animate through as `revealed` flips.
 * The pour stream and its landing ripple are transient props that only
 * ever exist while `animate` is true (same convention as Basketball's
 * ball-in-hand and Gaming's console silhouettes): the finished scene has
 * already stopped pouring, so static output omits them entirely rather
 * than hiding them inline.
 */
export function CoffeeRosetta({
  className,
  animate,
  revealed,
}: {
  className?: string;
  animate: boolean;
  revealed: boolean;
}) {
  const gradientId = useId();
  const playing = animate && revealed;

  const pitcherClassName = clsx(
    "coffee-pitcher",
    animate && (playing ? "coffee-pitcher--play" : "coffee-pitcher--hidden")
  );

  return (
    <svg
      viewBox="0 0 400 200"
      className={className}
      role="img"
      aria-label="Illustration of a hand pouring a pitcher of milk into a coffee cup, the pour forming a tulip pattern"
    >
      <defs>
        <radialGradient id={gradientId} cx="35%" cy="28%" r="65%">
          <stop offset="0%" stopColor="#e4c9a0" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#e4c9a0" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* contact shadow, grounding the cup */}
      <ellipse cx="270" cy="193" rx="92" ry="8" fill="#140a05" opacity="0.32" />

      {/* ── cup + rosetta — unchanged artwork from the previous pass, scaled up ── */}
      <g transform={`translate(${CUP_TX} ${CUP_TY}) scale(${CUP_SCALE})`}>
        {/* saucer */}
        <ellipse cx="29" cy="54" rx="24" ry="4.5" fill="#1c110a" stroke="#4a3223" strokeWidth="1.2" />

        {/* cup body */}
        <path
          d="M11 23 Q10 42 17 50 Q20 53 29 53 Q38 53 41 50 Q48 42 47 23 Z"
          fill="#3a2318"
          stroke="#4a3223"
          strokeWidth="1.5"
        />

        {/* handle */}
        <path
          d="M46 28 Q59 28 59 37 Q59 46 46 44"
          fill="none"
          stroke="#3a2318"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M46 28 Q59 28 59 37 Q59 46 46 44"
          fill="none"
          stroke="#4a3223"
          strokeWidth="1.2"
        />

        {/* coffee surface, viewed at a slight angle */}
        <ellipse cx="29" cy="23" rx="18" ry="13" fill="#2b1810" stroke="#4a3223" strokeWidth="1.3" />
        {/* ceramic rim sheen */}
        <ellipse cx="29" cy="23" rx="18" ry="13" fill="none" stroke="#e4c9a0" strokeWidth="1" opacity="0.25" />
        {/* crema sheen under the linework */}
        <ellipse cx="29" cy="23" rx="18" ry="13" fill={`url(#${gradientId})`} />

        {STROKES.map((stroke, i) => (
          <path
            key={i}
            d={stroke.d}
            fill="none"
            stroke="#e4c9a0"
            strokeWidth={stroke.width}
            strokeLinecap="round"
            pathLength={animate ? 1 : undefined}
            strokeDasharray={animate ? STROKE_DASHARRAY : undefined}
            className={
              animate
                ? clsx(revealed ? "offduty-stroke-play" : "offduty-stroke-hidden")
                : undefined
            }
            style={
              animate && revealed
                ? {
                    animationDuration: STROKE_DURATION,
                    animationDelay: `${POUR_LAND_OFFSET + stroke.delay}s`,
                  }
                : undefined
            }
          />
        ))}

        {/* finishing pooled dot — sits right at the heart bud's top dip
            (y=12.5), same finishing-touch role the rosetta's tip dot played,
            repositioned to match the rescaled heart stack. */}
        <circle
          cx="29"
          cy="12.5"
          r="1.1"
          fill="#e4c9a0"
          className={animate ? (revealed ? "offduty-pop-play" : "offduty-pop-hidden") : undefined}
          style={
            animate
              ? {
                  transformOrigin: "29px 12.5px",
                  ...(revealed
                    ? { animationDuration: "0.35s", animationDelay: `${POUR_LAND_OFFSET + 0.64}s` }
                    : undefined),
                }
              : undefined
          }
        />
      </g>

      {/* ── pour stream — a transient prop that only ever exists while
          motion is allowed (see component doc above): the resting scene
          has already stopped pouring, so static/no-JS/reduced-motion
          output omits it entirely rather than hiding it inline. Draws in
          with the same stroke-dasharray technique as the rosetta, timed
          to land right as the rosetta begins. */}
      {animate && (
        <path
          d={`M208 95 Q233 114 ${POUR_LANDING.x} ${POUR_LANDING.y}`}
          fill="none"
          stroke="#e4c9a0"
          strokeWidth="3.2"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={STROKE_DASHARRAY}
          className={playing ? "coffee-stream--play" : "coffee-stream--hidden"}
        />
      )}

      {/* ── impact ripple where the stream lands — same transient-prop
          convention as the stream above. */}
      {animate && (
        <ellipse
          cx={POUR_LANDING.x}
          cy={POUR_LANDING.y}
          rx="9"
          ry="3.4"
          fill="#e4c9a0"
          className={playing ? "coffee-ripple--play" : "coffee-ripple--hidden"}
          style={{ transformOrigin: `${POUR_LANDING.x}px ${POUR_LANDING.y}px` }}
        />
      )}

      {/* ── hand + pitcher ───────────────────────────────────────────── */}
      <g transform={`translate(${PITCHER_X} ${PITCHER_Y})`}>
        <g className={pitcherClassName} style={{ transformOrigin: "0px 0px" }}>
          <g transform={`scale(${PITCHER_ART_SCALE})`}>
            {/* handle loop, gripped by the hand — drawn first so it reads
                as tucked behind/inside the grip, with the ends peeking out
                past the hand mass at top and bottom. Dark espresso, like
                the cup's own handle, so it reads as a distinct graspable
                part rather than blending into the roast pitcher body or
                the crema hand. */}
            <path
              d="M4 -9 Q-16 -12 -18 4 Q-16 20 4 17"
              fill="none"
              stroke="#3a2318"
              strokeWidth="6.5"
              strokeLinecap="round"
            />
            <path
              d="M4 -9 Q-16 -12 -18 4 Q-16 20 4 17"
              fill="none"
              stroke="#4a3223"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            {/* pitcher body — ceramic roast, same material as the cup */}
            <path
              d="M10 -10 L34 -12 L40 -17 L48 -20 L42 -8 L38 -8 Q46 4 46 14 Q46 25 35 27 L14 27 Q4 24 4 12 Q4 -2 10 -10 Z"
              fill="#c97c3d"
              stroke="#4a3223"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            {/* rim highlight */}
            <path d="M12 -10 L34 -12" fill="none" stroke="#e4c9a0" strokeWidth="1.6" opacity="0.5" strokeLinecap="round" />
            {/* hand — one continuous mitten silhouette (a single filled
                path, not two separately-outlined circles, so there's no
                seam reading as "two objects") gripping the handle: a
                rounded palm/fingers mass with a thumb lobe wrapping over
                the handle's top curve, plus a short crease line hinting at
                the web of the hand without breaking the silhouette. */}
            <path
              d="M-2 -13 Q6 -11 6 -3 Q10 3 6 9 Q2 18 -10 19 Q-24 20 -25 6 Q-26 -6 -16 -10 Q-9 -13 -2 -13 Z"
              fill="#e4c9a0"
              stroke="#4a3223"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path d="M-9 -9 Q-5 -3 -4 3" fill="none" stroke="#4a3223" strokeWidth="1.1" opacity="0.55" strokeLinecap="round" />
          </g>
        </g>
      </g>
    </svg>
  );
}
