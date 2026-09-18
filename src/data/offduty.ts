export type OffDutyCard = {
  id: "basketball" | "gaming" | "coffee" | "running";
  label: string;
  headline: string;
  body: string;
  detail: string;
  href?: string;
  linkLabel?: string;
  cardClassName: string;
};

export const offDutyCards: OffDutyCard[] = [
  {
    id: "basketball",
    label: "Court",
    headline: "Basketball",
    body: "I play regularly, usually pickup games on weekends. It's my favorite way to stay active, and I try to make time for it whenever I can.",
    detail: "Weekend pickup games",
    cardClassName: "card-sports",
  },
  {
    id: "gaming",
    label: "PS5 / Switch",
    headline: "Story-driven games",
    body: "Gaming has been a constant since I was a kid. I'm drawn to narrative-heavy titles — the appeal is less about winning and more about living through a story and seeing where it goes.",
    detail: "Currently on PS5 and Switch",
    cardClassName: "card-gaming",
  },
  {
    id: "coffee",
    label: "Latte art",
    headline: "Coffee, made properly",
    body: "I make my own coffee and post the results. Mostly rosettas so far — still working on a clean tulip pour.",
    detail: "Posted under an alias",
    href: "https://instagram.com/ground_pourfection",
    linkLabel: "@ground_pourfection",
    cardClassName: "card-coffee",
  },
  {
    id: "running",
    label: "Nov 2026",
    headline: "Training for a half marathon",
    body: "Running is the other constant alongside basketball. This one has a race date attached, so the training's more structured than usual.",
    detail: "Half marathon, November 2026",
    cardClassName: "card-sports",
  },
];
