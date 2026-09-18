import clsx from "clsx";
import { certIssuerIcons, type CertIssuer } from "@/data/certIssuers";

/**
 * Small static circular badge carrying the credential's real issuer
 * brand mark (Coursera blue / Udemy violet), rendered permanently in
 * color rather than the tech-chip "muted default, colored on hover"
 * treatment — this list has 7 rows, and a hover-fill on every one of
 * them is exactly the "scattered effects" pattern the design direction
 * calls out as the generic default. A fixed color per row instead turns
 * the flat gray list into something with real identity at a glance, with
 * zero added motion.
 *
 * Plain inline SVG in normal document flow (no absolute positioning),
 * same reasoning as ProjectGlyph.tsx: it can never overlap the name/date
 * text next to it, at any viewport, by construction.
 */
export function IssuerGlyph({
  issuer,
  className,
}: {
  issuer: CertIssuer;
  className?: string;
}) {
  const { color, path } = certIssuerIcons[issuer];

  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-line",
        className
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3">
        <path d={path} fill={color} />
      </svg>
    </span>
  );
}
