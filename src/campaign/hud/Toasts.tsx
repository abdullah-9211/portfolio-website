"use client";

import { useCampaign } from "@/campaign/state/store";
import { TrophyGlyph } from "@/campaign/ui/glyphs";

/** Announcements for discoveries and trophies, stacked at the bottom left. */
export function Toasts() {
  const toasts = useCampaign((s) => s.toasts);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast" data-kind={t.kind}>
          <span className="toast-icon" aria-hidden="true">
            {t.kind === "trophy" ? (
              <TrophyGlyph />
            ) : (
              <svg viewBox="0 0 20 20" width="16" height="16">
                <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="10" cy="10" r="2.5" fill="currentColor" />
              </svg>
            )}
          </span>
          <span className="toast-text">
            <span className="toast-kicker">{t.kind === "trophy" ? "Trophy earned" : "Region discovered"}</span>
            <span className="toast-title">{t.title}</span>
            <span className="toast-detail">{t.detail}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
