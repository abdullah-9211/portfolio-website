"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "@/components/primitives/ReducedMotionProvider";
import { sfx } from "@/campaign/audio/sfx";

const BeaverScene = dynamic(() => import("@/campaign/ui/BeaverScene"), { ssr: false });

const EMBERS = Array.from({ length: 14 }, (_, i) => i);

/**
 * The Forge's mascot. The artwork is given depth and firelight, so it
 * turns toward the pointer, and a click is a hammer strike that throws
 * sparks.
 */
export function ForgeMascot() {
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const strike = useRef(0);
  const [near, setNear] = useState(false);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => setNear(entries.some((e) => e.isIntersecting)), { rootMargin: "50% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const hit = () => {
    strike.current = 1;
    setBurst((n) => n + 1);
    sfx.tick();
  };

  return (
    <div className="mascot">
      <div ref={root} className="mascot-stage">
        <div className="mascot-glow" aria-hidden="true" />
        <div className="mascot-embers" aria-hidden="true">
          {EMBERS.map((i) => (
            <span key={i} style={{ "--i": i } as React.CSSProperties} />
          ))}
        </div>
        {/* The plain image is always there: it is the fallback and the first paint. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="mascot-still" src="/photos/forge/beaver.webp" alt="The Forge's mascot: a beaver in goggles and a leather apron, arms crossed, with a hammer at its hip." width={1028} height={1600} loading="lazy" data-hidden={near && !reduced} />
        {near && !reduced && (
          <div className="mascot-live" aria-hidden="true">
            <BeaverScene animate strike={strike} />
          </div>
        )}
        {burst > 0 && (
          <div className="mascot-burst" key={burst} aria-hidden="true">
            {EMBERS.map((i) => (
              <span key={i} style={{ "--i": i } as React.CSSProperties} />
            ))}
          </div>
        )}
        <button type="button" className="mascot-hit" onClick={hit} aria-label="Strike the hammer" />
      </div>
      <p className="visual-note">The house mascot. Move around it, and click for a hammer strike.</p>
    </div>
  );
}
