import type { TechItem } from "./tech";
import {
  mediapipe,
  fastapi,
  opencv,
  reactNative,
  supabase,
  firebase,
  java,
  androidStudio,
  python,
  networkx,
  nltk,
  matplotlib,
} from "./tech";

export type Project = {
  name: string;
  range: string;
  description: string;
  tags: TechItem[];
};

export const projects: Project[] = [
  {
    name: "Move",
    range: "Sept 2023 — May 2024",
    description:
      "A mobile fitness app that watches your form while you train — pose estimation compares your posture against a trainer's and flags what to fix.",
    tags: [mediapipe, fastapi, opencv, reactNative, supabase, firebase],
  },
  {
    name: "What On Earth",
    range: "Nov 2022 — Dec 2022",
    description:
      "An Android game about climate choices — every decision shifts biodiversity, population, and currency, and the game keeps going until the planet doesn't.",
    tags: [java, firebase, androidStudio],
  },
  {
    name: "Web Scraping Project",
    range: "Nov 2021 — Dec 2021",
    description:
      "A console app that scraped Pakistani university sites (NUST, FAST, LUMS), classified the text into nouns/verbs/adjectives, and graphed the most common nouns with NetworkX.",
    tags: [python, networkx, nltk, matplotlib],
  },
];
