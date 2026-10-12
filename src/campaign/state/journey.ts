"use client";

/** How far along the main route the reader has walked this visit, in map units. */
let walked = 0;
const listeners = new Set<() => void>();

export const journey = {
  get: () => walked,
  /** The walked line only ever grows. */
  reach(length: number) {
    if (length <= walked + 0.25) return;
    walked = length;
    listeners.forEach((fn) => fn());
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
