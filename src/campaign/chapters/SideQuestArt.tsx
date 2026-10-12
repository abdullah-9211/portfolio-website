"use client";

import { ShaderScene } from "@/campaign/scenes/ShaderScene";
import { ERDTREE } from "@/campaign/scenes/erdtree";
import { VISTA } from "@/campaign/scenes/vista";
import { LinkFigure } from "@/campaign/scenes/LinkFigure";

/**
 * Drawings for the side quests. Every one of them is driven by `--q`, the
 * progress through its quest's stretch of scroll, set on the panel that
 * contains it. The two game scenes are shaders; the rest is plain SVG.
 */

/**
 * Two worlds, each a live shader with its land marched in 3D: a rider
 * before a colossal golden tree in the fog, and a hero in a blue tunic
 * looking out over an open kingdom at dawn. Homages, drawn from scratch.
 */
export function GameScenes() {
  return (
    <div className="scenes">
      <p className="sr-only">On PS5, games like Elden Ring. On Switch, Zelda.</p>
      <figure className="scene scene-ps5" data-scene aria-hidden="true">
        <ShaderScene fragment={ERDTREE} />
        <figcaption>
          <span className="scene-platform display-caps">PS5</span>
          <span className="scene-line">Worlds that do not explain themselves.</span>
        </figcaption>
      </figure>
      <figure className="scene scene-switch" data-scene aria-hidden="true">
        <ShaderScene fragment={VISTA} />
        <LinkFigure />
        <figcaption>
          <span className="scene-platform display-caps">Switch</span>
          <span className="scene-line">And ones where you can walk to anything you can see.</span>
        </figcaption>
      </figure>
    </div>
  );
}

/** A track, a runner, and the distance. The runner laps as you scroll. */
export function RunTrack() {
  return (
    <svg className="track" viewBox="0 0 560 300" aria-hidden="true">
      <rect className="track-lane" x="20" y="30" width="520" height="240" rx="120" />
      <rect className="track-lane" x="50" y="60" width="460" height="180" rx="90" />
      <rect className="track-lane track-lane-inner" x="80" y="90" width="400" height="120" rx="60" />
      <path id="track-path" className="track-path" d="M155 45 H405 A105 105 0 0 1 405 255 H155 A105 105 0 0 1 155 45Z" pathLength={1} />
      <path className="track-run" d="M155 45 H405 A105 105 0 0 1 405 255 H155 A105 105 0 0 1 155 45Z" pathLength={1} />
      <circle className="track-runner" r="9" />
      <line className="track-start" x1="155" y1="30" x2="155" y2="62" />
    </svg>
  );
}
