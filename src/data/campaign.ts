/** The regions of the story, in the order the page visits them. */
export type RegionId =
  | "fast"
  | "securiti"
  | "pass"
  | "veeam"
  | "valkrix"
  | "forge"
  | "camp"
  | "next";

export type Region = {
  id: RegionId;
  /** Element id the map travels to. */
  anchor: string;
  /** Chapter numeral, or null for places that are not chapters. */
  numeral: string | null;
  name: string;
  /** Short line under the name on the map and in the menu. */
  note: string;
  years: string;
  /** Position on the 1000 x 1100 map. */
  x: number;
  y: number;
  tint: string;
  /** Which side of the marker the label sits on. */
  labelSide: "left" | "right";
};

export const regions: Region[] = [
  {
    id: "fast",
    anchor: "chapter-fast",
    numeral: "I",
    name: "FAST NUCES",
    note: "The starting area",
    years: "2020 to 2024",
    x: 300,
    y: 968,
    tint: "#9ccb6b",
    labelSide: "right",
  },
  {
    id: "securiti",
    anchor: "chapter-securiti",
    numeral: "II",
    name: "Securiti.ai",
    note: "Data access control",
    years: "2024 to 2025",
    x: 660,
    y: 790,
    tint: "#5fd4e6",
    labelSide: "right",
  },
  {
    id: "pass",
    anchor: "cutscene-acquisition",
    numeral: null,
    name: "The $1.725B pass",
    note: "Acquisition",
    years: "December 2025",
    x: 410,
    y: 612,
    tint: "#d8b878",
    labelSide: "left",
  },
  {
    id: "veeam",
    anchor: "chapter-veeam",
    numeral: "III",
    name: "Veeam Software",
    note: "Current main quest",
    years: "2025 to now",
    x: 700,
    y: 452,
    tint: "#3ddc84",
    labelSide: "right",
  },
  {
    id: "valkrix",
    anchor: "chapter-valkrix",
    numeral: "IV",
    name: "Valkrix",
    note: "A company of our own",
    years: "2026",
    x: 330,
    y: 318,
    tint: "#b78cf5",
    labelSide: "left",
  },
  {
    id: "forge",
    anchor: "chapter-forge",
    numeral: null,
    name: "The Forge",
    note: "Our co-working space",
    years: "2026",
    x: 548,
    y: 196,
    tint: "#e0a83a",
    labelSide: "right",
  },
  {
    id: "camp",
    anchor: "side-quests",
    numeral: null,
    name: "Base camp",
    note: "Side quests",
    years: "Off the clock",
    x: 850,
    y: 640,
    tint: "#f08a4b",
    labelSide: "left",
  },
  {
    id: "next",
    anchor: "ending",
    numeral: null,
    name: "Uncharted",
    note: "What we build next",
    years: "Open",
    x: 720,
    y: 70,
    tint: "#ede6d6",
    labelSide: "left",
  },
];

/** The walked route, as region ids. Base camp is a detour off it, drawn separately on the map. */
export const mainRoute: RegionId[] = ["fast", "securiti", "pass", "veeam", "valkrix", "forge", "next"];

export const regionById = Object.fromEntries(regions.map((r) => [r.id, r])) as Record<RegionId, Region>;

export type TrophyId =
  | "silver-medal"
  | "deans-list"
  | "shipped-move"
  | "hired"
  | "promoted"
  | "acquired"
  | "founder"
  | "forge-open"
  | "game-gatekeeper"
  | "game-formcheck"
  | "game-earth"
  | "the-end";

export type Trophy = {
  id: TrophyId;
  title: string;
  detail: string;
  /** How a locked trophy is described in the menu. */
  hint: string;
  kind: "story" | "game";
};

export const trophies: Trophy[] = [
  {
    id: "silver-medal",
    title: "Silver Medal",
    detail: "Awarded for the Fall 2021 semester.",
    hint: "Reach FAST NUCES.",
    kind: "story",
  },
  {
    id: "deans-list",
    title: "Dean's List, every time",
    detail: "Every semester with a 3.5+ SGPA.",
    hint: "Read the FAST NUCES chapter.",
    kind: "story",
  },
  {
    id: "shipped-move",
    title: "Shipped Move",
    detail: "A fitness app that checks your form with pose estimation.",
    hint: "Find Move in the FAST NUCES chapter.",
    kind: "story",
  },
  {
    id: "hired",
    title: "Hired",
    detail: "Joined Securiti.ai, June 2024.",
    hint: "Reach Securiti.ai.",
    kind: "story",
  },
  {
    id: "promoted",
    title: "Level up",
    detail: "Associate to Software Development Engineer in 13 months.",
    hint: "Keep reading at Securiti.ai.",
    kind: "story",
  },
  {
    id: "acquired",
    title: "$1.725B",
    detail: "Veeam acquired Securiti. Same team, same codebase.",
    hint: "Cross the pass.",
    kind: "story",
  },
  {
    id: "founder",
    title: "Founder",
    detail: "Co-founded Valkrix with two friends.",
    hint: "Reach Valkrix.",
    kind: "story",
  },
  {
    id: "forge-open",
    title: "Doors open",
    detail: "A co-working space in DHA Phase II, Islamabad.",
    hint: "Visit The Forge.",
    kind: "story",
  },
  {
    id: "game-gatekeeper",
    title: "Gatekeeper",
    detail: "Finished a shift without a breach.",
    hint: "Finish Gatekeeper with zero breaches.",
    kind: "game",
  },
  {
    id: "game-formcheck",
    title: "Good form",
    detail: "Scored 85% or better in Form Check.",
    hint: "Score 85% or better in Form Check.",
    kind: "game",
  },
  {
    id: "game-earth",
    title: "Still habitable",
    detail: "Kept the planet alive to 2100.",
    hint: "Reach 2100 in What On Earth.",
    kind: "game",
  },
  {
    id: "the-end",
    title: "Roll credits",
    detail: "Read the whole story.",
    hint: "Reach the end.",
    kind: "story",
  },
];

export const trophyById = Object.fromEntries(trophies.map((t) => [t.id, t])) as Record<TrophyId, Trophy>;

export const contact = {
  email: "abd.umar.1102@gmail.com",
  phone: "+92 312 2166999",
  linkedin: "https://www.linkedin.com/in/abdullah-umar-166440219",
  github: "https://github.com/abdullah-9211",
  resume: "/resume/abdullah-umar-resume.pdf",
};

/** Every stop on the page, in order. This drives the menu and the HUD readout. */
export type Stop = {
  anchor: string;
  label: string;
  /** Shown beside the label in the HUD. */
  numeral?: string;
  region?: RegionId;
};

export const stops: Stop[] = [
  { anchor: "world-map", label: "The map" },
  { anchor: "chapter-fast", label: "FAST NUCES", numeral: "I", region: "fast" },
  { anchor: "chapter-securiti", label: "Securiti.ai", numeral: "II", region: "securiti" },
  { anchor: "cutscene-acquisition", label: "The acquisition", region: "pass" },
  { anchor: "chapter-veeam", label: "Veeam Software", numeral: "III", region: "veeam" },
  { anchor: "chapter-valkrix", label: "Valkrix", numeral: "IV", region: "valkrix" },
  { anchor: "chapter-forge", label: "The Forge", region: "forge" },
  { anchor: "inventory", label: "Inventory" },
  { anchor: "side-quests", label: "Side quests", region: "camp" },
  { anchor: "ending", label: "Let's build", region: "next" },
];

export const games = [
  { anchor: "game-earth", name: "What On Earth", note: "Keep the planet alive to 2100" },
  { anchor: "game-formcheck", name: "Form Check", note: "Match the trainer's pose" },
  { anchor: "game-gatekeeper", name: "Gatekeeper", note: "Allow or deny, before a breach" },
] as const;
