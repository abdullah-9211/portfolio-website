import { SectionHeading } from "@/components/primitives/SectionHeading";
import { ScrollReveal } from "@/components/primitives/ScrollReveal";
import { experienceRows } from "@/data/experience";
import { ExperienceRow } from "./ExperienceRow";
import { AcquisitionMoment } from "./AcquisitionMoment";
import { AccessConsole } from "./AccessConsole";

export function ExperienceSection() {
  const [veeam, securitiSde, securitiAssociate] = experienceRows;

  return (
    <section aria-labelledby="experience-heading" className="section-wash wash-experience py-20 sm:py-28">
      <ScrollReveal>
        <SectionHeading id="experience-heading" index="02" title="Where I've worked" />
      </ScrollReveal>

      {/* Each row (and the acquisition moment) reveals on its own as it
          scrolls into view — the section builds itself line by line
          rather than fading in as one block. This section no longer owns
          a private decorative rail: the old row-scoped CareerThread/
          CareerThreadModel has been retired and rebuilt as a full-page
          companion spanning every section (About through Contact), one
          checkpoint per section rather than per row — see
          src/components/journey-spine/JourneySpine.tsx, mounted once in
          app/page.tsx rather than here. */}
      <div>
        <ScrollReveal>
          <ExperienceRow row={veeam} />
        </ScrollReveal>
        <ScrollReveal>
          <AcquisitionMoment />
        </ScrollReveal>
        <ScrollReveal>
          <ExperienceRow row={securitiSde} />
        </ScrollReveal>
        <ScrollReveal>
          <ExperienceRow row={securitiAssociate} />
        </ScrollReveal>
      </div>

      {/* A second, separate interactive element (client ask: "something
          different too," confirmed to mean its own distinct addition, not
          more on the rail/ship). See AccessConsole.tsx. */}
      <ScrollReveal>
        <AccessConsole />
      </ScrollReveal>
    </section>
  );
}
