import { SectionHeading } from "@/components/primitives/SectionHeading";
import { ScrollReveal } from "@/components/primitives/ScrollReveal";
import { offDutyCards } from "@/data/offduty";
import { OffDutyCard } from "./OffDutyCard";

export function OffDutySection() {
  return (
    <section aria-labelledby="offduty-heading" className="section-wash wash-offduty py-20 sm:py-28">
      <ScrollReveal>
        <SectionHeading
          id="offduty-heading"
          index="08"
          title="Off duty"
          lead="Away from the professional side of things, this is who I am."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {offDutyCards.map((card) => (
            <OffDutyCard key={card.id} card={card} />
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
