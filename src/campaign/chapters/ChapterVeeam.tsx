import { ChapterTitle } from "./ChapterTitle";
import { Reveal } from "@/campaign/ui/Reveal";

const objectives = [
  {
    title: "Backup and snapshot policies",
    detail: "Integrated into the product.",
  },
  {
    title: "Audit and event logs",
    detail: "Ingested from Veeam backup systems into the UI.",
  },
  {
    title: "Threat detection",
    detail: "Helped develop a new framework, and the ingestion of threat logs from the Veeam product side.",
  },
];

export function ChapterVeeam() {
  return (
    <>
      <ChapterTitle
        region="veeam"
        place="Islamabad"
        seed={31}
        lede="The current main quest. Same team, same codebase, a much bigger map."
      />
      <div className="chapter" style={{ "--region": "#3ddc84" } as React.CSSProperties}>
        <section className="wrap quest" aria-labelledby="veeam-quest">
          <Reveal className="quest-head" stagger={70}>
            <p className="quest-status">
              <span className="quest-live" aria-hidden="true" />
              Main quest, in progress
            </p>
            <h3 id="veeam-quest" className="display h-section">
              Software Development Engineer, Veeam Software
            </h3>
            <p className="body">
              Since December 2025. Veeam&rsquo;s data resilience platform and Securiti&rsquo;s data security and
              governance are now one product family. Three things I have worked on so far:
            </p>
          </Reveal>
          <Reveal as="ul" className="quest-list" stagger={90}>
            {objectives.map((o) => (
              <li key={o.title}>
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className="quest-check">
                  <path d="M12 2 L22 12 L12 22 L2 12Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7.5 12.2 L10.8 15.4 L16.6 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div>
                  <p className="quest-objective">{o.title}</p>
                  <p className="quest-detail">{o.detail}</p>
                </div>
              </li>
            ))}
          </Reveal>
        </section>
      </div>
    </>
  );
}
