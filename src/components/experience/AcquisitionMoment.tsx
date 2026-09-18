"use client";

import { useCallback, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { GradientText } from "@/components/primitives/GradientText";
import { useReducedMotion } from "@/components/primitives/ReducedMotionProvider";
import { acquisition } from "@/data/experience";

// The site's own accents — signal mint plus the Valkrix gradient stops —
// so the burst reads as on-brand, not generic rainbow confetti.
const CONFETTI_COLORS = ["#35e8b8", "#4f7df3", "#a85de8", "#e85dbe"];

// Guards a single click event from firing twice (e.g. a stray double
// dispatch) — not a "cooldown"; deliberate rapid re-clicks each still land.
const REFIRE_GUARD_MS = 300;

export function AcquisitionMoment() {
  const ref = useRef<HTMLDivElement>(null);
  const hasAutoFiredRef = useRef(false);
  const lastFireRef = useRef(0);
  const prefersReduced = useReducedMotion();

  const burst = useCallback((el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const origin = {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    };
    confetti({
      particleCount: 90,
      spread: 80,
      startVelocity: 38,
      gravity: 0.9,
      ticks: 220,
      origin,
      colors: CONFETTI_COLORS,
      scalar: 0.9,
      disableForReducedMotion: true,
    });
  }, []);

  // Auto-fire the first time the block scrolls into view — a nice
  // surprise on first visit. Fires once, ever; clicking (below) is the
  // repeatable trigger after that.
  useEffect(() => {
    if (prefersReduced) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAutoFiredRef.current) {
          hasAutoFiredRef.current = true;
          lastFireRef.current = performance.now();
          burst(el);
          observer.disconnect();
        }
      },
      { threshold: 0.6 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [prefersReduced, burst]);

  const handleClick = useCallback(() => {
    if (prefersReduced) return;
    const el = ref.current;
    if (!el) return;
    const now = performance.now();
    if (now - lastFireRef.current < REFIRE_GUARD_MS) return;
    lastFireRef.current = now;
    burst(el);
  }, [prefersReduced, burst]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label="Replay the celebration"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="group relative my-4 cursor-pointer border-y border-line py-14 text-center transition-[border-color,transform] duration-300 ease-out hover:border-signal/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-4 sm:py-20"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-4 font-mono text-xs text-dim opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 sm:right-6 sm:top-6"
      >
        ↻ click to celebrate
      </span>
      <p className="font-mono text-xs uppercase tracking-widest text-dim">
        {acquisition.date}
      </p>
      <p className="font-display mt-3 text-6xl font-extrabold tracking-tight transition-transform duration-300 ease-out group-hover:scale-[1.02] sm:text-8xl">
        <GradientText>{acquisition.amount}</GradientText>
      </p>
      <p className="font-display mt-4 text-xl font-semibold text-paper sm:text-2xl">
        {acquisition.headline}
      </p>
      <p className="mx-auto mt-4 max-w-xl leading-relaxed text-dim">
        {acquisition.body}
      </p>
    </div>
  );
}
