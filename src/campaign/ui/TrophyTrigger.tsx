"use client";

import { useEffect, useRef } from "react";
import { trophyById, type TrophyId } from "@/data/campaign";
import { campaign } from "@/campaign/state/store";
import { sfx } from "@/campaign/audio/sfx";

/** Awards a story trophy the first time this point of the page is read. */
export function TrophyTrigger({ id }: { id: TrophyId }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        const t = trophyById[id];
        if (campaign.award(id, t.title, t.detail)) sfx.trophy();
        io.disconnect();
      },
      { rootMargin: "0px 0px -35% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [id]);

  return <span ref={ref} className="trophy-trigger" aria-hidden="true" />;
}

export function awardTrophy(id: TrophyId) {
  const t = trophyById[id];
  if (campaign.award(id, t.title, t.detail)) sfx.trophy();
}
