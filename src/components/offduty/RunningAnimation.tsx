"use client";

import clsx from "clsx";

// ── Rig geometry (viewBox 0 0 400 200 — the same wide landscape stage the
// Basketball card's rig uses, proven to read clearly as a human figure at
// this exact banner size) ───────────────────────────────────────────────
// Same technique as BasketballAnimation.tsx: every limb is a pill hanging
// straight down (+Y) from its own local (0,0) pivot, positioned in the
// world via a static SVG `transform="translate(x,y)"` wrapper and
// re-oriented via a CSS `rotate()` on an inner group whose transform-origin
// is that same local (0,0) — so child joints (knee, elbow) automatically
// follow their parent limb's rotation for free. Unlike Basketball's rig
// (one rigid back leg, one hero front leg with a knee — the figure stays
// roughly in place for a jump shot), running needs BOTH legs to carry a
// full hip+knee joint chain, and the whole rig also carries a horizontal
// translateX so the figure actually travels across the banner's width
// or the ribbon-breaking finish never has anywhere to happen.
//
// The local anchor points below (HIP_R, HIP_L, SHOULDER_R, SHOULDER_L,
// HEAD) are authored at the figure's FINAL resting position — well past
// the ribbon, near the banner's right side — exactly like hoop-root's own
// convention: a track's *base* CSS class (applied unconditionally,
// independent of `animate`) carries no transform at all when the local
// geometry is already the resting pose, so an identity transform already
// equals SSR/no-JS/pre-hydration/reduced-motion output. Only "finish-root"
// needs this identity trick (translateX(0) = arrived); every limb's own
// resting *angle* still needs an explicit bare class since a pill hangs
// straight down by default.

const HIP_R = { x: 340, y: 104 };
const HIP_L = { x: 326, y: 103 };
const SHOULDER_R = { x: 348, y: 62 };
const SHOULDER_L = { x: 320, y: 63 };
const HEAD = { cx: 334, cy: 45, r: 12 };

const POLE_L_X = 200;
const POLE_R_X = 280;
const TAPE_Y = 104;

function Pill({ length, thickness }: { length: number; thickness: number }) {
  return (
    <rect
      x={-thickness / 2}
      y={0}
      width={thickness}
      height={length}
      rx={thickness / 2}
      fill="#edede8"
    />
  );
}

// A black running shoe with a white three-stripe accent — a nod to the
// client's own reference shoe (an Adidas Adizero Evo SL: black knit
// upper, three diagonal white stripes across the midfoot, chunky
// light-grey outsole) rather than the plain chalk-colored foot block used
// previously. Kept simple (this renders at only a few pixels tall) but
// unmistakably "a shoe," not a bare foot.
function Foot() {
  return (
    <g>
      <path
        d="M-5 -1 Q-5 -3 -2 -3 L13 -3 Q17 -3 17 0 L17 4.5 L-5 4.5 Z"
        fill="#161311"
      />
      <path d="M-1 -2.5 L3 4" stroke="#f5f3ee" strokeWidth="1.3" />
      <path d="M3.5 -2.5 L7.5 4" stroke="#f5f3ee" strokeWidth="1.3" />
      <path d="M8 -2.5 L12 4" stroke="#f5f3ee" strokeWidth="1.3" />
      <rect x="-5" y="4.5" width="22" height="2.8" rx="1.4" fill="#c9cdd1" />
    </g>
  );
}

/**
 * A runner in full stride crossing the banner and breaking through a
 * finish-line ribbon — rebuilt from scratch (the previous pass's speed-line
 * pictogram was a static pose sliding sideways, not genuine running
 * motion). Uses the same jointed hip/knee/shoulder/elbow rig technique as
 * BasketballAnimation.tsx, adapted so BOTH legs carry a full thigh+shin
 * chain cycling through a running gait (high-knee drive → under-body plant
 * → extended toe-off → recovery fold, repeating across three stride
 * cycles) while the whole figure translates across the banner's width.
 *
 * The complete, correct resting illustration — runner already well past
 * the broken ribbon, settled into a relaxed one-arm-raised finish pose,
 * the two torn ribbon halves already drooping from their poles — is the
 * plain base-class markup below (no inline hiding styles anywhere), so
 * SSR / no-JS / pre-hydration / reduced-motion visitors always see the
 * finished crossing, never a blank or half-drawn scene.
 *
 * When motion is allowed, every track resets to its start-of-race pose
 * (the "--hidden" modifier classes, all sharing keyframe 0%) and, on
 * scroll-into-view or click, plays through one shared 3.2s timeline (see
 * globals.css: finish-root-motion, finish-thigh-r/l-motion,
 * finish-shin-r/l-motion, finish-arm-u-r/l-motion, finish-arm-f-r/l-motion,
 * finish-tape-motion, finish-ribbon-l/r-motion, finish-speedlines-motion)
 * — the runner drives forward across the banner through three full stride
 * cycles, closing on a taut finish-line tape strung between two poles →
 * at the moment of contact the tape instantly vanishes and the two torn
 * halves snap outward from the break point, fluttering → the runner
 * continues through to the same settled, one-fist-raised finish pose the
 * static markup already shows.
 *
 * `animate`/`revealed` come from OffDutyCard's shared useCardAnimation —
 * see useCardAnimation.ts for the full scroll/click/reduced-motion
 * contract this mirrors.
 */
export function RunningAnimation({
  className,
  animate,
  revealed,
}: {
  className?: string;
  animate: boolean;
  revealed: boolean;
}) {
  const playing = animate && revealed;
  // Base class always applied (it encodes the resting angle/transform);
  // the --hidden/--play modifier is only layered on once motion is
  // allowed, exactly mirroring BasketballAnimation.tsx's own `cls` helper.
  const cls = (base: string) => clsx(base, animate && (playing ? `${base}--play` : `${base}--hidden`));

  return (
    <svg
      viewBox="0 0 400 200"
      className={className}
      role="img"
      aria-label="Illustration of a runner in full stride breaking through a finish-line ribbon"
    >
      {/* track context — static, decorative */}
      <line x1="6" y1="178" x2="394" y2="178" stroke="#edede8" strokeWidth="1.5" opacity="0.22" />
      <line
        x1="6"
        y1="171"
        x2="394"
        y2="171"
        stroke="#edede8"
        strokeWidth="1"
        strokeDasharray="10 8"
        opacity="0.12"
      />

      {/* finish-line checkered mat on the ground — stays put as a clear
          "this is the finish line" anchor even once the ribbon above it
          has already snapped and drooped away, which matters most for the
          static/no-JS resting frame. */}
      {Array.from({ length: 8 }).map((_, i) => (
        <rect
          key={i}
          x={POLE_L_X + i * 10}
          y="170"
          width="10"
          height="7"
          fill={i % 2 === 0 ? "#e8720c" : "#edede8"}
          opacity={i % 2 === 0 ? 0.85 : 0.75}
        />
      ))}

      {/* poles */}
      <rect x={POLE_L_X - 1.5} y="92" width="3" height="83" fill="#edede8" opacity="0.85" />
      <path d={`M${POLE_L_X - 1.5} 92 L${POLE_L_X + 11} 97 L${POLE_L_X - 1.5} 102 Z`} fill="#e8720c" />
      <rect x={POLE_R_X - 1.5} y="92" width="3" height="83" fill="#edede8" opacity="0.85" />
      <path d={`M${POLE_R_X + 1.5} 92 L${POLE_R_X - 11} 97 L${POLE_R_X + 1.5} 102 Z`} fill="#e8720c" />

      {/* torn ribbon halves — always rendered. Each wrapper's static SVG
          `transform` attribute pins it to its pole's attachment point; the
          CSS-animated class lives on the INNER group only (same
          static-wrapper/animated-inner split BasketballAnimation.tsx uses
          for its ball-in-flight, and for the same reason: an SVG
          `transform` attribute and a CSS `transform` property on the same
          element don't compose). Local geometry is authored already in
          the FINAL drooping-and-torn shape, so the identity transform
          (no class, or the base class with no modifier) is already the
          correct settled illustration — no inline hiding styles needed
          for SSR/no-JS/reduced-motion. */}
      <g transform={`translate(${POLE_L_X} ${TAPE_Y})`}>
        <g className={cls("finish-ribbon-l")} style={{ transformOrigin: "0px 0px" }}>
          <path
            d="M0 -4 Q-9 9 -15 24 Q-11 29 -6 27 L-2 27 Q3 11 4 -2 Z"
            fill="#e8720c"
          />
          <path d="M-1 -3 L-9 25" stroke="#edede8" strokeWidth="1.4" opacity="0.55" strokeLinecap="round" />
        </g>
      </g>
      <g transform={`translate(${POLE_R_X} ${TAPE_Y})`}>
        <g className={cls("finish-ribbon-r")} style={{ transformOrigin: "0px 0px" }}>
          <path
            d="M0 -4 Q9 9 15 24 Q11 29 6 27 L2 27 Q-3 11 -4 -2 Z"
            fill="#e8720c"
          />
          <path d="M1 -3 L9 25" stroke="#edede8" strokeWidth="1.4" opacity="0.55" strokeLinecap="round" />
        </g>
      </g>

      {/* intact tape — only ever exists while motion is allowed (it rides
          the approach and vanishes the instant the runner reaches it); the
          resting illustration shows it already gone, via the two torn
          halves above, so this element is simply absent from static/no-JS
          output rather than hidden with an inline style — same convention
          BasketballAnimation.tsx uses for the ball-in-hand. */}
      {animate && (
        <g>
          <path
            d={`M${POLE_L_X} ${TAPE_Y} Q${(POLE_L_X + POLE_R_X) / 2} ${TAPE_Y + 5} ${POLE_R_X} ${TAPE_Y}`}
            fill="none"
            stroke="#e8720c"
            strokeWidth="6"
            strokeLinecap="round"
            className={playing ? "finish-tape--play" : "finish-tape--hidden"}
          />
          <path
            d={`M${POLE_L_X} ${TAPE_Y} Q${(POLE_L_X + POLE_R_X) / 2} ${TAPE_Y + 5} ${POLE_R_X} ${TAPE_Y}`}
            fill="none"
            stroke="#edede8"
            strokeWidth="1.6"
            strokeDasharray="4 5"
            opacity="0.7"
            className={playing ? "finish-tape--play" : "finish-tape--hidden"}
          />
        </g>
      )}

      {/* ── figure ───────────────────────────────────────────────────── */}
      <g className={cls("finish-root")} style={{ transformOrigin: "293px 178px" }}>
        {/* trailing speed lines — a light embellishment that only exists
            during the run itself; faded to invisible by the time the
            figure settles, so it never appears in the resting frame. */}
        <g className={cls("finish-speedlines")} style={{ transformOrigin: "0px 0px" }}>
          <path d="M-38 118 L-16 118" stroke="#e8720c" strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
          <path d="M-44 128 L-18 128" stroke="#e8720c" strokeWidth="2.2" strokeLinecap="round" opacity="0.4" />
          <path d="M-34 138 L-14 138" stroke="#e8720c" strokeWidth="2.2" strokeLinecap="round" opacity="0.3" />
        </g>

        {/* ground shadow, local to the root so it travels with the figure */}
        <ellipse cx="293" cy="178" rx="30" ry="5" fill="#140a05" opacity="0.35" />

        {/* left leg (drawn first — the trailing/far leg through most of
            the DOM's fixed stacking order) */}
        <g transform={`translate(${HIP_L.x} ${HIP_L.y})`}>
          <g className={cls("finish-thigh-l")} style={{ transformOrigin: "0px 0px" }}>
            <Pill length={34} thickness={13} />
            <g transform="translate(0 34)">
              <g className={cls("finish-shin-l")} style={{ transformOrigin: "0px 0px" }}>
                <Pill length={32} thickness={10.5} />
                <g transform="translate(0 32)">
                  <Foot />
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* right leg (drawn second — the near/lead leg) */}
        <g transform={`translate(${HIP_R.x} ${HIP_R.y})`}>
          <g className={cls("finish-thigh-r")} style={{ transformOrigin: "0px 0px" }}>
            <Pill length={34} thickness={13} />
            <g transform="translate(0 34)">
              <g className={cls("finish-shin-r")} style={{ transformOrigin: "0px 0px" }}>
                <Pill length={32} thickness={10.5} />
                <g transform="translate(0 32)">
                  <Foot />
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* torso — a tapered singlet silhouette (wide shoulders, narrower
            waist), matching the Basketball card's jersey treatment. */}
        <path d="M319 60 L349 60 L344 108 L324 108 Z" fill="#edede8" />
        <rect x="321" y="100" width="26" height="15" rx="4" fill="#e8720c" />
        {/* head — small relative to the torso, with a neck gap so
            head/neck/shoulders read as distinct anatomy at true render
            size, matching the Basketball figure's proportions. */}
        <circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} fill="#edede8" />

        {/* left arm (off/back arm — drawn before the torso's near arm so
            it reads as slightly behind it) */}
        <g transform={`translate(${SHOULDER_L.x} ${SHOULDER_L.y})`}>
          <g className={cls("finish-arm-u-l")} style={{ transformOrigin: "0px 0px" }}>
            <Pill length={29} thickness={11.5} />
            <g transform="translate(0 29)">
              <g className={cls("finish-arm-f-l")} style={{ transformOrigin: "0px 0px" }}>
                <Pill length={20} thickness={9.5} />
                <g transform="translate(0 20)">
                  <circle cx="0" cy="5" r="6" fill="#edede8" />
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* right arm (near/lead arm) */}
        <g transform={`translate(${SHOULDER_R.x} ${SHOULDER_R.y})`}>
          <g className={cls("finish-arm-u-r")} style={{ transformOrigin: "0px 0px" }}>
            <Pill length={29} thickness={11.5} />
            <g transform="translate(0 29)">
              <g className={cls("finish-arm-f-r")} style={{ transformOrigin: "0px 0px" }}>
                <Pill length={20} thickness={9.5} />
                <g transform="translate(0 20)">
                  <circle cx="0" cy="5" r="6" fill="#edede8" />
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
