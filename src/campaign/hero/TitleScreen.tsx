"use client";

import { useEffect, useRef } from "react";
import { Act, useActProgress, ramp } from "@/campaign/scroll/Act";
import { useScroll } from "@/campaign/scroll/ScrollProvider";
import { useReducedMotion } from "@/components/primitives/ReducedMotionProvider";
import { contact } from "@/data/campaign";

const HERO = "/photos/hero";

/**
 * The title screen. A real photograph split into planes (sky, far ridges,
 * the name, the mountain, Abdullah, mist) that separate as the page
 * scrolls. Then a scan line sweeps down and redraws the same scene as the
 * contour map the rest of the story takes place on.
 */
export function TitleScreen() {
  return (
    <Act id="top" span={4.4} className="vista" labelledBy="title-name">
      <Vista />
    </Act>
  );
}

function Planes({ map }: { map?: boolean }) {
  const suffix = map ? "-map" : "";
  const priority = map ? "low" : "high";
  const ridge = `${HERO}/ridge${suffix}.webp`;
  return (
    <div className="vista-frame" aria-hidden="true">
      <div className="vista-plane vista-plane-ridge">
        {/* The mountain, with a mirrored copy on each side so the range runs
            edge to edge. A mirror meets its original seamlessly. */}
        <div className="vista-pano">
          {/* eslint-disable @next/next/no-img-element */}
          <img className="vista-pano-flip" src={ridge} alt="" width={1200} height={1600} decoding="async" />
          <img src={ridge} alt="" width={1200} height={1600} decoding="async" fetchPriority={priority} />
          <img className="vista-pano-flip" src={ridge} alt="" width={1200} height={1600} decoding="async" />
        </div>
      </div>
      <div className="vista-plane vista-plane-subject">
        <img
          src={`${HERO}/subject${suffix}.webp`}
          alt=""
          width={1200}
          height={1600}
          decoding="async"
          fetchPriority={priority}
        />
        {/* eslint-enable @next/next/no-img-element */}
      </div>
    </div>
  );
}

function Name({ id, outlined }: { id?: string; outlined?: boolean }) {
  // The outlined copy belongs to the map layer and is hidden from assistive tech.
  const Tag = outlined ? "p" : "h1";
  return (
    <Tag
      id={id}
      aria-hidden={outlined || undefined}
      className={`vista-name display-caps ${outlined ? "vista-name-outlined" : ""}`}
    >
      <span className="vista-name-first">Abdullah</span>
      <span className="vista-name-last">Umar</span>
    </Tag>
  );
}

function Vista() {
  const stage = useRef<HTMLDivElement>(null);
  const night = useRef<HTMLDivElement>(null);
  const scan = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const scroll = useScroll();

  useActProgress((p) => {
    const el = stage.current;
    if (!el) return;
    // Camera push while the title copy clears, then the scan.
    el.style.setProperty("--push", reduced ? "0" : ramp(p, 0, 0.36).toFixed(4));
    el.style.setProperty("--copy", (1 - ramp(p, 0.03, 0.16)).toFixed(3));
    const s = ramp(p, 0.3, 0.68);
    // The banner arrives once the scan is done and holds for a good stretch of scroll.
    el.style.setProperty("--settle", (ramp(p, 0.69, 0.75) * (1 - ramp(p, 0.95, 1))).toFixed(3));
    if (night.current) {
      night.current.style.clipPath = `inset(0 0 ${((1 - s) * 100).toFixed(2)}% 0)`;
      night.current.style.visibility = s > 0 ? "visible" : "hidden";
    }
    if (scan.current) {
      scan.current.style.transform = `translate3d(0, ${(s * 100).toFixed(2)}svh, 0)`;
      scan.current.style.opacity = s > 0.001 && s < 0.999 ? "1" : "0";
    }
    el.dataset.copy = p < 0.16 ? "on" : "off";
  });

  // The scene leans a little toward the pointer, the way a view shifts when you move your head.
  useEffect(() => {
    const el = stage.current;
    if (!el || reduced) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const tick = () => {
      x += (tx - x) * 0.07;
      y += (ty - y) * 0.07;
      el.style.setProperty("--mx", x.toFixed(4));
      el.style.setProperty("--my", y.toFixed(4));
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.002 ? requestAnimationFrame(tick) : 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <div ref={stage} className="vista-stage" data-copy="on">
      {/* Day: the photograph. */}
      <div className="vista-day">
        <div className="vista-sky" aria-hidden="true" />
        <div className="vista-depths" aria-hidden="true" />
        <Name id="title-name" />
        <Planes />
        <div className="vista-mist" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>

      {/* Night: the same scene as a map, revealed from the top by the scan. */}
      <div ref={night} className="vista-night" aria-hidden="true">
        <div className="vista-night-ground" />
        <Name outlined />
        <Planes map />
      </div>
      <div ref={scan} className="vista-scan" aria-hidden="true" />

      <div className="vista-floor" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />

      <div className="vista-copy">
        <p className="vista-tagline">
          Backend engineer at Veeam. Founder at Valkrix. Building both, on purpose.
        </p>
        <div className="vista-actions">
          <button type="button" className="btn btn-primary" onClick={() => scroll.scrollTo("world-map")}>
            Start the story
          </button>
          <a className="btn btn-ghost" href={contact.resume} download>
            Download resume
          </a>
        </div>
      </div>

      <p className="vista-banner banner" aria-hidden="true">
        <span>Map discovered</span>
      </p>
    </div>
  );
}
