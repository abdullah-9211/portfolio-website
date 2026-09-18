import type { ReactNode } from "react";
import clsx from "clsx";

/**
 * Base card treatment for the whole site: a hairline border, flat fill,
 * moderate radius. Depth comes from --line borders, never box-shadow.
 * Pass a topic class (e.g. "card-forge") to swap in a fixed micro-palette.
 */
export function HairlineCard({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "section";
}) {
  return (
    <Tag
      className={clsx(
        "rounded-card border border-line bg-void/40 p-6 sm:p-8",
        className
      )}
    >
      {children}
    </Tag>
  );
}
