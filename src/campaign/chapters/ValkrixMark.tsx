"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/components/primitives/ReducedMotionProvider";

type P = { x: number; y: number; hx: number; hy: number; vx: number; vy: number; size: number; hue: number; ring: number; phase: number };

const BLUE = [79, 125, 243];
const VIOLET = [168, 93, 232];
const PINK = [232, 93, 190];

function brand(t: number, alpha: number) {
  const a = t < 0.5 ? BLUE : VIOLET;
  const b = t < 0.5 ? VIOLET : PINK;
  const k = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  return `rgba(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)},${alpha})`;
}

/** A point inside the "V": two slanted bars meeting at the bottom. */
function pointInV(rand: () => number): [number, number] {
  const right = rand() < 0.54;
  const t = rand();
  const w = (rand() - 0.5) * 0.24;
  const top: [number, number] = right ? [0.56, -0.62] : [-0.52, -0.5];
  const x = top[0] + (0.02 - top[0]) * t + w;
  const y = top[1] + (0.6 - top[1]) * t;
  return [x, y];
}

/**
 * The Valkrix mark, built from particles in the brand's blue-to-pink. They
 * start scattered, gather into the V as the section scrolls into view,
 * scatter from the pointer, and are circled by two rings.
 */
export function ValkrixMark() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;

    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };

    const parts: P[] = [];
    for (let i = 0; i < 1900; i++) {
      const [hx, hy] = pointInV(rand);
      const a = rand() * Math.PI * 2;
      const r = 0.9 + rand() * 0.9;
      parts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, hx, hy, vx: 0, vy: 0, size: 0.6 + rand() * 1.5, hue: (hx + 0.6) / 1.2, ring: 0, phase: 0 });
    }
    for (let ring = 1; ring <= 2; ring++) {
      for (let i = 0; i < 380; i++) {
        parts.push({ x: 0, y: 0, hx: 0, hy: 0, vx: 0, vy: 0, size: 0.5 + rand() * 1.2, hue: rand(), ring, phase: rand() * Math.PI * 2 + (rand() - 0.5) * 0.2 });
      }
    }

    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      const rect = el.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const pointer = { x: 9, y: 9 };
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const s = Math.min(rect.width, rect.height) * 0.5;
      pointer.x = (e.clientX - rect.left - rect.width / 2) / s;
      pointer.y = (e.clientY - rect.top - rect.height / 2) / s;
    };
    const onLeave = () => {
      pointer.x = 9;
      pointer.y = 9;
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);

    let raf = 0;
    let visible = false;
    let time = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      time += dt;

      // How far the mark has scrolled into view decides how gathered it is.
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const gather = reduced ? 1 : Math.max(0, Math.min(1, (vh * 0.95 - rect.top) / (vh * 0.45)));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const s = Math.min(w, h) * 0.5;
      const cx = w / 2;
      const cy = h / 2;

      for (const p of parts) {
        let tx: number;
        let ty: number;
        if (p.ring) {
          // Two tilted ellipses turning in opposite directions.
          const a = p.phase + time * (p.ring === 1 ? 0.35 : -0.26);
          const rx = p.ring === 1 ? 0.98 : 0.86;
          const ry = p.ring === 1 ? 0.3 : 0.44;
          const tilt = p.ring === 1 ? -0.38 : 0.5;
          const ex = Math.cos(a) * rx;
          const ey = Math.sin(a) * ry;
          tx = ex * Math.cos(tilt) - ey * Math.sin(tilt);
          ty = ex * Math.sin(tilt) + ey * Math.cos(tilt) + 0.04;
          p.x = tx;
          p.y = ty;
          const depth = Math.sin(a);
          ctx.fillStyle = brand(p.hue, (0.25 + (depth + 1) * 0.3) * gather);
          ctx.beginPath();
          ctx.arc(cx + p.x * s, cy + p.y * s, p.size * (0.7 + (depth + 1) * 0.3), 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        tx = p.hx;
        ty = p.hy;
        // Spring toward home, stronger the more gathered the mark is.
        p.vx += (tx - p.x) * (0.5 + gather * 9) * dt;
        p.vy += (ty - p.y) * (0.5 + gather * 9) * dt;
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 0.09) {
          const f = (0.09 - d2) * 40 * dt;
          p.vx += dx * f;
          p.vy += dy * f;
        }
        p.vx *= 0.9;
        p.vy *= 0.9;
        p.x += p.vx + Math.sin(time * 0.9 + p.hx * 9) * 0.0009;
        p.y += p.vy + Math.cos(time * 0.8 + p.hy * 9) * 0.0009;
        ctx.fillStyle = brand(p.hue, 0.35 + gather * 0.5);
        ctx.beginPath();
        ctx.arc(cx + p.x * s, cy + p.y * s, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = visible && !reduced ? requestAnimationFrame(frame) : 0;
    };

    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (visible && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    });
    io.observe(el);
    if (reduced) {
      // One settled frame: let the springs run without drawing, then draw once.
      for (let i = 0; i < 240; i++) frame(performance.now());
    }

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced]);

  return <canvas ref={canvas} className="vmark" aria-hidden="true" />;
}
