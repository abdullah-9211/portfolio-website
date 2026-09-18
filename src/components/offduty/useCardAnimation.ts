"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useReducedMotion } from "@/components/primitives/ReducedMotionProvider";

// Guards a single click/keypress from firing twice (e.g. a stray double
// dispatch) — not a "cooldown"; deliberate rapid re-clicks each still land.
const REFIRE_GUARD_MS = 300;

// Gap between resetting to the pre-play pose and flipping back to "revealed"
// — long enough for the browser to actually paint the reset frame (and, for
// keyframe-driven elements, drop the finished animation state) before the
// class is re-applied, so every replay restarts from the true start pose
// instead of the browser silently no-op'ing an unchanged class list.
const RESET_DELAY_MS = 30;

/**
 * Shared "scroll-triggers-once, click-replays-always" wiring for the four
 * off-duty card illustrations — same shape as AcquisitionMoment.tsx's
 * confetti trigger, generalized so each card's own illustration owns what
 * "revealed" actually looks like:
 *
 *  - `animate` is false until the component has mounted on the client AND
 *    the user hasn't asked for reduced motion. Illustrations must render
 *    their complete, correct, static artwork whenever `animate` is false —
 *    this is what SSR, no-JS, pre-hydration and reduced-motion visitors all
 *    see, and it must never be a blank/half-drawn placeholder.
 *  - `revealed` starts true (matching the safe default) and is flipped to
 *    false the instant it's safe to animate, so the first scroll-into-view
 *    is a real reveal rather than an already-finished illustration —
 *    exactly CoffeeRosetta's pre-existing pour-in behavior, now shared.
 *  - Scrolling the card into view flips `revealed` back to true once.
 *  - Every click/Enter/Space after that briefly flips `revealed` false then
 *    true again (a tick apart) to restart whatever CSS transition or
 *    `both`-filled keyframe animation keys off it, debounced 300ms against
 *    accidental double-fires.
 */
export function useCardAnimation(): {
  ref: RefObject<HTMLDivElement | null>;
  animate: boolean;
  revealed: boolean;
  handleClick: () => void;
  handleKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
} {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const [hasMounted, setHasMounted] = useState(false);
  const [revealed, setRevealed] = useState(true);
  const hasAutoFiredRef = useRef(false);
  const lastFireRef = useRef(0);
  const resetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setHasMounted(true);
    if (!prefersReduced) setRevealed(false);
  }, [prefersReduced]);

  useEffect(() => {
    if (!hasMounted || prefersReduced) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAutoFiredRef.current) {
          hasAutoFiredRef.current = true;
          lastFireRef.current = performance.now();
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMounted, prefersReduced]);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current !== null) {
        window.clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const replay = useCallback(() => {
    if (prefersReduced || !hasMounted) return;
    const now = performance.now();
    if (now - lastFireRef.current < REFIRE_GUARD_MS) return;
    lastFireRef.current = now;
    hasAutoFiredRef.current = true;
    setRevealed(false);
    resetTimeoutRef.current = window.setTimeout(() => {
      setRevealed(true);
    }, RESET_DELAY_MS);
  }, [prefersReduced, hasMounted]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        replay();
      }
    },
    [replay]
  );

  return {
    ref,
    animate: hasMounted && !prefersReduced,
    revealed,
    handleClick: replay,
    handleKeyDown,
  };
}
