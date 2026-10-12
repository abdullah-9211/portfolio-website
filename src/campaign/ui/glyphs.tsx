/** The diamond used for trophies everywhere. */
export function TrophyGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true" className="trophy-glyph">
      <path d="M10 1.5 L18.5 10 L10 18.5 L1.5 10Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 6 L14 10 L10 14 L6 10Z" fill="currentColor" />
    </svg>
  );
}

export function ArrowGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true">
      <path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ExternalGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true">
      <path d="M8 4H4v12h12v-4M11 4h5v5M16 4l-7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
