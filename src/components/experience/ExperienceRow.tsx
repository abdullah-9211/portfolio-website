import { StatusDot } from "@/components/primitives/StatusDot";
import type { ExperienceRow as ExperienceRowType } from "@/data/experience";

export function ExperienceRow({ row }: { row: ExperienceRowType }) {
  return (
    <div className="grid gap-2 border-t border-line py-8 sm:grid-cols-[180px_1fr] sm:gap-8">
      <div className="font-mono text-xs text-dim">{row.range}</div>
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-display text-xl font-bold text-paper sm:text-2xl">
            {row.role}
          </h3>
          {row.current && <StatusDot label="CURRENT" />}
        </div>
        <p className="mt-1 font-mono text-sm text-dim">
          {row.company} — {row.location}
        </p>
        <p className="mt-3 max-w-2xl leading-relaxed text-dim">
          {row.narrative}
        </p>
      </div>
    </div>
  );
}
