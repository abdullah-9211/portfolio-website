"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameCard, GameFrame } from "@/campaign/games/GameFrame";
import { awardTrophy } from "@/campaign/ui/TrophyTrigger";
import { sfx } from "@/campaign/audio/sfx";
import { BONES, constrain, exercises, FLOOR, REST, score, skeleton, type HandleId, type Pose, type Skeleton, type Vec } from "./poses";

const SECONDS = 20;
const LOCK_AT = 0.9;
const HOLD_MS = 900;

type Phase = "idle" | "playing" | "locked" | "done";

type Result = { name: string; accuracy: number; seconds: number };

const handles: { id: HandleId; label: string }[] = [
  { id: "wristL", label: "Left hand" },
  { id: "wristR", label: "Right hand" },
  { id: "hips", label: "Hips" },
  { id: "ankleL", label: "Left foot" },
  { id: "ankleR", label: "Right foot" },
];

/**
 * Form Check. A trainer holds a pose and the player drags a figure's
 * hands, feet and hips to match it. Accuracy is scored from joint angles
 * and the round ends with the same kind of report the Move app gives.
 */
export function FormCheckGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [round, setRound] = useState(0);
  const [pose, setPose] = useState<Pose>(REST);
  const [results, setResults] = useState<Result[]>([]);
  const [left, setLeft] = useState(SECONDS);
  const [paused, setPaused] = useState(false);

  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<HandleId | null>(null);
  const hold = useRef(0);
  const elapsed = useRef(0);
  const poseRef = useRef(pose);
  useEffect(() => {
    poseRef.current = pose;
  });

  const exercise = exercises[Math.min(round, exercises.length - 1)];
  const live = score(pose, exercise.pose);
  const pct = Math.round(live.accuracy * 100);

  const finishRound = useCallback(
    (accuracy: number) => {
      setResults((r) => [...r, { name: exercise.name, accuracy, seconds: Math.min(elapsed.current / 1000, SECONDS) }]);
      setPhase("locked");
      if (accuracy >= LOCK_AT) sfx.good();
      else sfx.bad();
    },
    [exercise.name],
  );

  // Round clock, and the hold that locks a pose in once it is close enough.
  useEffect(() => {
    if (phase !== "playing" || paused) return;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      elapsed.current += dt;
      const acc = score(poseRef.current, exercise.pose).accuracy;
      hold.current = acc >= LOCK_AT && !drag.current ? hold.current + dt : acc >= LOCK_AT ? hold.current + dt * 0.5 : 0;
      const remaining = Math.max(0, SECONDS - elapsed.current / 1000);
      setLeft((prev) => (Math.ceil(prev) === Math.ceil(remaining) ? prev : remaining));
      if (hold.current >= HOLD_MS || remaining <= 0) {
        finishRound(acc);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, paused, exercise.pose, finishRound]);

  // After a pose locks, show the result for a moment, then set up the next one.
  useEffect(() => {
    if (phase !== "locked") return;
    const t = window.setTimeout(() => {
      if (round + 1 >= exercises.length) {
        setPhase("done");
        return;
      }
      setRound((r) => r + 1);
      setPose(REST);
      hold.current = 0;
      elapsed.current = 0;
      setLeft(SECONDS);
      setPhase("playing");
    }, 1500);
    return () => window.clearTimeout(t);
  }, [phase, round]);

  const overall = results.length ? results.reduce((n, r) => n + r.accuracy, 0) / results.length : 0;
  const totalSeconds = results.reduce((n, r) => n + r.seconds, 0);

  useEffect(() => {
    if (phase === "done" && overall >= 0.85) awardTrophy("game-formcheck");
  }, [phase, overall]);

  const start = () => {
    setResults([]);
    setRound(0);
    setPose(REST);
    hold.current = 0;
    elapsed.current = 0;
    setLeft(SECONDS);
    setPhase("playing");
  };

  const toLocal = (e: { clientX: number; clientY: number }): Vec => {
    const el = svg.current;
    if (!el) return { x: 0, y: 0 };
    const pt = el.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = el.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };

  const move = (id: HandleId, to: Vec) => {
    setPose((prev) => {
      const next = { ...prev, [id]: constrain(id, to) };
      // Moving the hips carries the hands with them, as a body would.
      if (id === "hips") {
        const dx = next.hips.x - prev.hips.x;
        const dy = next.hips.y - prev.hips.y;
        next.wristL = constrain("wristL", { x: prev.wristL.x + dx, y: prev.wristL.y + dy });
        next.wristR = constrain("wristR", { x: prev.wristR.x + dx, y: prev.wristR.y + dy });
      }
      // Snap the stored handle back to where the limb can actually reach.
      const sk = skeleton(next);
      return { hips: next.hips, wristL: sk.wristL, wristR: sk.wristR, ankleL: sk.ankleL, ankleR: sk.ankleR };
    });
  };

  const onPointerDown = (id: HandleId) => (e: React.PointerEvent) => {
    if (phase !== "playing") return;
    drag.current = id;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || phase !== "playing") return;
    move(drag.current, toLocal(e));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const onKey = (id: HandleId) => (e: React.KeyboardEvent) => {
    if (phase !== "playing") return;
    const step = e.shiftKey ? 20 : 7;
    const d: Record<string, Vec> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const delta = d[e.key];
    if (!delta) return;
    e.preventDefault();
    const cur = poseRef.current[id];
    move(id, { x: cur.x + delta.x, y: cur.y + delta.y });
  };

  const you = skeleton(pose);
  const trainer = skeleton(exercise.pose);
  const active = phase === "playing" || phase === "locked";
  const locked = phase === "locked";
  const lastResult = results[results.length - 1];

  return (
    <GameFrame
      id="game-formcheck"
      numeral="II"
      title="Form Check"
      active={active}
      onVisible={(v) => setPaused(!v)}
      basedOn="Based on Move: pose estimation compares your joints with a trainer's and tells you what to fix."
      stats={
        active ? (
          <>
            <span>
              Exercise {round + 1}/{exercises.length}
            </span>
            <span>{Math.ceil(left)}s</span>
          </>
        ) : null
      }
    >
      <div className="fc" data-phase={phase}>
        <div className="fc-side">
          <p className="fc-kicker">Trainer</p>
          <p className="display fc-name">{exercise.name}</p>
          <p className="fc-cue">{exercise.cue}</p>
          <svg className="fc-trainer" viewBox="60 40 280 450" aria-hidden="true">
            <Figure sk={trainer} tone="trainer" />
          </svg>
        </div>

        <div className="fc-main">
          <svg
            ref={svg}
            className="fc-svg"
            viewBox="0 0 400 520"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            role="group"
            aria-label="Your figure. Move the hands, feet and hips to match the trainer."
          >
            <line className="fc-floor" x1="20" x2="380" y1={FLOOR + 14} y2={FLOOR + 14} />
            <g className="fc-ghost">
              <Figure sk={trainer} tone="ghost" />
            </g>
            <Figure sk={you} tone={locked ? "locked" : "you"} />
            {handles.map((h) => {
              const p = you[h.id];
              return (
                <g
                  key={h.id}
                  className="fc-handle"
                  transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}
                  tabIndex={phase === "playing" ? 0 : -1}
                  role="slider"
                  aria-label={`${h.label}. Use the arrow keys to move it.`}
                  aria-valuetext={`${Math.round(p.x)}, ${Math.round(p.y)}`}
                  aria-valuenow={Math.round(p.y)}
                  onPointerDown={onPointerDown(h.id)}
                  onKeyDown={onKey(h.id)}
                >
                  <circle className="fc-handle-hit" r={26} />
                  <circle className="fc-handle-ring" r={13} />
                  <circle className="fc-handle-dot" r={5} />
                </g>
              );
            })}
          </svg>

          <div className="fc-meter" aria-hidden="true">
            <span className="fc-meter-fill" style={{ transform: `scaleX(${live.accuracy.toFixed(3)})` }} data-good={live.accuracy >= LOCK_AT} />
            <span className="fc-meter-mark" style={{ left: `${LOCK_AT * 100}%` }} />
          </div>
          <div className="fc-read">
            <p className="fc-pct tnum" aria-live="off">
              <span className="display">{locked && lastResult ? Math.round(lastResult.accuracy * 100) : pct}%</span> match
            </p>
            <p className="fc-fix" role="status">
              {locked
                ? lastResult && lastResult.accuracy >= LOCK_AT
                  ? "Good form. Locked in."
                  : "Time. Scored where you were."
                : (live.worst ?? "Hold it there.")}
            </p>
          </div>
        </div>

        {phase === "idle" && (
          <GameCard
            title="Your brief"
            hint="Drag the five handles. With a keyboard, Tab to a handle and use the arrow keys."
            actions={
              <button type="button" className="btn btn-primary" onClick={start}>
                Start the workout
              </button>
            }
          >
            <p>
              The trainer holds a pose. Move your figure&rsquo;s hands, feet and hips until you match it, then hold.
              Four exercises, {SECONDS} seconds each, scored on joint angles the way Move scored real workouts.
            </p>
          </GameCard>
        )}

        {phase === "done" && (
          <GameCard
            title="Workout completed"
            tone={overall >= 0.85 ? "win" : "intro"}
            actions={
              <button type="button" className="btn btn-primary" onClick={start}>
                Go again
              </button>
            }
          >
            <dl className="game-report">
              <div>
                <dt>Accuracy</dt>
                <dd>{(overall * 100).toFixed(1)}%</dd>
              </div>
              <div>
                <dt>Exercises</dt>
                <dd>{results.length}</dd>
              </div>
              <div>
                <dt>Time taken</dt>
                <dd>{Math.round(totalSeconds)}s</dd>
              </div>
            </dl>
            <ul className="fc-report">
              {results.map((r) => (
                <li key={r.name}>
                  <span>{r.name}</span>
                  <span className="tnum">{Math.round(r.accuracy * 100)}%</span>
                </li>
              ))}
            </ul>
          </GameCard>
        )}
      </div>
    </GameFrame>
  );
}

function Figure({ sk, tone }: { sk: Skeleton; tone: "trainer" | "ghost" | "you" | "locked" }) {
  const line = (a: Vec, b: Vec, key: string) => <line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
  return (
    <g className="fc-figure" data-tone={tone}>
      <g className="fc-bones">
        {line(sk.neck, sk.hips, "spine")}
        {line(sk.shoulderL, sk.shoulderR, "shoulders")}
        {line(sk.hipL, sk.hipR, "pelvis")}
        {line(sk.shoulderL, sk.elbowL, "ual")}
        {line(sk.elbowL, sk.wristL, "fal")}
        {line(sk.shoulderR, sk.elbowR, "uar")}
        {line(sk.elbowR, sk.wristR, "far")}
        {line(sk.hipL, sk.kneeL, "tl")}
        {line(sk.kneeL, sk.ankleL, "sl")}
        {line(sk.hipR, sk.kneeR, "tr")}
        {line(sk.kneeR, sk.ankleR, "sr")}
        {line(sk.neck, { x: sk.head.x, y: sk.head.y + BONES.head }, "neck")}
      </g>
      <circle className="fc-head" cx={sk.head.x} cy={sk.head.y} r={BONES.head} />
      <g className="fc-joints">
        {[sk.shoulderL, sk.shoulderR, sk.elbowL, sk.elbowR, sk.hipL, sk.hipR, sk.kneeL, sk.kneeR].map((j, i) => (
          <circle key={i} cx={j.x} cy={j.y} r={5} />
        ))}
      </g>
    </g>
  );
}
