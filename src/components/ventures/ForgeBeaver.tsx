"use client";

import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "@/components/primitives/ReducedMotionProvider";
import { ForgeBeaverModel } from "./ForgeBeaverModel";

/**
 * Small, self-contained 3D beaver mounted inside the Forge card, as a
 * normal flow element beside the card's href link (not an absolute
 * overlay) — see VentureCard.tsx. That placement means it can never
 * overlap the fact chips or any other text, at any viewport, by
 * construction: it participates in layout instead of floating over it.
 * Purely decorative — the card's real content (logo, copy, facts, link)
 * all render normally without it; if this fails to mount for any reason
 * the row just has a blank space where it would sit, nothing breaks.
 *
 * Camera: previously fov 24 / distance 3.6 / eye-level y=0, tuned so the
 * WHOLE head — both ears, both eyes, snout, teeth — fit inside the frame
 * with margin as a tight head-only crop. Pulled back again (fov 27,
 * distance 4.6) for the goggles/apron/crossed-arms redesign
 * (ForgeBeaverModel) — those accessories live from the forehead down to
 * the lower chest, well outside that old head-only crop, so the frame
 * needed enough vertical room to include them. Paired with raising the
 * model's own resting offset (BASE_Y in ForgeBeaverModel, -0.42 → -0.16)
 * rather than pulling back alone: shifting the character UP within the
 * frame brings the torso into view without needing as large a pull-back
 * on distance by itself, which would have shrunk the head more than
 * necessary. The head stays the largest, most central element — this is
 * still fundamentally a face badge, not a full character shot. Verified
 * against the model's actual mesh bounds and confirmed by screenshotting
 * the canvas at its true on-card size, not zoomed in.
 *
 * Sized up from the original 80–96px per client feedback ("make it
 * bigger... make the beaver a little more defined") — 112–144px, same
 * footprint as ValkrixNeuralNet so both cards keep equal composition
 * weight, and big enough for the new mouth/whisker/brow detail
 * (ForgeBeaverModel) to actually register instead of smearing into a
 * blob.
 *
 * `pointer-events-none` is dropped so the model can receive the
 * click-to-smile and drag-to-rotate interactions the client asked for
 * (see ForgeBeaverModel) — same opt-in AboutVisual.tsx documents for
 * DeskSetupModel. Still `aria-hidden`: purely a mouse/touch flourish on
 * top of a complete resting scene, nothing here is required to
 * understand the card.
 */
export function ForgeBeaver() {
  const prefersReduced = useReducedMotion();

  return (
    <div className="h-28 w-28 shrink-0 sm:h-36 sm:w-36" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 4.6], fov: 27 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        frameloop={prefersReduced ? "demand" : "always"}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[2, 3, 3]} intensity={1.1} />
        <directionalLight position={[-2, -1, -2]} intensity={0.3} color="#c9a227" />
        <ForgeBeaverModel animate={!prefersReduced} />
      </Canvas>
    </div>
  );
}
