"use client";

import { useState } from "react";
import { contact, trophies } from "@/data/campaign";
import { useCampaign } from "@/campaign/state/store";
import { Reveal } from "@/campaign/ui/Reveal";
import { TrophyTrigger } from "@/campaign/ui/TrophyTrigger";
import { TrophyGlyph } from "@/campaign/ui/glyphs";
import { ContourField } from "@/campaign/ui/ContourField";
import { useScroll } from "@/campaign/scroll/ScrollProvider";

const summit = [{ x: 0.5, y: 0.46, radius: 0.26, height: 1.1 }];

/** The last screen. The route runs out, and the reader is asked to help draw the next part. */
export function Ending() {
  const earned = useCampaign((s) => s.trophies);
  const scroll = useScroll();
  const [copied, setCopied] = useState(false);
  const missing = trophies.filter((t) => !earned.includes(t.id) && t.id !== "the-end");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(contact.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      window.location.href = `mailto:${contact.email}`;
    }
  };

  return (
    <section id="ending" className="ending" aria-labelledby="ending-heading">
      <ContourField seed={83} color="#ede6d6" alpha={0.12} hills={summit} className="ending-field" />
      <div className="wrap ending-inner">
        <Reveal stagger={90} className="ending-main">
          <p className="ending-kicker">The map ends here</p>
          <h2 id="ending-heading" className="display-caps ending-title">
            Let&rsquo;s build
            <br />
            the next part.
          </h2>
          <p className="ending-lede">
            I am open to interesting problems, ambitious teams, and anyone who wants to talk shop. If you need
            something built and you are not sure it can be done, that is my favourite kind of message.
          </p>
          <div className="ending-actions">
            <a className="btn btn-primary" href={`mailto:${contact.email}`}>
              Email me
            </a>
            <button type="button" className="btn btn-ghost" onClick={copy} aria-live="polite">
              {copied ? "Copied" : "Copy email address"}
            </button>
            <a className="btn btn-ghost" href={contact.resume} download>
              Download resume
            </a>
          </div>
          <ul className="ending-links">
            <li>
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
            </li>
            <li>
              <a href={`tel:${contact.phone.replace(/\s+/g, "")}`} className="tnum">
                {contact.phone}
              </a>
            </li>
            <li>
              <a href={contact.linkedin} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
            </li>
            <li>
              <a href={contact.github} target="_blank" rel="noreferrer">
                GitHub
              </a>
            </li>
          </ul>
        </Reveal>

        <Reveal className="ending-save">
          <p className="ending-save-title">
            <TrophyGlyph size={18} />
            <span>
              Progress saved.{" "}
              <span className="tnum">
                {earned.length} of {trophies.length}
              </span>{" "}
              trophies.
            </span>
          </p>
          {missing.length > 0 ? (
            <ul className="ending-missing">
              {missing.slice(0, 4).map((t) => (
                <li key={t.id}>{t.hint}</li>
              ))}
            </ul>
          ) : (
            <p className="ending-complete">Every one of them. Thank you for reading the whole thing.</p>
          )}
          <button type="button" className="slate-link" onClick={() => scroll.scrollTo(0)}>
            Back to the title screen
          </button>
        </Reveal>
        <TrophyTrigger id="the-end" />
      </div>
      <footer className="wrap ending-foot">
        <p>Islamabad, Pakistan</p>
        <p>
          Link model by{" "}
          <a href="https://sketchfab.com/3d-models/ocarina-of-time-link-c62717add333410987482d44959e56c7" target="_blank" rel="noreferrer">
            projectmgame
          </a>
          , CC BY 4.0
        </p>
        <p>© 2026 Abdullah Umar</p>
      </footer>
    </section>
  );
}
