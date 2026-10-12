"use client";

import { campaign } from "@/campaign/state/store";

/**
 * Small synthesised sounds. Nothing plays unless the reader has turned
 * sound on, and the audio context is only created after that choice.
 */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (!campaign.get().sound) return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type Note = { freq: number; at: number; dur: number; type?: OscillatorType; gain?: number };

function play(notes: Note[]) {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  for (const n of notes) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.value = n.freq;
    const peak = n.gain ?? 0.07;
    g.gain.setValueAtTime(0, now + n.at);
    g.gain.linearRampToValueAtTime(peak, now + n.at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + n.at + n.dur);
    osc.connect(g).connect(ac.destination);
    osc.start(now + n.at);
    osc.stop(now + n.at + n.dur + 0.02);
  }
}

export const sfx = {
  /** A soft two-note chime for discovering a region. */
  discover: () =>
    play([
      { freq: 659.25, at: 0, dur: 0.5 },
      { freq: 987.77, at: 0.11, dur: 0.7 },
    ]),
  /** A brighter rising figure for a trophy. */
  trophy: () =>
    play([
      { freq: 523.25, at: 0, dur: 0.28, type: "triangle" },
      { freq: 659.25, at: 0.09, dur: 0.28, type: "triangle" },
      { freq: 783.99, at: 0.18, dur: 0.3, type: "triangle" },
      { freq: 1046.5, at: 0.27, dur: 0.6, type: "triangle" },
    ]),
  tick: () => play([{ freq: 880, at: 0, dur: 0.06, gain: 0.04 }]),
  good: () =>
    play([
      { freq: 783.99, at: 0, dur: 0.12, type: "triangle" },
      { freq: 1174.66, at: 0.06, dur: 0.18, type: "triangle" },
    ]),
  bad: () => play([{ freq: 164.81, at: 0, dur: 0.22, type: "sawtooth", gain: 0.05 }]),
  open: () => play([{ freq: 440, at: 0, dur: 0.1, gain: 0.04 }, { freq: 660, at: 0.05, dur: 0.14, gain: 0.04 }]),
  close: () => play([{ freq: 660, at: 0, dur: 0.1, gain: 0.04 }, { freq: 440, at: 0.05, dur: 0.14, gain: 0.04 }]),
};
