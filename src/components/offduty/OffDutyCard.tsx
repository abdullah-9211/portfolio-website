"use client";

import clsx from "clsx";
import type { ReactElement } from "react";
import type { OffDutyCard as OffDutyCardType } from "@/data/offduty";
import { CoffeeRosetta } from "./CoffeeRosetta";
import { GamingPlatformMarks } from "./GamingPlatformMarks";
import { BasketballAnimation } from "./BasketballAnimation";
import { RunningAnimation } from "./RunningAnimation";
import { useCardAnimation } from "./useCardAnimation";

type IllustrationProps = { className?: string; animate: boolean; revealed: boolean };

const ILLUSTRATIONS: Record<OffDutyCardType["id"], (props: IllustrationProps) => ReactElement> = {
  basketball: BasketballAnimation,
  gaming: GamingPlatformMarks,
  coffee: CoffeeRosetta,
  running: RunningAnimation,
};

/**
 * Every card's illustration auto-plays once the first time it scrolls into
 * view, then replays on every click (or Enter/Space) after that — the
 * whole card is the click target, mirroring AcquisitionMoment.tsx's
 * confetti pattern. The scroll/click/reduced-motion wiring lives once,
 * centrally, in useCardAnimation, rather than duplicated across four
 * illustration components.
 */
export function OffDutyCard({ card }: { card: OffDutyCardType }) {
  const { ref, animate, revealed, handleClick, handleKeyDown } = useCardAnimation();
  const Illustration = ILLUSTRATIONS[card.id];

  return (
    <div
      ref={ref}
      id={card.id}
      role="button"
      tabIndex={0}
      aria-label={`Replay the ${card.headline} animation`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={clsx(
        "offduty-card cursor-pointer overflow-hidden rounded-card border p-7 outline-none sm:p-8",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-4",
        card.cardClassName
      )}
    >
      {/* Full-bleed illustration banner — much bigger stage than the old
          h-12 corner icon, per the client's explicit "make all these
          bigger in size a lot bigger they're tiny" feedback. Negative
          margins cancel the card's own padding so the illustration bleeds
          to the card's edges; the card's own overflow-hidden clips it to
          the rounded corners rather than needing separate radius math. */}
      <div className="offduty-illustration-banner -mx-7 -mt-7 mb-5 h-40 sm:-mx-8 sm:-mt-8 sm:mb-6 sm:h-52">
        <Illustration className="offduty-icon h-full w-full" animate={animate} revealed={revealed} />
      </div>
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-xs uppercase tracking-widest text-dim">
          {card.label}
        </span>
      </div>
      <h3 className="font-display mt-4 text-xl font-bold text-paper">
        {card.headline}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-dim">{card.body}</p>
      <div className="mt-5 border-t border-line/60 pt-4">
        <p className="font-mono text-xs text-dim">{card.detail}</p>
        {card.href && (
          <a
            href={card.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="relative z-10 mt-2 inline-block font-mono text-xs text-signal hover:underline"
          >
            {card.linkLabel}
          </a>
        )}
      </div>
    </div>
  );
}
