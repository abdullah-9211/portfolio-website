"use client";

import { useEffect, useRef } from "react";
import { compile, fullscreenTriangle } from "@/lib/gl";
import { useReducedMotion } from "@/components/primitives/ReducedMotionProvider";

const MAX_PIXELS = 1_300_000;

type ShaderSceneProps = {
  /** A WebGL2 fragment shader. It receives uRes, uTime, uQ and uPointer. */
  fragment: string;
  className?: string;
};

/**
 * Runs one fragment shader on a canvas. `uQ` is the scroll progress of the
 * side quest the scene sits in (read from that panel's `--q`), and the
 * scene only renders while it is on screen and its panel is showing.
 */
export function ShaderScene({ fragment, className }: ShaderSceneProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });
    if (!gl) return;
    const program = compile(gl, fragment);
    if (!program) return;
    const vao = fullscreenTriangle(gl);
    const u = {
      res: gl.getUniformLocation(program, "uRes"),
      time: gl.getUniformLocation(program, "uTime"),
      q: gl.getUniformLocation(program, "uQ"),
      pointer: gl.getUniformLocation(program, "uPointer"),
    };
    const panel = canvas.closest<HTMLElement>("[data-panel]");
    const scene = canvas.closest<HTMLElement>("[data-scene]");

    let raf = 0;
    let onScreen = false;
    let start = performance.now();
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      // These scenes march a ray per pixel, so the pixel count is capped and the browser scales up the rest.
      const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(MAX_PIXELS / Math.max(1, rect.width * rect.height)));
      const w = Math.max(2, Math.round(rect.width * dpr));
      const h = Math.max(2, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    const draw = (now: number) => {
      raf = 0;
      resize();
      const q = panel ? parseFloat(panel.style.getPropertyValue("--q")) || 0 : 0;
      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform1f(u.time, reduced ? 12 : (now - start) / 1000);
      gl.uniform1f(u.q, q);
      gl.uniform2f(u.pointer, pointer.x, pointer.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // Keep going only while there is something to see.
      const showing = onScreen && (!panel || panel.style.visibility !== "hidden") && (!scene || getComputedStyle(scene).opacity !== "0");
      if (showing && !reduced) raf = requestAnimationFrame(draw);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };

    const io = new IntersectionObserver((entries) => {
      onScreen = entries.some((e) => e.isIntersecting);
      if (onScreen) kick();
    });
    io.observe(canvas);
    // The panel fades in and out on scroll without leaving the viewport, so wake on scroll too.
    const onScroll = () => {
      if (onScreen) kick();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const onMove = (e: PointerEvent) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    start = performance.now();
    kick();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      // The context is left alone: this effect can re-run on the same canvas, and a lost context cannot be reused.
      gl.deleteProgram(program);
    };
  }, [fragment, reduced]);

  return <canvas ref={ref} className={`shader-scene ${className ?? ""}`} aria-hidden="true" />;
}
