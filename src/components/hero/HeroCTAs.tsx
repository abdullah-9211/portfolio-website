export function HeroCTAs() {
  return (
    <div className="mt-10 flex flex-wrap items-center gap-4">
      <a
        href="#about-heading"
        className="hero-cta-primary rounded-full border px-6 py-3 font-mono text-sm"
      >
        See the work ↓
      </a>
      <a
        href="/resume/abdullah-umar-resume.pdf"
        download
        className="rounded-full border border-line px-6 py-3 font-mono text-sm text-paper transition-colors hover:border-signal hover:text-signal"
      >
        Just the resume ↓
      </a>
    </div>
  );
}
