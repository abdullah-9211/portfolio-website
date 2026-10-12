"use client";

import { useEffect, useRef, useState } from "react";
import { stops, trophies } from "@/data/campaign";
import { campaign, useCampaign } from "@/campaign/state/store";
import { useScroll } from "@/campaign/scroll/ScrollProvider";
import { WorldMap } from "@/campaign/map/WorldMap";
import { MAP_H, MAP_W } from "@/campaign/map/terrain";
import { sfx } from "@/campaign/audio/sfx";
import { useJourney } from "./useJourney";
import { Slate } from "./Slate";
import { Toasts } from "./Toasts";
import { TrophyGlyph } from "@/campaign/ui/glyphs";

const MINI_ZOOM = 0.46; // map units to pixels inside the minimap

/** The persistent game layer: location readout, menu buttons, minimap, toasts and the pause menu. */
export function Hud() {
  const scroll = useScroll();
  const open = useCampaign((s) => s.slateOpen);
  const earned = useCampaign((s) => s.trophies.length);
  const [stop, setStop] = useState(-1);
  const [visible, setVisible] = useState(false);
  const mini = useRef<HTMLDivElement>(null);
  const arrow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    campaign.load();
  }, []);

  useJourney((f) => {
    setStop((prev) => (prev === f.stop ? prev : f.stop));
    if (mini.current) {
      mini.current.style.transform = `translate3d(${(-f.x * MINI_ZOOM).toFixed(1)}px, ${(-f.y * MINI_ZOOM).toFixed(1)}px, 0)`;
    }
    if (arrow.current) arrow.current.style.transform = `rotate(${(f.heading + 90).toFixed(0)}deg)`;
  });

  // The HUD stays out of the title screen and arrives once the map has been drawn.
  useEffect(
    () =>
      scroll.subscribe((y, vh) => {
        const show = y > vh * 1.1;
        setVisible((prev) => (prev === show ? prev : show));
      }),
    [scroll],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (target?.closest("[data-game-active='true']")) return;
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggle(!campaign.get().slateOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const current = stop >= 0 ? stops[stop] : null;

  return (
    <>
      <header className="hud" data-visible={visible || open}>
        <a
          className="hud-sigil"
          href="#top"
          aria-label="Abdullah Umar, back to the title screen"
          onClick={(e) => {
            e.preventDefault();
            scroll.scrollTo(0);
          }}
        >
          AU
        </a>
        <p className="hud-location" aria-live="polite">
          {current ? (
            <>
              {current.numeral && <span className="hud-numeral">{current.numeral}</span>}
              <span>{current.label}</span>
            </>
          ) : (
            <span>Title screen</span>
          )}
        </p>
        <div className="hud-actions">
          <button
            type="button"
            className="hud-btn"
            onClick={() => toggle(true)}
            aria-label={`Trophies: ${earned} of ${trophies.length} earned. Open the menu.`}
          >
            <TrophyGlyph />
            <span className="tnum">
              {earned}/{trophies.length}
            </span>
          </button>
          <button type="button" className="hud-btn hud-btn-map" onClick={() => toggle(true)} aria-haspopup="dialog">
            <span>Map</span>
            <kbd className="keycap" aria-hidden="true">
              M
            </kbd>
          </button>
        </div>
      </header>

      <button
        type="button"
        className="minimap"
        data-visible={visible && !open && stop >= 0 && stop < stops.length - 1}
        onClick={() => toggle(true)}
        aria-label="Open the map"
        tabIndex={visible ? 0 : -1}
      >
        <div className="minimap-world" ref={mini} style={{ width: MAP_W * MINI_ZOOM, height: MAP_H * MINI_ZOOM }}>
          <WorldMap compact />
        </div>
        <div className="minimap-arrow" ref={arrow} aria-hidden="true">
          <svg viewBox="-10 -10 20 20" width="20" height="20">
            <path d="M0 -8 L6 7 L0 3 L-6 7Z" />
          </svg>
        </div>
      </button>

      <Toasts />
      <Slate />
    </>
  );
}

function toggle(open: boolean) {
  campaign.setSlate(open);
  if (open) sfx.open();
  else sfx.close();
}
