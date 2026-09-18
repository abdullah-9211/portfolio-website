import { GradientText } from "@/components/primitives/GradientText";
import { Whisper } from "@/components/primitives/Whisper";
import { HeroCTAs } from "./HeroCTAs";
import { WordCycle } from "./WordCycle";
import { ScrollCue } from "./ScrollCue";
import { HeroGlow } from "./HeroGlow";

/**
 * Almost no client-side JS — the word-cycle rotator, entrance stagger,
 * scroll cue, and glow color-cycle are all pure CSS (see globals.css),
 * each with a real reduced-motion fallback. The one small client
 * component (HeroGlow) only adds cursor-tracking on top of an already-
 * complete, already-animated CSS glow; nothing depends on it running.
 */
export function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-screen flex-col justify-center overflow-hidden px-5 sm:px-8"
    >
      <div className="grain-overlay pointer-events-none absolute inset-0" aria-hidden="true" />
      <HeroGlow />

      <div className="mx-auto w-full max-w-4xl">
        <p
          className="hero-stagger-item font-mono text-xs uppercase tracking-widest text-dim"
          style={{ "--stagger": 0 } as React.CSSProperties}
        >
          Islamabad, Pakistan — Software Engineer &amp; Founder
        </p>

        <p
          className="hero-stagger-item font-display mt-5 text-4xl font-extrabold leading-none tracking-tight sm:text-6xl"
          style={{ "--stagger": 1 } as React.CSSProperties}
        >
          <WordCycle />
        </p>

        <h1
          className="hero-stagger-item font-display mt-4 text-4xl font-bold tracking-tight text-paper sm:text-5xl"
          style={{ "--stagger": 2 } as React.CSSProperties}
        >
          ABDULLAH <GradientText>UMAR</GradientText>
        </h1>

        <Whisper
          className="hero-stagger-item mt-5 max-w-lg"
          style={{ "--stagger": 3 } as React.CSSProperties}
        >
          Backend engineer at Veeam. Founder at Valkrix. Building{" "}
          <em className="not-italic text-paper">both</em>, on purpose.
        </Whisper>

        <div
          className="hero-stagger-item"
          style={{ "--stagger": 4 } as React.CSSProperties}
        >
          <HeroCTAs />
        </div>
      </div>

      <ScrollCue />
    </section>
  );
}
