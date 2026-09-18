"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "@/components/primitives/ReducedMotionProvider";
import { JourneySpineScene } from "./JourneySpineModel";

// The nine real page sections, in DOM order, identified by the exact
// heading `id`s already used sitewide (SectionHeading's `id` prop —
// unchanged by this component, per the "don't change any heading ids"
// constraint). `document.getElementById(id).closest("section")` gets the
// section's own wrapping element to measure, the same
// getBoundingClientRect-based technique ExperienceSection used for its
// old row-scoped rail, just applied to whole sections instead of rows.
const SECTION_HEADING_IDS = [
  "about-heading",
  "experience-heading",
  "ventures-heading",
  "projects-heading",
  "skills-heading",
  "certifications-heading",
  "education-heading",
  "offduty-heading",
  "contact-heading",
] as const;

// Hex pulled directly from each section's own `.wash-*` rgba triples in
// globals.css (search `.wash-`) — reusing the exact accents those washes
// already established per section, rather than inventing a new palette:
// About=paper, Experience=signal mint, Ventures=Valkrix violet,
// Projects=console cyan, Skills=neutral dim, Certifications=signal mint,
// Education=cool silver, Off-duty=court orange, Contact=signal mint
// (brightest of all, matching the wash's own "brightest of all" note).
const SECTION_COLORS = [
  "#f5f3ee",
  "#35e8b8",
  "#a85de8",
  "#4cd3ff",
  "#888d92",
  "#35e8b8",
  "#c9cdd1",
  "#e8720c",
  "#35e8b8",
] as const;

// Client follow-up: "hovered on should show a label which section is
// this." Exact "NN — Title" strings each SectionHeading itself already
// renders (see e.g. about/AboutSection.tsx's `index="01" title="Who I
// am"`) — a hovered checkpoint reads as the same numbering the visitor
// already scrolled past, not a new naming scheme invented for this rail,
// same convention contact/JourneyModel.tsx's own node tooltips use.
const SECTION_LABELS = [
  "01 — Who I am",
  "02 — Where I've worked",
  "03 — What I've built",
  "04 — For fun",
  "05 — Stack",
  "06 — Proof",
  "07 — School",
  "08 — Off duty",
  "09 — Let's talk",
] as const;

// Sensible fallback fractions (evenly spaced) so checkpoints render in a
// reasonable position before the first real DOM measurement lands, same
// convention ExperienceSection's DEFAULT_FRACTIONS used.
const DEFAULT_FRACTIONS = SECTION_HEADING_IDS.map((_, i) => i / (SECTION_HEADING_IDS.length - 1));

// `id` carries each checkpoint's real section heading id straight through
// to JourneySpineModel's click handler (client follow-up: "clicking any
// circle on the path takes us to that section") — same
// document.getElementById(...).scrollIntoView(...) pattern
// contact/JourneyModel.tsx's own node click already proved out.
type Stop = { frac: number; color: string; id: string; label: string };

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

/**
 * Measures each section's own document-relative top edge (`rect.top +
 * window.scrollY`, stable regardless of current scroll position) plus the
 * bottom edge of the last section (Contact) — the full "top of About to
 * bottom of Contact" span the client asked for. Returns null if any
 * section isn't in the DOM yet (first paint before hydration settles).
 */
function measureSections(): { tops: number[]; bottom: number } | null {
  if (typeof document === "undefined") return null;
  const tops: number[] = [];
  for (const id of SECTION_HEADING_IDS) {
    const heading = document.getElementById(id);
    const section = heading?.closest("section");
    if (!section) return null;
    const rect = section.getBoundingClientRect();
    tops.push(rect.top + window.scrollY);
  }
  const lastHeading = document.getElementById(SECTION_HEADING_IDS[SECTION_HEADING_IDS.length - 1]);
  const lastSection = lastHeading?.closest("section");
  const bottom = lastSection
    ? lastSection.getBoundingClientRect().bottom + window.scrollY
    : tops[tops.length - 1];
  return { tops, bottom };
}

/**
 * Full-page traveling spaceship — the client's own words: "go from top to
 * bottom... like from who I am to contact me section... bigger in scale
 * so it accompanies you in the journey." Replaces the old Experience-only
 * rail (CareerThread/CareerThreadModel, now retired) with a single
 * persistent 3D scene that spans the whole scrollable range from About's
 * top to Contact's bottom, one checkpoint per SECTION (not per row).
 *
 * Architecture: a `position: fixed`, viewport-height-tall, narrow strip
 * pinned to the right edge — chosen over an actual document-height Canvas
 * because R3F's camera/scene math stays trivial (one small orthographic
 * scene, same as the old rail) and because a real full-document-height
 * Canvas would be enormous and wasteful to keep mounted. All nine
 * checkpoints render simultaneously at FIXED proportional positions along
 * the strip's own height (a permanent mini-map of the whole page, always
 * visible), and only the SHIP's position is scroll-linked — it glides
 * along that same 0..1 axis as `window.scrollY` moves through the
 * measured About→Contact range. This matches "accompanies you in the
 * journey" literally: the whole journey is always laid out in front of
 * you, and the ship is where you currently are in it.
 *
 * Scroll progress is computed in a plain rAF-throttled scroll/resize
 * listener (this component's own `useEffect` below) and written into a
 * ref, never React state — so scrolling (the single highest-frequency
 * event on this whole page) never triggers a re-render of this tree.
 * `JourneySpineScene`/`TravelingShip`/`CheckpointNode` read that ref
 * directly inside their own `useFrame` callbacks.
 */
export function JourneySpine() {
  const prefersReduced = useReducedMotion();
  const [stops, setStops] = useState<Stop[]>(
    DEFAULT_FRACTIONS.map((frac, i) => ({
      frac,
      color: SECTION_COLORS[i],
      id: SECTION_HEADING_IDS[i],
      label: SECTION_LABELS[i],
    }))
  );
  const [staticCurrentIndex, setStaticCurrentIndex] = useState(0);

  // Written by the scroll handler below, read imperatively inside R3F's
  // useFrame — see JourneySpineModel for why these are refs, not state.
  const progressRef = useRef(0);
  const currentIndexRef = useRef(0);

  // Portal target for checkpoint hover tooltips (see the render below for
  // why) — a plain DOM ref, not R3F state, so it never changes identity.
  const htmlPortalRef = useRef<HTMLDivElement>(null);

  // ── Layout measurement — real section positions, not guessed ones ────
  useEffect(() => {
    function measure() {
      const result = measureSections();
      if (!result) return;
      const { tops, bottom } = result;
      const start = tops[0];
      const span = Math.max(bottom - start, 1);
      setStops(
        tops.map((t, i) => ({
          frac: clamp01((t - start) / span),
          color: SECTION_COLORS[i],
          id: SECTION_HEADING_IDS[i],
          label: SECTION_LABELS[i],
        }))
      );
    }

    measure();
    const raf = requestAnimationFrame(measure);
    const settleTimer = setTimeout(measure, 350); // after web fonts settle, same convention ExperienceSection used

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(document.body);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settleTimer);
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // ── Scroll progress — rAF-throttled, ref-driven, skipped entirely
  // under reduced motion (constraint: no continuous scroll-driven
  // animation loop when the visitor has asked for less motion; the
  // checkpoints above still render, just at a static layout with no
  // progress tracking needed at all). ─────────────────────────────────
  useEffect(() => {
    if (prefersReduced) {
      // One-shot resolution of "which section are you currently near" for
      // the static resting frame's own active-glow — computed once, never
      // updated again, which is the correct reduced-motion behavior.
      const result = measureSections();
      if (result) {
        const anchor = window.scrollY + window.innerHeight * 0.5;
        let idx = 0;
        for (let i = 0; i < result.tops.length; i++) {
          if (result.tops[i] <= anchor) idx = i;
        }
        setStaticCurrentIndex(idx);
      }
      return;
    }

    let ticking = false;
    function update() {
      const result = measureSections();
      if (!result) {
        ticking = false;
        return;
      }
      const { tops, bottom } = result;
      const start = tops[0];
      const span = Math.max(bottom - start, 1);

      // Two different anchors, deliberately: the ship's own progress uses
      // the viewport's BOTTOM edge, not its center — using the center
      // would mean progress could never actually reach 1 at real max
      // scroll (Contact's bottom can only ever get to innerHeight/2 past
      // the viewport's center, never past its bottom edge), so the ship
      // would perpetually fall short of the final checkpoint by about
      // half a screen. The viewport's bottom edge reaches exactly
      // `document.scrollHeight` at max scroll, which is exactly
      // `bottom` here (Contact has no trailing content), so progress
      // reaches exactly 1 right when the page can no longer scroll.
      // "Which section is active" uses the viewport's CENTER instead —
      // better UX match for "what's actually prominently in view," which
      // would trigger far too early (as soon as a section's top merely
      // touches the bottom edge) if it shared the progress anchor.
      const progressAnchor = window.scrollY + window.innerHeight;
      const activeAnchor = window.scrollY + window.innerHeight * 0.5;
      progressRef.current = clamp01((progressAnchor - start) / span);
      let idx = 0;
      for (let i = 0; i < tops.length; i++) {
        if (tops[i] <= activeAnchor) idx = i;
      }
      currentIndexRef.current = idx;
      ticking = false;
    }
    function onScrollOrResize() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [prefersReduced]);

  return (
    // Hidden below `lg` (1024px): main's content column is `max-w-4xl`
    // (896px), so there is no real margin for a strip to occupy without
    // overlapping real content until the viewport is wide enough to leave
    // one — at exactly 1024px that margin is 64px, which `right-0 w-14`
    // (56px) fits inside with room to spare; below that, hiding entirely
    // is the only way to guarantee the "no overlap 320-1920px" constraint
    // holds. Width grows at `xl`/`2xl` where the margin is much wider
    // (192px/320px+), giving the "bigger... a lot bigger" ship real room.
    // Top offset (`top-16` = 64px, CornerNav's own measured rendered
    // height at sm+) keeps the strip's whole span, checkpoint 0 (About)
    // included, clear of the fixed nav bar's own z-50 layer instead of
    // rendering the first checkpoint half-hidden under it — z-20 for the
    // rest of the stack still keeps this strip correctly behind the nav
    // wherever their bounds would otherwise touch.
    // `pointer-events-none` on this wrapper, with only the Canvas itself
    // re-enabling pointer events, plus `aria-hidden` — never able to block
    // anything under it since it never extends into the content column in
    // the first place. Clicking a checkpoint now scrolls to its section
    // (client follow-up: "clicking any circle on the path takes us to that
    // section") — a bonus mouse-only shortcut layered on top of a scene
    // that stays `aria-hidden`, since every section it mirrors is already
    // independently reachable through the real page structure the JS-off/
    // screen-reader/keyboard paths already use; this never becomes the
    // only way to get anywhere.
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-0 right-0 top-16 z-20 hidden w-14 lg:block xl:w-32 2xl:w-40"
    >
      {/* Client follow-up: "the labels you just added aren't fully
          visible, they're cut." Root cause: R3F's <Canvas> wraps its own
          <canvas> element in an internal div with `overflow: hidden`
          (needed so the WebGL surface can never visually spill past its
          own box) — drei's <Html> tooltips append into that same div by
          default, so a label that grows leftward past this strip's own
          ~56px width (the checkpoint sits right at the strip's edge) got
          silently clipped there, leaving only whichever few characters
          landed nearest the checkpoint (e.g. "worked" out of "Where I've
          worked") still inside that box. This div is a sibling one level
          up — same top-left origin as the canvas (both plain `h-full
          w-full`, no padding/border), but with no `overflow: hidden` of
          its own — so passing it as each tooltip's `portal` target (see
          CheckpointNode below) keeps the same on-screen position while
          escaping that specific clip. */}
      <div ref={htmlPortalRef} className="pointer-events-auto h-full w-full">
        <Canvas
          orthographic
          camera={{ zoom: 1, position: [0, 0, 100] }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
          frameloop={prefersReduced ? "demand" : "always"}
        >
          <JourneySpineScene
            stops={stops}
            animate={!prefersReduced}
            progressRef={progressRef}
            currentIndexRef={currentIndexRef}
            staticCurrentIndex={prefersReduced ? staticCurrentIndex : null}
            htmlPortalRef={htmlPortalRef}
          />
        </Canvas>
      </div>
    </div>
  );
}
