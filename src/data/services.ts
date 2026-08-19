// Service × location matrix content — powers /services, /services/:service and /services/:service/:city

export interface ServiceSection {
  h2: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface ServiceDef {
  slug: string;
  /** "Mobile puncture repair" */
  name: string;
  /** short keyword form used in H1s: "puncture repair" */
  keyword: string;
  tagline: string;
  priceLine: string;
  /** national page intro */
  intro: string;
  sections: ServiceSection[];
  bullets: string[];
  faqs: { q: string; a: string }[];
  /** city page copy generator */
  cityIntro: (city: string, region: string) => string;
  citySections: (city: string, region: string, postcodes: string) => ServiceSection[];
  cityFaqs: (city: string, region: string) => { q: string; a: string }[];
  guides: { to: string; label: string }[];
}

export const SERVICES: ServiceDef[] = [
  {
    slug: "puncture-repair",
    name: "Mobile puncture repair",
    keyword: "puncture repair",
    tagline: "Nail, screw or slow leak — repaired at your kerb, usually in under 30 minutes on-site.",
    priceLine: "From £40–£55 for a BS AU 159 compliant repair",
    intro:
      "A mobile puncture repair means a fully-equipped van comes to your car, removes the wheel, finds the leak in a water bath, and fits a combined plug-and-patch from inside the tyre. Tyrefly matches you to a vetted local technician by text — no phone queue, no garage trip, no waiting room. You get a fixed all-in price before anyone sets off.",
    sections: [
      {
        h2: "When a puncture can be repaired — and when it can't",
        paragraphs: [
          "UK repairs follow BS AU 159, the British Standard every reputable fitter works to. It defines a central repairable area across the tyre's tread and sets a maximum damage size. Outside that, the tyre must be replaced — no exceptions, because a repair there can fail at speed.",
          "Your technician assesses the tyre before quoting a repair. If it fails the standard, you'll be told on the spot and offered a replacement price instead, with the tyre in the van where possible.",
        ],
        bullets: [
          "Repairable: puncture in the central three-quarters of the tread, up to 6mm damage",
          "Not repairable: sidewall or shoulder damage of any size",
          "Not repairable: run-flat driven flat, or any tyre run under-inflated for a distance",
          "Not repairable: existing repair overlapping the new damage, or tread below 1.6mm",
        ],
      },
      {
        h2: "What a proper repair actually involves",
        paragraphs: [
          "A road-legal repair is done from the inside. The tyre is demounted, the injury is reamed and sealed with a combined stem-and-patch unit, the inner liner is buffed and cemented, then the wheel is refitted and rebalanced. External plug kits and aerosol sealants are temporary get-you-home measures, not repairs.",
          "Expect the technician to rebalance the wheel and reset TPMS where fitted. If a job is quoted suspiciously cheap, it usually means an external plug and no balancing.",
        ],
      },
      {
        h2: "How much puncture repair costs in the UK",
        paragraphs: [
          "Tyrefly technicians typically charge £40–£55 for a mobile puncture repair including callout, with a £20 booking fee deducted from the final bill. Night, motorway-junction and remote rural jobs sit at the upper end. Replacement, if the tyre fails the standard, starts at around £75–£95 for a common budget size fitted.",
        ],
      },
    ],
    bullets: [
      "24/7 including nights, weekends and bank holidays",
      "BS AU 159 compliant internal plug-and-patch repairs",
      "Wheel rebalanced and TPMS checked as part of the job",
      "Fixed price confirmed by text before the technician sets off",
    ],
    faqs: [
      { q: "How long does a mobile puncture repair take?", a: "Around 20–30 minutes on-site once the technician arrives. Most Tyrefly customers get a quote within 60 seconds and a fitter within 35–90 minutes." },
      { q: "Is a repaired tyre as safe as a new one?", a: "Yes, when the repair meets BS AU 159 — a proper internal plug-and-patch restores the tyre to its original speed rating. Repairs outside the standard are not safe and we won't do them." },
      { q: "Can you repair a run-flat tyre?", a: "Sometimes. If the run-flat has been driven on while deflated the sidewall structure is compromised and it must be replaced. If it was caught early and holds pressure, a standard repair may be possible." },
      { q: "Will tyre sealant ruin the tyre?", a: "Not usually, but it makes the repair messier and some technicians charge a small cleaning surcharge. Tell us if you've used a sealant can so we can bring the right kit." },
    ],
    cityIntro: (city, region) =>
      `Got a nail, screw or slow puncture in ${city}? Tyrefly sends a vetted mobile technician to your car — home, work, roadside or car park — anywhere across ${region}, 24 hours a day. You text your postcode, get a fixed price in about 60 seconds, and the repair itself takes roughly 20–30 minutes at the kerb.`,
    citySections: (city, region, postcodes) => [
      {
        h2: `Puncture repair prices in ${city}`,
        paragraphs: [
          `A mobile puncture repair in ${city} is typically £40–£55 all-in — callout, internal plug-and-patch, rebalancing and TPMS check included. A £20 booking fee holds the slot and comes off the final bill; the technician takes the balance on-site by card, link, transfer or cash.`,
          `If the damage falls outside the repairable area, you'll be quoted for a replacement tyre before any work starts — normally £75–£95 for a common budget size fitted in ${city}, more for run-flat, SUV and performance sizes.`,
        ],
      },
      {
        h2: `Where we repair punctures across ${region}`,
        paragraphs: [
          `Coverage spans ${postcodes} and the surrounding ${region} road network. Technicians work at homes, office car parks, supermarket bays, multi-storeys with sufficient height clearance, and motorway service areas. For safety we can't work on a live carriageway or hard shoulder — call 999 or National Highways on 0300 123 5000 and we'll meet you at the next junction or services.`,
        ],
      },
      {
        h2: `Can your ${city} puncture be repaired?`,
        paragraphs: [
          `Every Tyrefly technician works to BS AU 159. That means repairs only in the central three-quarters of the tread, damage up to 6mm, no sidewall or shoulder injuries, and no tyre that has been driven flat. If your tyre fails any of those checks, a repair is illegal and unsafe — you'll be told immediately and offered a replacement instead.`,
        ],
        bullets: [
          "Nail or screw in the tread — usually repairable",
          "Slow leak from the valve or bead — often fixable without a new tyre",
          "Sidewall bulge or cut — replacement only",
          "Driven flat for more than a few hundred metres — replacement only",
        ],
      },
    ],
    cityFaqs: (city, region) => [
      { q: `How fast can you repair a puncture in ${city}?`, a: `Most ${city} jobs get a quote in under 60 seconds and a technician on-site in 35–90 minutes, day or night. The repair itself takes about 20–30 minutes.` },
      { q: `How much is a puncture repair in ${city}?`, a: `£40–£55 all-in for a BS AU 159 repair including callout, rebalancing and TPMS check. A £20 booking fee secures the slot and is deducted from the final bill.` },
      { q: `Do you repair punctures at night in ${city}?`, a: `Yes — Tyrefly operates 24/7 across ${region}, including weekends and bank holidays. Night jobs sit at the upper end of the price range.` },
      { q: `Can you come to my workplace or a car park in ${city}?`, a: `Yes. Home, work, roadside, car parks and service areas are all fine as long as the technician can safely access the wheel. We can't work on a live motorway carriageway.` },
    ],
    guides: [
      { to: "/blog/nail-in-tyre-what-to-do", label: "Nail in your tyre: what to do next" },
      { to: "/blog/puncture-repair-vs-replacement", label: "Repair or replace? How to decide" },
      { to: "/blog/tyre-pressure-guide-uk", label: "UK tyre pressure guide" },
    ],
  },

  {
    slug: "tyre-replacement",
    name: "Mobile tyre replacement",
    keyword: "tyre replacement",
    tagline: "New tyre supplied, fitted and balanced at your location — day or night.",
    priceLine: "From £75–£95 fitted for common budget sizes",
    intro:
      "Mobile tyre replacement brings the tyre machine, wheel balancer and stock to you. Tyrefly's vetted technicians supply and fit budget, mid-range and premium tyres at your home, workplace or roadside across the UK, 24/7, with the old tyre taken away for recycling. Text your postcode and tyre size and you'll have an all-in price in about a minute.",
    sections: [
      {
        h2: "What's included in a fitted price",
        paragraphs: [
          "An honest mobile fitting price covers the tyre itself, the callout, mounting, a new valve or TPMS service kit, wheel balancing and disposal of the old tyre. If a quote looks unusually low, one of those is usually missing — most often balancing or the valve.",
        ],
        bullets: [
          "Tyre supplied to your exact size, load index and speed rating",
          "Callout to your home, work or roadside location",
          "New rubber valve or TPMS service kit",
          "Dynamic wheel balancing on the van's balancer",
          "Old tyre removed and recycled",
        ],
      },
      {
        h2: "Choosing a tyre: budget, mid-range or premium",
        paragraphs: [
          "Budget tyres are legal and fine for low-mileage town driving. Mid-range brands buy you noticeably better wet braking and tread life. Premium makes the biggest difference on fast roads, heavy cars and in winter conditions — stopping distances at 70mph can differ by several car lengths.",
          "Whatever you choose, keep the same size and speed rating as the placard in your door shut, and try to match the tyre across an axle.",
        ],
      },
      {
        h2: "When replacement isn't optional",
        paragraphs: [
          "Some damage rules out a repair outright: sidewall cuts and bulges, shoulder punctures, tread below the 1.6mm UK legal minimum, cracked or perished rubber, and any tyre driven flat. Driving on any of these risks a £2,500 fine and three penalty points per tyre, and an MOT failure.",
        ],
      },
    ],
    bullets: [
      "Budget, mid-range and premium brands available",
      "Run-flat, SUV, van and performance sizes covered",
      "Balanced on-site and old tyre recycled",
      "24/7 fitting UK-wide, price fixed before dispatch",
    ],
    faqs: [
      { q: "How long does mobile tyre fitting take?", a: "Around 30–45 minutes per tyre on-site, including balancing. Multiple tyres on the same visit are quicker per wheel." },
      { q: "Do you carry my tyre size in the van?", a: "Common sizes usually yes. Rarer sizes may need a short sourcing window — the technician confirms availability before you commit." },
      { q: "Should I replace tyres in pairs?", a: "Matching across an axle is best practice for stable braking and handling. It's essential on many four-wheel-drive cars, where mismatched rolling radius can damage the drivetrain." },
      { q: "What happens to my old tyre?", a: "It's taken away and recycled under the technician's waste carrier duty of care — included in the price." },
    ],
    cityIntro: (city, region) =>
      `Need a new tyre in ${city} without losing half a day to a garage? Tyrefly's mobile fitters supply and fit tyres at your home, office or roadside anywhere in ${region}, 24 hours a day. Text your postcode and the size on your sidewall — you'll get a fixed all-in quote in around 60 seconds and a fitter typically within 35–90 minutes.`,
    citySections: (city, region, postcodes) => [
      {
        h2: `Tyre replacement prices in ${city}`,
        paragraphs: [
          `Typical ${city} all-in prices — tyre, callout, fitting, valve, balancing and old-tyre disposal included — run £75–£110 for budget, £120–£175 for mid-range premium, and £190–£370 for performance, SUV and run-flat sizes. The £20 booking fee comes off whatever the final bill is.`,
          `Prices firm up once you send the size from your sidewall (for example 205/55 R16 91V). Rare or large sizes may need a short sourcing window, and the technician tells you before you commit.`,
        ],
      },
      {
        h2: `Where we fit tyres across ${region}`,
        paragraphs: [
          `We cover ${postcodes} and the wider ${region} network. Fitting happens at driveways, kerbsides, workplaces, car parks and service areas — anywhere with safe access to the wheel and enough room for the jack. Live carriageways and hard shoulders are off-limits; ring 999 or National Highways first and we'll meet you at the next exit.`,
        ],
      },
      {
        h2: `Common reasons ${city} drivers need a new tyre`,
        paragraphs: [
          `Pothole impacts and kerbing account for a large share of ${city} call-outs — both often show as a sidewall bulge, which is an instant replacement. Blowouts, tread below 1.6mm, perished rubber on a car that sits unused, and punctures outside the repairable area make up most of the rest.`,
        ],
        bullets: [
          "Sidewall bulge or cut after a pothole or kerb strike",
          "Tread at or below the 1.6mm legal minimum",
          "Blowout or run-flat driven while deflated",
          "Puncture in the shoulder or an overlapping old repair",
        ],
      },
    ],
    cityFaqs: (city, region) => [
      { q: `How much is a new tyre fitted in ${city}?`, a: `£75–£110 for budget sizes, £120–£175 mid-range, £190–£370 for performance, SUV and run-flat — all-in with callout, balancing and disposal included.` },
      { q: `Can you fit a tyre at night in ${city}?`, a: `Yes. Tyrefly runs 24/7 across ${region}, including weekends and bank holidays.` },
      { q: `How quickly can a fitter reach me in ${city}?`, a: `Typically 35–90 minutes, with a quote back within 60 seconds of your text.` },
      { q: `Do you fit tyres I've bought myself?`, a: `Many ${city} technicians will fit customer-supplied tyres for a fitting-only fee. Mention it in your first message and we'll match you with one who does.` },
    ],
    guides: [
      { to: "/blog/tyre-age-when-to-replace", label: "How old is too old for a tyre?" },
      { to: "/blog/uk-tyre-legal-tread-depth", label: "UK legal tread depth explained" },
      { to: "/blog/cheap-vs-premium-tyres", label: "Cheap vs premium tyres" },
    ],
  },

  {
    slug: "emergency-tyre-fitting",
    name: "Emergency mobile tyre fitting",
    keyword: "emergency tyre fitting",
    tagline: "Blowout, shredded tyre or stranded at 2am — a technician dispatched immediately.",
    priceLine: "24/7 emergency call-out, quote in 60 seconds",
    intro:
      "Emergency tyre fitting is for the moments you can't drive away: a blowout, a shredded sidewall, no usable spare, or a car full of people at midnight. Tyrefly's network runs around the clock — you text your postcode, we dispatch the nearest vetted technician, and you get a firm price and an ETA rather than an open-ended wait.",
    sections: [
      {
        h2: "What to do in the first two minutes",
        paragraphs: [
          "Get off the carriageway if you safely can, put hazards on, and stop somewhere flat and visible. On a motorway, exit to the hard shoulder or an emergency area, get everyone out via the passenger side and behind the barrier, then call 999 or National Highways on 0300 123 5000. Nobody — us included — should be changing a wheel on a live motorway shoulder.",
        ],
      },
      {
        h2: "How Tyrefly dispatch works at 3am",
        paragraphs: [
          "One text starts it. Our system reads your postcode, checks which vetted technicians are live in that area, and broadcasts the job. You get quotes back in about a minute with the arrival window attached, and the £20 booking fee locks in the slot. You then track progress by message until the van pulls up.",
        ],
      },
      {
        h2: "Emergency call-out costs",
        paragraphs: [
          "Night and emergency jobs price at the upper end of the normal ranges rather than a separate surcharge tier: roughly £50–£65 for a repair and £95–£200+ for a supplied and fitted tyre depending on size. You see the number before you commit — there is no meter running while you wait.",
        ],
      },
    ],
    bullets: [
      "Live 24/7 including 2am, Christmas Day and bank holidays",
      "Nearest available vetted technician dispatched automatically",
      "Firm quote and ETA before you pay anything",
      "Motorway junction and service-area meets supported",
    ],
    faqs: [
      { q: "Is Tyrefly cheaper than a breakdown recovery call-out?", a: "Usually. Recovery firms tow you to a garage that then charges separately for the tyre. Tyrefly fixes the car where it stands, so you pay for one job, not two." },
      { q: "Can you come to a motorway hard shoulder?", a: "No — that's genuinely dangerous and it's a job for the police and National Highways. Get recovered to the next junction or services and we'll meet you there." },
      { q: "What if I have no spare wheel?", a: "That's the most common emergency we handle. Most modern cars ship with a sealant kit instead of a spare, which is exactly why mobile fitting exists." },
      { q: "How do I pay in an emergency?", a: "A £20 booking fee secures the slot, and the technician takes the balance on-site by card, payment link, bank transfer or cash." },
    ],
    cityIntro: (city, region) =>
      `Stranded with a blown or shredded tyre in ${city}? Tyrefly runs a 24/7 emergency mobile fitting network across ${region}. Send one text with your postcode and the nearest vetted technician is dispatched with a firm price and an arrival window — typically 35–90 minutes, at any hour.`,
    citySections: (city, region, postcodes) => [
      {
        h2: `24/7 emergency cover across ${region}`,
        paragraphs: [
          `Technicians cover ${postcodes} and the surrounding ${region} routes overnight as well as through the day. Most emergency call-outs in ${city} come from pothole blowouts, kerb strikes on tight junctions, and cars with no spare wheel discovering the sealant kit can't handle the damage.`,
          `We attend driveways, side streets, car parks and service areas. We do not attend live carriageways or hard shoulders — call 999 or National Highways on 0300 123 5000 first, then message us to meet you at the next junction.`,
        ],
      },
      {
        h2: `Emergency call-out prices in ${city}`,
        paragraphs: [
          `Night and emergency jobs sit at the top of the standard ranges rather than on a separate surcharge tariff: around £50–£65 for a repair, and £95–£200+ for a supplied and fitted tyre depending on size and brand. The £20 booking fee is deducted from the final bill.`,
        ],
      },
      {
        h2: `What to do while you wait in ${city}`,
        paragraphs: [
          `Park somewhere flat, level and visible, put your hazards on, and keep passengers out of the car and away from traffic if you're on a road rather than a driveway. Don't try to drive on a fully deflated tyre — a few hundred metres will destroy the sidewall and turn a repair into a replacement, and on an alloy it can wreck the rim too.`,
        ],
      },
    ],
    cityFaqs: (city, region) => [
      { q: `Do you cover ${city} at 3am?`, a: `Yes — the ${region} network is live 24/7, including weekends and bank holidays.` },
      { q: `How fast is an emergency call-out in ${city}?`, a: `Quote in about 60 seconds and a technician on-site typically within 35–90 minutes, depending on where you are and the time of night.` },
      { q: `What does an emergency tyre call-out cost in ${city}?`, a: `Around £50–£65 for a repair and £95–£200+ for a supplied and fitted tyre. You see the exact figure before you commit.` },
      { q: `Can you help if I have no spare wheel?`, a: `Yes — that's the single most common emergency we attend in ${city}. The technician brings the tyre to you.` },
    ],
    guides: [
      { to: "/blog/tyre-blowout-on-motorway-what-to-do", label: "Blowout on the motorway: what to do" },
      { to: "/blog/can-i-drive-on-a-flat-tyre-uk", label: "Can you drive on a flat tyre?" },
      { to: "/blog/emergency-tyre-replacement-uk", label: "Emergency tyre replacement explained" },
    ],
  },

  {
    slug: "run-flat-tyre-fitting",
    name: "Run-flat tyre fitting",
    keyword: "run-flat tyre fitting",
    tagline: "BMW, Mini and Mercedes run-flats supplied and fitted at your location.",
    priceLine: "From £150–£370 fitted depending on size and brand",
    intro:
      "Run-flat tyres have reinforced sidewalls that let you drive roughly 50 miles at up to 50mph after a total pressure loss. That buys you time — but once a run-flat has been driven on while deflated, it must be replaced, not repaired. Tyrefly's technicians carry the right stock and the stiffer-bead fitting equipment run-flats need, and come to you 24/7.",
    sections: [
      {
        h2: "Why run-flats usually can't be repaired",
        paragraphs: [
          "The reinforced sidewall carries the car's weight when the tyre is flat, and that generates heat that quietly degrades the rubber's internal structure. There's no reliable way to inspect for that damage afterwards, so most manufacturers and fitters treat any driven-flat run-flat as scrap. If the tyre held pressure and the damage sits in the repairable tread area, a repair is sometimes possible.",
        ],
      },
      {
        h2: "Can you replace run-flats with normal tyres?",
        paragraphs: [
          "Technically yes on most cars, and it's cheaper and more comfortable. The catch: you lose the get-you-home capability, and unless the car has a spare or a sealant kit you'll need roadside help for every puncture. Never mix run-flats and standard tyres on the same axle.",
        ],
      },
      {
        h2: "Run-flat fitting needs the right kit",
        paragraphs: [
          "The stiff bead needs a tyre machine with a proper assist arm — forcing one on with basic equipment damages the bead and the alloy. Tyrefly only routes run-flat jobs to technicians whose vans are equipped for them, and every fit includes rebalancing and a TPMS check, since run-flats depend on working pressure sensors to warn you at all.",
        ],
      },
    ],
    bullets: [
      "RSC, ROF, ZP and SSR marked tyres sourced",
      "Assist-arm equipped vans only — no bead or rim damage",
      "TPMS checked and reset with every fit",
      "24/7 at home, work or roadside",
    ],
    faqs: [
      { q: "How far can I drive on a flat run-flat?", a: "Around 50 miles at up to 50mph, but check your handbook — some manufacturers specify less. Drive gently and straight to a safe location." },
      { q: "How much do run-flat tyres cost fitted?", a: "Typically £150–£370 supplied and fitted depending on size and brand. Larger BMW and Mercedes sizes sit at the upper end." },
      { q: "Do I have to replace run-flats in pairs?", a: "Not always, but matching across the axle is strongly recommended, and essential if the remaining tyre is significantly worn." },
      { q: "Will my TPMS light clear after fitting?", a: "Yes — the technician resets the system once the new tyre is inflated to the correct pressure. If a sensor has failed, they'll tell you and can usually replace it." },
    ],
    cityIntro: (city, region) =>
      `Run-flat gone down in ${city}? Tyrefly matches you with a ${region} technician whose van carries run-flat stock and the assist-arm machine these tyres need. Text your postcode and the size and marking from your sidewall (RSC, ROF, ZP or SSR) and you'll have a fixed all-in price in about 60 seconds.`,
    citySections: (city, region, postcodes) => [
      {
        h2: `Run-flat prices in ${city}`,
        paragraphs: [
          `Run-flat fitting in ${city} typically runs £150–£370 all-in per tyre — the tyre, callout, fitting, balancing, TPMS check and old-tyre disposal. Common 17" and 18" BMW and Mini sizes sit toward the lower end; large Mercedes, X-series and performance sizes toward the top.`,
          `The £20 booking fee holds the slot and comes off the final bill. Rarer sizes may need a short sourcing window — the technician confirms availability before you commit.`,
        ],
      },
      {
        h2: `Which cars we see most in ${city}`,
        paragraphs: [
          `BMW 1, 3 and 5 Series, Mini hatch and Countryman, and Mercedes C and E Class make up most run-flat call-outs across ${region}. Many of these cars have no spare wheel at all, so a mobile fit is the only realistic fix short of a recovery truck.`,
        ],
        bullets: [
          "BMW — RSC / ROF marked",
          "Mini — RSC",
          "Mercedes-Benz — MOE / ZP",
          "Audi and VW performance models — ZP / SSR",
        ],
      },
      {
        h2: `Where we fit run-flats across ${region}`,
        paragraphs: [
          `Coverage spans ${postcodes} and the wider ${region} area, 24/7, at homes, workplaces, car parks and service areas. If your run-flat is still holding pressure you can usually drive gently to a safer spot before we arrive — but keep it under 50mph and under 50 miles, and don't do it on a tyre that's already been run flat.`,
        ],
      },
    ],
    cityFaqs: (city, region) => [
      { q: `How much is run-flat fitting in ${city}?`, a: `Usually £150–£370 per tyre all-in, depending on size and brand, with callout, balancing and disposal included.` },
      { q: `Can my run-flat be repaired in ${city}?`, a: `Only if it never lost pressure and the damage is inside the repairable tread area. Any run-flat driven while deflated must be replaced.` },
      { q: `Do you carry run-flat stock in ${region}?`, a: `Common BMW, Mini and Mercedes sizes yes. Unusual sizes may need a short sourcing window, which the technician confirms upfront.` },
      { q: `Can I switch to standard tyres instead?`, a: `On most cars yes, and it's cheaper — but you lose the drive-home capability, and you shouldn't mix run-flats and standard tyres on the same axle.` },
    ],
    guides: [
      { to: "/blog/run-flat-tyres-uk-guide", label: "Run-flat tyres explained" },
      { to: "/blog/tpms-warning-light", label: "What the TPMS light really means" },
      { to: "/blog/puncture-repair-vs-replacement", label: "Repair or replace? How to decide" },
    ],
  },
];

export function getService(slug: string): ServiceDef | undefined {
  return SERVICES.find((s) => s.slug === slug);
}
