import { SectionHeading } from "@/components/primitives/SectionHeading";
import { ScrollReveal } from "@/components/primitives/ScrollReveal";
import { projects } from "@/data/projects";
import { ProjectRow } from "./ProjectRow";
import { EarthPlaytest } from "./EarthPlaytest";

export function ProjectsSection() {
  return (
    <section aria-labelledby="projects-heading" className="section-wash wash-projects py-20 sm:py-28">
      <ScrollReveal>
        <SectionHeading id="projects-heading" index="04" title="For fun" />
        {projects.map((project) => (
          <ProjectRow key={project.name} project={project} />
        ))}
        {/* Fills the empty space below the three rows — client ask: "something
            animated and interactive below the data space as well." See
            EarthPlaytest.tsx for why this is a playable riff on What On Earth
            specifically, not a generic addition. */}
        <EarthPlaytest />
      </ScrollReveal>
    </section>
  );
}
