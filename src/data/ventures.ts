export type Venture = {
  id: "valkrix" | "forge";
  name: string;
  tagline: string;
  description: string;
  facts: string[];
  href: string;
  logoSrc: string;
  logoAlt: string;
  logoWidth: number;
  logoHeight: number;
  /** Extra classes for sizing/blending — logos differ a lot in native crop/bg. */
  logoClassName: string;
  logoAlign?: "left" | "center";
};

export const ventures: Venture[] = [
  {
    id: "valkrix",
    name: "Valkrix",
    tagline: "Future-grade technology services for companies that refuse to settle.",
    description:
      "A service-based software studio I co-founded with 2 other ambitious individuals — senior, cross-disciplinary engineers who own hard problems end to end and stay with clients long after launch. Five focus areas: cloud infrastructure, AI & data, cybersecurity, custom development, digital transformation.",
    facts: [
      "Founder & COO, one of 3 co-founders",
      "Founded 2026",
      "Senior-only, weekly delivery cadence",
    ],
    href: "https://valkrix.com",
    logoSrc: "/logos/valkrix.jpg",
    logoAlt: "Valkrix wordmark",
    logoWidth: 538,
    logoHeight: 86,
    // The current source file is already a transparent PNG (no backdrop
    // box to blend away) — plain alpha compositing shows just the
    // gradient letters against the card's aurora glow.
    logoClassName: "h-10",
    logoAlign: "center",
  },
  {
    id: "forge",
    name: "The Forge",
    tagline: "Where work gets forged.",
    description:
      "A co-working space for individuals and teams who'd rather build than commute — owned and operated by Valkrix. Open, air-conditioned, first-floor space in DHA Phase II, Islamabad, serving solo developers up to 5-person teams.",
    facts: [
      "Powered by Valkrix",
      "Mon–Fri, 9AM–6PM",
      "Day pass to dedicated monthly desks",
    ],
    href: "https://theforge.pk",
    logoSrc: "/logos/the-forge-v3.jpg",
    logoAlt: "The Forge logo",
    // Tightly cropped from the original (which had large black margins on
    // all sides) so it aligns and scales the same way the Valkrix wordmark
    // does, instead of floating small and off-center inside a mostly-empty box.
    logoWidth: 1142,
    logoHeight: 243,
    // The source JPEG has a solid black backdrop — screen-blend it away so
    // only the gold mark shows against the card's own dark-wood gradient.
    logoClassName: "h-16 sm:h-20 mix-blend-screen",
  },
];
