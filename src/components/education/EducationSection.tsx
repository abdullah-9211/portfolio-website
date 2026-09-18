import { SectionHeading } from "@/components/primitives/SectionHeading";
import { ScrollReveal } from "@/components/primitives/ScrollReveal";
import { ChipList } from "@/components/primitives/ChipList";
import { EducationVisual } from "./EducationVisual";

export function EducationSection() {
  return (
    <section aria-labelledby="education-heading" className="section-wash wash-education py-20 sm:py-28">
      <ScrollReveal>
        <SectionHeading id="education-heading" index="07" title="School" />
        <div className="flex flex-col-reverse items-center gap-10 lg:flex-row lg:items-center lg:gap-14">
          <div className="lg:flex-1">
            <h3 className="font-display text-xl font-bold text-paper">
              FAST NUCES, Islamabad
            </h3>
            <p className="mt-1 font-mono text-sm text-dim">
              Bachelor in Computer Science — Aug 2020 — Aug 2024
            </p>
            <ChipList
              className="mt-4"
              items={["CGPA 3.70", "Silver Medal, Fall '21", "Dean's List every semester"]}
            />
          </div>
          <EducationVisual />
        </div>
      </ScrollReveal>
    </section>
  );
}
