"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type GameFrameProps = {
  id: string;
  /** Which trial this is, as a numeral. */
  numeral: string;
  title: string;
  /** Live numbers shown inside the stage while playing. */
  stats?: ReactNode;
  /** One sentence tying the game to the real work behind it. */
  basedOn: string;
  /** True while a round is running. Page shortcuts stand down. */
  active: boolean;
  /** Called when the game leaves or re-enters the viewport, so it can pause. */
  onVisible?: (visible: boolean) => void;
  className?: string;
  children: ReactNode;
};

/**
 * A trial. The name and what it is based on sit in the page like any other
 * heading, and the playfield below is an open stage marked out by four
 * corner brackets instead of a boxed panel.
 */
export function GameFrame({ id, numeral, title, stats, basedOn, active, onVisible, className, children }: GameFrameProps) {
  const ref = useRef<HTMLElement>(null);
  const cb = useRef(onVisible);
  // A round left running off screen must not keep the page's HUD and shortcuts stood down.
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    cb.current = onVisible;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        setOnScreen(visible);
        cb.current?.(visible);
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <figure ref={ref} id={id} className={`game ${className ?? ""}`} data-game-active={active && onScreen} aria-label={`${title}, a playable game`}>
      <figcaption className="game-head">
        <p className="game-kicker">
          <span className="game-numeral display">{numeral}</span>
          Trial {numeral} of III
        </p>
        <p className="game-title display">{title}</p>
        <p className="game-based">{basedOn}</p>
      </figcaption>
      <div className="game-stage">
        {children}
        {stats && (
          <div className="game-stats tnum" aria-live="off">
            {stats}
          </div>
        )}
        <span className="game-corner game-corner-tl" aria-hidden="true" />
        <span className="game-corner game-corner-tr" aria-hidden="true" />
        <span className="game-corner game-corner-bl" aria-hidden="true" />
        <span className="game-corner game-corner-br" aria-hidden="true" />
      </div>
    </figure>
  );
}

type GameCardProps = {
  title: string;
  children: ReactNode;
  /** How to play, in one line. */
  hint?: string;
  actions: ReactNode;
  tone?: "intro" | "win" | "lose";
};

/**
 * What is laid over the stage before a round and after it. Before: a
 * briefing tablet down the left edge, with the playfield still visible
 * beside it. After: a banner across the stage and the numbers under it.
 */
export function GameCard({ title, children, hint, actions, tone = "intro" }: GameCardProps) {
  if (tone === "intro") {
    return (
      <div className="game-brief" role="group" aria-label={title}>
        <div className="game-brief-inner">
          <p className="game-brief-title display">{title}</p>
          <div className="game-brief-body">{children}</div>
          {hint && <p className="game-brief-hint">{hint}</p>}
          <div className="game-brief-actions">{actions}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="game-result" data-tone={tone} role="group" aria-label={title}>
      <p className="banner game-result-banner">
        <span>{title}</span>
      </p>
      <div className="game-result-body">
        {children}
        <div className="game-brief-actions">{actions}</div>
      </div>
    </div>
  );
}
