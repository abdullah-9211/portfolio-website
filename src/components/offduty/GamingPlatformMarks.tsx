"use client";

import clsx from "clsx";
import { siPlaystation } from "simple-icons";

// Real PlayStation mark, sourced programmatically from the `simple-icons`
// package — same reliable method as src/data/tech.ts. The installed
// simple-icons package has no Nintendo entry of any kind, so the Nintendo
// mark below is a hand-drawn recreation (plain shapes + SVG text, not a
// redistributed asset) built from a reference image the client supplied
// directly, replacing an earlier bespoke Joy-Con-colored placeholder badge
// that predated having that reference.
const PS_COLOR = `#${siPlaystation.hex}`;
const SWITCH_RED = "#e60012"; // matches --card-accent-3
const SWITCH_BLUE = "#0ab9e6"; // matches the previous pass's Joy-Con homage blue

// Final, well-separated resting slots for the two marks — pulled wide
// across the now much bigger 400-unit-wide banner stage specifically to
// fix the client's "too crammed into each other" complaint. A 210-unit gap
// between centers (with the small controller glyph alone in the middle of
// that gap) reads as two independent, fully-legible plaques rather than a
// pair fighting for space.
const PS_SLOT = { x: 95, y: 150 };
const SWITCH_SLOT = { x: 305, y: 150 };

// TV screen's inner content area — both console shapes "emerge" from
// roughly this point before traveling out to their slots.
const SCREEN = { x: 158, y: 16, width: 84, height: 56 };

/**
 * The full narrative the client asked for: a TV plays a game → the PS5 and
 * Switch rise up out of the screen and travel outward → each console
 * silhouette morphs into its real/homage brand mark → both marks land at
 * rest, wide apart. Rebuilt from scratch (the previous pass was two static
 * plaques side by side, explicitly called out as "too crammed" and "tiny").
 *
 * Complete, correct RESTING frame (what SSR/no-JS/pre-hydration/reduced-
 * motion visitors see, with zero inline hiding styles): the TV sits idle
 * with its game-glow softly pulsing, the controller glyph rests below it,
 * and both brand marks are already fully formed and landed at their wide,
 * separated slots — this is just the plain markup below with no modifier
 * classes, mirroring BasketballAnimation.tsx's "base class already equals
 * the animation's own 100% keyframe" convention. The console silhouettes
 * themselves only ever exist while motion is allowed (same technique as
 * that file's ball-in-hand element) — they're a transient mid-flight prop,
 * not part of the finished scene, so static output never has to fake a
 * "settled console" pose for them.
 *
 * When motion is allowed: both console groups reset to hidden-inside-the-
 * screen (tiny, transparent, `gaming-console-{ps,switch}--hidden`) and both
 * logo groups reset to `offduty-pop-hidden`. On scroll-into-view / click,
 * each console rises out of the screen and travels out to its slot while
 * scaling up (`gaming-console-{ps,switch}-motion`, in globals.css), fading
 * out just as it arrives; each logo pops in (reusing the existing
 * offduty-pop-in keyframe, just retimed via a custom delay/duration, the
 * same `popStyle` trick the previous pass used) starting slightly before
 * the console has fully faded — the overlap window is the "morph": a
 * crossfade+scale between a console silhouette and a flat logo mark at the
 * same position, which reads clearly as a transformation without needing
 * fragile true SVG path-shape interpolation.
 *
 * `animate`/`revealed` come from OffDutyCard's shared useCardAnimation —
 * see useCardAnimation.ts for the full scroll/click/reduced-motion
 * contract this mirrors.
 */
export function GamingPlatformMarks({
  className,
  animate,
  revealed,
}: {
  className?: string;
  animate: boolean;
  revealed: boolean;
}) {
  const playing = animate && revealed;

  // Console silhouette motion — only meaningful while `animate` is true;
  // the elements themselves are omitted entirely from static output (see
  // the component doc above), so this only ever has to pick between the
  // pre-play hidden pose and the play keyframes.
  const consoleClass = (side: "ps" | "switch") =>
    clsx(`gaming-console-${side}--${playing ? "play" : "hidden"}`);

  // Logo pop — reuses the site-wide offduty-pop-in keyframe (same one the
  // previous pass used) but retimed with a custom delay so each mark pops
  // in right as its console silhouette finishes fading, plus a small
  // stagger between the two sides so they don't move in lockstep.
  const popClass = clsx(animate && (playing ? "offduty-pop-play" : "offduty-pop-hidden"));
  const popStyle = (delay: string) =>
    animate
      ? {
          transformOrigin: "0px 0px",
          ...(playing ? { animationDuration: "0.75s", animationDelay: delay } : undefined),
        }
      : undefined;

  return (
    <svg
      viewBox="0 0 400 200"
      className={className}
      role="img"
      aria-label="Illustration of a TV playing a game, with a PlayStation console and a Nintendo Switch console rising out of the screen and settling as their brand marks, well separated"
    >
      <defs>
        <linearGradient id="gaming-screen-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#123a63" />
          <stop offset="100%" stopColor="#0a1626" />
        </linearGradient>
        <clipPath id="gaming-screen-clip">
          <rect x={SCREEN.x} y={SCREEN.y} width={SCREEN.width} height={SCREEN.height} rx="4" />
        </clipPath>
      </defs>

      {/* ── TV ───────────────────────────────────────────────────────── */}
      {/* soft ambient backlight behind the whole set, idling regardless of
          `animate`. The static `opacity` attribute below is NOT dead
          weight even though the animation drives opacity while it's
          running: `.platform-glow`'s infinite pulse has no
          animation-fill-mode, so under prefers-reduced-motion the global
          rule (globals.css) collapses it to one ~0ms iteration and the
          animation then stops contributing entirely — the element falls
          back through the cascade to this presentation attribute rather
          than to opaque. Without it every platform-glow element would
          settle at full opacity 1, which for the two mark glows below
          (same fill color as the logo drawn on top of them) would fully
          camouflage the logo against its own glow — caught via an actual
          reduced-motion screenshot, not by inspection. */}
      <ellipse cx="200" cy="46" rx="92" ry="52" fill={PS_COLOR} opacity="0.16" className="platform-glow" style={{ animationDuration: "3.1s" }} />

      <rect x="150" y="8" width="100" height="80" rx="10" fill="#0a1626" stroke="#1c3a56" strokeWidth="2" />

      {/* screen content — a bold, simplified "game world" (not a literal
          render): a two-tone sky, layered mountains, a warm accent sun.
          Legible as "something is playing" at true banner size without
          overdetailing a scene nobody can actually read that small. */}
      <g clipPath="url(#gaming-screen-clip)">
        <rect x={SCREEN.x} y={SCREEN.y} width={SCREEN.width} height={SCREEN.height} fill="url(#gaming-screen-sky)" />
        <path d="M158 72 L182 40 L206 72 Z" fill="#081120" opacity="0.65" />
        <path d="M190 72 L222 34 L246 72 Z" fill="#081120" opacity="0.5" />
        <circle cx="222" cy="30" r="7" fill={SWITCH_RED} opacity="0.85" />
        {/* one-shot screen flash right as the consoles begin to emerge —
            purely decorative, so it's simply omitted from static output
            rather than needing an inline hidden style. */}
        {animate && (
          <rect
            x={SCREEN.x}
            y={SCREEN.y}
            width={SCREEN.width}
            height={SCREEN.height}
            fill="#eaf6ff"
            className={playing ? "gaming-screen-flash--play" : "gaming-screen-flash--hidden"}
          />
        )}
      </g>

      {/* power LED */}
      <circle cx="240" cy="90" r="1.8" fill={SWITCH_BLUE} opacity="0.6" className="platform-glow" style={{ animationDuration: "2s" }} />

      {/* stand */}
      <rect x="193" y="88" width="14" height="10" fill="#0a1626" />
      <rect x="170" y="97" width="60" height="6" rx="3" fill="#0a1626" stroke="#1c3a56" strokeWidth="1" />
      <ellipse cx="200" cy="107" rx="46" ry="4.5" fill="#04070d" opacity="0.35" />

      {/* controller silhouette — the "on which I'm playing them" cue,
          resting in the gap between the two spread-out marks so it never
          competes with either for space. Static; it doesn't need to move
          to read as "someone's playing." */}
      <g>
        <rect x="183" y="140" width="34" height="19" rx="9.5" fill="#0a1626" stroke="#1c3a56" strokeWidth="1.2" />
        <circle cx="193" cy="149.5" r="3" fill="#152840" />
        <circle cx="207" cy="149.5" r="3" fill="#152840" />
        <rect x="198" y="143.5" width="4" height="2" rx="1" fill="#152840" />
      </g>

      {/* ── PS5 console silhouette — emerges from the screen, travels to
          the PS slot, fades out as its logo pops in. Transient prop only;
          never part of the resting scene, so it's entirely absent from
          static/no-JS/reduced-motion output. ─────────────────────────── */}
      {animate && (
        <g transform={`translate(${PS_SLOT.x} ${PS_SLOT.y})`}>
          <g className={consoleClass("ps")} style={{ transformOrigin: "0px 0px" }}>
            {/* two curved white "blade" panels leaning apart at the top and
                tapering to a narrow waist near the base — the PS5's actual
                silhouette, not a generic rounded rectangle (the client's
                exact complaint: "the ps5 illustration is hella off"). Each
                blade is a single closed bezier path so the curve reads as
                one continuous panel rather than a stack of primitives. */}
            <path
              d="M-1 27 C-1 22 -2 15 -2 4 C-2 -8 -3 -18 -7 -27 C-3 -27 1 -25 3 -20 C6 -12 6 0 5 12 C4.4 19 2.5 24.5 -1 27 Z"
              fill="#e7edf5"
            />
            <path
              d="M1 27 C1 22 2 15 2 4 C2 -8 3 -18 7 -27 C3 -27 -1 -25 -3 -20 C-6 -12 -6 0 -5 12 C-4.4 19 -2.5 24.5 1 27 Z"
              fill="#e7edf5"
            />
            {/* black center gap between the two blades, with a few thin
                diagonal grille lines — the console's signature detail
                visible from straight on. */}
            <path d="M-2 -26 C-1 -14 -1 8 -1.5 26 L1.5 26 C1 8 1 -14 2 -26 Z" fill="#0a1626" />
            <path d="M-1.4 -6 L1.4 -10" stroke="#2a3a4d" strokeWidth="0.8" opacity="0.8" />
            <path d="M-1.5 0 L1.5 -4" stroke="#2a3a4d" strokeWidth="0.8" opacity="0.8" />
            <path d="M-1.6 6 L1.4 2" stroke="#2a3a4d" strokeWidth="0.8" opacity="0.8" />
            {/* blue LED accent line near the base, the same signal color
                the console glows in real life */}
            <rect x="-1.6" y="16" width="3.2" height="1.4" fill={SWITCH_BLUE} opacity="0.9" />
            {/* stand */}
            <ellipse cx="0" cy="28.5" rx="9" ry="2.4" fill="#0a1626" opacity="0.55" />
          </g>
        </g>
      )}

      {/* ── Switch console silhouette — same treatment, mirrored. ──────── */}
      {animate && (
        <g transform={`translate(${SWITCH_SLOT.x} ${SWITCH_SLOT.y})`}>
          <g className={consoleClass("switch")} style={{ transformOrigin: "0px 0px" }}>
            <rect x="-19" y="-13" width="38" height="26" rx="5" fill="#1c3a56" />
            <rect x="-15" y="-10" width="30" height="20" rx="3" fill="#0a1626" />
            <rect x="-23" y="-13" width="6" height="26" rx="3" fill={SWITCH_BLUE} />
            <rect x="17" y="-13" width="6" height="26" rx="3" fill={SWITCH_RED} />
          </g>
        </g>
      )}

      {/* ── PlayStation mark — real simple-icons glyph, landed wide left.
          The glow circle's fill is the exact same blue as the glyph drawn
          on top of it, so its resting `opacity` (the reduced-motion
          fallback explained above) has to stay well under 1 — otherwise
          the two become indistinguishable and the mark disappears into
          its own glow.
          Client follow-up: "playstation logo is a little dim make it more
          visible." The brand blue (#0070D1) sitting directly on the card's
          own dark-navy gradient didn't have enough contrast on its own — a
          solid, slightly lighter backdrop plate behind the glyph (between
          the soft ambient glow and the mark itself) gives it a real fixed
          pedestal to read against regardless of animation state, and the
          glyph's own fill is brightened a touch from the raw brand hex. */}
      <g transform={`translate(${PS_SLOT.x} ${PS_SLOT.y})`}>
        <circle r="40" fill={PS_COLOR} opacity="0.22" className="platform-glow" style={{ animationDuration: "2.4s" }} />
        <circle r="30" fill="#16375c" />
        <g className={popClass} style={popStyle("2.35s")}>
          <g transform="translate(-31.2 -31.2) scale(2.6)">
            <path d={siPlaystation.path} fill="#2f96ff" />
          </g>
        </g>
      </g>

      {/* ── Nintendo wordmark — landed wide right, well clear of the
          PlayStation mark. Per the client's explicit direction (reference
          image provided): the console silhouette above was already fine,
          only this final "logo" was wrong — a hand-drawn recreation of the
          real Nintendo mark (solid red background, a white stadium-pill
          outline, the bold white "Nintendo" wordmark, small ® at the
          upper right), replacing the earlier bespoke Joy-Con-colored S
          badge that was a legal-safety placeholder before this reference
          was available. Built as plain shapes + SVG text, not a
          redistributed logo asset. ─────────────────────────────────── */}
      <g transform={`translate(${SWITCH_SLOT.x} ${SWITCH_SLOT.y})`}>
        <circle r="40" fill={SWITCH_RED} opacity="0.18" className="platform-glow" style={{ animationDuration: "2.4s", animationDelay: "-1.1s" }} />
        <g className={popClass} style={popStyle("2.5s")}>
          <g transform="translate(-55 -18)">
            {/* solid red background, fully rounded "stadium" pill */}
            <rect width="110" height="36" rx="18" fill={SWITCH_RED} />
            {/* white outline pill, inset from the edge */}
            <rect
              x="4.5"
              y="4.5"
              width="101"
              height="27"
              rx="13.5"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
            />
            <text
              x="55"
              y="24.5"
              textAnchor="middle"
              fontFamily="Arial, Helvetica, sans-serif"
              fontWeight="800"
              fontSize="17"
              fill="#ffffff"
            >
              Nintendo
            </text>
            <text
              x="101"
              y="10"
              fontFamily="Arial, Helvetica, sans-serif"
              fontWeight="700"
              fontSize="6"
              fill="#ffffff"
            >
              ®
            </text>
          </g>
        </g>
      </g>
    </svg>
  );
}
