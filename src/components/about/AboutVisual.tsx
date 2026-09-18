"use client";

import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "@/components/primitives/ReducedMotionProvider";
import { DeskSetupModel } from "./DeskSetupModel";

/**
 * Small, self-contained 3D desk still-life (laptop, coffee mug, game
 * controller, notebook+pen) sitting beside the About copy — replacing the
 * earlier padlock, which read as a metaphor for the client's job function
 * rather than something recognizably "him" (his own words: "It should be
 * me not a lock"). Purely decorative — the section's real content
 * (heading + both paragraphs) is plain server-rendered text that reads
 * correctly whether or not this canvas ever mounts; if it fails, the
 * section just has a blank patch next to the text, nothing essential is
 * lost.
 *
 * ── Full rebuild, third pass ──────────────────────────────────────────
 * Client, on the SECOND pass (which had already tried "more detail" and
 * "bigger/clearer click reactions"): "The animation in who I am are still
 * so bad ... They only get up on click and you cant do anything with them
 * 0 interaction." Two things needed fixing independently — the underlying
 * visual quality ("ugly"), and hover legibility ("0 interaction," despite
 * hover-lift-and-brighten already existing in the previous version, which
 * tells you that version's hover response was too subtle to register at
 * all). Hover's fix lives in DeskSetupModel (see its own "Hover feedback —
 * third-pass rebuild" comment). This file's contribution is the "ugly"
 * half — the lighting rig:
 *
 * Replaced entirely. The old setup was a flat ambient + two directionals
 * — functional, but the reason every material in the scene read as
 * flat/plasticky no matter how the objects themselves were built. Now: a
 * warm key light (the dominant modeling light, casting real
 * form-defining shadow/highlight contrast), a cool hemisphere light
 * (sky/ground gradient — the cheapest way to get an environment-map-like
 * ambient falloff without an actual HDRI, and this codebase deliberately
 * avoids HDRI environment maps elsewhere — see MedalModel's own comment
 * on why it keeps metalness modest with no env map available — so a
 * hemisphere light stays consistent with that established constraint
 * instead of introducing a new, network-dependent asset class), and two
 * low, colored rim/fill lights (mint from one side, violet from
 * below-behind) that kiss the far edges of the objects in this site's own
 * established accent tones rather than staying pure white — the same
 * "borrow the site's own hero-glow palette" instinct DeskSetupModel's
 * material comments already document, now extended to the lighting
 * itself.
 *
 * `@react-three/postprocessing` (an installed but, sitewide, unused
 * dependency) was tried here for a Bloom pass on the scene's emissive
 * elements and pulled back out — at this canvas's small render size and
 * with a transparent background, the default EffectComposer pipeline
 * crushed overall exposure and produced a solid black rendering artifact
 * over one object, confirmed by screenshotting several tuning attempts.
 * Not worth chasing further: every other glowing element in this
 * codebase (MedalModel's shine, ForgeBeaverModel's eye-shine,
 * JourneySpineModel's checkpoint bursts, and this file's own screen/LED/
 * steam/hover-halo emissives) already reads as "glowing" purely through
 * plain `emissive`/`emissiveIntensity` on MeshStandardMaterial, with no
 * post-processing pass anywhere else in the codebase — staying on that
 * same proven, dependency-free technique here keeps this piece
 * consistent with everything else instead of introducing new fragility
 * for a marginal gain over what emissive materials already deliver.
 *
 * Slightly larger than the old single-object canvas (a four-object
 * composition needs a bit more room than one padlock did to stay legible
 * at true render size) but kept close to the original footprint so the
 * text/visual balance in AboutSection's flex layout still holds.
 *
 * Fixed CSS dimensions reserve its space up front (same discipline as
 * ForgeBeaver/the hero canvas) so there's no layout shift while R3F
 * hydrates on the client.
 *
 * Pointer events are intentionally left enabled here (no
 * `pointer-events-none`) — each object in DeskSetupModel responds to
 * hover/click. It stays `aria-hidden` regardless: like every other small
 * 3D piece in this codebase, it's a mouse-hover/click flourish layered on
 * top of a complete resting scene, not a control anything depends on to
 * understand the section — the real content is the plain-text heading and
 * paragraphs beside it.
 */
export function AboutVisual() {
  const prefersReduced = useReducedMotion();

  return (
    <div className="h-60 w-60 shrink-0 sm:h-72 sm:w-72" aria-hidden="true">
      <Canvas
        camera={{ position: [0.4, 0.36, 3.75], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        frameloop={prefersReduced ? "demand" : "always"}
      >
        {/* Warm key light — the scene's dominant modeling light, giving
            every surface real highlight/shadow contrast instead of the
            flat, evenly-lit look the previous single-directional-plus-
            ambient rig produced. */}
        <directionalLight position={[2.3, 3.4, 2.7]} intensity={1.5} color="#fff2df" />
        {/* Hemisphere light — a cheap sky/ground gradient standing in for
            the environment-map fill this codebase deliberately doesn't
            use elsewhere (see MedalModel's comment on why); gives
            surfaces a soft ambient falloff instead of the previous flat
            ambientLight's uniform wash. */}
        <hemisphereLight args={["#eaf6f1", "#120f0b", 0.6]} />
        {/* Low ambient floor so nothing ever goes fully unlit. */}
        <ambientLight intensity={0.22} />
        {/* Mint rim/fill — this site's own "Engineer" hero-glow color,
            grazing the scene from the opposite side of the key light. */}
        <directionalLight position={[-2.4, 1.1, -1.6]} intensity={0.42} color="#35e8b8" />
        {/* Violet under-fill — this site's own "Founder" hero-glow color,
            kissing the underside/back of the objects for a second accent
            of color separation, new this pass. */}
        <directionalLight position={[-0.4, -1.8, 1.6]} intensity={0.3} color="#a85de8" />
        <DeskSetupModel animate={!prefersReduced} />
      </Canvas>
    </div>
  );
}
