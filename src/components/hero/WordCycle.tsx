import clsx from "clsx";

// Each word is tinted to match the palette it'll actually pay off in
// further down the page (Founder → Valkrix gradient, Baller → court
// orange from the sports off-duty card, Coffee Guy → crema/latte-art
// cream, Gamer → console cyan) — a preview thread into the rest of the
// site, not an arbitrary color choice. Coffee Guy uses the lighter crema
// tone rather than the darker roast brown specifically so it doesn't
// read as "the same orange" as Baller.
type WordItem = { text: string; color: string; gradient?: boolean };

const WORDS: WordItem[] = [
  { text: "Engineer", color: "#35e8b8" },
  { text: "Founder", color: "#a85de8", gradient: true },
  { text: "Baller", color: "#e8720c" },
  { text: "Coffee Guy", color: "#e4c9a0" },
  { text: "Gamer", color: "#4cd3ff" },
];

const LONGEST_WORD = "Coffee Guy";

/**
 * Pure CSS word rotator — no JS, works with zero-JS visitors (all words
 * are real text in the DOM; under reduced-motion they collapse to a
 * plain static list via the CSS in globals.css rather than trying to
 * "pause" on one word, which would need JS to pick a word deliberately).
 */
export function WordCycle() {
  return (
    <span className="word-cycle align-bottom">
      {/* Normal-flow, invisible — absolutely-positioned children below
          don't contribute to the inline-block parent's intrinsic width,
          so without this the container collapses to zero width and every
          word renders with nothing visible. This sizes it to the widest
          word instead of a guessed ch value. */}
      <span
        className="word-cycle-sizer font-display font-extrabold invisible"
        aria-hidden="true"
      >
        {LONGEST_WORD}
      </span>
      {WORDS.map((item, i) => (
        <span
          key={item.text}
          className={clsx(
            "word-cycle-item font-display font-extrabold",
            item.gradient && "text-gradient-valkrix"
          )}
          style={
            {
              "--i": i,
              ...(item.gradient ? {} : { color: item.color }),
            } as React.CSSProperties
          }
        >
          {item.text}
        </span>
      ))}
    </span>
  );
}
