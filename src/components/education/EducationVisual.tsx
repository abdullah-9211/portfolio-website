"use client";

import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "@/components/primitives/ReducedMotionProvider";
import { MedalModel } from "./MedalModel";

/**
 * The Education section's visual centerpiece — a large silver medal on a
 * ribbon, slowly turning above eight lit pillars (one per semester of
 * the degree). Per the client's explicit ask ("add something major...
 * its too empty"), this is deliberately the biggest 3D element on the
 * page: bigger than AboutVisual's desk still-life (h-60/72 → here
 * h-64/80/96) and given its own dedicated box in the layout rather than
 * a small corner badge, because this was the one section called out by
 * name as needing real visual weight.
 *
 * Purely decorative — the section's real content (university, degree,
 * dates, all three achievement chips) is plain server-rendered text in
 * EducationSection that reads correctly with or without this canvas ever
 * mounting. Fixed CSS dimensions reserve its space up front, same
 * discipline as every other Canvas on this site, so there's no layout
 * shift while R3F hydrates and no broken-looking gap if it never does.
 *
 * `pointer-events-none` is dropped so the medal can receive the
 * drag-to-rotate and click-to-shine interactions the client asked for
 * ("make it interactive and rotatable") — see MedalModel. Same opt-in
 * AboutVisual.tsx/ForgeBeaver.tsx document for their own models. Still
 * `aria-hidden`: a mouse/touch flourish on a complete resting scene, not
 * something any content here depends on.
 */
export function EducationVisual() {
  const prefersReduced = useReducedMotion();

  return (
    <div
      className="mx-auto h-64 w-64 shrink-0 sm:h-80 sm:w-80 lg:mx-0 lg:h-96 lg:w-96"
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 32 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        frameloop={prefersReduced ? "demand" : "always"}
      >
        {/* Ambient trimmed slightly and the key light raised (was
            0.85/1.7) — more contrast between highlight and shadow reads
            as "more defined/polished" alongside MedalModel's tightened
            specular (lower roughness), without needing an environment
            map. Fill lights unchanged. */}
        <ambientLight intensity={0.78} />
        <directionalLight position={[3, 4, 5]} intensity={1.9} />
        <directionalLight position={[-3, -1, -3]} intensity={0.55} color="#35e8b8" />
        <directionalLight position={[0, -2, -4]} intensity={0.35} color="#f5f3ee" />
        <MedalModel animate={!prefersReduced} />
      </Canvas>
    </div>
  );
}
