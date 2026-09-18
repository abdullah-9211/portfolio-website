import { Hero } from "@/components/hero/Hero";
import { AboutSection } from "@/components/about/AboutSection";
import { ExperienceSection } from "@/components/experience/ExperienceSection";
import { VenturesSection } from "@/components/ventures/VenturesSection";
import { ProjectsSection } from "@/components/projects/ProjectsSection";
import { SkillsSection } from "@/components/skills/SkillsSection";
import { CertificationsSection } from "@/components/certifications/CertificationsSection";
import { EducationSection } from "@/components/education/EducationSection";
import { OffDutySection } from "@/components/offduty/OffDutySection";
import { ContactSection } from "@/components/contact/ContactSection";
import { JourneySpine } from "@/components/journey-spine/JourneySpine";

export default function Home() {
  return (
    <>
      <Hero />
      <main className="mx-auto max-w-4xl px-5 sm:px-8">
        <AboutSection />
        <ExperienceSection />
        <VenturesSection />
        <ProjectsSection />
        <SkillsSection />
        <CertificationsSection />
        <EducationSection />
        <OffDutySection />
      </main>
      <ContactSection />
      {/* Full-page traveling companion — spans the whole About→Contact
          scroll range with one checkpoint per section (see
          journey-spine/JourneySpine.tsx for the full architecture note).
          Mounted once here rather than inside any one section, since it
          is no longer scoped to Experience. `position: fixed` internally,
          so its placement in this tree only matters for stacking order —
          it renders after (so visually atop, before z-index) real content
          but stays below CornerNav's z-50 via its own z-20. */}
      <JourneySpine />
    </>
  );
}
