export type BusinessId =
  | "food-cart"
  | "cafe"
  | "barber"
  | "fashion-store"
  | "retail";

export type FactorKey =
  | "population"
  | "pedestrian"
  | "accessibility"
  | "targetMarket"
  | "competition"
  | "compatibility";

export type FactorSet = Record<FactorKey, number>;

export const factorLabels: Record<FactorKey, string> = {
  population: "Population",
  pedestrian: "Pedestrian potential",
  accessibility: "Accessibility",
  targetMarket: "Target market",
  competition: "Competition",
  compatibility: "Area compatibility",
};

export const factorExplanations: Record<FactorKey, string> = {
  population: "18,400 active residents within catchment with strong daytime density.",
  pedestrian: "High foot traffic corridor peaking during morning commute and evening hours.",
  accessibility: "Public transit access is fair, but 2 recorded walkway issues slow pedestrian flow.",
  targetMarket: "Strong demographic match: 64% of visitors match the target customer profile.",
  competition: "6 established direct competitors within 350 meters split the existing market.",
  compatibility: "Zoning and surrounding storefronts align naturally with commercial hospitality.",
};

export const businesses: {
  id: BusinessId;
  label: string;
  tagline: string;
  typicalRadius: string;
  competitorCount: number;
}[] = [
  {
    id: "food-cart",
    label: "food cart",
    tagline: "hyper-local pedestrian grab-and-go",
    typicalRadius: "250 m",
    competitorCount: 3,
  },
  {
    id: "cafe",
    label: "cafe",
    tagline: "sit-down third place & specialty coffee",
    typicalRadius: "400 m",
    competitorCount: 6,
  },
  {
    id: "barber",
    label: "barber",
    tagline: "scheduled personal grooming service",
    typicalRadius: "600 m",
    competitorCount: 4,
  },
  {
    id: "fashion-store",
    label: "fashion store",
    tagline: "destination apparel & lifestyle goods",
    typicalRadius: "800 m",
    competitorCount: 5,
  },
  {
    id: "retail",
    label: "retail",
    tagline: "convenience & daily neighborhood essentials",
    typicalRadius: "500 m",
    competitorCount: 7,
  },
];

export const businessFactors: Record<BusinessId, FactorSet> = {
  "food-cart": {
    population: 84,
    pedestrian: 90,
    accessibility: 72,
    targetMarket: 80,
    competition: 61,
    compatibility: 86,
  },
  cafe: {
    population: 86,
    pedestrian: 81,
    accessibility: 69,
    targetMarket: 78,
    competition: 52,
    compatibility: 83,
  },
  barber: {
    population: 78,
    pedestrian: 64,
    accessibility: 74,
    targetMarket: 82,
    competition: 58,
    compatibility: 80,
  },
  "fashion-store": {
    population: 81,
    pedestrian: 77,
    accessibility: 71,
    targetMarket: 69,
    competition: 48,
    compatibility: 76,
  },
  retail: {
    population: 88,
    pedestrian: 70,
    accessibility: 66,
    targetMarket: 73,
    competition: 44,
    compatibility: 75,
  },
};

export type LocationId = "a" | "b" | "c";

export const locations: {
  id: LocationId;
  name: string;
  hint: string;
  offset: number;
  description: string;
  baseScore: number;
}[] = [
  {
    id: "a",
    name: "location a",
    hint: "mixed corridor",
    offset: 0,
    description: "Moderate pedestrian volume, high population density, active commercial road.",
    baseScore: 74,
  },
  {
    id: "b",
    name: "location b",
    hint: "campus edge",
    offset: 8,
    description: "Very high student footfall, strong daytime demand, lower direct competition.",
    baseScore: 82,
  },
  {
    id: "c",
    name: "location c",
    hint: "inner block",
    offset: -13,
    description: "Residential quiet pocket, lower spontaneous footfall, destination visits only.",
    baseScore: 61,
  },
];

export function averageScore(factors: FactorSet) {
  const values = Object.values(factors);
  return Math.round(values.reduce((sum, n) => sum + n, 0) / values.length);
}

export function scoreTone(score: number) {
  if (score >= 80) return "potential" as const;
  if (score >= 65) return "consideration" as const;
  return "warning" as const;
}

export const scoreCopy = {
  potential: "potential",
  consideration: "consideration",
  warning: "needs review",
};

export const reportStatuses = [
  "reported",
  "verification",
  "confirmed",
  "handled",
  "resolved",
] as const;

export type ReportStatus = (typeof reportStatuses)[number];

export interface CivicReportItem {
  id: string;
  label: string;
  category: "road" | "flood" | "waste" | "light";
  tone: string;
  badgeColor: string;
  x: number;
  y: number;
  status: ReportStatus;
  note: string;
  timeAgo: string;
  confirmations: number;
  streetName: string;
  impactNote: string;
}

export const civicReports: CivicReportItem[] = [
  {
    id: "r1",
    label: "road damage",
    category: "road",
    tone: "#c45b4a",
    badgeColor: "bg-[#c45b4a]",
    x: 24,
    y: 74,
    status: "confirmed",
    note: "Pavement crack and uneven surface near the pedestrian crossing. Slows foot traffic and stroller mobility.",
    timeAgo: "2 hours ago",
    confirmations: 14,
    streetName: "Jl. Sudirman crossing",
    impactNote: "Affects pedestrian accessibility score (-5 pts)",
  },
  {
    id: "r2",
    label: "flooding",
    category: "flood",
    tone: "#d17a32",
    badgeColor: "bg-[#d17a32]",
    x: 68,
    y: 30,
    status: "verification",
    note: "Standing rainwater up to 15 cm after downpour due to blocked street inlet grating.",
    timeAgo: "Yesterday",
    confirmations: 23,
    streetName: "North alley intersection",
    impactNote: "Affects rainy-day access & delivery reliability (-8 pts)",
  },
  {
    id: "r3",
    label: "waste",
    category: "waste",
    tone: "#c4922a",
    badgeColor: "bg-[#c4922a]",
    x: 42,
    y: 18,
    status: "reported",
    note: "Commercial disposal bin overflow near the secondary lane service entrance.",
    timeAgo: "3 days ago",
    confirmations: 8,
    streetName: "West service corridor",
    impactNote: "Affects area cleanliness perception (-3 pts)",
  },
  {
    id: "r4",
    label: "street light",
    category: "light",
    tone: "#3d6fd8",
    badgeColor: "bg-[#3d6fd8]",
    x: 82,
    y: 70,
    status: "handled",
    note: "Defective luminaire fixture creating a 35m dark stretch along the student sidewalk.",
    timeAgo: "4 days ago",
    confirmations: 19,
    streetName: "East campus walkway",
    impactNote: "Reduces evening pedestrian safety confidence (-4 pts)",
  },
];

export const aiScenarios = [
  {
    query: "I still want to open a cafe here.",
    context: "Location score 74 / 100 with high competition (52) and strong footfall (81)",
    strategies: [
      {
        title: "focus on a different customer segment",
        detail: "Target quiet laptop workers and evening post-grad study groups instead of hurried morning commuters.",
      },
      {
        title: "adjust product mix",
        detail: "Introduce signature artisan bakery pairings and specialty decaf options that current competitors omit.",
      },
      {
        title: "consider different operating hours",
        detail: "Extend hours from 16:00 to 23:00 to capture foot traffic after nearby commercial offices close.",
      },
      {
        title: "create a differentiated concept",
        detail: "Build around reserved quiet booths or a botanical courtyard rather than standard fast-casual seating.",
      },
    ],
  },
  {
    query: "How can I mitigate the recurring flood issue nearby?",
    context: "Area condition report shows standing rainwater during monsoon rain 200m away",
    strategies: [
      {
        title: "provide elevated entryway barrier",
        detail: "Incorporate a subtle 15cm threshold ramp to protect interior seating from surface overflow.",
      },
      {
        title: "partner with app-based delivery runners",
        detail: "Position delivery pickup counter toward the dry south access road rather than the flooded alley.",
      },
      {
        title: "plan rainy day promotion campaigns",
        detail: "Offer comfort-food incentives to retain loyal neighborhood walk-ins during heavy weather.",
      },
    ],
  },
  {
    query: "Is a food cart more viable than a cafe at this spot?",
    context: "Food cart potential scores 84 / 100 due to higher pedestrian agility and lower overhead",
    strategies: [
      {
        title: "leverage peak morning transit wave",
        detail: "Position between 06:45–09:15 right at the pedestrian corridor crossing for fast impulse purchase.",
      },
      {
        title: "bypass fixed lease vulnerability",
        detail: "Avoid long commercial rent commitments while testing neighborhood product-market fit.",
      },
      {
        title: "relocate during road maintenance",
        detail: "Move 80 meters south when the reported road crossing undergoes resurfacing.",
      },
    ],
  },
];
