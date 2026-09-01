// UK service areas — used to generate SEO landing pages at /areas/:slug
export interface AreaSection {
  h2: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface Area {
  slug: string;
  name: string;       // "London"
  region: string;     // "Greater London"
  shortPitch: string; // hero subline
  postcodes: string;  // sample postcode districts to look local
  hubs: string[];     // sub-areas / towns we list as covered
  faqAnswer: string;  // unique FAQ snippet
  metaTitle?: string;
  metaDesc?: string;
  intro?: string;             // long-form opening paragraph
  sections?: AreaSection[];   // long-form body (expanded ranking targets)
  extraFaqs?: { q: string; a: string }[];
  guides?: { to: string; label: string }[];
}

export const AREAS: Area[] = [
  {
    slug: "london",
    name: "London",
    region: "Greater London",
    shortPitch: "Mobile tyre fitters across all 33 London boroughs — Zone 1 to the M25.",
    postcodes: "EC, WC, N, NW, E, SE, SW, W, BR, CR, DA, EN, HA, IG, KT, RM, SM, TW, UB, WD",
    hubs: ["Westminster", "Camden", "Islington", "Hackney", "Tower Hamlets", "Lambeth", "Southwark", "Wandsworth", "Kensington & Chelsea", "Hammersmith & Fulham", "Croydon", "Bromley", "Ealing", "Hounslow", "Brent", "Barnet", "Enfield", "Haringey", "Waltham Forest", "Newham", "Redbridge", "Havering", "Bexley", "Greenwich", "Lewisham", "Merton", "Sutton", "Kingston upon Thames", "Richmond upon Thames", "Harrow", "Hillingdon", "Barking & Dagenham", "City of London"],
    faqAnswer: "Yes — we cover every London borough and the M25 corridor 24/7. Most jobs inside the North & South Circular get a fitter within 35–60 minutes.",
    metaTitle: "Mobile Tyre Fitting London | 24/7 from £95 | Tyrefly",
    metaDesc: "Flat tyre anywhere in London? A vetted fitter reaches you in 35–90 minutes, day or night. Puncture repair from £45 — message us on WhatsApp.",
    intro: "Mobile tyre fitting in London means a fully-equipped van — tyre machine, wheel balancer, compressor, stock — coming to your car instead of you limping to a garage. Tyrefly matches you to a vetted local fitter across all 33 boroughs and the M25 corridor, 24 hours a day, with a firm all-in price before anyone sets off.",
    sections: [
      {
        h2: "What mobile tyre fitting costs in London",
        paragraphs: [
          "These are the real 2026 all-in numbers across the capital — callout, tyre, fitting, balancing and disposal of the old tyre included. Anything materially cheaper usually means an external plug repair (not road-legal on its own) or a tyre that isn't actually in the van.",
        ],
        bullets: [
          "<strong>Puncture repair (BS AU 159 internal plug-patch):</strong> £45–£65",
          "<strong>Budget tyre supplied and fitted:</strong> £95–£135",
          "<strong>Mid-range premium (Michelin, Continental, Bridgestone):</strong> £140–£200",
          "<strong>Performance, SUV or run-flat:</strong> £220–£420",
          "<strong>Overnight surcharge (10pm–6am):</strong> +£20–£40",
          "<strong>Congestion Charge zone during charging hours:</strong> +£5–£15",
          "<strong>Locking wheel nut removal (no key):</strong> +£20–£40",
        ],
      },
      {
        h2: "How fast a van reaches you, by zone",
        bullets: [
          "<strong>Zones 1–2 (Central and inner):</strong> 30–60 minutes",
          "<strong>Zones 3–4 (Hackney, Camden, Wandsworth, Ealing):</strong> 45–75 minutes",
          "<strong>Zones 5–6 (Bromley, Croydon, Enfield, Kingston):</strong> 60–90 minutes",
          "<strong>Overnight, anywhere inside the M25:</strong> 40–75 minutes — often the fastest window, because the roads are empty",
          "<strong>Weekday rush hour (7.30–9.30am, 4.30–7pm):</strong> add 15–30 minutes",
        ],
        paragraphs: [
          "Airports are covered around the clock: Heathrow, Gatwick, London City, Luton and Stansted long-stay car parks typically see a fitter within 45–75 minutes.",
        ],
      },
      {
        h2: "Where we can work in London",
        bullets: [
          "<strong>Best:</strong> driveways, private mews, hotel forecourts, office car parks, NCP and Q-Park sites, estate parking with reception's OK",
          "<strong>Workable:</strong> residents' bays where you hold the permit, paid meter bays, single yellows outside restricted hours",
          "<strong>Genuine breakdowns on Red Routes:</strong> possible with hazards on, but coasting into a side street first removes all ticket risk",
          "<strong>Not possible:</strong> the M25 or motorway hard shoulder — call National Highways on 0300 123 5000 and we'll meet you at the next junction",
        ],
      },
      {
        h2: "The London jobs we see most",
        bullets: [
          "<strong>Screws and nails</strong> from construction traffic — the single biggest category across every borough",
          "<strong>Pothole and kerb damage</strong> on the North Circular, the A2 east of Blackheath, and inner Hackney and Camden side streets",
          "<strong>Run-flat replacements</strong> on BMW, Mini and Mercedes — Zone 1 parallel parking is unkind to low-profile sidewalls",
          "<strong>Private-hire and delivery drivers</strong> who can't afford to lose a shift to a garage appointment",
          "<strong>Airport arrivals</strong> finding a flat in long-stay at midnight",
        ],
      },
      {
        h2: "How to book in 60 seconds",
        bullets: [
          "Your postcode (or what3words if you're roadside)",
          "Car reg, or make, model and year",
          "Tyre size — a photo of the sidewall (e.g. 225/45 R17 94W) is fastest",
          "What's happened: nail in the tread, sidewall damage, blowout, slow leak",
          "Whether you have the locking wheel-nut key",
        ],
        paragraphs: [
          "Send those five things by WhatsApp and you get a firm all-in quote, a named fitter, and an ETA — usually inside two minutes, at 2pm or 2am.",
        ],
      },
    ],
    extraFaqs: [
      { q: "How much is mobile tyre fitting in London?", a: "£95–£135 for a budget tyre supplied and fitted, £140–£200 mid-range premium, and £220–£420 for performance, SUV or run-flat. Puncture repairs are £45–£65. Overnight adds £20–£40." },
      { q: "Can a mobile tyre fitter come inside the Congestion Charge zone?", a: "Yes, every day of the week. During charging hours a small £5–£15 uplift covers a share of the daily charge; evenings and weekends carry no surcharge." },
      { q: "Can you fit tyres in a London underground car park?", a: "Usually — most vans need about 2 metres of clearance. Check the height when you book; where the van can't get in, the wheel can be brought out for fitting." },
      { q: "Do I need to be with the car?", a: "Not if it's on a driveway or private car park and the key and locking wheel-nut key are accessible. Payment can be taken by card link afterwards." },
    ],
    guides: [
      { to: "/blog/mobile-puncture-repair-london", label: "Mobile puncture repair London: prices and same-day slots" },
      { to: "/blog/emergency-puncture-repair-london", label: "Emergency & 24 hour puncture repair London" },
      { to: "/blog/roadside-puncture-repair-london", label: "Mobile fitter vs AA and RAC" },
      { to: "/blog/mobile-tyre-fitting-london", label: "Field notes from a London tyre van" },
    ],
  },
  {
    slug: "greater-manchester",
    name: "Manchester",
    region: "Greater Manchester",
    shortPitch: "From Salford Quays to Stockport — mobile tyre techs across Greater Manchester.",
    postcodes: "M, BL, OL, SK, WA, WN",
    hubs: ["Manchester city centre", "Salford", "Trafford", "Stockport", "Bolton", "Bury", "Oldham", "Rochdale", "Tameside", "Wigan"],
    faqAnswer: "We cover all 10 Greater Manchester boroughs plus the M60 ring. Average arrival on the M60 is under 50 minutes.",
    metaTitle: "Manchester Mobile Tyre Fitting, 24/7 | Tyrefly",
    metaDesc: "Stuck with a puncture in Manchester? We repair and fit tyres at the roadside across all 10 boroughs, round the clock. Get a price in 60 seconds.",
    intro: "Mobile tyre fitting in Manchester puts a fully-stocked van at your kerb instead of costing you half a day at a garage. Tyrefly matches you to a vetted fitter across all ten Greater Manchester boroughs and the M60 ring, 24 hours a day, with a firm price agreed before dispatch.",
    sections: [
      {
        h2: "Manchester mobile tyre fitting prices",
        bullets: [
          "<strong>Puncture repair (internal plug-patch):</strong> £40–£60",
          "<strong>Budget tyre supplied and fitted:</strong> £85–£125",
          "<strong>Mid-range premium:</strong> £130–£185",
          "<strong>Performance, SUV or run-flat:</strong> £200–£390",
          "<strong>Overnight (10pm–6am):</strong> +£20–£35",
          "<strong>Locking wheel nut removal:</strong> +£20–£40",
        ],
        paragraphs: [
          "Prices run slightly below London because there's no Congestion Charge and the road network moves faster outside peak hours.",
        ],
      },
      {
        h2: "Arrival times across Greater Manchester",
        bullets: [
          "<strong>City centre, Salford, Trafford:</strong> 30–55 minutes",
          "<strong>Stockport, Bury, Oldham, Tameside:</strong> 40–70 minutes",
          "<strong>Bolton, Rochdale, Wigan:</strong> 50–85 minutes",
          "<strong>M60 ring and M62 junctions:</strong> under 50 minutes on average",
          "<strong>Manchester Airport (all terminals and long-stay):</strong> 40–70 minutes, 24/7",
        ],
      },
      {
        h2: "What we get called out to in Manchester",
        bullets: [
          "<strong>Pothole damage</strong> — the A56, A6 and inner-city side roads are hard on sidewalls after a wet winter",
          "<strong>Tram-line and kerb strikes</strong> around the Metrolink corridors in the city centre",
          "<strong>Motorway punctures</strong> on the M60, M62 and M602 — we meet you at the first safe junction or services",
          "<strong>Fleet and last-mile vans</strong> around Trafford Park and the Salford logistics estates",
          "<strong>Run-flat replacements</strong> for BMW, Mini and Mercedes drivers in Didsbury, Altrincham and Wilmslow",
        ],
      },
      {
        h2: "Booking a Manchester mobile fitter",
        bullets: [
          "Postcode or what3words",
          "Reg, or make and model",
          "Tyre size from the sidewall (photo is quickest)",
          "The problem: puncture, blowout, sidewall damage, slow leak",
          "Locking wheel-nut key: yes or no",
        ],
        paragraphs: [
          "You'll get a fixed all-in quote and an ETA back within a couple of minutes, day or night.",
        ],
      },
    ],
    extraFaqs: [
      { q: "How much is mobile tyre fitting in Manchester?", a: "£85–£125 for a budget tyre supplied and fitted, £130–£185 mid-range premium, and £200–£390 for performance, SUV or run-flat. Puncture repairs are £40–£60." },
      { q: "How fast can a mobile tyre fitter get to me in Manchester?", a: "30–55 minutes in the city centre, Salford and Trafford; 40–70 minutes across Stockport, Bury, Oldham and Tameside; 50–85 minutes in Bolton, Rochdale and Wigan." },
      { q: "Do you cover Manchester Airport?", a: "Yes — all terminals and long-stay car parks, 24/7, with typical arrival in 40–70 minutes." },
      { q: "Can you attend the M60 or M62?", a: "Not the hard shoulder — mobile fitters can't legally work there. Call National Highways on 0300 123 5000 for recovery to the next junction and we'll meet you." },
    ],
    guides: [
      { to: "/blog/mobile-tyre-fitting-manchester", label: "Mobile tyre fitting Manchester: the long read" },
      { to: "/blog/puncture-repair-cost-uk", label: "Puncture repair cost UK" },
      { to: "/blog/pothole-damage-claim-uk", label: "Claiming for pothole damage" },
    ],
  },
  {
    slug: "west-midlands",
    name: "Birmingham",
    region: "West Midlands",
    shortPitch: "Birmingham, Coventry, Wolverhampton — mobile fitters across the West Midlands.",
    postcodes: "B, CV, DY, WS, WV",
    hubs: ["Birmingham", "Coventry", "Wolverhampton", "Dudley", "Sandwell", "Solihull", "Walsall"],
    faqAnswer: "Our network covers all seven metropolitan boroughs and the M6 corridor through Spaghetti Junction. We're 24/7.",
    metaTitle: "Mobile Tyre Fitter Birmingham — Day or Night | Tyrefly",
    metaDesc: "Birmingham drivers get a tyre fitted where they're parked: home, work or hard shoulder. Repairs from £40 across the West Midlands. WhatsApp us now.",
    intro: "Mobile tyre fitting in Birmingham brings a fully-equipped van to your driveway, office car park or roadside anywhere across the West Midlands. Tyrefly matches you to a vetted local fitter covering all seven metropolitan boroughs and the M6, M5 and M42 corridors, 24 hours a day.",
    sections: [
      {
        h2: "Birmingham mobile tyre fitting prices",
        bullets: [
          "<strong>Puncture repair (internal plug-patch):</strong> £40–£60",
          "<strong>Budget tyre supplied and fitted:</strong> £85–£125",
          "<strong>Mid-range premium:</strong> £130–£185",
          "<strong>Performance, SUV or run-flat:</strong> £200–£390",
          "<strong>Overnight (10pm–6am):</strong> +£20–£35",
          "<strong>Clean Air Zone:</strong> our vans are compliant, so the charge never lands on your invoice",
        ],
      },
      {
        h2: "Arrival times across the West Midlands",
        bullets: [
          "<strong>Birmingham city centre, Edgbaston, Digbeth:</strong> 30–55 minutes",
          "<strong>Solihull, Sandwell, Dudley:</strong> 40–70 minutes",
          "<strong>Walsall, Wolverhampton:</strong> 45–80 minutes",
          "<strong>Coventry:</strong> 45–80 minutes",
          "<strong>Birmingham Airport and the NEC:</strong> 40–70 minutes, 24/7",
        ],
      },
      {
        h2: "What we get called out to in Birmingham",
        bullets: [
          "<strong>Debris punctures around Spaghetti Junction</strong> and the M6 approaches — the busiest stretch of road we work",
          "<strong>Pothole and kerb damage</strong> on the Ring Road, Hagley Road and the older Black Country routes",
          "<strong>Fleet and courier vans</strong> across the Aston, Tyseley and Oldbury industrial estates",
          "<strong>Event and exhibition traffic</strong> at the NEC and Resorts World with no time to visit a garage",
          "<strong>Run-flat replacements</strong> for Solihull and Sutton Coldfield drivers",
        ],
      },
      {
        h2: "Booking a Birmingham mobile fitter",
        bullets: [
          "Postcode or what3words",
          "Reg, or make and model",
          "Tyre size from the sidewall",
          "The problem: puncture, blowout, sidewall damage, slow leak",
          "Locking wheel-nut key: yes or no",
        ],
        paragraphs: [
          "A fixed all-in quote and ETA come back within a couple of minutes, any hour of the day.",
        ],
      },
    ],
    extraFaqs: [
      { q: "How much is mobile tyre fitting in Birmingham?", a: "£85–£125 for a budget tyre supplied and fitted, £130–£185 mid-range premium, £200–£390 for performance, SUV or run-flat. Puncture repairs are £40–£60." },
      { q: "How fast can a mobile tyre fitter reach me in Birmingham?", a: "30–55 minutes in the city centre, 40–70 minutes across Solihull, Sandwell and Dudley, and 45–80 minutes in Walsall, Wolverhampton and Coventry." },
      { q: "Does the Birmingham Clean Air Zone affect the callout?", a: "No. Our vans are CAZ-compliant, so the charge never appears on your bill." },
      { q: "Do you cover the NEC and Birmingham Airport?", a: "Yes, 24/7, with typical arrival in 40–70 minutes including long-stay car parks." },
    ],
    guides: [
      { to: "/blog/mobile-tyre-fitting-birmingham", label: "Mobile tyre fitting Birmingham: the long read" },
      { to: "/blog/puncture-repair-cost-uk", label: "Puncture repair cost UK" },
      { to: "/blog/tyre-sidewall-damage-guide", label: "Sidewall damage: repair or replace" },
    ],
  },


  {
    slug: "tyne-and-wear",
    name: "Newcastle",
    region: "Tyne & Wear",
    shortPitch: "Newcastle, Sunderland, Gateshead — North East mobile tyre fitters.",
    postcodes: "NE, SR, DH",
    hubs: ["Newcastle upon Tyne", "Sunderland", "Gateshead", "South Tyneside", "North Tyneside"],
    faqAnswer: "We cover all five Tyne & Wear boroughs and the A1 / A19 corridors 24/7.",
    metaTitle: "Newcastle Mobile Tyre Repair & Fitting | Tyrefly",
    metaDesc: "Blowout on the A1 or a slow puncture in Newcastle? CAZ-compliant vans cover Gateshead and Sunderland 24/7. Send your postcode for a quick price.",
    intro: "Mobile tyre fitting in Newcastle means a fully-kitted van crossing the Tyne to you, rather than you queueing at a garage in the Clean Air Zone. Tyrefly matches you to a vetted fitter covering Newcastle, Gateshead, Sunderland and both Tynesides around the clock, with a fixed price agreed before the van leaves the yard.",
    sections: [
      {
        h2: "Newcastle mobile tyre fitting prices",
        paragraphs: [
          "North East pricing sits below the national average, and every quote is all-in — no separate callout line that appears once the fitter's on your drive.",
        ],
        bullets: [
          "<strong>Puncture repair (internal plug-patch):</strong> £40–£55",
          "<strong>Budget tyre supplied and fitted:</strong> £80–£115",
          "<strong>Mid-range premium (Michelin, Continental, Goodyear):</strong> £120–£175",
          "<strong>Performance, SUV or run-flat:</strong> £190–£360",
          "<strong>Overnight (10pm–6am):</strong> +£20–£35",
          "<strong>Locking wheel nut removal (no key):</strong> +£20–£40",
        ],
      },
      {
        h2: "Arrival times across Tyne & Wear",
        bullets: [
          "<strong>Newcastle city centre, Quayside, Jesmond:</strong> 30–55 minutes",
          "<strong>Gateshead and the MetroCentre:</strong> 35–60 minutes",
          "<strong>North Tyneside — Wallsend, Tynemouth, Whitley Bay:</strong> 40–65 minutes",
          "<strong>Sunderland and South Tyneside — South Shields, Washington:</strong> 45–75 minutes",
          "<strong>Newcastle Airport and the A696 approach:</strong> 35–60 minutes, 24/7",
        ],
      },
      {
        h2: "Clean Air Zone and where a van can work",
        paragraphs: [
          "Newcastle's Clean Air Zone covers the city centre and the Tyne Bridge/Swing Bridge/Redheugh Bridge crossings. Our fitters run CAZ-compliant vans, so a callout inside the zone never adds a charge to your invoice.",
        ],
        bullets: [
          "<strong>Best:</strong> driveways, terraced-street parking with space to open the boot, retail and office car parks, Metro park-and-ride sites",
          "<strong>Workable:</strong> residents' permit bays, quiet side streets off the Coast Road",
          "<strong>Genuine breakdowns on the Central Motorway or Tyne Bridge approach:</strong> hazards on, and we'll route you to the nearest safe pull-in",
          "<strong>Not possible:</strong> the hard shoulder of the A1(M) or A19 — call National Highways on 0300 123 5000 and we'll meet you at the next junction",
        ],
      },
      {
        h2: "The jobs we see most in the North East",
        bullets: [
          "<strong>Pothole and frost-heave damage</strong> on the A1 Western Bypass, the Coast Road (A1058) and the older streets around Byker and Elswick",
          "<strong>Kerb strikes on the Tyne and Swing Bridges</strong> approach lanes during rush hour",
          "<strong>Debris punctures on the A19</strong> between the Tyne Tunnel and Sunderland — a fast, heavily used freight route",
          "<strong>Fleet vans</strong> around the Team Valley Trading Estate and Nissan's Washington plant supply chain",
          "<strong>Run-flat replacements</strong> for Gosforth and Ponteland drivers whose low-profile tyres don't survive local speed humps",
        ],
      },
      {
        h2: "How to book a Newcastle mobile fitter",
        bullets: [
          "Postcode or what3words",
          "Reg, or make, model and year",
          "Tyre size from the sidewall — a photo is quickest",
          "The problem: nail in the tread, sidewall bulge, blowout, slow leak",
          "Locking wheel-nut key: yes or no",
        ],
        paragraphs: [
          "Send those over WhatsApp and you'll have a fixed all-in price and a named fitter's ETA back within two minutes.",
        ],
      },
    ],
    extraFaqs: [
      { q: "How much is mobile tyre fitting in Newcastle?", a: "£80–£115 for a budget tyre supplied and fitted, £120–£175 mid-range premium, and £190–£360 for performance, SUV or run-flat. Puncture repairs are £40–£55." },
      { q: "Does the Newcastle Clean Air Zone add a charge?", a: "No. Our vans are CAZ-compliant, so working inside the zone doesn't add anything to your bill." },
      { q: "Can you reach me on the A1 or A19?", a: "Not on the hard shoulder — that's for National Highways (0300 123 5000) to recover you first. We'll meet you at the next junction or services." },
      { q: "Do you cover Sunderland and South Tyneside as well as Newcastle?", a: "Yes — all five Tyne & Wear boroughs, 24/7, with typical arrival of 40–75 minutes depending on how far you are from the Tyne." },
    ],
    guides: [
      { to: "/blog/pothole-damage-claim-uk", label: "Claiming for pothole damage" },
      { to: "/blog/tyre-blowout-on-motorway-what-to-do", label: "What to do after a motorway blowout" },
      { to: "/blog/cracked-alloy-from-pothole", label: "Cracked alloy from a pothole: your options" },
    ],
  },
  {
    slug: "bristol",
    name: "Bristol",
    region: "Bristol & Bath",
    shortPitch: "Bristol, Bath and the wider South West — mobile tyre techs on call.",
    postcodes: "BS, BA",
    hubs: ["Bristol city centre", "Clifton", "Bedminster", "Filton", "Bath", "Keynsham", "Portishead"],
    faqAnswer: "Cover spans Bristol, North Somerset, South Gloucestershire and BANES. M4 / M5 junctions are our specialty.",
    metaTitle: "Mobile Tyre Fitting in Bristol & Bath | Tyrefly",
    metaDesc: "From Clifton to the M5, our mobile fitters come to you across Bristol and Bath at any hour. Punctures from £40 — start a WhatsApp chat to book.",
    intro: "Mobile tyre fitting in Bristol brings a fully-equipped van to you, whether that's a steep Clifton terrace, a Bedminster side street or a lay-by on the M32. Tyrefly matches you to a vetted local fitter covering Bristol, Bath, North Somerset and South Gloucestershire 24 hours a day, with a firm price agreed before anyone sets off.",
    sections: [
      {
        h2: "What mobile tyre fitting costs in Bristol",
        paragraphs: [
          "These are realistic 2026 all-in prices for the Bristol and Bath area — callout, tyre, fitting, balancing and old-tyre disposal all included.",
        ],
        bullets: [
          "<strong>Puncture repair (internal plug-patch):</strong> £40–£60",
          "<strong>Budget tyre supplied and fitted:</strong> £85–£120",
          "<strong>Mid-range premium (Michelin, Continental, Bridgestone):</strong> £130–£185",
          "<strong>Performance, SUV or run-flat:</strong> £200–£380",
          "<strong>Overnight surcharge (10pm–6am):</strong> +£20–£35",
          "<strong>Locking wheel nut removal (no key):</strong> +£20–£40",
        ],
      },
      {
        h2: "Arrival times across Bristol and Bath",
        bullets: [
          "<strong>Bristol city centre, Clifton, Redland:</strong> 30–55 minutes",
          "<strong>Bedminster, Southville, Hartcliffe, Filton:</strong> 35–65 minutes",
          "<strong>Bath and Keynsham:</strong> 45–75 minutes",
          "<strong>Portishead, Nailsea, Yate:</strong> 45–80 minutes",
          "<strong>M4 (Almondsbury interchange) and M5 (Cribbs Causeway to Weston junctions):</strong> under an hour to most services",
          "<strong>Bristol Airport:</strong> 35–60 minutes, 24/7",
        ],
      },
      {
        h2: "Bristol's Clean Air Zone and where a van can work",
        paragraphs: [
          "Bristol runs a Clean Air Zone covering the city centre inside the inner ring — our fitters use CAZ-compliant vans, so a callout in Old Market, Broadmead or the Bearpit never adds a charge. Steep streets around Clifton and Totterdown can be tight for a van; where that's the case, we'll ask you to roll a few yards to a flatter, wider spot.",
        ],
        bullets: [
          "<strong>Best:</strong> driveways, hotel and retail car parks, park-and-ride sites (Long Ashton, Portway, Brislington), office parking",
          "<strong>Workable:</strong> residents' permit bays, wide terraced streets in Bedminster and Southville, Bath's paid car parks outside peak times",
          "<strong>Genuine breakdowns on the Cumberland Basin flyover or the M32:</strong> hazards on, and we'll direct you to the nearest safe pull-in",
          "<strong>Not possible:</strong> the M4 or M5 hard shoulder — call National Highways on 0300 123 5000 and we'll meet you at the next junction",
        ],
      },
      {
        h2: "The jobs we see most around Bristol",
        bullets: [
          "<strong>Pothole and drain-edge damage</strong> on the Portway, Bath Road and the older streets around Easton and St George — clay ground movement doesn't help",
          "<strong>Sidewall damage from kerbing</strong> on Clifton and Redland's narrow, parked-up terraces",
          "<strong>Debris punctures on the M32 and M4</strong> between the Almondsbury interchange and Aztec West",
          "<strong>Fleet and van punctures</strong> around the Avonmouth and Severnside distribution parks",
          "<strong>Run-flat replacements</strong> for drivers in Bath, Long Ashton and Failand, where low-profile tyres meet cobbled and pot-holed lanes",
        ],
      },
      {
        h2: "Booking a Bristol mobile fitter",
        bullets: [
          "Postcode or what3words",
          "Reg, or make, model and year",
          "Tyre size from the sidewall — a photo is quickest",
          "What's happened: nail in the tread, sidewall bulge, blowout, slow leak",
          "Locking wheel-nut key: yes or no",
        ],
        paragraphs: [
          "Send those five details over WhatsApp and you'll get a fixed all-in quote and a named fitter's ETA back within a couple of minutes, day or night.",
        ],
      },
    ],
    extraFaqs: [
      { q: "How much is mobile tyre fitting in Bristol?", a: "£85–£120 for a budget tyre supplied and fitted, £130–£185 mid-range premium, and £200–£380 for performance, SUV or run-flat. Puncture repairs are £40–£60." },
      { q: "Does Bristol's Clean Air Zone add a charge to my callout?", a: "No. Our vans are CAZ-compliant, so working inside the zone never adds anything to your invoice." },
      { q: "Can a van reach me on a steep Clifton or Totterdown street?", a: "Usually, but on very narrow inclines we may ask you to move the car a short distance to a flatter, wider spot so the fitter has room to work safely." },
      { q: "Do you cover Bath as well as Bristol?", a: "Yes — Bath, Keynsham, Saltford and BANES are all covered, with typical arrival of 45–75 minutes." },
    ],
    guides: [
      { to: "/blog/tyre-sidewall-damage-guide", label: "Sidewall damage: repair or replace" },
      { to: "/blog/wheel-alignment-uk-guide", label: "Wheel alignment: do you need it after kerbing a tyre?" },
      { to: "/blog/mobile-tyre-fitter-vs-garage", label: "Mobile fitter vs garage: which is right for you" },
    ],
  },
  {
    slug: "west-yorkshire",
    name: "Leeds",
    region: "West Yorkshire",
    shortPitch: "Leeds, Bradford, Wakefield — mobile tyre help across West Yorkshire.",
    postcodes: "LS, BD, HD, HX, WF",
    hubs: ["Leeds", "Bradford", "Wakefield", "Huddersfield", "Halifax", "Dewsbury", "Pontefract"],
    faqAnswer: "We cover all five West Yorkshire districts and the M62 corridor. Typical ETA inside Leeds ring road is 40 minutes.",
    metaTitle: "Leeds Mobile Tyre Fitter, Available 24/7 | Tyrefly",
    metaDesc: "Need a tyre sorted in Leeds, Bradford or Wakefield? We fit at the kerb, on driveways and along the M62. Message Tyrefly for a fixed price.",
    intro: "Mobile tyre fitting in Leeds means a fully-stocked van reaching you in the city centre, along the outer ring road, or out towards Bradford and Wakefield, instead of you queueing for a garage slot. Tyrefly matches you to a vetted local fitter across all five West Yorkshire districts, 24 hours a day, with a firm all-in price agreed before dispatch.",
    sections: [
      {
        h2: "Leeds mobile tyre fitting prices",
        bullets: [
          "<strong>Puncture repair (internal plug-patch):</strong> £40–£55",
          "<strong>Budget tyre supplied and fitted:</strong> £80–£115",
          "<strong>Mid-range premium (Michelin, Continental, Goodyear):</strong> £120–£175",
          "<strong>Performance, SUV or run-flat:</strong> £190–£360",
          "<strong>Overnight (10pm–6am):</strong> +£20–£35",
          "<strong>Locking wheel nut removal (no key):</strong> +£20–£40",
        ],
      },
      {
        h2: "Arrival times across West Yorkshire",
        bullets: [
          "<strong>Leeds city centre and inner ring road:</strong> 30–55 minutes",
          "<strong>Headingley, Chapel Allerton, Roundhay:</strong> 35–60 minutes",
          "<strong>Bradford and Shipley:</strong> 40–70 minutes",
          "<strong>Wakefield and Pontefract:</strong> 40–70 minutes",
          "<strong>Huddersfield and Halifax:</strong> 45–80 minutes",
          "<strong>Leeds Bradford Airport:</strong> 35–60 minutes, 24/7",
        ],
      },
      {
        h2: "Where a van can and can't work in Leeds",
        bullets: [
          "<strong>Best:</strong> driveways, office and retail car parks, park-and-ride sites off the ring road, hotel forecourts near the Arena",
          "<strong>Workable:</strong> residents' permit bays in Headingley and Hyde Park, terraced streets with room to open the boot",
          "<strong>Genuine breakdowns on the Leeds Inner Ring Road or Armley Gyratory:</strong> hazards on, and we'll route you to the nearest safe pull-in",
          "<strong>Not possible:</strong> the M1, M62 or M621 hard shoulder — call National Highways on 0300 123 5000 and we'll meet you at the next junction",
        ],
      },
      {
        h2: "The jobs we see most in West Yorkshire",
        bullets: [
          "<strong>Pothole damage</strong> on the A58 Wetherby Road, the Armley Gyratory and the older streets around Bradford's Great Horton and Manningham",
          "<strong>Debris punctures on the M62 and M1</strong> where they meet at the M621 — one of the busiest interchanges in the North",
          "<strong>Sidewall damage from kerbing</strong> on Headingley and Hyde Park's tight, parked-up terraces",
          "<strong>Fleet vans</strong> around the White Rose and Birstall retail and distribution parks",
          "<strong>Run-flat replacements</strong> for drivers in Roundhay, Alwoodley and Ilkley whose low-profile tyres don't survive local speed cushions",
        ],
      },
      {
        h2: "How to book a Leeds mobile fitter",
        bullets: [
          "Postcode or what3words",
          "Reg, or make, model and year",
          "Tyre size from the sidewall — a photo is quickest",
          "The problem: nail in the tread, sidewall bulge, blowout, slow leak",
          "Locking wheel-nut key: yes or no",
        ],
        paragraphs: [
          "Send those over WhatsApp and you'll get a fixed all-in quote and a named fitter's ETA back within a couple of minutes.",
        ],
      },
    ],
    extraFaqs: [
      { q: "How much is mobile tyre fitting in Leeds?", a: "£80–£115 for a budget tyre supplied and fitted, £120–£175 mid-range premium, and £190–£360 for performance, SUV or run-flat. Puncture repairs are £40–£55." },
      { q: "How fast can a fitter reach me in Leeds?", a: "30–55 minutes inside the ring road, 35–60 minutes in Headingley and Roundhay, and 40–70 minutes across Bradford and Wakefield." },
      { q: "Can you reach me on the M62 or M621?", a: "Not on the hard shoulder — National Highways (0300 123 5000) handles recovery from there. We'll meet you at the next junction or services." },
      { q: "Do you cover Huddersfield and Halifax as well as Leeds?", a: "Yes — all five West Yorkshire districts, 24/7, with typical arrival of 45–80 minutes for the Calder Valley towns." },
    ],
    guides: [
      { to: "/blog/puncture-repair-cost-uk", label: "Puncture repair cost UK" },
      { to: "/blog/nail-in-tyre-what-to-do", label: "Nail in your tyre: what to do next" },
      { to: "/blog/uk-tyre-legal-tread-depth", label: "UK legal tread depth explained" },
    ],
  },
  {
    slug: "merseyside",
    name: "Liverpool",
    region: "Merseyside",
    shortPitch: "Liverpool to the Wirral — fast mobile tyre fitting across Merseyside.",
    postcodes: "L, CH, WA",
    hubs: ["Liverpool", "Wirral", "Sefton", "Knowsley", "St Helens", "Birkenhead", "Bootle"],
    faqAnswer: "We cover all five Merseyside boroughs including the Wirral peninsula. M57 / M62 arrivals are usually under an hour.",
    metaTitle: "Mobile Tyre Fitting Liverpool & Wirral | Tyrefly",
    metaDesc: "Punctured in Liverpool or over the water in the Wirral? A vetted fitter travels to you day or night, repairs from £40. Send your postcode on WhatsApp.",
    intro: "Mobile tyre fitting in Liverpool means a fully-equipped van coming to you, whether you're in the city centre, out on the Wirral, or stuck near the Mersey tunnels. Tyrefly matches you to a vetted local fitter across all five Merseyside boroughs, 24 hours a day, with a firm price agreed before anyone leaves the yard.",
    sections: [
      {
        h2: "Liverpool mobile tyre fitting prices",
        bullets: [
          "<strong>Puncture repair (internal plug-patch):</strong> £40–£55",
          "<strong>Budget tyre supplied and fitted:</strong> £80–£115",
          "<strong>Mid-range premium (Michelin, Continental, Goodyear):</strong> £120–£175",
          "<strong>Performance, SUV or run-flat:</strong> £190–£360",
          "<strong>Overnight (10pm–6am):</strong> +£20–£35",
          "<strong>Locking wheel nut removal (no key):</strong> +£20–£40",
        ],
      },
      {
        h2: "Arrival times across Merseyside",
        bullets: [
          "<strong>Liverpool city centre, Baltic Triangle, Anfield:</strong> 30–55 minutes",
          "<strong>Bootle, Sefton, Crosby:</strong> 35–65 minutes",
          "<strong>Wirral (via Kingsway or Queensway tunnels) — Birkenhead, Wallasey, Heswall:</strong> 40–70 minutes",
          "<strong>Knowsley and St Helens:</strong> 40–70 minutes",
          "<strong>Liverpool John Lennon Airport:</strong> 35–60 minutes, 24/7",
        ],
      },
      {
        h2: "Tunnels, docks and where a van can work",
        paragraphs: [
          "The Mersey Tunnels (Kingsway and Queensway) mean a Wirral job might genuinely be a fitter based on the Liverpool side, or vice versa — we dispatch whoever's actually closer by road, not as the crow flies.",
        ],
        bullets: [
          "<strong>Best:</strong> driveways, retail and office car parks, park-and-ride sites, dockside business park parking",
          "<strong>Workable:</strong> residents' permit bays, quiet streets off the main arterial roads",
          "<strong>Genuine breakdowns on the tunnel approaches:</strong> hazards on — tunnel staff and CCTV respond fast, and we'll meet you once you're clear",
          "<strong>Not possible:</strong> the M62, M57 or M53 hard shoulder — call National Highways on 0300 123 5000 and we'll meet you at the next junction",
        ],
      },
      {
        h2: "The jobs we see most around Merseyside",
        bullets: [
          "<strong>Pothole damage</strong> on Queens Drive, the Dock Road and older streets around Bootle and Walton",
          "<strong>Debris punctures on the M57 and M62</strong> approaching the city — a heavy freight corridor from the port",
          "<strong>Sidewall damage from kerbing</strong> on Wirral's narrower coastal lanes around Hoylake and West Kirby",
          "<strong>Fleet and haulage vans</strong> around the Port of Liverpool and Knowsley industrial estates",
          "<strong>Run-flat replacements</strong> for drivers in Woolton, Formby and Heswall whose low-profile tyres take a beating on speed bumps",
        ],
      },
      {
        h2: "How to book a Liverpool mobile fitter",
        bullets: [
          "Postcode or what3words",
          "Reg, or make, model and year",
          "Tyre size from the sidewall — a photo is quickest",
          "The problem: nail in the tread, sidewall bulge, blowout, slow leak",
          "Locking wheel-nut key: yes or no",
        ],
        paragraphs: [
          "Send those over WhatsApp and you'll get a fixed all-in quote and a named fitter's ETA back within a couple of minutes.",
        ],
      },
    ],
    extraFaqs: [
      { q: "How much is mobile tyre fitting in Liverpool?", a: "£80–£115 for a budget tyre supplied and fitted, £120–£175 mid-range premium, and £190–£360 for performance, SUV or run-flat. Puncture repairs are £40–£55." },
      { q: "Do you cover the Wirral as well as Liverpool?", a: "Yes — Birkenhead, Wallasey, Heswall and the rest of the peninsula, with typical arrival of 40–70 minutes via the Mersey tunnels." },
      { q: "Can you reach me on the M62, M57 or M53?", a: "Not on the hard shoulder — National Highways (0300 123 5000) handles recovery from there. We'll meet you at the next junction or services." },
      { q: "Do you cover Liverpool John Lennon Airport?", a: "Yes, 24/7, with typical arrival of 35–60 minutes including the long-stay car parks." },
    ],
    guides: [
      { to: "/blog/slow-puncture-uk-guide", label: "Slow puncture: causes and fixes" },
      { to: "/blog/can-a-puncture-be-repaired-uk", label: "Can a puncture be repaired?" },
      { to: "/blog/budget-vs-premium-tyres-uk", label: "Budget vs premium tyres" },
    ],
  },
  {
    slug: "south-yorkshire",
    name: "Sheffield",
    region: "South Yorkshire",
    shortPitch: "Sheffield, Rotherham, Doncaster, Barnsley — mobile tyre techs across South Yorkshire.",
    postcodes: "S, DN",
    hubs: ["Sheffield", "Rotherham", "Doncaster", "Barnsley"],
    faqAnswer: "Coverage spans all four South Yorkshire boroughs plus the M1 / M18 / A1(M).",
    metaTitle: "Sheffield Mobile Tyre Repair, Any Hour | Tyrefly",
    metaDesc: "Tyre trouble in Sheffield, Rotherham or Doncaster? We cover the M1 and M18 around the clock and fit at your location. Quote back in about 60 seconds.",
    intro: "Mobile tyre fitting in Sheffield means a fully-stocked van reaching you on the hills of the city, or out along the M1 and M18 towards Rotherham and Doncaster, instead of a wasted trip to a garage. Tyrefly matches you to a vetted local fitter across all four South Yorkshire boroughs, 24 hours a day, with a firm all-in price agreed before dispatch.",
    sections: [
      {
        h2: "Sheffield mobile tyre fitting prices",
        bullets: [
          "<strong>Puncture repair (internal plug-patch):</strong> £40–£55",
          "<strong>Budget tyre supplied and fitted:</strong> £80–£115",
          "<strong>Mid-range premium (Michelin, Continental, Goodyear):</strong> £120–£175",
          "<strong>Performance, SUV or run-flat:</strong> £190–£360",
          "<strong>Overnight (10pm–6am):</strong> +£20–£35",
          "<strong>Locking wheel nut removal (no key):</strong> +£20–£40",
        ],
      },
      {
        h2: "Arrival times across South Yorkshire",
        bullets: [
          "<strong>Sheffield city centre, Ecclesall, Hillsborough:</strong> 30–55 minutes",
          "<strong>Rotherham:</strong> 35–65 minutes",
          "<strong>Doncaster:</strong> 40–70 minutes",
          "<strong>Barnsley:</strong> 40–70 minutes",
          "<strong>M1 (junctions 29–36) and M18:</strong> under an hour to most services",
          "<strong>Doncaster Sheffield Airport corridor:</strong> 40–70 minutes, 24/7",
        ],
      },
      {
        h2: "Sheffield's hills and where a van can work",
        paragraphs: [
          "Sheffield's terrain is genuinely steep in places — Crookes, Walkley and parts of the west end sit on gradients that make wheel-changing awkward on the actual slope. Where that's the case, we'll ask you to roll a short distance to level ground before the fitter starts.",
        ],
        bullets: [
          "<strong>Best:</strong> driveways, flat retail and office car parks, park-and-ride sites near the Supertram lines",
          "<strong>Workable:</strong> residents' permit bays on flatter streets, terraced streets in Hillsborough and Meadowhall's surrounding estates",
          "<strong>Genuine breakdowns on the Sheffield Parkway or inner ring road:</strong> hazards on, and we'll direct you to the nearest safe pull-in",
          "<strong>Not possible:</strong> the M1, M18 or A1(M) hard shoulder — call National Highways on 0300 123 5000 and we'll meet you at the next junction",
        ],
      },
      {
        h2: "The jobs we see most in South Yorkshire",
        bullets: [
          "<strong>Pothole damage</strong> on the Sheffield Parkway, the steep back streets of Crookes and Walkley, and Barnsley's older colliery-era roads",
          "<strong>Debris punctures on the M1 and M18</strong> where freight traffic runs heavy towards Doncaster and the ports",
          "<strong>Sidewall damage from kerbing</strong> on Sheffield's narrow hillside terraces",
          "<strong>Fleet vans</strong> around Meadowhall, the Advanced Manufacturing Park and Doncaster's iPort logistics hub",
          "<strong>Run-flat replacements</strong> for drivers in Dore, Fulwood and Wickersley whose low-profile tyres don't love cobbled or pot-holed lanes",
        ],
      },
      {
        h2: "How to book a Sheffield mobile fitter",
        bullets: [
          "Postcode or what3words",
          "Reg, or make, model and year",
          "Tyre size from the sidewall — a photo is quickest",
          "The problem: nail in the tread, sidewall bulge, blowout, slow leak",
          "Locking wheel-nut key: yes or no",
        ],
        paragraphs: [
          "Send those over WhatsApp and you'll get a fixed all-in quote and a named fitter's ETA back within a couple of minutes.",
        ],
      },
    ],
    extraFaqs: [
      { q: "How much is mobile tyre fitting in Sheffield?", a: "£80–£115 for a budget tyre supplied and fitted, £120–£175 mid-range premium, and £190–£360 for performance, SUV or run-flat. Puncture repairs are £40–£55." },
      { q: "Can a fitter work on a steep Sheffield street?", a: "Usually, but on genuinely steep gradients around Crookes or Walkley we'll ask you to move to flatter ground nearby for the fitter's safety." },
      { q: "Can you reach me on the M1 or M18?", a: "Not on the hard shoulder — National Highways (0300 123 5000) handles recovery from there. We'll meet you at the next junction or services." },
      { q: "Do you cover Doncaster and Barnsley as well as Sheffield?", a: "Yes — all four South Yorkshire boroughs, 24/7, with typical arrival of 40–70 minutes." },
    ],
    guides: [
      { to: "/blog/tyre-age-when-to-replace", label: "Tyre age: when to replace, not just tread" },
      { to: "/blog/wheel-alignment-uk-guide", label: "Wheel alignment UK guide" },
      { to: "/blog/pothole-damage-claim-uk", label: "Claiming for pothole damage" },
    ],
  },
  {
    slug: "edinburgh",
    name: "Edinburgh",
    region: "Edinburgh & Lothians",
    shortPitch: "Edinburgh and the Lothians — mobile tyre help across central Scotland.",
    postcodes: "EH",
    hubs: ["Edinburgh city centre", "Leith", "Portobello", "Musselburgh", "Livingston", "Dalkeith"],
    faqAnswer: "We cover the City of Edinburgh, Midlothian, East Lothian and West Lothian, plus the A720 city bypass.",
    metaTitle: "Mobile Tyre Fitter Edinburgh & Lothians | Tyrefly",
    metaDesc: "LEZ-ready vans reach Edinburgh drivers wherever they stop, including the A720 bypass. Puncture repair from £40 — WhatsApp us and we'll price it fast.",
    intro: "Mobile tyre fitting in Edinburgh means a fully-equipped van reaching you on a cobbled Old Town close, a Leith side street, or out along the A720 bypass, instead of a wasted trip to a garage. Tyrefly matches you to a vetted local fitter across the City of Edinburgh and the three Lothians, 24 hours a day, with a firm all-in price agreed before dispatch.",
    sections: [
      {
        h2: "Edinburgh mobile tyre fitting prices",
        paragraphs: [
          "Pricing in and around Edinburgh runs a little above the English North because stock has to travel further and city-centre parking eats into a fitter's day — but every quote is fixed and all-in.",
        ],
        bullets: [
          "<strong>Puncture repair (internal plug-patch):</strong> £45–£60",
          "<strong>Budget tyre supplied and fitted:</strong> £90–£125",
          "<strong>Mid-range premium (Michelin, Continental, Goodyear):</strong> £135–£190",
          "<strong>Performance, SUV or run-flat:</strong> £210–£390",
          "<strong>Overnight (10pm–6am):</strong> +£20–£40",
          "<strong>Locking wheel nut removal (no key):</strong> +£20–£40",
        ],
      },
      {
        h2: "Arrival times across Edinburgh and the Lothians",
        bullets: [
          "<strong>Edinburgh city centre, New Town, Leith:</strong> 30–60 minutes",
          "<strong>Portobello, Musselburgh, Corstorphine:</strong> 40–65 minutes",
          "<strong>Livingston and West Lothian:</strong> 45–75 minutes",
          "<strong>Dalkeith and Midlothian:</strong> 45–75 minutes",
          "<strong>A720 city bypass, all junctions:</strong> under an hour",
          "<strong>Edinburgh Airport:</strong> 35–60 minutes, 24/7",
        ],
      },
      {
        h2: "Edinburgh's LEZ, cobbles and where a van can work",
        paragraphs: [
          "Edinburgh's Low Emission Zone covers the city centre; our fitters run LEZ-compliant vans, so working inside it never adds a charge to your invoice. The Old Town and parts of Stockbridge are genuinely cobbled and narrow — where a van can't get close enough, we'll ask you to move a short distance to a wider street or car park.",
        ],
        bullets: [
          "<strong>Best:</strong> driveways, retail and office car parks, park-and-ride sites (Ingliston, Sheriffhall)",
          "<strong>Workable:</strong> residents' permit bays, wider streets in Leith and Portobello",
          "<strong>Genuine breakdowns on Princes Street or the bypass:</strong> hazards on, and we'll direct you to the nearest safe spot",
          "<strong>Not possible:</strong> the A720 bypass hard shoulder or motorway sections of the M8/M9 — call Traffic Scotland on 0800 028 1414 and we'll meet you at the next junction",
        ],
      },
      {
        h2: "The jobs we see most in Edinburgh",
        bullets: [
          "<strong>Cobble and tram-line damage</strong> around Princes Street, Shandwick Place and the Old Town's setts",
          "<strong>Pothole damage</strong> on the A720 bypass and the older streets of Leith and Gorgie",
          "<strong>Sidewall damage from kerbing</strong> on New Town's tight, permit-only terraces",
          "<strong>Fleet and airport transfer vehicles</strong> around Ingliston and the airport corridor",
          "<strong>Run-flat replacements</strong> for drivers in Morningside and the Grange whose low-profile tyres meet cobbled lanes",
        ],
      },
      {
        h2: "How to book an Edinburgh mobile fitter",
        bullets: [
          "Postcode or what3words",
          "Reg, or make, model and year",
          "Tyre size from the sidewall — a photo is quickest",
          "The problem: nail in the tread, sidewall bulge, blowout, slow leak",
          "Locking wheel-nut key: yes or no",
        ],
        paragraphs: [
          "Send those over WhatsApp and you'll get a fixed all-in quote and a named fitter's ETA back within a couple of minutes.",
        ],
      },
    ],
    extraFaqs: [
      { q: "How much is mobile tyre fitting in Edinburgh?", a: "£90–£125 for a budget tyre supplied and fitted, £135–£190 mid-range premium, and £210–£390 for performance, SUV or run-flat. Puncture repairs are £45–£60." },
      { q: "Does Edinburgh's LEZ add a charge to my callout?", a: "No. Our vans are LEZ-compliant, so working inside the zone never adds anything to your invoice." },
      { q: "Can a fitter reach me on a cobbled Old Town street?", a: "Usually, though on very narrow setts we may ask you to move to a nearby wider street or car park so the fitter can work safely." },
      { q: "Do you cover Livingston and the Lothians as well as Edinburgh?", a: "Yes — City of Edinburgh, Midlothian, East Lothian and West Lothian, 24/7, with typical arrival of 45–75 minutes further out." },
    ],
    guides: [
      { to: "/blog/all-season-vs-winter-tyres-uk", label: "All-season vs winter tyres" },
      { to: "/blog/tyre-pressure-guide-uk", label: "Tyre pressure guide" },
      { to: "/blog/locking-wheel-nut-lost-uk", label: "Lost locking wheel nut key: what now" },
    ],
  },
  {
    slug: "glasgow",
    name: "Glasgow",
    region: "Greater Glasgow",
    shortPitch: "Glasgow, Paisley, East Kilbride — mobile tyre fitters across Greater Glasgow.",
    postcodes: "G, PA, ML",
    hubs: ["Glasgow city centre", "Paisley", "East Kilbride", "Hamilton", "Motherwell", "Clydebank", "Renfrew"],
    faqAnswer: "Coverage includes the M8 / M74 / M77 ring and Renfrewshire, North & South Lanarkshire.",
    metaTitle: "Glasgow Mobile Tyre Fitting, 24 Hours a Day | Tyrefly",
    metaDesc: "Flat tyre in Glasgow or out towards Lanarkshire? Our LEZ-compliant fitters cover the M8 and M74 all night. Send a message for a fixed price.",
    intro: "Mobile tyre fitting in Glasgow means a fully-stocked van reaching you in the city centre's Low Emission Zone, out along the M8 or M74, or across to Paisley and East Kilbride, instead of a wasted trip to a garage. Tyrefly matches you to a vetted local fitter across Greater Glasgow, Renfrewshire and Lanarkshire, 24 hours a day, with a firm all-in price agreed before dispatch.",
    sections: [
      {
        h2: "Glasgow mobile tyre fitting prices",
        bullets: [
          "<strong>Puncture repair (internal plug-patch):</strong> £45–£60",
          "<strong>Budget tyre supplied and fitted:</strong> £90–£125",
          "<strong>Mid-range premium (Michelin, Continental, Goodyear):</strong> £135–£190",
          "<strong>Performance, SUV or run-flat:</strong> £210–£390",
          "<strong>Overnight (10pm–6am):</strong> +£20–£40",
          "<strong>Locking wheel nut removal (no key):</strong> +£20–£40",
        ],
      },
      {
        h2: "Arrival times across Greater Glasgow",
        bullets: [
          "<strong>Glasgow city centre, West End, Southside:</strong> 30–55 minutes",
          "<strong>Paisley and Renfrew:</strong> 35–65 minutes",
          "<strong>Clydebank and Dumbarton:</strong> 40–70 minutes",
          "<strong>East Kilbride and Hamilton:</strong> 40–70 minutes",
          "<strong>Motherwell and the M74 corridor:</strong> 45–75 minutes",
          "<strong>Glasgow Airport:</strong> 35–60 minutes, 24/7",
        ],
      },
      {
        h2: "Glasgow's LEZ and where a van can work",
        paragraphs: [
          "Glasgow's Low Emission Zone covers the city centre inside the M8; our fitters run LEZ-compliant vans, so working inside it never adds a charge to your bill. Tenement streets in the West End and Southside are often tight with parking on both sides — where that's the case, we'll ask you to move a short distance to a side street with more room.",
        ],
        bullets: [
          "<strong>Best:</strong> driveways, retail and office car parks, park-and-ride sites off the M8 and M77",
          "<strong>Workable:</strong> residents' permit bays, wider tenement streets in Shawlands and Dennistoun",
          "<strong>Genuine breakdowns on the M8 through the city or the Kingston Bridge:</strong> hazards on, and we'll direct you to the nearest safe pull-in",
          "<strong>Not possible:</strong> the M8, M74 or M77 hard shoulder — call Traffic Scotland on 0800 028 1414 and we'll meet you at the next junction",
        ],
      },
      {
        h2: "The jobs we see most in Glasgow",
        bullets: [
          "<strong>Pothole damage</strong> on the M8 through the city, the Clydeside Expressway and older streets in Govan and Dennistoun",
          "<strong>Sidewall damage from kerbing</strong> on tight tenement streets in the West End and Southside",
          "<strong>Debris punctures on the M74</strong> heading south towards Hamilton and Motherwell — a heavy freight route",
          "<strong>Fleet vans</strong> around the Hillington and Eurocentral industrial estates",
          "<strong>Run-flat replacements</strong> for drivers in Bearsden and Newton Mearns whose low-profile tyres don't love cobbled lanes and speed cushions",
        ],
      },
      {
        h2: "How to book a Glasgow mobile fitter",
        bullets: [
          "Postcode or what3words",
          "Reg, or make, model and year",
          "Tyre size from the sidewall — a photo is quickest",
          "The problem: nail in the tread, sidewall bulge, blowout, slow leak",
          "Locking wheel-nut key: yes or no",
        ],
        paragraphs: [
          "Send those over WhatsApp and you'll get a fixed all-in quote and a named fitter's ETA back within a couple of minutes.",
        ],
      },
    ],
    extraFaqs: [
      { q: "How much is mobile tyre fitting in Glasgow?", a: "£90–£125 for a budget tyre supplied and fitted, £135–£190 mid-range premium, and £210–£390 for performance, SUV or run-flat. Puncture repairs are £45–£60." },
      { q: "Does Glasgow's LEZ add a charge to my callout?", a: "No. Our vans are LEZ-compliant, so working inside the zone never adds anything to your invoice." },
      { q: "Can you reach me on the M8, M74 or M77?", a: "Not on the hard shoulder — Traffic Scotland (0800 028 1414) handles recovery from there. We'll meet you at the next junction or services." },
      { q: "Do you cover Paisley and East Kilbride as well as Glasgow?", a: "Yes — Renfrewshire, East and South Lanarkshire are all covered, 24/7, with typical arrival of 35–70 minutes." },
    ],
    guides: [
      { to: "/blog/puncture-repair-vs-new-tyre", label: "Puncture repair vs new tyre" },
      { to: "/blog/tyre-blowout-on-motorway-what-to-do", label: "What to do after a motorway blowout" },
      { to: "/blog/uk-tyre-legal-tread-depth", label: "UK legal tread depth explained" },
    ],
  },
  {
    slug: "cardiff",
    name: "Cardiff",
    region: "South Wales",
    shortPitch: "Cardiff, Newport, Swansea — mobile tyre techs across South Wales.",
    postcodes: "CF, NP, SA",
    hubs: ["Cardiff", "Newport", "Swansea", "Bridgend", "Caerphilly", "Pontypridd"],
    faqAnswer: "We cover the M4 from the Severn Bridge to Swansea, including the Valleys.",
    metaTitle: "Mobile Tyre Fitting Cardiff & South Wales | Tyrefly",
    metaDesc: "Cardiff, Newport and Swansea drivers can have a tyre changed at home, at work or on the M4. Repairs from £40 — one WhatsApp message books it.",
    intro: "Mobile tyre fitting in Cardiff means a fully-equipped van reaching you in the city centre, along the M4 towards Newport or Swansea, or up into the Valleys, instead of a wasted trip to a garage. Tyrefly matches you to a vetted local fitter across South Wales, 24 hours a day, with a firm all-in price agreed before dispatch.",
    sections: [
      {
        h2: "Cardiff mobile tyre fitting prices",
        bullets: [
          "<strong>Puncture repair (internal plug-patch):</strong> £40–£55",
          "<strong>Budget tyre supplied and fitted:</strong> £80–£115",
          "<strong>Mid-range premium (Michelin, Continental, Goodyear):</strong> £120–£175",
          "<strong>Performance, SUV or run-flat:</strong> £190–£360",
          "<strong>Overnight (10pm–6am):</strong> +£20–£35",
          "<strong>Locking wheel nut removal (no key):</strong> +£20–£40",
        ],
      },
      {
        h2: "Arrival times across South Wales",
        bullets: [
          "<strong>Cardiff city centre, Cardiff Bay, Cathays:</strong> 30–55 minutes",
          "<strong>Newport and Caerphilly:</strong> 35–65 minutes",
          "<strong>Bridgend and Pontypridd:</strong> 40–70 minutes",
          "<strong>Swansea:</strong> 50–85 minutes",
          "<strong>M4 corridor, Severn Bridge to Swansea:</strong> most junctions under an hour",
          "<strong>Cardiff Airport:</strong> 40–70 minutes, 24/7",
        ],
      },
      {
        h2: "Valleys roads and where a van can work",
        paragraphs: [
          "The Valleys towns north of Cardiff and Pontypridd sit on steep, narrow roads that were never built for modern car widths — a van can usually still reach you, but on the tightest terraces we'll ask you to move a short distance to a wider spot or the nearest car park.",
        ],
        bullets: [
          "<strong>Best:</strong> driveways, retail and office car parks, park-and-ride sites off the M4",
          "<strong>Workable:</strong> residents' permit bays, wider streets in Cardiff Bay and Newport city centre",
          "<strong>Genuine breakdowns on the A470 or Cardiff's Eastern/Western Avenue:</strong> hazards on, and we'll direct you to the nearest safe pull-in",
          "<strong>Not possible:</strong> the M4 hard shoulder, including the Brynglas Tunnels approach — call National Highways on 0300 123 5000 and we'll meet you at the next junction",
        ],
      },
      {
        h2: "The jobs we see most in South Wales",
        bullets: [
          "<strong>Pothole damage</strong> on the A470 through the Valleys, Newport's Brynglas Tunnels approach, and older streets in Grangetown and Riverside",
          "<strong>Debris punctures on the M4</strong> around Cardiff Gate, Coryton and the Swansea junctions — a heavy commuter and freight route",
          "<strong>Sidewall damage from kerbing</strong> on the narrow terraced streets of Pontypridd, Caerphilly and the Valleys towns",
          "<strong>Fleet vans</strong> around the Cardiff Gate and Imperial Park business estates",
          "<strong>Run-flat replacements</strong> for drivers in Pontcanna and Lisvane whose low-profile tyres don't love pothole-scarred B-roads",
        ],
      },
      {
        h2: "How to book a Cardiff mobile fitter",
        bullets: [
          "Postcode or what3words",
          "Reg, or make, model and year",
          "Tyre size from the sidewall — a photo is quickest",
          "The problem: nail in the tread, sidewall bulge, blowout, slow leak",
          "Locking wheel-nut key: yes or no",
        ],
        paragraphs: [
          "Send those over WhatsApp and you'll get a fixed all-in quote and a named fitter's ETA back within a couple of minutes.",
        ],
      },
    ],
    extraFaqs: [
      { q: "How much is mobile tyre fitting in Cardiff?", a: "£80–£115 for a budget tyre supplied and fitted, £120–£175 mid-range premium, and £190–£360 for performance, SUV or run-flat. Puncture repairs are £40–£55." },
      { q: "Do you cover the Valleys as well as Cardiff?", a: "Yes — Pontypridd, Caerphilly and the surrounding Valleys towns, though on very narrow terraces we may ask you to move to a wider spot nearby." },
      { q: "Can you reach me on the M4 or in the Brynglas Tunnels?", a: "Not on the hard shoulder or inside the tunnels — National Highways (0300 123 5000) handles recovery from there. We'll meet you at the next junction." },
      { q: "Do you cover Swansea as well as Cardiff and Newport?", a: "Yes, though it's further out — typical arrival in Swansea is 50–85 minutes rather than the 30–55 minutes you'd see in central Cardiff." },
    ],
    guides: [
      { to: "/blog/tyre-age-when-to-replace", label: "Tyre age: when to replace" },
      { to: "/blog/slow-puncture-uk-guide", label: "Slow puncture: causes and fixes" },
      { to: "/blog/mobile-tyre-fitter-vs-garage", label: "Mobile fitter vs garage: which is right for you" },
    ],
  },
  {
    slug: "belfast",
    name: "Belfast",
    region: "Northern Ireland",
    shortPitch: "Belfast and surrounds — mobile tyre fitters across Northern Ireland.",
    postcodes: "BT",
    hubs: ["Belfast", "Lisburn", "Bangor", "Newtownabbey", "Carrickfergus"],
    faqAnswer: "Greater Belfast coverage including the M1 / M2 / A2 corridors.",
    metaTitle: "Belfast Mobile Tyre Fitter, Day & Night | Tyrefly",
    metaDesc: "Puncture in Belfast, Lisburn or Bangor? A local fitter comes to you along the M1 and M2 corridors, from £40. Message us and we'll confirm a price.",
    intro: "Mobile tyre fitting in Belfast means a fully-equipped van reaching you in the city centre, along the M1 or M2, or out towards Lisburn and Bangor, instead of a wasted trip to a garage. Tyrefly matches you to a vetted local fitter across Greater Belfast, 24 hours a day, with a firm all-in price agreed before dispatch.",
    sections: [
      {
        h2: "Belfast mobile tyre fitting prices",
        paragraphs: [
          "Prices in Northern Ireland sit close to the English North, with one difference worth knowing: unusual or large tyre sizes sometimes come in on the next ferry rather than same-day, so we'll always tell you upfront if your size needs a day's notice rather than promising stock that isn't actually on the island yet.",
        ],
        bullets: [
          "<strong>Puncture repair (internal plug-patch):</strong> £40–£55",
          "<strong>Budget tyre supplied and fitted:</strong> £80–£115",
          "<strong>Mid-range premium (Michelin, Continental, Goodyear):</strong> £120–£175",
          "<strong>Performance, SUV or run-flat:</strong> £190–£370 (uncommon sizes may need next-day ferry stock)",
          "<strong>Overnight (10pm–6am):</strong> +£20–£35",
          "<strong>Locking wheel nut removal (no key):</strong> +£20–£40",
        ],
      },
      {
        h2: "Arrival times across Greater Belfast",
        bullets: [
          "<strong>Belfast city centre, Titanic Quarter, Ormeau:</strong> 30–55 minutes",
          "<strong>Newtownabbey and Carrickfergus:</strong> 35–65 minutes",
          "<strong>Lisburn:</strong> 40–65 minutes",
          "<strong>Bangor and North Down:</strong> 45–75 minutes",
          "<strong>M1 and M2 corridors, all junctions:</strong> under an hour",
          "<strong>Belfast International and George Best City Airport:</strong> 35–65 minutes, 24/7",
        ],
      },
      {
        h2: "Where a van can and can't work in Belfast",
        bullets: [
          "<strong>Best:</strong> driveways, retail and office car parks, park-and-ride sites off the M1 and M2",
          "<strong>Workable:</strong> residents' permit bays, terraced streets in the Holylands and Stranmillis with room to open the boot",
          "<strong>Genuine breakdowns on the Westlink or the M2 city end:</strong> hazards on, and we'll direct you to the nearest safe pull-in",
          "<strong>Not possible:</strong> the M1, M2 or A2 hard shoulder — call the PSNI non-emergency line on 101 for recovery help and we'll meet you at the next junction",
        ],
      },
      {
        h2: "The jobs we see most in Belfast",
        bullets: [
          "<strong>Pothole damage</strong> on the Westlink, the Sydenham bypass (A2) and older streets around East and West Belfast",
          "<strong>Debris punctures on the M1 and M2</strong> heading towards Lisburn and Newtownabbey",
          "<strong>Sidewall damage from kerbing</strong> on the Holylands and Stranmillis's tight terraced streets",
          "<strong>Fleet vans</strong> around the Boucher Road and Mallusk industrial estates",
          "<strong>Run-flat and larger SUV sizes</strong> that occasionally need next-day sourcing rather than same-day, given ferry-dependent stock",
        ],
      },
      {
        h2: "How to book a Belfast mobile fitter",
        bullets: [
          "Postcode or what3words",
          "Reg, or make, model and year",
          "Tyre size from the sidewall — a photo is quickest",
          "The problem: nail in the tread, sidewall bulge, blowout, slow leak",
          "Locking wheel-nut key: yes or no",
        ],
        paragraphs: [
          "Send those over WhatsApp and you'll get a fixed all-in quote and a named fitter's ETA back within a couple of minutes — or, for a rare size, an honest answer on next-day availability.",
        ],
      },
    ],
    extraFaqs: [
      { q: "How much is mobile tyre fitting in Belfast?", a: "£80–£115 for a budget tyre supplied and fitted, £120–£175 mid-range premium, and £190–£370 for performance, SUV or run-flat. Puncture repairs are £40–£55." },
      { q: "Is every tyre size available same-day in Belfast?", a: "Common sizes yes. Unusual or large sizes sometimes rely on stock coming over on the next ferry, so we'll flag upfront if your size needs a day's notice." },
      { q: "Can you reach me on the M1 or M2?", a: "Not on the hard shoulder — call 101 for PSNI/recovery assistance from a live carriageway. We'll meet you at the next junction or services." },
      { q: "Do you cover Lisburn and Bangor as well as Belfast?", a: "Yes — Greater Belfast including Lisburn, Newtownabbey, Carrickfergus and Bangor, 24/7, with typical arrival of 35–75 minutes." },
    ],
    guides: [
      { to: "/blog/nail-in-tyre-what-to-do", label: "Nail in your tyre: what to do next" },
      { to: "/blog/run-flat-tyres-uk-guide", label: "Run-flat tyres explained" },
      { to: "/blog/tyre-pressure-guide-uk", label: "Tyre pressure guide" },
    ],
  },
];

export function getArea(slug: string): Area | undefined {
  return AREAS.find((a) => a.slug === slug);
}
