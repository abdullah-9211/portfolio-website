"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "@/components/primitives/ReducedMotionProvider";
import plank from "./pose/move-a.json";
import pushup from "./pose/move-b.json";

type Frame = number[][] | null;
type Track = { width: number; height: number; duration: number; fps: number; frames: Frame[] };

const clips: { src: string; label: string; track: Track }[] = [
  { src: "/video/move-b.mp4", label: "Push-up", track: pushup as Track },
  { src: "/video/move-a.mp4", label: "Plank", track: plank as Track },
];

// MediaPipe Pose landmark indices.
const SHOULDER = [11, 12];
const ELBOW = [13, 14];
const WRIST = [15, 16];
const HIP = [23, 24];
const KNEE = [25, 26];
const ANKLE = [27, 28];
const BONES: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28],
];
const JOINTS = [...SHOULDER, ...ELBOW, ...WRIST, ...HIP, ...KNEE, ...ANKLE];

function angleAt(a: number[], b: number[], c: number[], w: number, h: number) {
  const v1x = (a[0] - b[0]) * w;
  const v1y = (a[1] - b[1]) * h;
  const v2x = (c[0] - b[0]) * w;
  const v2y = (c[1] - b[1]) * h;
  const cos = (v1x * v2x + v1y * v2y) / (Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y) || 1);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

/** The side of the body facing the camera is the one the model is surer about. */
function nearSide(f: number[][]) {
  const vis = (i: number) => f[SHOULDER[i]][2] + f[HIP[i]][2] + f[ANKLE[i]][2] + f[ELBOW[i]][2];
  return vis(0) >= vis(1) ? 0 : 1;
}

function measure(f: number[][], w: number, h: number) {
  const s = nearSide(f);
  const bodyLine = angleAt(f[SHOULDER[s]], f[HIP[s]], f[ANKLE[s]], w, h);
  const elbow = angleAt(f[SHOULDER[s]], f[ELBOW[s]], f[WRIST[s]], w, h);
  // Form here means one thing: how straight the line from shoulder to hip to ankle is.
  const form = Math.max(0, Math.min(1, 1 - Math.abs(180 - bodyLine) / 40));
  return { bodyLine, elbow, form };
}

/** Joint positions at a moment in time, blended between the two nearest sampled frames. */
function sample(track: Track, time: number): number[][] | null {
  const pos = Math.max(0, Math.min(track.frames.length - 1, time * track.fps));
  const i = Math.floor(pos);
  const a = track.frames[i];
  const b = track.frames[Math.min(i + 1, track.frames.length - 1)];
  if (!a) return b;
  if (!b) return a;
  const t = pos - i;
  return a.map((p, k) => [p[0] + (b[k][0] - p[0]) * t, p[1] + (b[k][1] - p[1]) * t, Math.min(p[2], b[k][2])]);
}

/**
 * Test footage recorded for Move, with the pose model's output drawn back
 * on top. The joints were extracted from these clips with MediaPipe Pose,
 * the model Move was built on, and the angles shown are measured from them.
 */
export function MoveFootage() {
  return (
    <div className="footage">
      <div className="footage-head">
        <p className="footage-title">What the app sees</p>
        <p className="footage-note">
          Test footage from the build. The skeleton is real MediaPipe output for these clips, and the angles are
          measured from it frame by frame.
        </p>
      </div>
      <div className="footage-grid">
        {clips.map((c) => (
          <Clip key={c.src} {...c} />
        ))}
      </div>
    </div>
  );
}

function Clip({ src, label, track }: { src: string; label: string; track: Track }) {
  const reduced = useReducedMotion();
  const video = useRef<HTMLVideoElement>(null);
  const bones = useRef<SVGGElement>(null);
  const joints = useRef<SVGGElement>(null);
  const playhead = useRef<SVGLineElement>(null);
  const read = useRef<{ form: HTMLElement | null; line: HTMLElement | null; elbow: HTMLElement | null }>({ form: null, line: null, elbow: null });
  const userPaused = useRef(false);
  const [playing, setPlaying] = useState(false);

  const { width: W, height: H } = track;

  // Form across the whole clip, for the trace under the video.
  const trace = useMemo(() => {
    const pts = track.frames.map((f, i) => {
      const form = f ? measure(f, W, H).form : 0;
      return `${((i / (track.frames.length - 1)) * 100).toFixed(2)},${(22 - form * 20).toFixed(2)}`;
    });
    return `M${pts.join(" L")}`;
  }, [track, W, H]);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    let raf = 0;
    let shown = { form: 0, line: 180, elbow: 180 };

    const draw = () => {
      const f = sample(track, v.currentTime);
      if (f && bones.current && joints.current) {
        const lines = bones.current.children;
        BONES.forEach(([a, b], i) => {
          const el = lines[i] as SVGLineElement;
          el.setAttribute("x1", (f[a][0] * W).toFixed(1));
          el.setAttribute("y1", (f[a][1] * H).toFixed(1));
          el.setAttribute("x2", (f[b][0] * W).toFixed(1));
          el.setAttribute("y2", (f[b][1] * H).toFixed(1));
          el.style.opacity = Math.min(f[a][2], f[b][2]) > 0.35 ? "1" : "0.25";
        });
        const dots = joints.current.children;
        JOINTS.forEach((j, i) => {
          const el = dots[i] as SVGCircleElement;
          el.setAttribute("cx", (f[j][0] * W).toFixed(1));
          el.setAttribute("cy", (f[j][1] * H).toFixed(1));
          el.style.opacity = f[j][2] > 0.35 ? "1" : "0.25";
        });
        const m = measure(f, W, H);
        // Ease the numbers so they read as a measurement, not a flicker.
        shown = {
          form: shown.form + (m.form - shown.form) * 0.2,
          line: shown.line + (m.bodyLine - shown.line) * 0.2,
          elbow: shown.elbow + (m.elbow - shown.elbow) * 0.2,
        };
        if (read.current.form) read.current.form.textContent = `${Math.round(shown.form * 100)}%`;
        if (read.current.line) read.current.line.textContent = `${Math.round(shown.line)}°`;
        if (read.current.elbow) read.current.elbow.textContent = `${Math.round(shown.elbow)}°`;
      }
      if (playhead.current) {
        const x = ((v.currentTime / (v.duration || track.duration)) * 100).toFixed(2);
        playhead.current.setAttribute("x1", x);
        playhead.current.setAttribute("x2", x);
      }
    };

    const loop = () => {
      draw();
      raf = v.paused ? 0 : requestAnimationFrame(loop);
    };
    const onPlay = () => {
      setPlaying(true);
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onPause = () => setPlaying(false);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("seeked", draw);
    v.addEventListener("loadeddata", draw);
    // Settle the numbers on the first frame so nothing reads as zero before play.
    for (let i = 0; i < 30; i++) draw();

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (visible && !reduced && !userPaused.current) void v.play().catch(() => {});
        else if (!visible) v.pause();
      },
      { threshold: 0.4 },
    );
    io.observe(v);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("seeked", draw);
      v.removeEventListener("loadeddata", draw);
    };
  }, [track, W, H, reduced]);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      userPaused.current = false;
      void v.play().catch(() => {});
    } else {
      userPaused.current = true;
      v.pause();
    }
  };

  return (
    <figure className="footage-clip">
      <div className="footage-frame">
        <video ref={video} src={src} muted loop playsInline preload="auto" aria-label={`${label}. Test footage recorded for Move.`} />
        <svg className="footage-pose" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <g ref={bones} className="footage-bones">
            {BONES.map((_, i) => (
              <line key={i} />
            ))}
          </g>
          <g ref={joints} className="footage-joints">
            {JOINTS.map((j) => (
              <circle key={j} r={7} />
            ))}
          </g>
        </svg>
        <span className="footage-tag">
          <span className="footage-rec" aria-hidden="true" />
          {label} / pose tracking
        </span>
        <button type="button" className="footage-toggle" onClick={toggle} aria-label={playing ? `Pause the ${label.toLowerCase()} clip` : `Play the ${label.toLowerCase()} clip`}>
          {playing ? (
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
              <path d="M5 3h3.5v14H5zM11.5 3H15v14h-3.5z" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
              <path d="M5 3l12 7-12 7z" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>
      <figcaption className="footage-read">
        <dl className="footage-metrics tnum">
          <div className="footage-metric-main">
            <dt>Form</dt>
            <dd
              ref={(el) => {
                read.current.form = el;
              }}
              className="display"
            >
              0%
            </dd>
          </div>
          <div>
            <dt>Body line</dt>
            <dd
              ref={(el) => {
                read.current.line = el;
              }}
            >
              180°
            </dd>
          </div>
          <div>
            <dt>Elbow</dt>
            <dd
              ref={(el) => {
                read.current.elbow = el;
              }}
            >
              180°
            </dd>
          </div>
        </dl>
        <svg className="footage-trace" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
          <path d={trace} />
          <line ref={playhead} x1="0" x2="0" y1="0" y2="24" />
        </svg>
      </figcaption>
    </figure>
  );
}
