"use client";

import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "@/components/primitives/ReducedMotionProvider";
import { ValkrixNeuralNetModel } from "./ValkrixNeuralNetModel";

/**
 * Small, self-contained 3D neural network illustration mounted inside the
 * Valkrix card, as a normal flow element beside the card's href link —
 * see VentureCard.tsx and ForgeBeaver.tsx (same slot, same pattern, sized
 * identically so both cards keep the same composition weight). Purely
 * decorative; if this fails to mount the row just has blank space where
 * it would sit, nothing else breaks.
 *
 * Sized up from the original 80–96px per client feedback ("make it bigger
 * and a little interactive") — 112–144px keeps it comfortably inside the
 * card's bottom row next to the href link at every width from 320px up
 * (that row is `flex flex-wrap`, so even in an unexpectedly tight
 * container the badge drops to its own line rather than overlapping the
 * link — see VentureCard.tsx). Node/edge geometry in
 * ValkrixNeuralNetModel is untouched by this resize: it's defined in
 * model-space units, not pixels, so the larger canvas renders the exact
 * same lattice at higher resolution instead of upscaling a blurrier one.
 *
 * `pointer-events-none` is dropped (unlike the original static badge) so
 * the model's per-node hover/click handlers can receive events — same
 * opt-in AboutVisual.tsx already documents for DeskSetupModel. Still
 * `aria-hidden`: this is a mouse-hover flourish on a complete resting
 * diagram, not content anything depends on.
 */
export function ValkrixNeuralNet() {
  const prefersReduced = useReducedMotion();

  return (
    <div className="h-28 w-28 shrink-0 sm:h-36 sm:w-36" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 2.4], fov: 32 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        frameloop={prefersReduced ? "demand" : "always"}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[1.5, 1.5, 2]} intensity={1.2} color="#a85de8" />
        <ValkrixNeuralNetModel animate={!prefersReduced} />
      </Canvas>
    </div>
  );
}
