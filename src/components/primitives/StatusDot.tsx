"use client";

import { useReducedMotion } from "./ReducedMotionProvider";

/**
 * A small "live/active" indicator — used sparingly (currently: the Veeam
 * "current role" row). The pulse ring is disabled under reduced-motion;
 * the dot itself always renders as a plain static mark either way.
 */
export function StatusDot({ label }: { label?: string }) {
  const prefersReduced = useReducedMotion();

  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        {!prefersReduced && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-60" />
        )}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
      </span>
      {label ? (
        <span className="font-mono text-xs tracking-wide text-signal">
          {label}
        </span>
      ) : null}
    </span>
  );
}
