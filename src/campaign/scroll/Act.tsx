"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useScroll, type ProgressListener } from "./ScrollProvider";

type ActApi = { subscribe: (fn: ProgressListener) => () => void };

const ActContext = createContext<ActApi | null>(null);

type ActProps = {
  id?: string;
  /** Scroll length in viewport heights. The stage pins for `span - 1` of them. */
  span: number;
  className?: string;
  stageClassName?: string;
  style?: CSSProperties;
  labelledBy?: string;
  children: ReactNode;
};

/**
 * A pinned scene. The section is `span` viewports tall and its stage
 * sticks for the duration, while progress is published as `--p` and to
 * `useActProgress` listeners.
 */
export function Act({ id, span, className, stageClassName, style, labelledBy, children }: ActProps) {
  const ref = useRef<HTMLElement>(null);
  const scroll = useScroll();
  const pending = useRef(new Set<ProgressListener>());
  const live = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const unregister = scroll.registerAct(el);
    live.current = true;
    const offs = [...pending.current].map((fn) => scroll.subscribeAct(el, fn));
    return () => {
      live.current = false;
      offs.forEach((off) => off());
      unregister();
    };
  }, [scroll]);

  const api = useMemo<ActApi>(
    () => ({
      subscribe(fn) {
        pending.current.add(fn);
        const off = live.current && ref.current ? scroll.subscribeAct(ref.current, fn) : null;
        return () => {
          pending.current.delete(fn);
          off?.();
        };
      },
    }),
    [scroll],
  );

  return (
    <section
      ref={ref}
      id={id}
      aria-labelledby={labelledBy}
      className={`act ${className ?? ""}`}
      style={{ "--span": span, ...style } as CSSProperties}
    >
      <div className={`act-stage ${stageClassName ?? ""}`}>
        <ActContext.Provider value={api}>{children}</ActContext.Provider>
      </div>
    </section>
  );
}

/** Run `fn` with the enclosing act's progress on every scroll frame. */
export function useActProgress(fn: ProgressListener) {
  const act = useContext(ActContext);
  const latest = useRef(fn);
  useEffect(() => {
    latest.current = fn;
  });
  useEffect(() => {
    if (!act) return;
    return act.subscribe((p, life) => latest.current(p, life));
  }, [act]);
}

export const smooth = (t: number) => {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * (3 - 2 * x);
};

/** 0 before `a`, 1 after `b`, eased between. */
export const ramp = (p: number, a: number, b: number) => smooth((p - a) / (b - a));
