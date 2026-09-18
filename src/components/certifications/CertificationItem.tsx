import type { Certification } from "@/data/certifications";
import { IssuerGlyph } from "./IssuerGlyph";

export function CertificationItem({ cert }: { cert: Certification }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-t border-line py-4">
      <a
        href={cert.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 items-center gap-3 text-paper hover:text-signal transition-colors"
      >
        <IssuerGlyph issuer={cert.issuer} className="h-6 w-6" />
        <span className="min-w-0">{cert.name}</span>
      </a>
      <span className="shrink-0 font-mono text-xs text-dim">
        {cert.issuer}
        {cert.range ? ` — ${cert.range}` : ""}
      </span>
    </li>
  );
}
