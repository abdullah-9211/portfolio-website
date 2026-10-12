"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { GameCard, GameFrame } from "@/campaign/games/GameFrame";
import { awardTrophy } from "@/campaign/ui/TrophyTrigger";
import { sfx } from "@/campaign/audio/sfx";
import { judge, makeRequests, mulberry, waves, type Request, type Rule } from "./rules";

const MAX_BREACHES = 3;

type Phase = "idle" | "briefing" | "playing" | "resolving" | "won" | "lost";

type Feedback = {
  kind: "correct" | "breach" | "blocked" | "timeout";
  text: string;
  choice: "allow" | "deny" | null;
};

type State = {
  phase: Phase;
  wave: number;
  queue: Request[];
  index: number;
  correct: number;
  breaches: number;
  blocked: number;
  timeouts: number;
  streak: number;
  best: number;
  feedback: Feedback | null;
  seed: number;
  paused: boolean;
};

type Event =
  | { type: "start"; seed: number }
  | { type: "begin-wave" }
  | { type: "decide"; choice: "allow" | "deny" | null }
  | { type: "next" }
  | { type: "pause"; paused: boolean };

const initial: State = {
  phase: "idle",
  wave: 0,
  queue: [],
  index: 0,
  correct: 0,
  breaches: 0,
  blocked: 0,
  timeouts: 0,
  streak: 0,
  best: 0,
  feedback: null,
  seed: 1,
  paused: false,
};

function explain(rule: Rule | null) {
  return rule ? rule.text : "No rule forbids it.";
}

function reduce(s: State, e: Event): State {
  switch (e.type) {
    case "start": {
      const rand = mulberry(e.seed);
      return { ...initial, phase: "briefing", seed: e.seed, queue: makeRequests(waves[0], rand, 1) };
    }
    case "begin-wave":
      return s.phase === "briefing" ? { ...s, phase: "playing", feedback: null } : s;
    case "decide": {
      if (s.phase !== "playing") return s;
      const request = s.queue[s.index];
      const verdict = judge(request, waves[s.wave]);
      let { correct, breaches, blocked, timeouts, streak } = s;
      let feedback: Feedback;
      if (e.choice === null) {
        timeouts++;
        streak = 0;
        feedback = {
          kind: "timeout",
          choice: null,
          text: `Timed out. It should have been ${verdict.allow ? "allowed" : "denied"}: ${explain(verdict.rule)}`,
        };
      } else if ((e.choice === "allow") === verdict.allow) {
        correct++;
        streak++;
        feedback = { kind: "correct", choice: e.choice, text: `Correct. ${explain(verdict.rule)}` };
      } else if (e.choice === "allow") {
        breaches++;
        streak = 0;
        feedback = { kind: "breach", choice: e.choice, text: `Breach. ${explain(verdict.rule)}` };
      } else {
        blocked++;
        streak = 0;
        feedback = { kind: "blocked", choice: e.choice, text: "You blocked legitimate work. No rule forbids it." };
      }
      return { ...s, phase: "resolving", correct, breaches, blocked, timeouts, streak, best: Math.max(s.best, streak), feedback };
    }
    case "next": {
      if (s.phase !== "resolving") return s;
      if (s.breaches >= MAX_BREACHES) return { ...s, phase: "lost" };
      if (s.index + 1 < s.queue.length) return { ...s, phase: "playing", index: s.index + 1, feedback: null };
      if (s.wave + 1 < waves.length) {
        const wave = s.wave + 1;
        const rand = mulberry(s.seed + wave * 101);
        return { ...s, phase: "briefing", wave, index: 0, queue: makeRequests(waves[wave], rand, wave * 100 + 1), feedback: null };
      }
      return { ...s, phase: "won" };
    }
    case "pause":
      return { ...s, paused: e.paused };
  }
}

const total = waves.reduce((n, w) => n + w.count, 0);

/**
 * Gatekeeper. Access requests arrive one at a time and the player allows
 * or denies each against a policy that is pushed three times. Based on
 * the data access control work at Securiti.
 */
export function GatekeeperGame() {
  const [s, dispatch] = useReducer(reduce, initial);
  const timer = useRef<HTMLSpanElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const wave = waves[s.wave];
  const request = s.queue[s.index];
  const playing = s.phase === "playing" || s.phase === "resolving" || s.phase === "briefing";

  // The countdown for the current request. It runs on the animation clock so pausing is exact.
  useEffect(() => {
    if (s.phase !== "playing" || s.paused) return;
    const limit = wave.seconds * 1000;
    let elapsed = Number(timer.current?.dataset.elapsed ?? 0);
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      elapsed += now - last;
      last = now;
      const left = Math.max(0, 1 - elapsed / limit);
      if (timer.current) {
        timer.current.style.transform = `scaleX(${left.toFixed(4)})`;
        timer.current.dataset.elapsed = String(elapsed);
        timer.current.dataset.low = left < 0.3 ? "true" : "false";
      }
      if (left <= 0) {
        dispatch({ type: "decide", choice: null });
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [s.phase, s.paused, s.index, s.wave, wave.seconds]);

  // Reset the countdown whenever a new request is shown.
  useEffect(() => {
    if (timer.current) {
      timer.current.dataset.elapsed = "0";
      timer.current.style.transform = "scaleX(1)";
    }
  }, [s.index, s.wave]);

  // Show the result of a decision briefly, then move on.
  useEffect(() => {
    if (s.phase !== "resolving" || !s.feedback) return;
    if (s.feedback.kind === "correct") sfx.good();
    else sfx.bad();
    const wait = s.feedback.kind === "correct" ? 950 : 2300;
    const t = window.setTimeout(() => dispatch({ type: "next" }), wait);
    return () => window.clearTimeout(t);
  }, [s.phase, s.feedback]);

  useEffect(() => {
    if (s.phase === "won" && s.breaches === 0) awardTrophy("game-gatekeeper");
  }, [s.phase, s.breaches]);

  const decide = useCallback((choice: "allow" | "deny") => dispatch({ type: "decide", choice }), []);

  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (s.phase === "playing") {
        if (k === "arrowright" || k === "d") {
          e.preventDefault();
          decide("allow");
        } else if (k === "arrowleft" || k === "a") {
          e.preventDefault();
          decide("deny");
        }
      } else if (s.phase === "briefing" && (k === "enter" || k === " ")) {
        e.preventDefault();
        dispatch({ type: "begin-wave" });
      } else if (s.phase === "resolving" && (k === "enter" || k === " ")) {
        e.preventDefault();
        dispatch({ type: "next" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, s.phase, decide]);

  const start = () => {
    dispatch({ type: "start", seed: Math.floor(Math.random() * 1e9) });
    stage.current?.focus();
  };

  const decided = s.correct + s.breaches + s.blocked + s.timeouts;
  const accuracy = decided ? Math.round((s.correct / decided) * 100) : 0;

  return (
    <GameFrame
      id="game-gatekeeper"
      numeral="III"
      title="Gatekeeper"
      active={playing}
      onVisible={(v) => dispatch({ type: "pause", paused: !v })}
      basedOn="Based on my work at Securiti: access policies deciding who can read, write or delete which data."
      stats={
        playing || s.phase === "won" || s.phase === "lost" ? (
          <>
            <span>
              Request {Math.min(decided + (s.phase === "playing" ? 1 : 0), total)}/{total}
            </span>
            <span className="gk-shields" aria-label={`${MAX_BREACHES - s.breaches} of ${MAX_BREACHES} shields left`}>
              {Array.from({ length: MAX_BREACHES }, (_, i) => (
                <svg key={i} viewBox="0 0 20 22" width="16" height="18" data-lost={i >= MAX_BREACHES - s.breaches} aria-hidden="true">
                  <path d="M10 1 L18 4 V11 C18 16 14 19.5 10 21 C6 19.5 2 16 2 11 V4Z" />
                </svg>
              ))}
            </span>
          </>
        ) : null
      }
    >
      <div ref={stage} className="gk" tabIndex={-1} data-phase={s.phase} data-feedback={s.feedback?.kind}>
        <div className="gk-policy" aria-label={`${wave.name}. ${wave.rules.map((r) => r.text).join(" ")}`}>
          <p className="gk-policy-name">{wave.name}</p>
          <ol className="gk-rules">
            {wave.rules.map((r) => (
              <li key={r.id + r.text} data-changed={wave.changed.includes(r.id) && s.wave > 0} data-hit={s.feedback && s.phase === "resolving" && judge(request, wave).rule === r}>
                {r.text}
              </li>
            ))}
          </ol>
          <p className="gk-default">Anything else is allowed.</p>
        </div>

        <div className="gk-lane">
          <div className="gk-gate" aria-hidden="true">
            <svg viewBox="-60 -60 120 120">
              <circle r="52" />
              <circle r="38" />
              <path d="M0 -24 L24 0 L0 24 L-24 0Z" />
            </svg>
          </div>

          {request && (s.phase === "playing" || s.phase === "resolving") && (
            <div className="gk-card" key={request.id} data-choice={s.feedback?.choice ?? undefined} aria-live="polite">
              <p className="gk-card-who">
                <RoleGlyph role={request.role} />
                {request.role}
              </p>
              <p className="gk-card-wants">
                wants to <strong data-action={request.action}>{request.action.toLowerCase()}</strong>
              </p>
              <p className="gk-card-what">
                <span className="gk-label" data-label={request.label}>
                  {request.label}
                </span>
                data in {request.system}
              </p>
              <span className="gk-timer" aria-hidden="true">
                <span ref={timer} />
              </span>
            </div>
          )}

          <p className="gk-feedback" role="status" data-kind={s.feedback?.kind}>
            {s.phase === "resolving" && s.feedback ? s.feedback.text : " "}
          </p>
        </div>

        <div className="gk-controls">
          <button type="button" className="gk-btn gk-btn-deny" onClick={() => decide("deny")} disabled={s.phase !== "playing"}>
            <kbd className="keycap" aria-hidden="true">
              A
            </kbd>
            Deny
          </button>
          <button type="button" className="gk-btn gk-btn-allow" onClick={() => decide("allow")} disabled={s.phase !== "playing"}>
            Allow
            <kbd className="keycap" aria-hidden="true">
              D
            </kbd>
          </button>
        </div>

        {s.phase === "idle" && (
          <GameCard
            title="Your brief"
            hint="Press A or the left arrow to deny, D or the right arrow to allow. Buttons work too."
            actions={
              <button type="button" className="btn btn-primary" onClick={start}>
                Start the shift
              </button>
            }
          >
            <p>
              You are the access policy. {total} requests are coming, and the rules will change twice while you work.
              Allow what the policy allows and deny what it forbids. Three breaches and the shift is over.
            </p>
          </GameCard>
        )}

        {s.phase === "briefing" && (
          <GameCard
            title={s.wave === 0 ? wave.name : `${wave.name} pushed`}
            hint={`${wave.count} requests, ${wave.seconds} seconds each.`}
            actions={
              <button type="button" className="btn btn-primary" onClick={() => dispatch({ type: "begin-wave" })} autoFocus>
                {s.wave === 0 ? "Open the gate" : "Back to the gate"}
              </button>
            }
          >
            <p>{wave.note}</p>
            <ol className="gk-brief">
              {wave.rules.map((r) => (
                <li key={r.id + r.text} data-changed={wave.changed.includes(r.id)}>
                  {r.text}
                  {wave.changed.includes(r.id) && s.wave > 0 && <span className="gk-new">Changed</span>}
                </li>
              ))}
            </ol>
          </GameCard>
        )}

        {(s.phase === "won" || s.phase === "lost") && (
          <GameCard
            title={s.phase === "won" ? (s.breaches === 0 ? "Clean shift" : "Shift complete") : "Shift over"}
            tone={s.phase === "won" ? "win" : "lose"}
            actions={
              <button type="button" className="btn btn-primary" onClick={start}>
                Play again
              </button>
            }
          >
            <p>
              {s.phase === "lost"
                ? "Three breaches. In production that is three incident reports."
                : s.breaches === 0
                  ? "Not one breach. That is the whole job."
                  : "You made it to the end of the shift, with some paperwork to file."}
            </p>
            <dl className="game-report">
              <div>
                <dt>Accuracy</dt>
                <dd>{accuracy}%</dd>
              </div>
              <div>
                <dt>Correct</dt>
                <dd>
                  {s.correct}/{decided}
                </dd>
              </div>
              <div>
                <dt>Breaches</dt>
                <dd>{s.breaches}</dd>
              </div>
              <div>
                <dt>Wrongly blocked</dt>
                <dd>{s.blocked}</dd>
              </div>
              <div>
                <dt>Timed out</dt>
                <dd>{s.timeouts}</dd>
              </div>
              <div>
                <dt>Best streak</dt>
                <dd>{s.best}</dd>
              </div>
            </dl>
          </GameCard>
        )}
      </div>
    </GameFrame>
  );
}

function RoleGlyph({ role }: { role: Request["role"] }) {
  const common = { viewBox: "0 0 24 24", width: 26, height: 26, "aria-hidden": true, fill: "none", stroke: "currentColor", strokeWidth: 1.6 } as const;
  if (role === "Service account")
    return (
      <svg {...common}>
        <rect x="5" y="7" width="14" height="12" rx="2" />
        <path d="M12 3v4M9 12v2M15 12v2M9 17h6" strokeLinecap="round" />
      </svg>
    );
  if (role === "Engineer")
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c1-4 4-6 7-6s6 2 7 6M8 5l4-2 4 2" strokeLinecap="round" />
      </svg>
    );
  if (role === "Contractor")
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c1-4 4-6 7-6s6 2 7 6" strokeLinecap="round" strokeDasharray="2 3" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1-4 4-6 7-6s6 2 7 6" strokeLinecap="round" />
    </svg>
  );
}
