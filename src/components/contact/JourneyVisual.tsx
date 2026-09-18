"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import confetti from "canvas-confetti";
import clsx from "clsx";
import { useReducedMotion } from "@/components/primitives/ReducedMotionProvider";
import { JourneyModel } from "./JourneyModel";

// Same accent set JourneyModel's nodes use — the hero's own five
// word-cycle colors — so the DOM-level burst at the arrival moment reads
// as the same event as the 3D one, not a separate effect.
const CONFETTI_COLORS = ["#35e8b8", "#a85de8", "#e8720c", "#e4c9a0", "#4cd3ff"];

// Guards a single click/keypress from firing twice (e.g. a stray double
// dispatch) — not a cooldown; deliberate rapid re-clicks each still land.
const REFIRE_GUARD_MS = 300;

/**
 * Canvas wrapper + interaction for the closing "journey" scene (see
 * JourneyModel for the animation itself). Auto-plays once the first time
 * it scrolls into view, then replays on every click after that — the
 * same auto-fire-once/click-to-replay pattern AcquisitionMoment already
 * established for this site's other big celebratory moment.
 *
 * Purely decorative: the section's real content (headline, copy, both
 * contact links, location) is plain server-rendered text in
 * ContactSection that's complete with or without this canvas ever
 * mounting. Fixed CSS dimensions reserve its space up front so there's no
 * layout shift while R3F hydrates and no gap if it never does.
 *
 * The canvas itself now takes real pointer events (see the wrapper div
 * below) so JourneyModel's nodes can be hovered/clicked — a mouse-only
 * bonus layered on top of the decorative scene, not a required
 * navigation path: the canvas and its <Html> tooltips stay
 * `aria-hidden`, and every section they point at is already reachable
 * through the page's own normal scroll/anchor structure regardless of
 * whether this canvas ever mounts.
 */
export function JourneyVisual({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const [playToken, setPlayToken] = useState(0);
  const hasAutoFiredRef = useRef(false);
  const lastFireRef = useRef(0);

  const burstConfetti = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Origin sits near the arrival point's own on-screen position (upper-
    // middle of the box, where the 3D burst actually renders) — clamped
    // to stay on-screen even if the box is partly scrolled past, so the
    // burst never reads as coming from empty space above the viewport.
    const originY = Math.max(rect.top + rect.height * 0.32, 40);
    const origin = {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: originY / window.innerHeight,
    };
    confetti({
      particleCount: 60,
      spread: 75,
      startVelocity: 26,
      gravity: 1,
      ticks: 170,
      origin,
      colors: CONFETTI_COLORS,
      scalar: 0.8,
      disableForReducedMotion: true,
    });
  }, []);

  // Auto-play the first time the scene scrolls into view.
  useEffect(() => {
    if (prefersReduced) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAutoFiredRef.current) {
          hasAutoFiredRef.current = true;
          lastFireRef.current = performance.now();
          setPlayToken((n) => n + 1);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [prefersReduced]);

  const handleReplay = useCallback(() => {
    if (prefersReduced) return;
    const now = performance.now();
    if (now - lastFireRef.current < REFIRE_GUARD_MS) return;
    lastFireRef.current = now;
    setPlayToken((n) => n + 1);
  }, [prefersReduced]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleReplay();
      }
    },
    [handleReplay]
  );

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label="Replay the journey animation"
      onClick={handleReplay}
      onKeyDown={handleKeyDown}
      className={clsx(
        // Widened from a square to a landscape box — client follow-up:
        // "animation needs to be horizontally bigger... every node too
        // crammed together." A square canvas capped how far apart the 9
        // nodes could spread before hitting the frustum edge; going wide
        // (still modest on mobile, properly landscape from sm+) gives the
        // path real horizontal room without needing to zoom the camera
        // out (which would just shrink everything, nodes included).
        "group relative mx-auto h-64 w-72 cursor-pointer sm:h-80 sm:w-[28rem] lg:h-96 lg:w-[36rem]",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-1 z-10 font-mono text-[11px] text-dim opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        ↻ replay
      </span>
      {/* No longer `pointer-events-none`: JourneyModel's nodes and arrival
          burst need real hover/click to reach them. Every click that
          isn't intercepted by a node (see JourneyModel's stopPropagation
          comment) still bubbles up to this element's own onClick above,
          so "click anywhere replays" is unchanged for empty space and the
          burst — only node clicks now do something different. */}
      <div className="h-full w-full" aria-hidden="true">
        <Canvas
          // Pulled back from the original z:6.6 (and the whole scene's
          // local Y lowered — see JourneyModel's PATH_Y_OFFSET) to give
          // the arrival burst's own outer halo/sparkles enough headroom
          // that they sit inside the frustum with margin, not clipped
          // against its top edge like before.
          camera={{ position: [0, -0.2, 7.3], fov: 40 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
          frameloop={prefersReduced ? "demand" : "always"}
        >
          <ambientLight intensity={0.9} />
          <directionalLight position={[4, 5, 6]} intensity={1.3} />
          <directionalLight position={[-4, -1, -3]} intensity={0.4} color="#35e8b8" />
          <directionalLight position={[0, -2, -4]} intensity={0.3} color="#f5f3ee" />
          <JourneyModel animate={!prefersReduced} playToken={playToken} onArrive={burstConfetti} />
        </Canvas>
      </div>
    </div>
  );
}
