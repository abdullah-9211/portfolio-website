"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import Lenis from "lenis";
import { useReducedMotion } from "@/components/primitives/ReducedMotionProvider";

/** Receives pin progress (0 to 1) and progress across the act's whole visible life. */
export type ProgressListener = (p: number, life: number) => void;

type ActEntry = {
  el: HTMLElement;
  top: number;
  height: number;
  p: number;
  life: number;
  listeners: Set<ProgressListener>;
};

type ScrollApi = {
  registerAct: (el: HTMLElement) => () => void;
  subscribeAct: (el: HTMLElement, fn: ProgressListener) => () => void;
  /** Subscribe to every scroll frame with the raw scroll position. */
  subscribe: (fn: (y: number, vh: number) => void) => () => void;
  scrollTo: (target: string | number, opts?: { immediate?: boolean; offset?: number }) => void;
  /** Stop or resume page scrolling, used while a modal layer is open. */
  lock: (locked: boolean) => void;
};

const ScrollContext = createContext<ScrollApi | null>(null);

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * One scroll loop for the whole page. Acts register themselves, and each
 * frame the provider writes their progress to `--p` and to any listeners,
 * so nothing here re-renders React while scrolling.
 */
export function ScrollProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const acts = useRef(new Map<HTMLElement, ActEntry>());
  const globals = useRef(new Set<(y: number, vh: number) => void>());
  const lenisRef = useRef<Lenis | null>(null);
  const dirty = useRef(true);

  const measure = useCallback(() => {
    const y = window.scrollY;
    acts.current.forEach((a) => {
      a.top = a.el.getBoundingClientRect().top + y;
      a.height = a.el.offsetHeight;
    });
    dirty.current = true;
  }, []);

  const update = useCallback(() => {
    const y = window.scrollY;
    const vh = window.innerHeight;
    acts.current.forEach((a) => {
      const travel = Math.max(a.height - vh, 1);
      const p = clamp01((y - a.top) / travel);
      const life = clamp01((y - (a.top - vh)) / (a.height + vh));
      if (p === a.p && life === a.life) return;
      a.p = p;
      a.life = life;
      a.el.style.setProperty("--p", p.toFixed(4));
      a.listeners.forEach((fn) => fn(p, life));
    });
    globals.current.forEach((fn) => fn(y, vh));
  }, []);

  useEffect(() => {
    let lenis: Lenis | null = null;
    if (!reduced) {
      lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1, touchMultiplier: 1.4 });
      lenisRef.current = lenis;
    }

    let raf = 0;
    let lastY = -1;
    const loop = (time: number) => {
      lenis?.raf(time);
      const y = window.scrollY;
      if (y !== lastY || dirty.current) {
        lastY = y;
        dirty.current = false;
        update();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => measure());
    ro.observe(document.body);
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", measure);
      lenis?.destroy();
      lenisRef.current = null;
    };
  }, [reduced, measure, update]);

  const api = useMemo<ScrollApi>(
    () => ({
      registerAct(el) {
        const entry: ActEntry = { el, top: 0, height: 0, p: -1, life: -1, listeners: new Set() };
        acts.current.set(el, entry);
        measure();
        return () => {
          acts.current.delete(el);
        };
      },
      subscribeAct(el, fn) {
        const entry = acts.current.get(el);
        if (!entry) return () => {};
        entry.listeners.add(fn);
        if (entry.p >= 0) fn(entry.p, entry.life);
        return () => {
          entry.listeners.delete(fn);
        };
      },
      subscribe(fn) {
        globals.current.add(fn);
        fn(window.scrollY, window.innerHeight);
        return () => {
          globals.current.delete(fn);
        };
      },
      scrollTo(target, opts) {
        const el = typeof target === "string" ? document.getElementById(target) : null;
        const y =
          typeof target === "number"
            ? target
            : el
              ? el.getBoundingClientRect().top +
                window.scrollY -
                (parseFloat(getComputedStyle(el).scrollMarginTop) || 0) +
                (opts?.offset ?? 0)
              : 0;
        const lenis = lenisRef.current;
        if (lenis) {
          lenis.scrollTo(y, { immediate: opts?.immediate, duration: 1.4 });
        } else {
          window.scrollTo({ top: y, behavior: "auto" });
        }
        if (el) {
          // Move keyboard focus with the view so the next Tab continues from here.
          if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
          el.focus({ preventScroll: true });
        }
      },
      lock(locked) {
        const lenis = lenisRef.current;
        if (locked) lenis?.stop();
        else lenis?.start();
        document.documentElement.style.overflow = locked ? "hidden" : "";
      },
    }),
    [measure],
  );

  return <ScrollContext.Provider value={api}>{children}</ScrollContext.Provider>;
}

export function useScroll(): ScrollApi {
  const ctx = useContext(ScrollContext);
  if (!ctx) throw new Error("useScroll must be used inside ScrollProvider");
  return ctx;
}
