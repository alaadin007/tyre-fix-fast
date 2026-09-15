// SINGLE SOURCE OF TRUTH for all customer-facing price ranges.
// Every area page (/areas/:slug) and service page (/services/:service[/:city])
// pulls its numbers from here. Never hand-type prices in page copy again.

export type Band = [low: number, high: number];

export interface CityPricing {
  /** BS AU 159 internal plug-patch puncture repair, all-in */
  puncture: Band;
  /** budget tyre supplied and fitted, all-in */
  budget: Band;
  /** mid-range premium tyre supplied and fitted */
  midRange: Band;
  /** performance, SUV or run-flat tyre supplied and fitted */
  performance: Band;
  /** overnight surcharge (10pm–6am) */
  overnight: Band;
  /** locking wheel nut removal without a key */
  lockingNut: Band;
  /** optional city-specific surcharge, e.g. London Congestion Charge */
  zoneCharge?: { label: string; band: Band };
  /** premium brand names quoted in the mid-range bullet */
  midRangeBrands?: string;
  /** trailing note appended to the performance bullet */
  performanceNote?: string;
  /** typical on-site arrival window in minutes for core coverage */
  response?: Band;
}

/** Booking fee is flat nationwide and deducted from the final bill. */
export const BOOKING_FEE = 20;

const STANDARD: CityPricing = {
  puncture: [40, 55],
  budget: [80, 115],
  midRange: [120, 175],
  performance: [190, 360],
  overnight: [20, 35],
  lockingNut: [20, 40],
  midRangeBrands: "Michelin, Continental, Goodyear",
  response: [30, 55],
};

export const CITY_PRICING: Record<string, CityPricing> = {
  london: {
    puncture: [45, 65],
    budget: [95, 135],
    midRange: [140, 200],
    performance: [220, 420],
    overnight: [20, 40],
    lockingNut: [20, 40],
    midRangeBrands: "Michelin, Continental, Bridgestone",
    zoneCharge: { label: "Congestion Charge zone during charging hours", band: [5, 15] },
    response: [30, 60],
  },
  "greater-manchester": {
    ...STANDARD,
    puncture: [40, 60],
    budget: [85, 125],
    midRange: [130, 185],
    performance: [200, 390],
  },
  "west-midlands": {
    ...STANDARD,
    puncture: [40, 60],
    budget: [85, 125],
    midRange: [130, 185],
    performance: [200, 390],
  },
  "tyne-and-wear": { ...STANDARD },
  bristol: {
    ...STANDARD,
    puncture: [40, 60],
    budget: [85, 120],
    midRange: [130, 185],
    performance: [200, 380],
    midRangeBrands: "Michelin, Continental, Bridgestone",
  },
  "west-yorkshire": { ...STANDARD },
  merseyside: { ...STANDARD },
  "south-yorkshire": { ...STANDARD },
  edinburgh: {
    ...STANDARD,
    puncture: [45, 60],
    budget: [90, 125],
    midRange: [135, 190],
    performance: [210, 390],
    overnight: [20, 40],
    response: [30, 60],
  },
  glasgow: {
    ...STANDARD,
    puncture: [45, 60],
    budget: [90, 125],
    midRange: [135, 190],
    performance: [210, 390],
    overnight: [20, 40],
  },
  cardiff: { ...STANDARD },
  belfast: {
    ...STANDARD,
    performance: [190, 370],
    performanceNote: "uncommon sizes may need next-day ferry stock",
  },
};

/** Nationwide band for a field: widest span across every city we cover. */
function nationalBand(key: keyof Pick<CityPricing, "puncture" | "budget" | "midRange" | "performance" | "overnight" | "lockingNut">): Band {
  const bands = Object.values(CITY_PRICING).map((c) => c[key]);
  return [Math.min(...bands.map((b) => b[0])), Math.max(...bands.map((b) => b[1]))];
}

export const NATIONAL_PRICING: CityPricing = {
  puncture: nationalBand("puncture"),
  budget: nationalBand("budget"),
  midRange: nationalBand("midRange"),
  performance: nationalBand("performance"),
  overnight: nationalBand("overnight"),
  lockingNut: nationalBand("lockingNut"),
  midRangeBrands: "Michelin, Continental, Goodyear",
  response: [
    Math.min(...Object.values(CITY_PRICING).map((c) => (c.response ?? [30, 55])[0])),
    Math.max(...Object.values(CITY_PRICING).map((c) => (c.response ?? [30, 55])[1])),
  ],
};

export function getPricing(citySlug?: string): CityPricing {
  return (citySlug && CITY_PRICING[citySlug]) || NATIONAL_PRICING;
}

/** Typical on-site arrival window, e.g. "30–60 minutes". */
export function responseWindow(citySlug?: string): string {
  const r = getPricing(citySlug).response ?? [30, 60];
  return `${r[0]}–${r[1]} minutes`;
}

/** The price band a given service slug is quoted in, for a city (or nationwide). */
export function serviceBand(serviceSlug: string, citySlug?: string): Band {
  const p = getPricing(citySlug);
  switch (serviceSlug) {
    case "puncture-repair":
      return p.puncture;
    case "run-flat-tyre-fitting":
      return p.performance;
    case "emergency-tyre-fitting":
      return [p.puncture[0], p.performance[1]];
    case "tyre-replacement":
    default:
      return [p.budget[0], p.performance[1]];
  }
}

/**
 * 40–60 word direct-answer opening block for a commercial page.
 * All figures come from CITY_PRICING / NATIONAL_PRICING — never hand-typed.
 */
export function directAnswer(opts: {
  /** lower-case service phrase, e.g. "puncture repair" */
  service: string;
  /** "London", or "the UK" for nationwide pages */
  place: string;
  /** service slug used to pick the price band; omit on area pages */
  serviceSlug?: string;
  citySlug?: string;
}): { question: string; answer: string } {
  const { service, place, serviceSlug, citySlug } = opts;
  const p = getPricing(citySlug);
  const band = serviceSlug ? serviceBand(serviceSlug, citySlug) : [p.budget[0], p.performance[1]];
  const win = responseWindow(citySlug);
  const question = `How much does ${service} cost in ${place}?`;
  const answer =
    `${range(band as Band)}, 24/7, typically within ${win}. ` +
    (serviceSlug === "puncture-repair"
      ? ""
      : `Puncture repairs are ${range(p.puncture)}. `) +
    `Tyrefly sends a vetted mobile technician to your home, work or the roadside anywhere in ${place}, day or night. ` +
    `You get a fixed all-in price by WhatsApp in about 60 seconds, with the £${BOOKING_FEE} booking fee deducted from your bill.`;
  return { question, answer };
}

/**
 * Machine-readable Offer for a Service JSON-LD node, built from the same
 * price bands the visible copy uses. GBP, all-in, per job.
 */
export function serviceOffer(opts: {
  serviceSlug: string;
  citySlug?: string;
  url: string;
  /** e.g. "Mobile puncture repair in London" */
  name: string;
  areaServed?: string;
}): Record<string, unknown> {
  const [low, high] = serviceBand(opts.serviceSlug, opts.citySlug);
  return {
    "@type": "Offer",
    name: opts.name,
    url: opts.url,
    priceCurrency: "GBP",
    availability: "https://schema.org/InStock",
    priceSpecification: {
      "@type": "PriceSpecification",
      priceCurrency: "GBP",
      minPrice: low,
      maxPrice: high,
      valueAddedTaxIncluded: true,
      description: `All-in price per tyre, quoted before work starts. A £${BOOKING_FEE} booking fee is deducted from the final bill.`,
    },
    ...(opts.areaServed ? { areaServed: { "@type": "Place", name: opts.areaServed } } : {}),
  };
}

/** "£40–£55" */
export function range(band: Band): string {
  return `£${band[0]}–£${band[1]}`;
}

/** "+£20–£35" */
export function surcharge(band: Band): string {
  return `+£${band[0]}–£${band[1]}`;
}

/** Emergency / overnight call-out ranges, derived so they can never drift. */
export function emergencyRepair(p: CityPricing): string {
  return `£${p.puncture[1]}–£${p.puncture[1] + p.overnight[0]}`;
}
export function emergencyFitted(p: CityPricing): string {
  return `£${p.budget[1]}–£${p.performance[0]}+`;
}
/** Run-flat fitting shares the performance/SUV band. */
export function runFlatRange(p: CityPricing): string {
  return range(p.performance);
}

/** The price bullet list rendered on every area page. */
export function priceBullets(citySlug?: string): string[] {
  const p = getPricing(citySlug);
  const brands = p.midRangeBrands ? ` (${p.midRangeBrands})` : "";
  const note = p.performanceNote ? ` (${p.performanceNote})` : "";
  const bullets = [
    `<strong>Puncture repair (BS AU 159 internal plug-patch):</strong> ${range(p.puncture)}`,
    `<strong>Budget tyre supplied and fitted:</strong> ${range(p.budget)}`,
    `<strong>Mid-range premium${brands}:</strong> ${range(p.midRange)}`,
    `<strong>Performance, SUV or run-flat:</strong> ${range(p.performance)}${note}`,
    `<strong>Overnight surcharge (10pm–6am):</strong> ${surcharge(p.overnight)}`,
  ];
  if (p.zoneCharge) bullets.push(`<strong>${p.zoneCharge.label}:</strong> ${surcharge(p.zoneCharge.band)}`);
  bullets.push(`<strong>Locking wheel nut removal (no key):</strong> ${surcharge(p.lockingNut)}`);
  return bullets;
}

/** The "How much is mobile tyre fitting in X?" FAQ answer on every area page. */
export function priceFaqAnswer(cityName: string, citySlug?: string): string {
  const p = getPricing(citySlug);
  return `${range(p.budget)} for a budget tyre supplied and fitted, ${range(p.midRange)} mid-range premium, and ${range(
    p.performance,
  )} for performance, SUV or run-flat. Puncture repairs are ${range(p.puncture)}. Overnight adds £${p.overnight[0]}–£${
    p.overnight[1]
  }. A £${BOOKING_FEE} booking fee is deducted from the final bill.`;
}

/** Lower bound used in meta descriptions, e.g. "Puncture repair from £45". */
export function fromPrice(citySlug: string | undefined, key: keyof Pick<CityPricing, "puncture" | "budget"> = "puncture"): string {
  return `£${getPricing(citySlug)[key][0]}`;
}
