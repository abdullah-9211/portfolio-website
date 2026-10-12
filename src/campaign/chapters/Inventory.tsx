"use client";

import { useState } from "react";
import {
  python,
  golang,
  sql,
  javascript,
  reactNative,
  nodejs,
  expressjs,
  tensorflow,
  keras,
  mediapipe,
  docker,
  kubernetes,
  helm,
  aws,
  claudeCode,
  type TechItem,
} from "@/data/tech";
import { projects } from "@/data/projects";
import { certifications, type Certification } from "@/data/certifications";
import { TechIcon } from "@/components/skills/TechIcon";
import { Reveal } from "@/campaign/ui/Reveal";
import { ExternalGlyph } from "@/campaign/ui/glyphs";

type TabId = "languages" | "frameworks" | "tools" | "credentials";

const tabs: { id: TabId; label: string; items: TechItem[] }[] = [
  { id: "languages", label: "Languages", items: [python, golang, sql, javascript] },
  { id: "frameworks", label: "Frameworks", items: [reactNative, nodejs, expressjs, tensorflow, keras, mediapipe] },
  { id: "tools", label: "Tools", items: [docker, kubernetes, helm, aws, claudeCode] },
  { id: "credentials", label: "Credentials", items: [] },
];

/** Which credential backs which tool, by credential name. */
const certFor: Record<string, string> = {
  Python: "Python for Everybody",
  SQL: "SQL — The Complete Developer's Guide (MySQL, PostgreSQL)",
  Docker: "Docker and Kubernetes",
  Kubernetes: "Docker and Kubernetes",
};

const displayName = (name: string) => name.replace(" — ", ": ");

/** The kit, laid out like an inventory screen: pick a slot to see where that item shows up. */
export function Inventory() {
  const [tab, setTab] = useState<TabId>("languages");
  const [picked, setPicked] = useState<Record<TabId, number>>({ languages: 0, frameworks: 0, tools: 0, credentials: 0 });
  const active = tabs.find((t) => t.id === tab)!;
  const index = picked[tab];

  const onTabKey = (e: React.KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === tab);
    let next = i;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    setTab(tabs[next].id);
    document.getElementById(`inv-tab-${tabs[next].id}`)?.focus();
  };

  return (
    <section id="inventory" className="inventory" aria-labelledby="inventory-heading">
      <div className="wrap">
        <Reveal className="inventory-head" stagger={70}>
          <h2 id="inventory-heading" className="display-caps h-chapter">
            Inventory
          </h2>
          <p className="body">What I carry. Pick a slot to see where it shows up in the story.</p>
        </Reveal>

        <div className="inv">
          <div className="inv-tabs" role="tablist" aria-label="Inventory sections" onKeyDown={onTabKey}>
            {tabs.map((t) => (
              <button
                key={t.id}
                id={`inv-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                aria-controls="inv-panel"
                tabIndex={tab === t.id ? 0 : -1}
                className="inv-tab"
                onClick={() => setTab(t.id)}
              >
                {t.label}
                <span className="inv-tab-count tnum">{t.id === "credentials" ? certifications.length : t.items.length}</span>
              </button>
            ))}
          </div>

          <div id="inv-panel" role="tabpanel" aria-labelledby={`inv-tab-${tab}`} className="inv-panel" key={tab}>
            <ul className="inv-grid">
              {tab === "credentials"
                ? certifications.map((c, i) => (
                    <li key={c.name}>
                      <button
                        type="button"
                        className="inv-slot inv-slot-cert"
                        aria-pressed={index === i}
                        onClick={() => setPicked((p) => ({ ...p, [tab]: i }))}
                      >
                        <CertGlyph />
                        <span className="inv-slot-name">{displayName(c.name)}</span>
                      </button>
                    </li>
                  ))
                : active.items.map((item, i) => (
                    <li key={item.name}>
                      <button
                        type="button"
                        className="inv-slot"
                        aria-pressed={index === i}
                        onClick={() => setPicked((p) => ({ ...p, [tab]: i }))}
                      >
                        <TechIcon item={item} className="inv-slot-icon" />
                        <span className="inv-slot-name">{item.name}</span>
                      </button>
                    </li>
                  ))}
            </ul>

            <div className="inv-detail" aria-live="polite">
              {tab === "credentials" ? (
                <CertDetail cert={certifications[index]} />
              ) : (
                <TechDetail item={active.items[index]} category={active.label} />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TechDetail({ item, category }: { item: TechItem; category: string }) {
  const seenIn = projects.filter((p) => p.tags.some((t) => t.name === item.name));
  const cert = certifications.find((c) => c.name === certFor[item.name]);
  return (
    <>
      <div className="inv-detail-head">
        <span className="inv-detail-icon" style={{ color: item.color === "#000000" ? "var(--parch)" : item.color }}>
          <TechIcon item={item} />
        </span>
        <div>
          <p className="inv-detail-kind">{category}</p>
          <h3 className="display inv-detail-name">{item.name}</h3>
        </div>
      </div>
      <dl className="inv-facts">
        {seenIn.length > 0 && (
          <div>
            <dt>Used in</dt>
            <dd>{seenIn.map((p) => p.name).join(", ")}</dd>
          </div>
        )}
        {cert && (
          <div>
            <dt>Credential</dt>
            <dd>
              <a href={cert.href} target="_blank" rel="noreferrer">
                {displayName(cert.name)}, {cert.issuer} <ExternalGlyph />
              </a>
            </dd>
          </div>
        )}
        {seenIn.length === 0 && !cert && (
          <div>
            <dt>Listed under</dt>
            <dd>{category}, on the resume</dd>
          </div>
        )}
      </dl>
    </>
  );
}

function CertDetail({ cert }: { cert: Certification }) {
  return (
    <>
      <div className="inv-detail-head">
        <span className="inv-detail-icon inv-detail-icon-cert">
          <CertGlyph />
        </span>
        <div>
          <p className="inv-detail-kind">Credential</p>
          <h3 className="display inv-detail-name">{displayName(cert.name)}</h3>
        </div>
      </div>
      <dl className="inv-facts">
        <div>
          <dt>Issued by</dt>
          <dd>{cert.issuer}</dd>
        </div>
        {cert.range && (
          <div>
            <dt>Completed</dt>
            <dd className="tnum">{cert.range.replace(" — ", " to ")}</dd>
          </div>
        )}
      </dl>
      <a className="btn btn-ghost" href={cert.href} target="_blank" rel="noreferrer">
        View credential <ExternalGlyph />
      </a>
    </>
  );
}

function CertGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="inv-slot-icon" aria-hidden="true">
      <path d="M5 3h14v12H5z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7h8M8 10.5h5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 14l1.5 7 2-2 2 2 1.5-7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
