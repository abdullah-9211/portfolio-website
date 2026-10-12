export type Stats = {
  /** Warming. 100 is unlivable. */
  heat: number;
  /** Sea level rise. 100 drowns the coasts. */
  sea: number;
  /** Living things. 0 is collapse. */
  bio: number;
  /** How people are doing. 0 is collapse. */
  well: number;
};

export type Effect = Partial<Stats>;

export type Option = {
  label: string;
  /** Negative costs are income. */
  cost: number;
  /** Applied once, now. */
  now?: Effect;
  /** Added to the change that happens every turn from here on. */
  trend?: Effect;
  /** Added to income every turn from here on. */
  income?: number;
  /** What the news says afterwards. */
  result: string;
};

export type WorldEvent = {
  region: number;
  place: string;
  title: string;
  text: string;
  options: Option[];
};

/** Region indices match land.json. */
export const REGIONS = [
  { name: "North America", lon: -100, lat: 42 },
  { name: "South America", lon: -60, lat: -14 },
  { name: "Europe", lon: 14, lat: 50 },
  { name: "Africa", lon: 20, lat: 4 },
  { name: "Asia", lon: 92, lat: 34 },
  { name: "Oceania", lon: 136, lat: -24 },
  { name: "The poles", lon: -40, lat: 74 },
];

export const START: Stats = { heat: 30, sea: 24, bio: 72, well: 66 };
export const START_COINS = 42;
export const START_YEAR = 2026;
export const YEARS_PER_TURN = 7;
export const BASE_INCOME = 16;

/** What happens every turn if nobody does anything. */
export const DRIFT: Stats = { heat: 8, sea: 5.5, bio: -7, well: -3 };

export const events: WorldEvent[] = [
  {
    region: 4,
    place: "Asia",
    title: "The coal fleet is due for renewal",
    text: "Hundreds of ageing plants reach the end of their licences in the same decade.",
    options: [
      { label: "Replace them with solar and wind", cost: 30, trend: { heat: -2.6 }, result: "The grid goes clean, slowly, then all at once." },
      { label: "Switch to gas as a bridge", cost: 12, now: { heat: 2 }, trend: { heat: -1 }, result: "Emissions dip. The bridge had better lead somewhere." },
      { label: "Renew the licences", cost: -14, now: { heat: 7 }, trend: { heat: 1 }, result: "Cheap power, for now. The air says otherwise." },
    ],
  },
  {
    region: 1,
    place: "South America",
    title: "Logging concessions in the Amazon",
    text: "A government offers the forest in return for revenue. The buyers are ready.",
    options: [
      { label: "Buy the concessions and protect them", cost: 18, now: { bio: 8 }, trend: { bio: 2 }, result: "The canopy holds. So does the rain it makes." },
      { label: "Allow selective logging", cost: -8, now: { bio: -5 }, result: "Some of it survives. Some of it is furniture." },
      { label: "Sell them all", cost: -26, now: { bio: -14, heat: 4 }, trend: { bio: -1 }, result: "A windfall, and a hole you can see from orbit." },
    ],
  },
  {
    region: 3,
    place: "Africa",
    title: "Drought across the Sahel",
    text: "The rains have failed for a third year and the harvest with them.",
    options: [
      { label: "Fund irrigation and drought-resistant crops", cost: 22, now: { well: 10 }, trend: { well: 1.5 }, result: "The next dry year is survivable." },
      { label: "Send emergency food aid", cost: 8, now: { well: 4 }, result: "People eat this season. Next season is another question." },
      { label: "Do nothing", cost: 0, now: { well: -12 }, result: "Millions move. Nobody planned for where." },
    ],
  },
  {
    region: 2,
    place: "Europe",
    title: "A carbon price is on the table",
    text: "Polluters would pay per tonne. Households worry about what it does to their bills.",
    options: [
      { label: "Adopt it, and return the money to households", cost: 10, trend: { heat: -1.6 }, result: "Emissions fall and the protests never arrive." },
      { label: "Adopt it, and keep the revenue", cost: 0, trend: { heat: -1.6 }, now: { well: -6 }, income: 6, result: "It works. People resent it." },
      { label: "Shelve it", cost: 0, now: { heat: 3 }, result: "Another decade of free pollution." },
    ],
  },
  {
    region: 5,
    place: "Oceania",
    title: "The reefs are bleaching",
    text: "Warm water and overfishing are emptying the richest waters on the planet.",
    options: [
      { label: "Create marine reserves", cost: 16, now: { bio: 7 }, trend: { bio: 1.6 }, result: "Fish return faster than anyone predicted." },
      { label: "Set fishing quotas", cost: 6, now: { bio: 3 }, result: "The decline slows." },
      { label: "Leave it to the market", cost: 0, now: { bio: -10 }, result: "The boats come home empty." },
    ],
  },
  {
    region: 0,
    place: "North America",
    title: "An Arctic drilling licence",
    text: "The ice has retreated far enough to reach the oil underneath it.",
    options: [
      { label: "Refuse, and fund clean energy research", cost: 20, trend: { heat: -1.5 }, result: "The oil stays down and better batteries come up." },
      { label: "Refuse", cost: 0, result: "The oil stays where it is." },
      { label: "Grant it", cost: -30, now: { heat: 8, sea: 4, bio: -5 }, result: "A fortune, extracted from the place that least needed it." },
    ],
  },
  {
    region: 4,
    place: "Asia",
    title: "The Himalayan glaciers are retreating",
    text: "Meltwater floods the valleys below, where a billion people depend on those rivers.",
    options: [
      { label: "Build flood defences and early warning", cost: 20, now: { well: 8 }, trend: { well: 1 }, result: "The next flood is a headline, not a catastrophe." },
      { label: "Relocate the most exposed villages", cost: 10, now: { well: 2 }, result: "Fewer people in harm's way." },
      { label: "Do nothing", cost: 0, now: { well: -14 }, result: "The river takes what it wants." },
    ],
  },
  {
    region: 6,
    place: "The poles",
    title: "The ice sheets are destabilising",
    text: "What melts here raises the sea everywhere.",
    options: [
      { label: "Fund a global cut in methane", cost: 25, now: { heat: -8 }, trend: { sea: -2 }, result: "The fastest lever there is. The melt slows." },
      { label: "Build sea walls for the great ports", cost: 15, now: { sea: -10 }, result: "The cities stay dry. The cause is untouched." },
      { label: "Wait for better data", cost: 0, now: { sea: 8 }, result: "The data arrives. It is worse." },
    ],
  },
  {
    region: 3,
    place: "Africa",
    title: "Clean cooking and new forests",
    text: "A plan to replace charcoal stoves and replant what was cut for them.",
    options: [
      { label: "Fund all of it", cost: 18, now: { bio: 6, well: 6 }, trend: { heat: -0.6 }, result: "Cleaner air indoors, and trees outdoors." },
      { label: "Fund half", cost: 9, now: { bio: 3, well: 3 }, result: "Half the stoves, half the trees." },
      { label: "Skip it", cost: 0, result: "The plan goes back in the drawer." },
    ],
  },
  {
    region: 2,
    place: "Every nation",
    title: "The last climate summit",
    text: "Everyone is in the room. This is the final chance to agree on anything binding.",
    options: [
      { label: "Sign a binding net-zero treaty", cost: 30, now: { heat: -12 }, trend: { heat: -3 }, result: "It holds. Nobody expected it to." },
      { label: "Settle for voluntary pledges", cost: 8, now: { heat: -4 }, result: "Promises are made. Some are kept." },
      { label: "Walk out", cost: 0, now: { heat: 4, well: -6 }, result: "Every country for itself." },
    ],
  },
];

export type Cause = "heat" | "sea" | "bio" | "well";

export const ENDINGS: Record<Cause, string> = {
  heat: "Too hot. Crops fail across the tropics and the planet stops being a place people can live.",
  sea: "The sea took the coasts, and most of the world's cities with them.",
  bio: "The living world collapsed. Without it, nothing else lasts long.",
  well: "Hunger and displacement overwhelmed every government at once.",
};

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function apply(stats: Stats, effect: Effect | undefined): Stats {
  if (!effect) return stats;
  return {
    heat: clamp(stats.heat + (effect.heat ?? 0)),
    sea: clamp(stats.sea + (effect.sea ?? 0)),
    bio: clamp(stats.bio + (effect.bio ?? 0)),
    well: clamp(stats.well + (effect.well ?? 0)),
  };
}

/** One turn of time passing: the drift, plus the damage that warming and flooding do on their own. */
export function advance(stats: Stats, trend: Stats): Stats {
  const knock: Effect = {
    sea: stats.heat > 60 ? 2 : 0,
    bio: stats.heat > 70 ? -2 : 0,
    well: (stats.sea > 70 ? -3 : 0) + (stats.bio < 30 ? -2 : 0),
  };
  return apply(apply(stats, trend), knock);
}

export function failure(stats: Stats): Cause | null {
  if (stats.heat >= 100) return "heat";
  if (stats.sea >= 100) return "sea";
  if (stats.bio <= 0) return "bio";
  if (stats.well <= 0) return "well";
  return null;
}
