import { SectionHeading } from "@/components/primitives/SectionHeading";
import { ScrollReveal } from "@/components/primitives/ScrollReveal";
import { ventures } from "@/data/ventures";
import { VentureCard } from "./VentureCard";

export function VenturesSection() {
  return (
    <section aria-labelledby="ventures-heading" className="section-wash wash-ventures py-20 sm:py-28">
      <ScrollReveal>
        <SectionHeading id="ventures-heading" index="03" title="What I've built" />
        <div className="grid gap-6 sm:grid-cols-2">
          {ventures.map((venture) => (
            <VentureCard key={venture.id} venture={venture} />
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
