"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { useActProgress, ramp } from "./Act";

type CueProps = {
  /** Progress at which the cue starts to appear. Use a negative value to greet. */
  from: number;
  /** Progress at which it has fully left. Omit to hold until the act ends. */
  to?: number;
  rampIn?: number;
  rampOut?: number;
  /** Pixels of rise on entry. */
  rise?: number;
  as?: "div" | "p" | "figure" | "li";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

/**
 * Content that appears for a window of its act's progress. It fades with a
 * small rise, holds on a plateau, and becomes inert while hidden so nothing
 * invisible can take focus or clicks.
 */
export function Cue({
  from,
  to,
  rampIn = 0.08,
  rampOut = 0.08,
  rise = 14,
  as: Tag = "div",
  className,
  style,
  children,
}: CueProps) {
  const ref = useRef<HTMLElement>(null);

  useActProgress((p) => {
    const el = ref.current;
    if (!el) return;
    const a = ramp(p, from, from + rampIn);
    const b = to === undefined ? 1 : 1 - ramp(p, to - rampOut, to);
    const o = a * b;
    el.style.opacity = o.toFixed(3);
    el.style.transform = `translate3d(0, ${((1 - a) * rise).toFixed(1)}px, 0)`;
    const hidden = o < 0.02;
    el.style.visibility = hidden ? "hidden" : "visible";
    if (hidden) el.setAttribute("inert", "");
    else el.removeAttribute("inert");
  });

  const startsVisible = from <= 0;
  return (
    <Tag
      // @ts-expect-error one ref type serves every allowed tag
      ref={ref}
      className={`cue ${className ?? ""}`}
      style={{ opacity: startsVisible ? 1 : 0, willChange: "opacity, transform", ...style }}
    >
      {children}
    </Tag>
  );
}
