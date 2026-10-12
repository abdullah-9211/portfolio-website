"use client";

import { useSyncExternalStore } from "react";
import type { RegionId, TrophyId } from "@/data/campaign";

export type Toast = {
  id: number;
  kind: "region" | "trophy";
  title: string;
  detail: string;
};

type State = {
  /** Region the reader is currently inside. */
  region: RegionId | null;
  discovered: RegionId[];
  trophies: TrophyId[];
  sound: boolean;
  slateOpen: boolean;
  toasts: Toast[];
};

const SAVE_KEY = "au-campaign-save-v1";

let state: State = {
  region: null,
  discovered: [],
  trophies: [],
  sound: false,
  slateOpen: false,
  toasts: [],
};

const listeners = new Set<() => void>();
let toastId = 0;
let loaded = false;

function emit() {
  listeners.forEach((fn) => fn());
}

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  emit();
}

function persist() {
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ discovered: state.discovered, trophies: state.trophies, sound: state.sound }),
    );
  } catch {
    // Private mode or storage disabled: the campaign still works, it just won't remember.
  }
}

export const campaign = {
  /** Read the saved game once on the client. */
  load() {
    if (loaded) return;
    loaded = true;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<State>;
      set({
        discovered: Array.isArray(saved.discovered) ? saved.discovered : [],
        trophies: Array.isArray(saved.trophies) ? saved.trophies : [],
        sound: Boolean(saved.sound),
      });
    } catch {
      // A corrupt save is treated as no save.
    }
  },
  setRegion(region: RegionId | null) {
    if (state.region !== region) set({ region });
  },
  /** Returns true the first time a region is discovered. */
  discover(region: RegionId, title: string, detail: string): boolean {
    if (state.discovered.includes(region)) return false;
    set({ discovered: [...state.discovered, region] });
    persist();
    campaign.toast({ kind: "region", title, detail });
    return true;
  },
  /** Returns true the first time a trophy is earned. */
  award(trophy: TrophyId, title: string, detail: string): boolean {
    if (state.trophies.includes(trophy)) return false;
    set({ trophies: [...state.trophies, trophy] });
    persist();
    campaign.toast({ kind: "trophy", title, detail });
    return true;
  },
  toast(t: Omit<Toast, "id">) {
    const id = ++toastId;
    set({ toasts: [...state.toasts, { ...t, id }].slice(-2) });
    window.setTimeout(() => campaign.dismiss(id), 4800);
  },
  dismiss(id: number) {
    if (state.toasts.some((t) => t.id === id)) set({ toasts: state.toasts.filter((t) => t.id !== id) });
  },
  setSound(sound: boolean) {
    set({ sound });
    persist();
  },
  setSlate(slateOpen: boolean) {
    if (state.slateOpen !== slateOpen) set({ slateOpen });
  },
  reset() {
    set({ discovered: [], trophies: [] });
    persist();
  },
  get: () => state,
};

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

const serverState = state;

export function useCampaign<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(state),
    () => select(serverState),
  );
}
