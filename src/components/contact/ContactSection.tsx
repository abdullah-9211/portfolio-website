import { GradientText } from "@/components/primitives/GradientText";
import { ScrollReveal } from "@/components/primitives/ScrollReveal";
import { JourneyVisual } from "./JourneyVisual";

const CONTACT = {
  email: "abd.umar.1102@gmail.com",
  phone: "+92 312 2166999",
};

export function ContactSection() {
  return (
    <section
      aria-labelledby="contact-heading"
      // Top padding (nav-clearance side) is unchanged from the original
      // py-24/sm:py-32. Bottom padding is trimmed from that same 96/128px
      // down to 64/80px: this is the very last section on the page, so
      // there's nothing below it to fill out a full viewport — at typical
      // laptop viewport heights, scrolling all the way to the document's
      // true end pushed the journey canvas partway above the viewport top
      // simply because too much whitespace sat after it. Trimming the
      // padding that's actually causing that (bottom, not top) closes
      // most of that gap without touching the nav-clearance padding this
      // client feedback isn't about.
      className="section-wash wash-contact border-t border-line pt-24 pb-16 text-center sm:pt-32 sm:pb-20"
    >
      <ScrollReveal>
        <JourneyVisual className="mb-8 sm:mb-10" />
        <p className="font-mono text-xs uppercase tracking-widest text-dim">
          09 — Let&apos;s talk
        </p>
        <h2
          id="contact-heading"
          className="font-display mt-4 text-6xl font-extrabold leading-none tracking-tight sm:text-8xl scroll-mt-24"
        >
          LET&apos;S
          <br />
          <GradientText>BUILD.</GradientText>
        </h2>
        <p className="mx-auto mt-6 max-w-md text-paper">
          You&apos;ve reached the end of the page. Let&apos;s make sure it
          isn&apos;t the end of the conversation.
        </p>
        <p className="mx-auto mt-3 max-w-md text-dim">
          Open to interesting problems, ambitious teams, and anyone who wants
          to talk shop.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a
            href={`mailto:${CONTACT.email}`}
            className="rounded-full border border-line px-6 py-3 font-mono text-sm text-paper hover:border-signal hover:text-signal transition-colors"
          >
            {CONTACT.email}
          </a>
          <a
            href={`tel:${CONTACT.phone.replace(/\s+/g, "")}`}
            className="rounded-full border border-line px-6 py-3 font-mono text-sm text-paper hover:border-signal hover:text-signal transition-colors"
          >
            {CONTACT.phone}
          </a>
        </div>
        <p className="mt-12 font-mono text-xs text-dim">
          Islamabad, Pakistan
        </p>
      </ScrollReveal>
    </section>
  );
}
