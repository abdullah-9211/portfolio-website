"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useReducedMotion } from "@/components/primitives/ReducedMotionProvider";

/**
 * A red "VERIFIED" corner ribbon pinned across the credentials card's
 * upper-right corner — the client's own steer, distinct from the site's
 * usual signal-mint accent (a literal red "verified" ribbon is a familiar,
 * recognizable badge idiom in its own right, worth keeping in its own
 * color rather than reskinning it into the site palette).
 *
 * Same scroll-triggered "lands once" convention as VerifiedSeal: resting
 * CSS state (rotate/translate settled, opacity 1) already equals the
 * animation's own end frame, so SSR/no-JS/pre-hydration output shows the
 * ribbon already in place — nothing is hidden waiting on JS. Once JS
 * confirms motion is allowed, it resets to an off-position/scaled start
 * pose and drops into place, with a continuous, restrained diagonal
 * sheen sweeping across it afterward — a satin-ribbon shimmer, not a
 * second competing motion beat (VerifiedSeal is still the section's one
 * "orchestrated moment"; this shimmer is a quiet ambient detail on a
 * static object, same register as StatusDot's live pulse elsewhere).
 */
export function VerifiedRibbon({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const [dropped, setDropped] = useState(false);

  useEffect(() => {
    if (prefersReduced) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDropped(true);
          observer.disconnect();
        }
      },
      { rootMargin: "-60px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [prefersReduced]);

  return (
    <div
      ref={ref}
      className={clsx(
        "verified-ribbon pointer-events-none absolute -right-8 top-4 w-28 sm:-right-11 sm:top-6 sm:w-40",
        dropped && "verified-ribbon--dropped",
        className
      )}
      aria-hidden="true"
    >
      <div className="verified-ribbon-shimmer relative overflow-hidden bg-[#dc2626] py-0.5 text-center font-mono text-[8px] font-bold tracking-[0.15em] text-[#f5f3ee] sm:py-1 sm:text-[10px] sm:tracking-[0.2em]">
        VERIFIED
      </div>
    </div>
  );
}
