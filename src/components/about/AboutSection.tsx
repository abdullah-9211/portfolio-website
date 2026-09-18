import { SectionHeading } from "@/components/primitives/SectionHeading";
import { ScrollReveal } from "@/components/primitives/ScrollReveal";
import { AboutVisual } from "./AboutVisual";

export function AboutSection() {
  return (
    <section aria-labelledby="about-heading" className="section-wash wash-about py-20 sm:py-28">
      <ScrollReveal>
        <SectionHeading id="about-heading" index="01" title="Who I am" />
        <div className="flex flex-col-reverse items-center gap-10 lg:flex-row lg:items-center lg:gap-14">
          <div className="lg:flex-1">
            <p className="font-display text-2xl font-semibold leading-snug text-paper sm:text-3xl">
              I&apos;m a software engineer who ended up running a company.
            </p>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-dim">
              At Veeam, I build the systems that decide who gets to touch what:
              Access Control, File Policies, Systems at scale and a lot more. At
              Valkrix, the studio I co-founded with 2 other ambitious
              individuals, I get to make those same calls for other people&apos;s
              businesses. Most days I&apos;m doing both from The Forge, the
              co-working space we built because Islamabad needed one.
            </p>
          </div>
          <AboutVisual />
        </div>
      </ScrollReveal>
    </section>
  );
}
