"use client";

import clsx from "clsx";

// ── Rig geometry (viewBox 0 0 400 200 — a wide landscape stage for the
// full-bleed banner) ────────────────────────────────────────────────────
// Every limb is authored as a pill hanging straight down (+Y) from its own
// local (0,0) pivot, then positioned in the world via a static SVG
// `transform="translate(x,y)"` wrapper and re-oriented via a CSS `rotate()`
// on an inner group whose transform-origin is that same local (0,0) — so
// child joints (knee, elbow) automatically follow their parent limb's
// rotation for free. Each track's *base* CSS class (applied unconditionally,
// independent of `animate`) sets `rotate()` to that limb's resting angle —
// the landed follow-through pose, exactly matching every animation's own
// 100% keyframe — so SSR/no-JS/pre-hydration/reduced-motion output needs
// no inline hiding styles: it's just the plain base classes with no
// modifier, which is already the complete, correct, finished shot.

const HIP_FRONT = { x: 158, y: 104 };
const HIP_BACK = { x: 144, y: 103 };
const SHOULDER = { x: 166, y: 62 };
const OFF_SHOULDER = { x: 138, y: 63 };
const RIM = { cx: 304, cy: 64, rx: 28, ry: 5.5 };
const BALL_REST = { x: 304, y: 92 };

const NET_TOP_XS = [284, 289, 294, 299, 304, 309, 314, 319, 324];

// Real basketball seam geometry, not a hand-drawn approximation — per the
// client's repeated "the lines are off... check online how to draw them."
// This `d` is the actual seam path from Twemoji's open-source (CC-BY 4.0)
// basketball emoji (1f3c0.svg: a thin vertical spine plus two curved
// "wing" seams sweeping out from the equator toward each pole — the same
// structure basic tutorials describe, but with a real design's exact
// curve proportions instead of a guessed symmetric lens), mathematically
// rescaled from its native 36-unit/r=18 viewBox down to this ball's r=13
// (scale factor 13/18, coordinates transformed and rounded by script, not
// hand-eyeballed) and re-centered on the ball's own local origin. Filled
// (not stroked) with a small negative-radius trick isn't needed — the
// path itself already encodes the seam's width as a filled shape, the
// same technique the real icon uses, which reads as crisper "manufactured
// grooves" than parallel stroked lines at this small render size.
const BASKETBALL_SEAMS_D =
  "M13.0 -0.722 L6.514 -0.722 C6.649 -4.699 7.917 -7.435 9.969 -8.339 C9.647 -8.722 9.3 -9.081 8.937 -9.425 C6.894 -8.285 5.222 -5.617 5.071 -0.723 L0.722 -0.723 L0.722 -13.0 L-0.722 -13.0 L-0.722 -0.722 L-5.071 -0.722 C-5.221 -5.616 -6.893 -8.285 -8.937 -9.424 C-9.299 -9.081 -9.647 -8.722 -9.968 -8.339 C-7.916 -7.435 -6.65 -4.699 -6.514 -0.722 L-13.0 -0.722 L-13.0 0.722 L-6.514 0.722 C-6.65 4.699 -7.916 7.435 -9.968 8.339 C-9.647 8.722 -9.299 9.081 -8.937 9.425 C-6.892 8.285 -5.221 5.617 -5.071 0.722 L-0.722 0.722 L-0.722 13.0 L0.722 13.0 L0.722 0.722 L5.071 0.722 C5.222 5.616 6.893 8.285 8.938 9.425 C9.3 9.081 9.648 8.722 9.969 8.339 C7.917 7.435 6.65 4.699 6.514 0.722 L13.0 0.722 L13.0 -0.722 Z";

function BasketballSurface() {
  return (
    <>
      <circle cx="0" cy="0" r="13" fill="#e8720c" />
      <path d={BASKETBALL_SEAMS_D} fill="#161311" fillRule="evenodd" />
    </>
  );
}

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

/**
 * A pictogram-style basketball player shooting a full jump shot, rebuilt
 * from scratch as a proper multi-stage animation (not the previous pass's
 * "ball drops through a hoop" scribble). The complete, correct resting
 * illustration — figure landed in its shooting follow-through, ball
 * already swished through the net — is the plain base-class markup below
 * (no inline hiding styles anywhere), so SSR / no-JS / pre-hydration /
 * reduced-motion visitors always see the finished shot, never a blank or
 * half-drawn scene.
 *
 * When motion is allowed, every track resets to its crouch/ready pose (the
 * "--hidden" modifier classes, all sharing keyframe 0%) and, on
 * scroll-into-view or click, plays through one shared 2.8s timeline (see
 * globals.css: hoop-root-motion, hoop-thigh-f-motion, hoop-shin-f-motion,
 * hoop-leg-b-motion, hoop-arm-u-motion, hoop-arm-f-motion,
 * hoop-ball-hand-motion, hoop-ball-flight-motion, hoop-net-ripple) —
 * crouch → rise and cock the shooting arm → release with a wrist-snap
 * follow-through (the ball crossfades from "held in hand" to an
 * independently-arcing element at this exact instant) → the ball arcs in
 * a parabola across the banner, spinning → it swishes through the net,
 * which ripples → the figure lands and settles into the same
 * follow-through pose the static markup already shows.
 *
 * `animate`/`revealed` come from OffDutyCard's shared useCardAnimation —
 * see useCardAnimation.ts for the full scroll/click/reduced-motion
 * contract this mirrors.
 */
export function BasketballAnimation({
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
  // allowed, exactly mirroring the offduty-stroke-hidden/play and
  // bball-ball--hidden/play precedent elsewhere in this file's siblings.
  const cls = (base: string) => clsx(base, animate && (playing ? `${base}--play` : `${base}--hidden`));

  return (
    <svg
      viewBox="0 0 400 200"
      className={className}
      role="img"
      aria-label="Illustration of a basketball player completing a jump shot, the ball swishing through the net"
    >
      {/* court context — static, decorative */}
      <path d="M20 175 Q200 140 380 175" fill="none" stroke="#edede8" strokeWidth="1.5" opacity="0.16" />
      <line x1="8" y1="178" x2="392" y2="178" stroke="#edede8" strokeWidth="1.5" opacity="0.22" />

      {/* ground shadows */}
      <ellipse cx="155" cy="182" rx="34" ry="5.5" fill="#140a05" opacity="0.35" />
      <ellipse cx="304" cy="182" rx="26" ry="4.5" fill="#140a05" opacity="0.3" />

      {/* ── hoop ─────────────────────────────────────────────────────── */}
      <rect x="300" y="24" width="42" height="32" rx="3" fill="#edede8" opacity="0.92" />
      <rect x="309" y="34" width="13" height="11" fill="none" stroke="#2a160b" strokeWidth="1.4" opacity="0.45" />
      <ellipse cx={RIM.cx} cy={RIM.cy} rx={RIM.rx} ry={RIM.ry} fill="none" stroke="#e8720c" strokeWidth="4.2" />

      {/* net */}
      <g className={cls("hoop-net")} style={{ transformOrigin: `${RIM.cx}px ${RIM.cy}px` }}>
        {NET_TOP_XS.map((topX, i) => {
          const midX = RIM.cx + (topX - RIM.cx) * 0.8;
          const bottomX = RIM.cx + (topX - RIM.cx) * 0.48;
          return (
            <path
              key={i}
              d={`M${topX} 69 L${midX} 84 L${bottomX} 97`}
              fill="none"
              stroke="#edede8"
              strokeWidth="1.3"
              strokeLinecap="round"
              opacity="0.85"
            />
          );
        })}
        <path d="M286 80 Q304 85 322 80" fill="none" stroke="#edede8" strokeWidth="1" opacity="0.5" />
        <path d="M289 90 Q304 95 319 90" fill="none" stroke="#edede8" strokeWidth="1" opacity="0.5" />
      </g>

      {/* ── figure ───────────────────────────────────────────────────── */}
      <g className={cls("hoop-root")} style={{ transformOrigin: "155px 178px" }}>
        {/* back leg — single rigid pivot, trailing */}
        <g transform={`translate(${HIP_BACK.x} ${HIP_BACK.y})`}>
          <g className={cls("hoop-leg-b")} style={{ transformOrigin: "0px 0px" }}>
            <Pill length={62} thickness={13} />
            <g transform="translate(0 62)">
              <rect x="-5" y="0" width="20" height="7" rx="3.5" fill="#edede8" />
            </g>
          </g>
        </g>

        {/* front leg — thigh + shin, the "hero" leg showing the knee bend */}
        <g transform={`translate(${HIP_FRONT.x} ${HIP_FRONT.y})`}>
          <g className={cls("hoop-thigh-f")} style={{ transformOrigin: "0px 0px" }}>
            <Pill length={36} thickness={14} />
            <g transform="translate(0 36)">
              <g className={cls("hoop-shin-f")} style={{ transformOrigin: "0px 0px" }}>
                <Pill length={34} thickness={11} />
                <g transform="translate(0 34)">
                  <rect x="-5" y="0" width="21" height="7" rx="3.5" fill="#edede8" />
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* torso — a tapered jersey silhouette (wide shoulders, narrower
            waist) instead of a uniform rounded rect, so it reads as a
            torso rather than blending into a blob with the head. */}
        <path d="M137 60 L167 60 L162 108 L142 108 Z" fill="#edede8" />
        <rect x="139" y="100" width="26" height="15" rx="4" fill="#e8720c" />
        {/* head — kept small relative to the torso, with a small neck gap
            (not flush against the torso top) so head/neck/shoulders read
            as distinct anatomy at true render size. */}
        <circle cx="152" cy="45" r="12" fill="#edede8" />

        {/* off arm — static counterbalance, no animation needed: its pose
            is plausible across every stage, so it never has to move.
            Pivots from its own shoulder point on the torso's far side so
            it doesn't stack on top of the shooting arm. */}
        <g transform={`translate(${OFF_SHOULDER.x} ${OFF_SHOULDER.y})`}>
          <g style={{ transform: "rotate(-20deg)" }}>
            <Pill length={30} thickness={11} />
            <g transform="translate(0 30)">
              <g style={{ transform: "rotate(-30deg)" }}>
                <Pill length={25} thickness={9} />
              </g>
            </g>
          </g>
        </g>

        {/* shooting arm — shoulder + elbow chain */}
        <g transform={`translate(${SHOULDER.x} ${SHOULDER.y})`}>
          <g className={cls("hoop-arm-u")} style={{ transformOrigin: "0px 0px" }}>
            <Pill length={31} thickness={12.5} />
            <g transform="translate(0 31)">
              <g className={cls("hoop-arm-f")} style={{ transformOrigin: "0px 0px" }}>
                <Pill length={29} thickness={10.5} />
                <g transform="translate(0 29)">
                  <circle cx="0" cy="5" r="7.5" fill="#edede8" />
                  {/* ball in hand — only ever exists while motion is
                      allowed (it rides the crouch/rise/cock stages and
                      crossfades out at the release instant); the resting
                      illustration shows the ball already gone, via the
                      independent hoop-ball-flight group below, so this
                      element is simply absent from static/no-JS output
                      rather than hidden with an inline style. */}
                  {animate && (
                    <g transform="translate(2 15)" className={playing ? "hoop-ball-hand--play" : "hoop-ball-hand--hidden"}>
                      <BasketballSurface />
                    </g>
                  )}
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>

      {/* ball in flight — a static SVG `transform` attribute places the
          outer wrapper at its resting position (already swished through
          the net); the CSS-animated class lives on the INNER group only.
          These must stay on separate elements: an SVG `transform`
          attribute and a CSS `transform` property on the *same* element
          don't compose — the CSS property wins outright and replaces the
          attribute rather than adding to it, which would silently strand
          the ball off-canvas during flight. Splitting them like this (the
          same nested static-wrapper/animated-inner pattern the limb rig
          uses above) makes the two add together correctly, and means the
          unanimated base state needs no override at all: no class, no
          inline style, just the plain circle sitting where a made shot
          leaves it. */}
      <g transform={`translate(${BALL_REST.x} ${BALL_REST.y})`}>
        <g className={cls("hoop-ball-flight")} style={{ transformOrigin: "0px 0px" }}>
          <BasketballSurface />
          <ellipse cx="-3.8" cy="-4.5" rx="2.8" ry="1.8" fill="#fff" opacity="0.22" transform="rotate(-25 -3.8 -4.5)" />
        </g>
      </g>
    </svg>
  );
}
