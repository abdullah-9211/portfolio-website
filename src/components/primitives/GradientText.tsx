import { createElement, type ElementType, type ReactNode } from "react";
import clsx from "clsx";

/**
 * Applies the Valkrix brand gradient as text fill. This is the ONLY place
 * a gradient is allowed on the site — reserve it for genuinely
 * Valkrix-tied moments (wordmark, venture card, the closing "BUILD").
 */
export function GradientText({
  children,
  className,
  as: Tag = "span",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  return createElement(
    Tag,
    { className: clsx("text-gradient-valkrix", className) },
    children
  );
}
