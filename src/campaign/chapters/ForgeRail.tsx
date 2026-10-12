"use client";

import { useRef } from "react";
import Image from "next/image";
import { Act, useActProgress } from "@/campaign/scroll/Act";
import { useReducedMotion } from "@/components/primitives/ReducedMotionProvider";

const photos = [
  {
    src: "/photos/forge/floor.webp",
    alt: "The main floor of The Forge with people working at long shared desks.",
    w: 1600,
    h: 900,
    caption: "The floor, on a working day",
  },
  {
    src: "/photos/forge/desks.webp",
    alt: "Rows of desks and black office chairs under a mural of a beaver swinging a hammer.",
    w: 1600,
    h: 1066,
    caption: "Desks, under the mural",
  },
  {
    src: "/photos/forge/cafe.webp",
    alt: "A corner with round tables and wooden chairs under a sign reading The Beaver Cafe.",
    w: 1200,
    h: 1600,
    caption: "The Beaver Cafe",
  },
];

/** A walk through the space: vertical scroll moves the photographs sideways. */
export function ForgeRail() {
  return (
    <Act span={3.4} className="rail" labelledBy="forge-rail">
      <RailStage />
    </Act>
  );
}

function RailStage() {
  const track = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useActProgress((p) => {
    const el = track.current;
    if (!el || reduced) return;
    const overflow = Math.max(el.scrollWidth - window.innerWidth, 0);
    el.style.transform = `translate3d(${(-overflow * p).toFixed(1)}px, 0, 0)`;
  });

  return (
    <div className={`rail-stage ${reduced ? "rail-static" : ""}`}>
      <div ref={track} className="rail-track">
        <div className="rail-lead">
          <h3 id="forge-rail" className="display h-big">
            Come in.
          </h3>
          <p className="body">First floor, east side, Shauq 8 Plaza on Jinnah Boulevard.</p>
        </div>
        {photos.map((ph) => (
          <figure key={ph.src} className="rail-item" style={{ aspectRatio: `${ph.w} / ${ph.h}` }}>
            <Image src={ph.src} alt={ph.alt} width={ph.w} height={ph.h} sizes="(min-width: 900px) 60vw, 86vw" />
            <figcaption className="photo-caption">{ph.caption}</figcaption>
          </figure>
        ))}
        <div className="rail-tail">
          <p className="display h-section">Pull up a chair.</p>
          <a className="btn btn-primary" href="https://theforge.pk" target="_blank" rel="noreferrer">
            Book a desk
          </a>
        </div>
      </div>
    </div>
  );
}
