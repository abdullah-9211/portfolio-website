export type Role = "Analyst" | "Engineer" | "Contractor" | "Service account";
export type Action = "Read" | "Write" | "Delete";
export type Label = "Public" | "Internal" | "PII" | "Financial";
export type System = "Snowflake" | "Databricks" | "SharePoint";

export type Request = {
  id: number;
  role: Role;
  action: Action;
  system: System;
  label: Label;
};

export type Rule = {
  id: string;
  text: string;
  /** True when this rule forbids the request. */
  denies: (r: Request) => boolean;
};

export type Wave = {
  name: string;
  /** What changed, shown when the policy is pushed. */
  note: string;
  rules: Rule[];
  /** Ids of rules that are new or changed in this wave. */
  changed: string[];
  count: number;
  /** Seconds allowed per request. */
  seconds: number;
};

const noDelete: Rule = {
  id: "no-delete",
  text: "Nobody deletes anything.",
  denies: (r) => r.action === "Delete",
};
const piiEngineers: Rule = {
  id: "pii",
  text: "PII is for engineers only.",
  denies: (r) => r.label === "PII" && r.role !== "Engineer",
};
const contractorsPublic: Rule = {
  id: "contractors",
  text: "Contractors get Public data only.",
  denies: (r) => r.role === "Contractor" && r.label !== "Public",
};
const piiQuarantine: Rule = {
  id: "pii",
  text: "PII is quarantined. Nobody touches it.",
  denies: (r) => r.label === "PII",
};
const serviceReadOnly: Rule = {
  id: "service",
  text: "Service accounts read. They never write or delete.",
  denies: (r) => r.role === "Service account" && r.action !== "Read",
};
const deleteInternal: Rule = {
  id: "no-delete",
  text: "Only engineers delete, and only Internal data.",
  denies: (r) => r.action === "Delete" && !(r.role === "Engineer" && r.label === "Internal"),
};

export const waves: Wave[] = [
  {
    name: "Policy v1",
    note: "Two rules. Anything they do not forbid is allowed.",
    rules: [noDelete, piiEngineers],
    changed: ["no-delete", "pii"],
    count: 7,
    seconds: 7,
  },
  {
    name: "Policy v2",
    note: "A new rule for contractors.",
    rules: [noDelete, piiEngineers, contractorsPublic],
    changed: ["contractors"],
    count: 8,
    seconds: 6,
  },
  {
    name: "Policy v3",
    note: "An incident. PII is quarantined, service accounts are locked down, and one delete is now legal.",
    rules: [deleteInternal, piiQuarantine, contractorsPublic, serviceReadOnly],
    changed: ["no-delete", "pii", "service"],
    count: 9,
    seconds: 5,
  },
];

export type Verdict = { allow: boolean; rule: Rule | null };

export function judge(request: Request, wave: Wave): Verdict {
  const rule = wave.rules.find((r) => r.denies(request)) ?? null;
  return { allow: rule === null, rule };
}

const roles: Role[] = ["Analyst", "Engineer", "Contractor", "Service account"];
const actions: Action[] = ["Read", "Read", "Write", "Delete"];
const labels: Label[] = ["Public", "Internal", "PII", "Financial"];
const systems: System[] = ["Snowflake", "Databricks", "SharePoint"];

function pick<T>(list: T[], rand: () => number): T {
  return list[Math.floor(rand() * list.length)];
}

/** A small seeded generator, so a shift is fair but different every time. */
export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Requests for one wave. Roughly half should be allowed, and each changed
 * rule is exercised at least once so a policy update always matters.
 */
export function makeRequests(wave: Wave, rand: () => number, startId: number): Request[] {
  const out: Request[] = [];
  let id = startId;
  const make = (): Request => ({
    id: id++,
    role: pick(roles, rand),
    action: pick(actions, rand),
    system: pick(systems, rand),
    label: pick(labels, rand),
  });

  for (const ruleId of wave.changed) {
    const rule = wave.rules.find((r) => r.id === ruleId);
    if (!rule) continue;
    for (let tries = 0; tries < 200; tries++) {
      const r = make();
      if (rule.denies(r) && judge(r, wave).rule === rule) {
        out.push(r);
        break;
      }
    }
  }
  let allowed = 0;
  let guard = 0;
  while (out.length < wave.count && guard++ < 2000) {
    const r = make();
    const ok = judge(r, wave).allow;
    const wantAllow = allowed < Math.ceil(wave.count / 2);
    if (ok !== wantAllow && rand() < 0.75) continue;
    if (ok) allowed++;
    out.push(r);
  }
  // Shuffle so the guaranteed denials are not always first.
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
