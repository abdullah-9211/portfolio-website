import clsx from "clsx";

export function ChipList({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  return (
    <ul className={clsx("flex flex-wrap gap-2", className)}>
      {items.map((item) => (
        <li
          key={item}
          className="venture-chip rounded-full border border-line px-3 py-1 font-mono text-xs text-dim"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
