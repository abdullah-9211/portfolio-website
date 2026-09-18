import type { CSSProperties } from "react";
import type { TechItem } from "@/data/skills";
import { TechIcon } from "./TechIcon";

export function TechChip({
  item,
  hidden,
}: {
  item: TechItem;
  /** Marks the duplicated set used only to loop the marquee seamlessly. */
  hidden?: boolean;
}) {
  return (
    <span
      className="tech-chip flex items-center gap-2 rounded-full border border-line px-4 py-2 font-mono text-sm"
      style={
        {
          "--tech-color": item.color,
          "--tech-fg": item.fg,
        } as CSSProperties
      }
      data-marquee-duplicate={hidden ? "" : undefined}
      aria-hidden={hidden ? "true" : undefined}
    >
      <TechIcon item={item} className="h-4 w-4 shrink-0" />
      {item.name}
    </span>
  );
}
