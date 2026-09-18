import { SectionHeading } from "@/components/primitives/SectionHeading";
import { ScrollReveal } from "@/components/primitives/ScrollReveal";
import { skillsRowOne, skillsRowTwo } from "@/data/skills";
import { MarqueeRow } from "./MarqueeRow";

export function SkillsSection() {
  return (
    <section aria-labelledby="skills-heading" className="section-wash wash-skills py-20 sm:py-28">
      <ScrollReveal>
        <SectionHeading id="skills-heading" index="05" title="Stack" />
        <div className="flex flex-col gap-3">
          <MarqueeRow items={skillsRowOne} />
          <MarqueeRow items={skillsRowTwo} reverse />
        </div>
      </ScrollReveal>
    </section>
  );
}
