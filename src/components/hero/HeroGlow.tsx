"use client";

import { useEffect, useRef } from "react";

/**
 * Purely decorative — if JS is off this still renders (SSR) as a static,
 * centered, color-cycling glow via CSS alone; this effect only adds
 * cursor-following position on top of that. Never anything the page
 * depends on.
 */
export function HeroGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = ref.current?.closest("section");
    if (!section) return;

    function handlePointerMove(event: PointerEvent) {
      const rect = section!.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      (section as HTMLElement).style.setProperty("--mx", `${x}%`);
      (section as HTMLElement).style.setProperty("--my", `${y}%`);
    }

    section.addEventListener("pointermove", handlePointerMove as EventListener);
    return () =>
      section.removeEventListener("pointermove", handlePointerMove as EventListener);
  }, []);

  return (
    <div
      ref={ref}
      className="hero-glow pointer-events-none absolute inset-0 -z-10"
      aria-hidden="true"
    />
  );
}
