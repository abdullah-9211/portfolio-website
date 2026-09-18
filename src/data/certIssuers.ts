import { siCoursera, siUdemy } from "simple-icons";

/**
 * Real Coursera/Udemy brand marks for the per-credential issuer glyph in
 * CertificationItem.tsx — sourced programmatically from the `simple-icons`
 * package, the same reliable method src/data/tech.ts documents for
 * FastAPI/OpenCV/Supabase/Firebase/Android Studio. Kept as its own file
 * rather than added to tech.ts: these are credential-issuer marks, not
 * "tech stack" entries, and tech.ts's own header comment scopes it to
 * Skills + Projects tags specifically.
 */
export type CertIssuer = "Coursera" | "Udemy";

export const certIssuerIcons: Record<CertIssuer, { color: string; path: string }> = {
  Coursera: { color: `#${siCoursera.hex}`, path: siCoursera.path },
  Udemy: { color: `#${siUdemy.hex}`, path: siUdemy.path },
};
