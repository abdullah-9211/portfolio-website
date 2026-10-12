"use client";

import { useEffect, useRef } from "react";
import { drawContours, type Hill } from "@/lib/contours";

type ContourFieldProps = {
  seed: number;
  color?: string;
  alpha?: number;
  scale?: number;
  levels?: number;
  hills?: Hill[];
  className?: string;
};

/** Decorative terrain behind a scene, drawn once at the size it is shown. */
export function ContourField({ seed, color = "#5fd4e6", alpha = 0.16, scale = 320, levels = 16, hills, className }: ContourFieldProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let frame = 0;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      drawContours(ctx, {
        width: rect.width,
        height: rect.height,
        seed,
        scale,
        levels,
        cell: 8,
        color,
        alpha,
        hills: hills?.map((h) => ({ ...h, x: h.x * rect.width, y: h.y * rect.height, radius: h.radius * rect.width })),
      });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };
    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(canvas);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [seed, color, alpha, scale, levels, hills]);

  return <canvas ref={ref} className={`contour-field ${className ?? ""}`} aria-hidden="true" />;
}
