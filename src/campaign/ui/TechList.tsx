import type { TechItem } from "@/data/tech";
import { TechIcon } from "@/components/skills/TechIcon";

/** The tools a project was built with. */
export function TechList({ items }: { items: TechItem[] }) {
  return (
    <ul className="techlist" aria-label="Built with">
      {items.map((t) => (
        <li key={t.name}>
          <TechIcon item={t} className="techlist-icon" />
          {t.name}
        </li>
      ))}
    </ul>
  );
}
