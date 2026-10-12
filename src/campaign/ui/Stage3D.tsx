"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "@/components/primitives/ReducedMotionProvider";

const MedalScene = dynamic(() => import("./MedalScene"), { ssr: false });
/**
 * Holds a 3D scene's place in the layout and only runs it while it is near
 * the viewport, so the page never keeps more than a couple of WebGL
 * contexts alive at once.
 */
function Near({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => setNear(entries.some((e) => e.isIntersecting)), {
      rootMargin: "60% 0px 60% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`stage3d ${className ?? ""}`} aria-hidden="true">
      {near ? children : null}
    </div>
  );
}

export function MedalStage({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  return (
    <Near className={className}>
      <MedalScene animate={!reduced} />
    </Near>
  );
}
