"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useReducedMotion } from "@/components/primitives/ReducedMotionProvider";

/**
 * The section's one deliberate motion beat, next to the credential count.
 * Everything else added to Certifications (the per-row issuer glyphs) is
 * static color, on purpose — the design direction here is explicit that
 * "a single orchestrated moment lands better than scattered effects," and
 * a hover animation repeated across all 7 rows would be exactly that
 * generic scattered default. So the boldness is spent once, here.
 *
 * Shape: a 12-point sunburst rosette ringing a checkmark — the classic
 * notarized/certified-document seal. Chosen because this section is
 * literally titled "Proof" and is about verified credentials specifically
 * (not a generic accent that could sit on any other section unchanged).
 * Built only from a repeated rect + a circle + a checkmark path (no
 * hand-tuned bezier work) so it stays crisp at the small size it actually
 * renders at.
 *
 * Motion: lands with a stamp-like "thump" — an overshoot scale plus a
 * small rotational settle — when it scrolls into view, mirroring
 * ScrollReveal's own SSR-safe approach one level up: the resting CSS
 * state (scale 1, rotate 0, opacity 1) IS the animation's own end frame,
 * so server-rendered/no-JS/pre-hydration output already matches exactly
 * what the animation lands on — nothing is ever hidden waiting for JS.
 *
 * prefers-reduced-motion is covered twice: this component simply never
 * observes/triggers the animation class when the OS preference is on
 * (so the seal is static from first paint), and even if it were somehow
 * triggered, the sitewide reduced-motion rule in globals.css already
 * forces any animation down to a single ~0ms frame landing on `100%` —
 * never a paused mid-animation pose.
 */
export function VerifiedSeal({ className }: { className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prefersReduced = useReducedMotion();
  const [thump, setThump] = useState(false);

  useEffect(() => {
    if (prefersReduced) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setThump(true);
          observer.disconnect();
        }
      },
      { rootMargin: "-80px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [prefersReduced]);

  return (
    <span
      ref={ref}
      className={clsx(
        "verified-seal text-signal inline-flex shrink-0 items-center justify-center",
        thump && "verified-seal--thump",
        className
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" className="h-full w-full">
        <g fill="currentColor">
          {Array.from({ length: 12 }).map((_, i) => (
            <rect
              key={i}
              x="23"
              y="1"
              width="2"
              height="9"
              transform={`rotate(${i * 30} 24 24)`}
            />
          ))}
        </g>
        <circle
          cx="24"
          cy="24"
          r="13"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M17 24.5L21.5 29L31 18.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
