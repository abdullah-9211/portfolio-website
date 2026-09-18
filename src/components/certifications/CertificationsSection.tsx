import { SectionHeading } from "@/components/primitives/SectionHeading";
import { HairlineCard } from "@/components/primitives/HairlineCard";
import { ScrollReveal } from "@/components/primitives/ScrollReveal";
import { certifications } from "@/data/certifications";
import { CertificationItem } from "./CertificationItem";
import { VerifiedSeal } from "./VerifiedSeal";
import { VerifiedRibbon } from "./VerifiedRibbon";

export function CertificationsSection() {
  return (
    <section aria-labelledby="certifications-heading" className="section-wash wash-certifications py-20 sm:py-28">
      <ScrollReveal>
        <SectionHeading id="certifications-heading" index="06" title="Proof" />
        <HairlineCard className="relative overflow-hidden">
          <VerifiedRibbon />
          <div className="flex items-center gap-4 pr-14 sm:pr-0">
            <VerifiedSeal className="h-11 w-11 sm:h-12 sm:w-12" />
            <p className="min-w-0 text-paper">
              <span className="font-display text-3xl font-bold text-signal">
                {certifications.length}
              </span>{" "}
              verified credentials across Coursera &amp; Udemy.
            </p>
          </div>
          <ul className="mt-2">
            {certifications.map((cert) => (
              <CertificationItem key={cert.name} cert={cert} />
            ))}
          </ul>
        </HairlineCard>
      </ScrollReveal>
    </section>
  );
}
