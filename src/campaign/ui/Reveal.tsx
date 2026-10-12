"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "section" | "ul" | "figure" | "li" | "article";
  /** Stagger direct children by this many milliseconds. */
  stagger?: number;
};

/**
 * Fades its content in with a short rise the first time it scrolls into
 * view. It never hides again, and content is visible if scripting is off.
 */
export function Reveal({ children, className, style, as: Tag = "div", stagger }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.dataset.reveal = "armed";
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.dataset.reveal = "in";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      // @ts-expect-error one ref type serves every allowed tag
      ref={ref}
      className={`reveal ${stagger ? "reveal-stagger" : ""} ${className ?? ""}`}
      style={{ ...(stagger ? { "--stagger": `${stagger}ms` } : null), ...style } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
