import type { TechItem } from "@/data/tech";

/**
 * Renders a tech's 24x24 brand path, or one of the hand-drawn generic
 * glyphs for techs with no redistributable official mark (SQL is a
 * generic language with no single owner; AWS's mark isn't licensed for
 * this kind of reuse; Java, Matplotlib, NetworkX and NLTK simply have no
 * Simple Icons entry to draw from). The four newer glyphs (coffee,
 * barchart, network, parsetree) are built only from straight-edged
 * rectangles — no arcs or bezier curves — specifically so their
 * correctness can be verified by coordinates alone rather than by eye,
 * and so they stay crisp at the true ~16px chip render size.
 */
export function TechIcon({ item, className }: { item: TechItem; className?: string }) {
  if (item.icon === "sql") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M4 4h16v3.2H4zM4 10.4h16v3.2H4zM4 16.8h16V20H4z" />
      </svg>
    );
  }

  if (item.icon === "aws") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M6.5 19q-2.28 0-3.89-1.57Q1 15.86 1 13.6q0-2.07 1.29-3.65 1.29-1.58 3.3-1.85.64-2.24 2.46-3.67Q9.86 3 12.1 3q2.7 0 4.6 1.9 1.9 1.9 1.9 4.6 1.86.2 3.13 1.57Q23 12.44 23 14.3q0 2-1.4 3.35T18.2 19H6.5Z" />
      </svg>
    );
  }

  if (item.icon === "coffee") {
    // Java: a mug (quadrilateral body) + a handle drawn as a rectangular
    // ring (outer rect + a reverse-wound inner rect, which under the
    // default nonzero fill-rule cuts a hole — the same donut technique
    // typeface glyphs use for letters like "O").
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M6 7L18 7L16.5 19L7.5 19Z M17.5 9H21.5V15H17.5Z M19 10.5V13.5H20V10.5Z" />
      </svg>
    );
  }

  if (item.icon === "barchart") {
    // Matplotlib: a simple ascending bar chart.
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M5 13H8V19H5ZM10 9H13V19H10ZM15 5H18V19H15Z" />
      </svg>
    );
  }

  if (item.icon === "network") {
    // NetworkX: a small horizontal node chain — literally "a graph".
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M3 10H6V13H3ZM8 10H11V13H8ZM13 10H16V13H13ZM18 10H21V13H18ZM6 11H8V12H6ZM11 11H13V12H11ZM16 11H18V12H16Z" />
      </svg>
    );
  }

  if (item.icon === "parsetree") {
    // NLTK: a root branching into two — a parse tree, echoing its role
    // here (part-of-speech tagging).
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M10.5 4H13.5V7H10.5ZM11.5 7H12.5V9H11.5ZM6 9H18V10H6ZM6.5 10H7.5V11H6.5ZM16.5 10H17.5V11H16.5ZM5 11H9V14H5ZM15 11H19V14H15Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d={item.path} />
    </svg>
  );
}
