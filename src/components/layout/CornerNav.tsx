const CONTACT = {
  email: "abd.umar.1102@gmail.com",
  linkedin: "https://www.linkedin.com/in/abdullah-umar-166440219",
  github: "https://github.com/abdullah-9211",
};

export function CornerNav() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 flex items-center justify-between bg-void/70 px-5 py-4 font-mono text-xs tracking-wide backdrop-blur-sm sm:px-8 sm:py-6">
      <a href="#top" className="text-paper hover:text-signal transition-colors">
        AU.
      </a>
      <div className="flex items-center gap-4 text-dim sm:gap-6">
        <a
          href={`mailto:${CONTACT.email}`}
          className="hover:text-signal transition-colors"
        >
          MAIL
        </a>
        <a
          href={CONTACT.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-signal transition-colors"
        >
          LINKEDIN
        </a>
        <a
          href={CONTACT.github}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-signal transition-colors"
        >
          GITHUB
        </a>
      </div>
    </nav>
  );
}
