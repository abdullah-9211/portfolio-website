import Image from "next/image";
import { ChapterTitle } from "./ChapterTitle";
import { Reveal } from "@/campaign/ui/Reveal";
import { TrophyTrigger } from "@/campaign/ui/TrophyTrigger";
import { ForgeMascot } from "./ForgeMascot";
import { ValkrixMark } from "./ValkrixMark";
import { Photo } from "@/campaign/ui/Photo";
import { ExternalGlyph } from "@/campaign/ui/glyphs";
import { ForgeRail } from "./ForgeRail";

/** Facts in this section are as published on valkrix.com in October 2026. */
const products = [
  {
    name: "Visquire",
    status: "Launching 2026",
    live: false,
    kind: "Computer vision agent",
    line: "Turns the CCTV a business already owns into an agent it can instruct in plain English, Urdu or Arabic. It watches for the rules it is given and calls the right person when one is broken.",
    href: "https://visquire.com",
    link: "visquire.com",
  },
  {
    name: "ChemAssist",
    status: "Live",
    live: true,
    kind: "Pharmacy workflow AI, UK",
    line: "A patient app for requesting services before arrival, paired with an AI-assisted admin that prioritises the pharmacist's day. Running in more than eight pharmacies, with SOC 2 compliance.",
    href: "https://thechemassist.co.uk",
    link: "thechemassist.co.uk",
  },
  {
    name: "The Forge",
    status: "Live",
    live: true,
    kind: "Co-working platform",
    line: "The co-working space in Islamabad and the platform that runs it: bookings, memberships and a 3D tour. We built it because we work in it every day.",
    href: "https://theforge.pk",
    link: "theforge.pk",
  },
];

const numbers = [
  { value: "3", label: "Products built and run in-house" },
  { value: "40+", label: "Engagements shipped" },
  { value: "8+", label: "Pharmacies on ChemAssist" },
  { value: "99.9%", label: "Uptime across managed systems" },
];

const disciplines = [
  "Computer vision and video AI",
  "Agents and LLM applications",
  "Voice and multilingual AI",
  "Edge and on-prem AI",
  "Data and ML platforms",
  "AI for regulated industries",
];

export function ChapterValkrix() {
  return (
    <>
      <ChapterTitle
        region="valkrix"
        place="Islamabad"
        seed={47}
        lede="An AI product company, co-founded with two friends. I am its COO."
      />
      <div className="chapter" style={{ "--region": "#b78cf5" } as React.CSSProperties}>
        <section className="building" aria-labelledby="valkrix-building">
          <div className="building-photo">
            <Image
              src="/photos/forge/building.webp"
              alt="The front of a commercial building in Islamabad with a The Forge sign on the left and a Valkrix sign on the right."
              width={1600}
              height={1136}
              sizes="100vw"
            />
          </div>
          <div className="wrap building-copy">
            <Reveal stagger={80}>
              <h3 id="valkrix-building" className="display h-big">
                Then we put our names on a building.
              </h3>
              <p className="body">
                Same floor, left and right: The Forge and Valkrix. One is the company, the other is where it works.
              </p>
            </Reveal>
            <TrophyTrigger id="founder" />
          </div>
        </section>

        <section className="wrap spread valkrix" aria-labelledby="valkrix-what">
          <Reveal className="spread-text" stagger={70}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="valkrix-logo" src="/logos/valkrix.jpg" alt="Valkrix" width={538} height={86} />
            <h3 id="valkrix-what" className="display h-big">
              We build AI that does the work.
            </h3>
            <p className="body">
              Valkrix is an AI product company. We ship our own products, and build other people&rsquo;s with the same
              senior team. Founder-led, engineer-heavy, and you see working software every week.
            </p>
            <dl className="statline">
              <div>
                <dt>My role</dt>
                <dd>Founder and COO, one of three founders</dd>
              </div>
              <div>
                <dt>Based</dt>
                <dd>Islamabad, working globally</dd>
              </div>
            </dl>
            <a className="btn btn-ghost" href="https://valkrix.com" target="_blank" rel="noreferrer">
              valkrix.com <ExternalGlyph />
            </a>
          </Reveal>
          <div className="spread-visual">
            <ValkrixMark />
          </div>
        </section>

        <section className="wrap vnumbers" aria-label="Valkrix in numbers, from valkrix.com">
          <Reveal as="ul" className="vnumbers-list" stagger={90}>
            {numbers.map((n) => (
              <li key={n.label}>
                <span className="display tnum vnumbers-value">{n.value}</span>
                <span className="vnumbers-label">{n.label}</span>
              </li>
            ))}
          </Reveal>
        </section>

        <section className="wrap vproducts" aria-labelledby="valkrix-products">
          <Reveal className="vproducts-head" stagger={70}>
            <h3 id="valkrix-products" className="display h-section">
              We ship our own AI. Then we build yours.
            </h3>
            <p className="body">Three products, designed, built and operated by Valkrix.</p>
          </Reveal>
          <Reveal as="ul" className="vproducts-list" stagger={110}>
            {products.map((p, i) => (
              <li key={p.name} className="vproduct">
                <span className="vproduct-index display tnum" aria-hidden="true">
                  0{i + 1}
                </span>
                <div className="vproduct-main">
                  <p className="vproduct-status" data-live={p.live}>
                    <span aria-hidden="true" />
                    {p.status}
                  </p>
                  <p className="display vproduct-name">{p.name}</p>
                  <p className="vproduct-kind">{p.kind}</p>
                </div>
                <p className="vproduct-line">{p.line}</p>
                <a className="vproduct-link" href={p.href} target="_blank" rel="noreferrer">
                  {p.link} <ExternalGlyph />
                </a>
              </li>
            ))}
          </Reveal>
        </section>

        <section className="wrap spread spread-flip valkrix-work" aria-labelledby="valkrix-ai">
          <Reveal className="spread-text" stagger={70}>
            <h3 id="valkrix-ai" className="display h-section">
              AI first. Everything else, second.
            </h3>
            <p className="body">
              Six disciplines we ship to production, backed by the full stack that carries them: cloud, web and
              mobile, security, and data.
            </p>
            <ul className="worklist">
              {disciplines.map((d) => (
                <li key={d}>
                  <p className="worklist-name">{d}</p>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal className="spread-visual">
            <Photo
              src="/photos/forge/office.webp"
              alt="A desk with a laptop and a globe in an office, with a Valkrix sign on the wall behind it."
              width={1600}
              height={1200}
              caption="The Valkrix office, before it all started"
            />
          </Reveal>
        </section>
      </div>

      <ChapterTitle
        region="forge"
        place="DHA Phase II, Islamabad"
        seed={59}
        lede="A co-working space for people who would rather build than commute."
      />
      <div className="chapter chapter-forge" style={{ "--region": "#e0a83a" } as React.CSSProperties}>
        <section className="wrap spread forge" aria-labelledby="forge-what">
          <Reveal className="spread-text" stagger={70}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="forge-logo" src="/logos/the-forge-v3.jpg" alt="The Forge co-working space" width={1142} height={243} />
            <h3 id="forge-what" className="display h-section">
              Where work gets forged.
            </h3>
            <p className="body">
              Owned and run by Valkrix. An open, air-conditioned, well-lit first-floor space for solo developers and
              teams of up to five, with fast Wi-Fi, a meeting room, a kitchenette, a lounge and solar power.
            </p>
            <dl className="statline">
              <div>
                <dt>Open</dt>
                <dd>Monday to Friday, 9 AM to 6 PM</dd>
              </div>
              <div>
                <dt>Desks</dt>
                <dd>Day passes to dedicated monthly desks</dd>
              </div>
            </dl>
            <a className="btn btn-ghost" href="https://theforge.pk" target="_blank" rel="noreferrer">
              theforge.pk <ExternalGlyph />
            </a>
            <TrophyTrigger id="forge-open" />
          </Reveal>
          <ForgeMascot />
        </section>
        <ForgeRail />
      </div>
    </>
  );
}
