"use client";

import { useEffect, useRef } from "react";
import { contact, games, stops, trophies, type RegionId, regionById } from "@/data/campaign";
import { campaign, useCampaign } from "@/campaign/state/store";
import { useScroll } from "@/campaign/scroll/ScrollProvider";
import { WorldMap } from "@/campaign/map/WorldMap";
import { sfx } from "@/campaign/audio/sfx";
import { TrophyGlyph } from "@/campaign/ui/glyphs";

/** The pause menu: the map, fast travel, the games, trophies and settings. */
export function Slate() {
  const open = useCampaign((s) => s.slateOpen);
  const earned = useCampaign((s) => s.trophies);
  const discovered = useCampaign((s) => s.discovered);
  const sound = useCampaign((s) => s.sound);
  const ref = useRef<HTMLDialogElement>(null);
  const scroll = useScroll();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      scroll.lock(true);
    } else if (!open && dialog.open) {
      dialog.close();
    }
    if (!open) scroll.lock(false);
  }, [open, scroll]);

  const close = () => {
    if (campaign.get().slateOpen) sfx.close();
    campaign.setSlate(false);
  };

  const travel = (anchor: string) => {
    campaign.setSlate(false);
    // Let the dialog close and scrolling unlock before moving.
    requestAnimationFrame(() => scroll.scrollTo(anchor));
  };

  return (
    <dialog
      ref={ref}
      className="slate"
      aria-labelledby="slate-title"
      onClose={close}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="slate-panel">
        <div className="slate-head">
          <h2 id="slate-title" className="display-caps slate-title">
            Map
          </h2>
          <button type="button" className="btn btn-ghost slate-close" onClick={close}>
            Back to the story
            <kbd className="keycap" aria-hidden="true">
              Esc
            </kbd>
          </button>
        </div>

        <div className="slate-body">
          <div className="slate-map">
            <WorldMap onTravel={(id: RegionId) => travel(regionById[id].anchor)} title="Map of the story. Choose a marker to travel there." />
            <p className="slate-legend">
              <span className="legend-dot legend-ahead" /> Ahead
              <span className="legend-dot legend-found" /> Visited
              <span className="tnum slate-count">
                {discovered.length}/{stops.filter((s) => s.region).length} regions
              </span>
            </p>
          </div>

          <div className="slate-lists">
            <section aria-labelledby="slate-travel">
              <h3 id="slate-travel" className="slate-h">
                Travel
              </h3>
              <ul className="slate-travel">
                {stops.map((s) => (
                  <li key={s.anchor}>
                    <button type="button" onClick={() => travel(s.anchor)}>
                      <span className="slate-numeral">{s.numeral ?? ""}</span>
                      <span>{s.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="slate-play">
              <h3 id="slate-play" className="slate-h">
                Play
              </h3>
              <ul className="slate-games">
                {games.map((g) => (
                  <li key={g.anchor}>
                    <button type="button" onClick={() => travel(g.anchor)}>
                      <span className="slate-game-name">{g.name}</span>
                      <span className="slate-game-note">{g.note}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="slate-trophies">
              <h3 id="slate-trophies" className="slate-h">
                Trophies{" "}
                <span className="tnum slate-h-count">
                  {earned.length}/{trophies.length}
                </span>
              </h3>
              <ul className="slate-trophies">
                {trophies.map((t) => {
                  const has = earned.includes(t.id);
                  return (
                    <li key={t.id} data-earned={has}>
                      <TrophyGlyph />
                      <span>
                        <span className="slate-trophy-title">{t.title}</span>
                        <span className="slate-trophy-detail">{has ? t.detail : t.hint}</span>
                      </span>
                      <span className="sr-only">{has ? "Earned" : "Locked"}</span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section aria-labelledby="slate-settings" className="slate-settings">
              <h3 id="slate-settings" className="slate-h">
                Settings
              </h3>
              <div className="slate-row">
                <button
                  type="button"
                  className="switch"
                  role="switch"
                  aria-checked={sound}
                  onClick={() => {
                    campaign.setSound(!sound);
                    if (!sound) sfx.good();
                  }}
                >
                  <span className="switch-track" aria-hidden="true">
                    <span className="switch-thumb" />
                  </span>
                  Sound
                </button>
                <button
                  type="button"
                  className="slate-link"
                  onClick={() => campaign.reset()}
                  disabled={earned.length === 0 && discovered.length === 0}
                >
                  Clear saved progress
                </button>
              </div>
              <div className="slate-row slate-links">
                <a className="btn btn-primary" href={contact.resume} download>
                  Download resume
                </a>
                <a className="slate-link" href={`mailto:${contact.email}`}>
                  Email
                </a>
                <a className="slate-link" href={contact.linkedin} target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
                <a className="slate-link" href={contact.github} target="_blank" rel="noreferrer">
                  GitHub
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </dialog>
  );
}
