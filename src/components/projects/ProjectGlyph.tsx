/**
 * A small, interactive, content-grounded badge next to each project's
 * title — upgraded from a static pictogram to a hover/tap-triggered
 * animation, per client feedback that "For fun" reads dead interaction-
 * wise ("Move can have exercise related something... must be well
 * defined, smooth and interactive").
 *
 * Deliberately NOT a 3D scene, and deliberately NOT useState/JS-driven:
 * three rows of "date + title + description + tags" don't need
 * CareerThread's full connective-rail treatment, and a small per-row
 * accent glyph doesn't need a client-side reveal/replay state machine
 * either — plain CSS `:hover`/`:active` keyframes do the whole job here,
 * which has a real advantage over the JS-driven pattern used elsewhere
 * on this site (useCardAnimation.ts): the interaction works with zero
 * JavaScript at all, not just "degrades gracefully without it." Each
 * glyph keeps the underlying concept from the previous static pass —
 * still specifically about THAT project, not swappable with the others —
 * now animated:
 *
 * - Move: the same blocky pose-skeleton (Mediapipe teal), except one arm
 *   is a separate rotating group that swings through a single rep
 *   (a raise) on hover/tap, with a small checkmark flashing at the peak —
 *   literally "pose estimation... flags what to fix."
 * - What On Earth: the same three meters (biodiversity / population /
 *   currency), except each bar now dips/rises on hover/tap, staggered
 *   into a small ripple, as if a decision had just landed — the game's
 *   actual mechanic ("every decision shifts biodiversity, population,
 *   and currency").
 * - Web Scraping Project: the same hub-and-spoke node graph, except the
 *   center node (already lit in --signal) now pulses outward through the
 *   stem/spokes/connectors to the outer nodes on hover/tap — literally
 *   the NetworkX word-graph "settling," evoking "graphed the most common
 *   nouns."
 *
 * Resting markup is always the complete, correct static shape (every
 * element is always rendered — nothing is conditionally hidden pending
 * JS), so SSR/no-JS/pre-hydration output is pixel-identical to what
 * these glyphs look like before and after their animation plays. Because
 * the trigger is a plain CSS pseudo-class, this holds even with
 * JavaScript disabled entirely (hover/tap still work; only the motion
 * itself is CSS, not JS).
 *
 * prefers-reduced-motion is handled twice, deliberately: the sitewide
 * rule in globals.css already collapses any animation to ~0ms/1
 * iteration, but since every keyframe below both starts AND ends at the
 * resting pose (a "dip and return," not a toggle), that collapse alone
 * would land on a no-op blink — no perceptible reaction at all. So each
 * glyph also gets its own `@media (prefers-reduced-motion: reduce)`
 * override in globals.css that swaps the animation for a plain, instant
 * pose/color swap on :hover/:active — the same "instant pose-swap
 * instead of eased animation" convention DeskSetupModel.tsx's click
 * reaction uses, so reduced-motion visitors still get a real, brief
 * reaction to hovering/tapping, not silence.
 */
export function ProjectGlyph({ name }: { name: string }) {
  if (name === "Move") {
    return (
      <span
        className="project-glyph project-glyph-move inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 overflow-visible">
          {/* head */}
          <rect x="10.5" y="3" width="3" height="3" fill="#0097A7" />
          {/* torso */}
          <rect x="11.5" y="6" width="1" height="9" fill="#0097A7" />
          {/* shoulder bar */}
          <rect x="7" y="7" width="10" height="1" fill="#0097A7" />
          {/* left arm — static, stays put so the figure keeps a stable
              base silhouette while the right arm does the rep */}
          <rect x="7" y="8" width="1" height="5" fill="#0097A7" />
          {/* right arm — wrapper places the rotation pivot at the
              shoulder attachment point; inner group is what CSS rotates
              (same static-wrapper/animated-inner split RunningAnimation.tsx
              uses for its jointed limbs) */}
          <g transform="translate(16.5 8)">
            <g className="move-arm" style={{ transformOrigin: "0px 0px" }}>
              <rect x="-0.5" y="0" width="1" height="5" fill="#0097A7" />
            </g>
          </g>
          {/* hips */}
          <rect x="9" y="15" width="6" height="1" fill="#0097A7" />
          {/* legs */}
          <rect x="9" y="16" width="1" height="5" fill="#0097A7" />
          <rect x="14" y="16" width="1" height="5" fill="#0097A7" />
          {/* "good form" checkmark — flashes at the top of the rep */}
          <g className="move-check" transform="translate(17.6 2.6)">
            <path
              d="M-1.6 0.3 L-0.3 1.7 L2.1 -1.5"
              fill="none"
              stroke="#35E8B8"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      </span>
    );
  }

  if (name === "What On Earth") {
    return (
      <span
        className="project-glyph project-glyph-earth inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 overflow-visible">
          <rect x="2" y="20" width="20" height="1" fill="#888D92" />
          <rect
            className="earth-bar-a"
            x="3"
            y="7"
            width="4"
            height="13"
            fill="#4CAF6D"
            style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
          />
          <rect
            className="earth-bar-b"
            x="10"
            y="11"
            width="4"
            height="9"
            fill="#E8B93B"
            style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
          />
          <rect
            className="earth-bar-c"
            x="17"
            y="17"
            width="4"
            height="3"
            fill="#E24C4C"
            style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
          />
        </svg>
      </span>
    );
  }

  if (name === "Web Scraping Project") {
    return (
      <span
        className="project-glyph project-glyph-scrape inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 overflow-visible">
          {/* top node */}
          <rect className="scrape-node scrape-node-top" x="10.5" y="3" width="3" height="3" />
          {/* stem connecting the center node down to the spoke bar */}
          <rect className="scrape-edge scrape-edge-stem" x="11.5" y="13" width="1" height="2" />
          {/* horizontal spoke bar */}
          <rect className="scrape-edge scrape-edge-bar" x="4.5" y="15" width="15" height="1" />
          {/* connectors down to the two outer node clusters */}
          <rect className="scrape-edge scrape-edge-l" x="4" y="16" width="1" height="1" />
          <rect className="scrape-edge scrape-edge-r" x="19" y="16" width="1" height="1" />
          {/* outer node clusters */}
          <rect className="scrape-node scrape-node-l" x="3" y="17" width="3" height="3" />
          <rect className="scrape-node scrape-node-r" x="18" y="17" width="3" height="3" />
          {/* center node — lit in --signal, the graph's hub */}
          <rect className="scrape-node scrape-node-center" x="10.5" y="10" width="3" height="3" />
        </svg>
      </span>
    );
  }

  return null;
}
