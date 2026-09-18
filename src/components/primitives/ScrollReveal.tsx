"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useReducedMotion } from "./ReducedMotionProvider";

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/**
 * A single, restrained fade/rise-in the first time a section enters view.
 *
 * Server-rendered (and no-JS) output has NO inline style at all, so content
 * is fully visible by default — this only ever *adds* a transient hidden
 * state after hydration, never relies on JS to reveal content that would
 * otherwise stay stuck invisible. Framer Motion's `initial` prop would
 * render opacity:0 straight into the server HTML, which is exactly the
 * failure mode this avoids.
 */
export function ScrollReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const [hasMounted, setHasMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setHasMounted(true);

    if (prefersReduced) {
      setIsVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "-80px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [prefersReduced]);

  const animate = hasMounted && !prefersReduced;
  const style: CSSProperties | undefined = animate
    ? {
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(12px)",
        transition: `opacity 0.4s ${EASE}, transform 0.4s ${EASE}`,
      }
    : undefined;

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
