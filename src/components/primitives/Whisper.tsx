import type { CSSProperties, ReactNode } from "react";
import clsx from "clsx";

/**
 * The thin-weight, tracked-out "whisper" line that sits beneath a huge
 * display "shout" headline — the site's one deliberate typographic
 * signature move (contrast, not decoration).
 */
export function Whisper({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <p
      className={clsx(
        "font-body text-sm font-light tracking-[0.15em] text-dim sm:text-base",
        className
      )}
      style={style}
    >
      {children}
    </p>
  );
}
