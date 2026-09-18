import type { ReactNode } from "react";

export function SectionHeading({
  id,
  index,
  title,
  lead,
}: {
  /** Matches the enclosing section's aria-labelledby (and any anchor link to it). */
  id: string;
  /** Two-digit section number, e.g. "01" — sections form a real sequence. */
  index: string;
  title: string;
  lead?: ReactNode;
}) {
  return (
    <div className="mb-10 flex items-baseline gap-4 sm:mb-14">
      <span className="font-mono text-sm text-dim">{index}</span>
      <div>
        <h2
          id={id}
          className="font-display text-3xl font-bold tracking-tight text-paper sm:text-4xl scroll-mt-24"
        >
          {title}
        </h2>
        {lead ? <p className="mt-3 max-w-xl text-dim">{lead}</p> : null}
      </div>
    </div>
  );
}
