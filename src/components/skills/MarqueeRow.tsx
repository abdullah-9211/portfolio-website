import clsx from "clsx";
import type { TechItem } from "@/data/skills";
import { TechChip } from "./TechChip";

export function MarqueeRow({
  items,
  reverse,
}: {
  items: TechItem[];
  reverse?: boolean;
}) {
  return (
    <div className="marquee-row overflow-hidden">
      <div
        className={clsx(
          "marquee-track flex w-max gap-3 py-2",
          reverse && "marquee-track--reverse"
        )}
      >
        {items.map((item) => (
          <TechChip key={item.name} item={item} />
        ))}
        {items.map((item) => (
          <TechChip key={`${item.name}-dup`} item={item} hidden />
        ))}
      </div>
    </div>
  );
}
