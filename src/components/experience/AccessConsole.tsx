"use client";

import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import { useReducedMotion } from "@/components/primitives/ReducedMotionProvider";

/**
 * A second, separate interactive element for the Experience section —
 * client ask (after the rail/ship was twice reworked this session):
 * "something a little more needed... something different too," confirmed
 * to mean a genuinely separate addition, not deeper interactivity on the
 * ship. This is DOM/CSS, not R3F, on purpose: a flat "console" reads as a
 * different visual language from the rail's illustrative 3D spaceship,
 * rather than a second scene competing with it.
 *
 * v2 (client feedback: "love the game... add more access control
 * capabilities... and a visual display which actually shows the access
 * control is being applied" — access denied should visibly mean can't
 * access, access given should visibly mean can access something):
 *
 * - Requester picker: five accounts with different clearance tags
 *   (service accounts, a contractor, an engineer, an on-call/break-glass
 *   admin). Switching identity re-evaluates every resource's ALLOW/DENY
 *   badge live, for the SAME resource — the point being that access
 *   control is a function of (resource, requester), not a fixed label
 *   per row.
 * - The lock/unlock visual: clicking a request runs a check against the
 *   currently selected identity and resolves into an "access result"
 *   panel — a padlock that visibly springs open (and a small simulated
 *   data preview clarifies into view) on ALLOW, or stays shut with a
 *   reject-shake over a redacted, blurred panel on DENY.
 *
 * v3 (client feedback: make it more concise/horizontal — the vertical
 * stack of heading → full-width resource list → full-width result panel
 * → full-width audit trail was taking up too much space — and drop the
 * real-employer framing entirely, "this is independent, nothing to do
 * with them," with full creative license on naming):
 *
 * - This is now a fully invented, self-contained system: no real company,
 *   product, or job of Abdullah's is referenced anywhere. The theme is a
 *   made-up small access-control layer over a handful of invented
 *   resource types — a ledger, a telemetry grid, a dispatch queue, a
 *   contract archive, a feature store — reached over invented URI
 *   schemes (vault://, atlas://, relay://, archive://). Only the MECHANIC
 *   (request a resource as a chosen identity, watch a policy check run,
 *   see a real visual lock open/stay shut, see an audit log) survives
 *   from v2 — the surface theming is entirely new.
 * - Layout: at sm+ widths the resource list and the result-panel/audit
 *   trail sit side by side in a two-column grid instead of stacking full
 *   width one under another — choosing a resource and watching its effect
 *   land are both visible at once, no scrolling between them. Below sm
 *   it falls back to a single column (there's no room to split it there).
 *   Resource rows dropped from three lines to two, trimmed from six
 *   resources to five, and the requester picker collapsed from a
 *   labelled block with its own paragraph to one compact inline row.
 *
 * Still an honest simulation: verdicts are a deterministic function of
 * (resource, requester) — never randomized — and every resolved check
 * still appends a timestamped line to the audit trail.
 */

type Verdict = "ALLOW" | "DENY";

type ClearanceTag = "pipeline" | "ml" | "contractor" | "engineer" | "admin";

type Requester = {
  id: string;
  label: string;
  role: string;
  tag: ClearanceTag;
};

// Five identities spanning a small clearance spectrum: two narrow service
// accounts, a contractor (deliberately excluded from everything — least
// privilege), an engineer, and an on-call admin with break-glass elevated
// access.
const REQUESTERS: Requester[] = [
  { id: "svc-billing-worker", label: "svc-billing-worker", role: "service account · billing scope", tag: "pipeline" },
  { id: "svc-model-trainer", label: "svc-model-trainer", role: "service account · ml scope", tag: "ml" },
  { id: "contractor-jdoe", label: "contractor-jdoe", role: "contractor · no elevated scope", tag: "contractor" },
  { id: "eng-fullstack", label: "eng-fullstack", role: "engineer", tag: "engineer" },
  { id: "admin-oncall", label: "admin-oncall", role: "on-call admin · break-glass", tag: "admin" },
];

const DEFAULT_REQUESTER_ID = REQUESTERS[0].id;

function getRequester(id: string): Requester {
  return REQUESTERS.find((r) => r.id === id) ?? REQUESTERS[0];
}

type ConsoleResource = {
  id: string;
  resource: string;
  ruleLabel: string;
  allowTags: ClearanceTag[];
  allowReason: string;
  denyReason: string;
  checkingLabel: string;
  preview: string[];
};

// Five invented resources behind a small made-up access-control layer —
// no real product or employer, just enough variety in outcomes and policy
// reasons to make the mechanic legible.
const RESOURCES: ConsoleResource[] = [
  {
    id: "ledger",
    resource: "vault://ledger.q3-close",
    ruleLabel: "ledger policy",
    allowTags: ["admin"],
    allowReason: "Elevated access recognized — ledger scope cleared.",
    denyReason: "Ledger scope is elevated-access only.",
    checkingLabel: "checking ledger policy…",
    preview: ["4,208 line items", "period: Q3 close", "scope: finance-read"],
  },
  {
    id: "telemetry",
    resource: "atlas://telemetry.sensor-grid",
    ruleLabel: "telemetry policy",
    allowTags: ["pipeline", "admin"],
    allowReason: "Telemetry policy grants read scope to this account.",
    denyReason: "Telemetry policy has no read grant for this account's scope.",
    checkingLabel: "checking telemetry policy…",
    preview: ["1,882 sensors reporting", "grid: west-cluster", "scope: ops-read"],
  },
  {
    id: "features",
    resource: "atlas://models.feature-store",
    ruleLabel: "column-level policy",
    allowTags: ["ml", "admin"],
    allowReason: "Column-level policy matches this account's training scope.",
    denyReason: "Column-level policy excludes this account from ml scope.",
    checkingLabel: "checking column-level policy…",
    preview: ["64 columns", "snapshot v17", "scope: ml-read"],
  },
  {
    id: "dispatch",
    resource: "relay://broadcast.dispatch-queue",
    ruleLabel: "queue RBAC",
    allowTags: ["engineer", "admin"],
    allowReason: "Queue RBAC grants dispatch access to this role.",
    denyReason: "Queue RBAC excludes this account from dispatch scope.",
    checkingLabel: "checking queue RBAC…",
    preview: ["142 queued messages", "channel: broadcast-primary", "scope: dispatch-rw"],
  },
  {
    id: "archive",
    resource: "archive://legal.contract-drafts",
    ruleLabel: "group membership",
    allowTags: ["admin"],
    allowReason: "Elevated access breaks past group-membership scoping.",
    denyReason: "Scoped to archive-group members; this account isn't a member.",
    checkingLabel: "checking group membership…",
    preview: ["9 contracts", "review queue: legal", "last edit: 2d ago"],
  },
];

function getResource(id: string): ConsoleResource {
  return RESOURCES.find((r) => r.id === id) ?? RESOURCES[0];
}

// Pure, deterministic — never randomized. A real (if tiny) policy check:
// a resource grants a fixed set of clearance tags, an identity carries
// one tag, and access follows from whether they intersect.
function evaluate(resource: ConsoleResource, requester: Requester): Verdict {
  return resource.allowTags.includes(requester.tag) ? "ALLOW" : "DENY";
}

type LogEntry = {
  key: string;
  time: string;
  resource: string;
  requester: string;
  verdict: Verdict;
  isNew: boolean;
};

// Static starting trail — real, complete content with no JS required: a
// no-JS visitor already sees a finished, sensible audit history, not an
// empty box waiting for interaction (same safe-default-then-enhance
// convention as CoffeeRosetta/ScrollReveal). `isNew: false` so these never
// carry the JS-only entrance animation — only entries appended live do.
// Each verdict here is consistent with the (resource, requester) policy
// matrix above, so re-running the same pairing live reproduces it.
const BASE_LOG: LogEntry[] = [
  { key: "base-0", time: "09:41:52", resource: "atlas://telemetry.sensor-grid", requester: "svc-billing-worker", verdict: "ALLOW", isNew: false },
  { key: "base-1", time: "09:40:10", resource: "relay://broadcast.dispatch-queue", requester: "eng-fullstack", verdict: "ALLOW", isNew: false },
  { key: "base-2", time: "09:38:07", resource: "archive://legal.contract-drafts", requester: "eng-fullstack", verdict: "DENY", isNew: false },
  { key: "base-3", time: "09:22:19", resource: "vault://ledger.q3-close", requester: "contractor-jdoe", verdict: "DENY", isNew: false },
];

type ActiveResult = {
  resourceId: string;
  requesterId: string;
  verdict: Verdict;
  key: string;
};

// The "access result" panel's resting state mirrors the most recent log
// line above (base-0) — so the lock/preview visual is already showing a
// real, resolved ALLOW at first paint, not an empty placeholder.
const DEFAULT_ACTIVE_RESULT: ActiveResult = {
  resourceId: "telemetry",
  requesterId: DEFAULT_REQUESTER_ID,
  verdict: "ALLOW",
  key: "base-0",
};

const MAX_LOG_ENTRIES = 4;
const CHECK_DURATION_MS = 650;
const FLASH_DURATION_MS = 450;

// A minimal stroke padlock — square viewBox, currentColor, rounded
// linecaps, matching VerifiedSeal/ProjectGlyph's icon convention. The
// shackle is one path whose transform flips between a "shut" resting
// pose and a "sprung open" pose; color (dim vs signal) carries the
// locked/unlocked read, transform carries the motion. No box-shadow —
// depth/emphasis is color and border only, per the sitewide convention.
function LockIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    // overflow-visible fix (client: "the lock when unlocked gets cut from
    // above"): SVG elements clip their own content to the viewBox by
    // default. The open pose's shackle transform (-translate-y-1 plus a
    // -18deg rotation) pushes its top edge above y=0 in the 0-24 viewBox —
    // with no overflow rule, that portion was silently clipped at the
    // SVG's own viewport boundary rather than by any wrapping div (the
    // actual container around this icon already has generous padding).
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={clsx("overflow-visible", className)}>
      <rect x="5" y="11" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8 11V7.5a4 4 0 0 1 8 0V11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        style={{ transformOrigin: "8px 11px" }}
        className={clsx(
          "transition-transform duration-300 ease-out",
          open && "-translate-y-1 rotate-[-18deg]"
        )}
      />
      <circle cx="12" cy="14.5" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function AccessConsole() {
  const prefersReduced = useReducedMotion();
  const headingId = useId();
  const requesterHeadingId = useId();
  const [log, setLog] = useState<LogEntry[]>(BASE_LOG);
  const [selectedRequesterId, setSelectedRequesterId] = useState(DEFAULT_REQUESTER_ID);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [activeResult, setActiveResult] = useState<ActiveResult>(DEFAULT_ACTIVE_RESULT);
  const timeouts = useRef<number[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    return () => {
      timeouts.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const selectedRequester = getRequester(selectedRequesterId);

  function resolve(r: ConsoleResource, requester: Requester) {
    const verdict = evaluate(r, requester);
    counter.current += 1;
    const key = `live-${counter.current}`;
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setLog((prev) =>
      [{ key, time, resource: r.resource, requester: requester.label, verdict, isNew: true }, ...prev].slice(
        0,
        MAX_LOG_ENTRIES
      )
    );
    setActiveResult({ resourceId: r.id, requesterId: requester.id, verdict, key });
    setFlashId(r.id);
    const t = window.setTimeout(() => setFlashId(null), FLASH_DURATION_MS);
    timeouts.current.push(t);
  }

  function runCheck(r: ConsoleResource) {
    if (checkingId) return; // one check in flight at a time — no overlapping badge states

    if (prefersReduced) {
      // Discrete, instant reaction — no staged "checking" animation (that's
      // continuous motion the client's reduced-motion preference opts out
      // of), but still a real, brief reaction to the click, same convention
      // as AcquisitionMoment/ThreadNode's reduced-motion click handling.
      resolve(r, selectedRequester);
      return;
    }

    setCheckingId(r.id);
    const t1 = window.setTimeout(() => {
      setCheckingId(null);
      resolve(r, selectedRequester);
    }, CHECK_DURATION_MS);
    timeouts.current.push(t1);
  }

  // The panel reflects whichever resource is currently mid-check (a live
  // "verifying" limbo state) or, at rest, the last resolved result — so
  // clicking a request drives the panel through check → resolve exactly
  // like the row badge does, giving the lock/preview its own visible
  // cause-and-effect instead of just mirroring the log silently.
  const panelResource = checkingId ? getResource(checkingId) : getResource(activeResult.resourceId);
  const panelRequester = checkingId ? selectedRequester : getRequester(activeResult.requesterId);
  const panelMode: "checking" | "allow" | "deny" = checkingId
    ? "checking"
    : activeResult.verdict === "ALLOW"
      ? "allow"
      : "deny";

  return (
    <div className="mt-4 border-t border-line pt-12 sm:pt-16">
      <p className="font-mono text-xs uppercase tracking-widest text-dim">simulated policy engine</p>
      <h3 id={headingId} className="font-display mt-2 text-xl font-bold text-paper sm:text-2xl">
        Same shape, smaller scale
      </h3>
      <p className="mt-3 max-w-2xl leading-relaxed text-dim">
        Every row above involves systems like these — a request comes in, a policy decides, the
        decision gets logged. A small, invented access-control layer, not a live backend.
      </p>

      {/* Requester picker — compact single row (client ask: keep it less
          prominent than the resource list). The same resource can resolve
          differently depending on who's asking: switching identity
          re-evaluates every row's badge immediately; the lock/preview
          panel only updates once a check is actually run. */}
      <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
        <p id={requesterHeadingId} className="shrink-0 font-mono text-xs uppercase tracking-widest text-dim">
          requesting as
        </p>
        <div role="group" aria-labelledby={requesterHeadingId} className="flex flex-wrap gap-1.5">
          {REQUESTERS.map((req) => {
            const isSelected = req.id === selectedRequesterId;
            return (
              <button
                key={req.id}
                type="button"
                onClick={() => setSelectedRequesterId(req.id)}
                aria-pressed={isSelected}
                disabled={checkingId !== null}
                className={clsx(
                  "rounded-sm border px-2 py-1 font-mono text-[11px] transition-colors duration-300 ease-out",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2",
                  "disabled:cursor-default disabled:opacity-60",
                  isSelected
                    ? "border-signal/50 bg-signal/10 text-signal"
                    : "border-line text-dim hover:border-dim/60 hover:text-paper"
                )}
              >
                {req.label}
              </button>
            );
          })}
        </div>
        <span className="font-mono text-[11px] text-dim/70">{selectedRequester.role}</span>
      </div>

      {/* Horizontal split at sm+: the resource list and the result-panel
          / audit trail sit side by side, so choosing a resource and
          seeing its effect land are visible together without scrolling
          between two full-width blocks. Falls back to a single column
          below sm, where there's no room to split it. */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2 sm:items-start lg:grid-cols-[3fr_2fr]">
        <div
          role="group"
          aria-labelledby={headingId}
          className="min-w-0 divide-y divide-line border-y border-line"
        >
          {RESOURCES.map((r) => {
            const verdict = evaluate(r, selectedRequester);
            const isChecking = checkingId === r.id;
            const isFlashing = flashId === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => runCheck(r)}
                disabled={checkingId !== null && !isChecking}
                className={clsx(
                  "block w-full px-1 py-2.5 text-left transition-colors duration-300 ease-out sm:px-2",
                  "hover:bg-line/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2",
                  "disabled:cursor-default disabled:opacity-60",
                  isFlashing && (verdict === "ALLOW" ? "bg-signal/10" : "bg-line/60")
                )}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate font-mono text-sm text-paper">{r.resource}</span>
                  <span
                    className={clsx(
                      "shrink-0 rounded-sm border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide",
                      verdict === "ALLOW" ? "border-signal/40 text-signal" : "border-line text-dim"
                    )}
                  >
                    <span aria-hidden="true">{isChecking ? "···" : verdict}</span>
                    {isChecking && <span className="sr-only">checking</span>}
                  </span>
                </span>
                <span className="mt-1 block truncate font-mono text-[11px] leading-relaxed text-dim">
                  <span className="text-dim/50 uppercase tracking-wide text-[10px]">{r.ruleLabel}</span>
                  {" — "}
                  {isChecking ? r.checkingLabel : verdict === "ALLOW" ? r.allowReason : r.denyReason}
                </span>
              </button>
            );
          })}
        </div>

        <div className="min-w-0 flex flex-col gap-4">
          {/* The visual effect itself — client ask: "see the access
              control being applied," not just read a verdict. ALLOW
              springs the padlock open and clarifies a small simulated
              data preview into view; DENY keeps it shut (with a one-shot
              reject-shake) over a redacted, blurred panel. */}
          <div className="rounded-card border border-line p-3.5 sm:p-4">
            <p className="font-mono text-xs uppercase tracking-widest text-dim">access result</p>
            <div className="mt-3 flex items-start gap-3">
              <LockIcon
                key={panelMode === "checking" ? "checking" : activeResult.key}
                open={panelMode === "allow"}
                className={clsx(
                  "h-8 w-8 shrink-0",
                  panelMode === "allow" ? "text-signal" : "text-dim",
                  panelMode === "deny" && !prefersReduced && "access-lock-shake"
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm text-paper">{panelResource.resource}</p>
                <p className="mt-0.5 font-mono text-[11px] text-dim">
                  {panelRequester.label}
                  {" · "}
                  <span className={panelMode === "allow" ? "text-signal" : "text-dim"}>
                    {panelMode === "checking" ? "verifying…" : panelMode === "allow" ? "ALLOW" : "DENY"}
                  </span>
                </p>

                <div
                  className={clsx(
                    "mt-2.5 rounded-sm border border-line/70 bg-void/40 p-2.5 transition-all duration-500 ease-out",
                    panelMode === "allow" ? "opacity-100 blur-none" : "opacity-90 blur-[3px]"
                  )}
                >
                  {panelMode === "allow" ? (
                    <>
                      <p className="font-mono text-[10px] uppercase tracking-wide text-dim">
                        preview (simulated)
                      </p>
                      <ul className="mt-1 space-y-0.5 font-mono text-xs text-paper/90">
                        {panelResource.preview.map((line) => (
                          <li key={line} className="truncate">
                            {line}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <>
                      <div aria-hidden="true" className="space-y-1">
                        <span className="block h-2 w-full rounded-sm bg-dim/15" />
                        <span className="block h-2 w-4/5 rounded-sm bg-dim/15" />
                      </div>
                      <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wide text-dim">
                        {panelMode === "checking" ? "verifying…" : "redacted — access denied"}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-dim">audit trail</p>
            <ul aria-live="polite" className="mt-2 space-y-1 font-mono text-[11px] text-dim">
              {log.map((entry) => (
                <li
                  key={entry.key}
                  className={clsx(
                    "flex flex-wrap items-baseline gap-x-1.5",
                    entry.isNew && !prefersReduced && "access-log-enter"
                  )}
                >
                  <span className="text-dim/60">{entry.time}</span>
                  <span className="truncate text-dim">{entry.resource}</span>
                  <span className={entry.verdict === "ALLOW" ? "text-signal" : "text-dim"}>
                    {entry.verdict}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
