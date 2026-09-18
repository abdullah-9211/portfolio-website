import type { Project } from "@/data/projects";
import { TechChip } from "@/components/skills/TechChip";
import { ProjectGlyph } from "./ProjectGlyph";

export function ProjectRow({ project }: { project: Project }) {
  return (
    <div className="grid gap-2 border-t border-line py-8 sm:grid-cols-[180px_1fr] sm:gap-8">
      <div className="font-mono text-xs text-dim">{project.range}</div>
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-display text-xl font-bold text-paper">
            {project.name}
          </h3>
          <ProjectGlyph name={project.name} />
        </div>
        <p className="mt-2 max-w-2xl leading-relaxed text-dim">
          {project.description}
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {project.tags.map((tag) => (
            <li key={tag.name}>
              <TechChip item={tag} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
