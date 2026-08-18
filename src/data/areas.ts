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
    metaTitle: "Mobile Tyre Fitting London | 24/7 Call-Out from £95 | Tyre Fly",
    metaDesc: "Mobile tyre fitting in London, 24/7 across all 33 boroughs. Real prices, 35–90 minute arrival, puncture repair from £45. Quote by WhatsApp in 60 seconds.",
    intro: "Mobile tyre fitting in London means a fully-equipped van — tyre machine, wheel balancer, compressor, stock — coming to your car instead of you limping to a garage. Tyre Fly matches you to a vetted local fitter across all 33 boroughs and the M25 corridor, 24 hours a day, with a firm all-in price before anyone sets off.",
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
    metaTitle: "Mobile Tyre Fitting Manchester | 24/7 Call-Out | Tyre Fly",
    metaDesc: "Mobile tyre fitting Manchester — 24/7 across all 10 Greater Manchester boroughs. Prices, arrival times by area, puncture repair from £40. Quote in 60 seconds.",
    intro: "Mobile tyre fitting in Manchester puts a fully-stocked van at your kerb instead of costing you half a day at a garage. Tyre Fly matches you to a vetted fitter across all ten Greater Manchester boroughs and the M60 ring, 24 hours a day, with a firm price agreed before dispatch.",
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
    metaTitle: "Mobile Tyre Fitting Birmingham | 24/7 Call-Out | Tyre Fly",
    metaDesc: "Mobile tyre fitting Birmingham and the West Midlands, 24/7. Prices, arrival times across all seven boroughs, puncture repair from £40. Quote in 60 seconds.",
    intro: "Mobile tyre fitting in Birmingham brings a fully-equipped van to your driveway, office car park or roadside anywhere across the West Midlands. Tyre Fly matches you to a vetted local fitter covering all seven metropolitan boroughs and the M6, M5 and M42 corridors, 24 hours a day.",
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
    slug: "west-yorkshire",
    name: "Leeds",
    region: "West Yorkshire",
    shortPitch: "Leeds, Bradford, Wakefield — mobile tyre help across West Yorkshire.",
    postcodes: "LS, BD, HD, HX, WF",
    hubs: ["Leeds", "Bradford", "Wakefield", "Huddersfield", "Halifax", "Dewsbury", "Pontefract"],
    faqAnswer: "We cover all five West Yorkshire districts and the M62 corridor. Typical ETA inside Leeds ring road is 40 minutes.",
  },
  {
    slug: "merseyside",
    name: "Liverpool",
    region: "Merseyside",
    shortPitch: "Liverpool to the Wirral — fast mobile tyre fitting across Merseyside.",
    postcodes: "L, CH, WA",
    hubs: ["Liverpool", "Wirral", "Sefton", "Knowsley", "St Helens", "Birkenhead", "Bootle"],
    faqAnswer: "We cover all five Merseyside boroughs including the Wirral peninsula. M57 / M62 arrivals are usually under an hour.",
  },
  {
    slug: "south-yorkshire",
    name: "Sheffield",
    region: "South Yorkshire",
    shortPitch: "Sheffield, Rotherham, Doncaster, Barnsley — mobile tyre techs across South Yorkshire.",
    postcodes: "S, DN",
    hubs: ["Sheffield", "Rotherham", "Doncaster", "Barnsley"],
    faqAnswer: "Coverage spans all four South Yorkshire boroughs plus the M1 / M18 / A1(M).",
  },
  {
    slug: "tyne-and-wear",
    name: "Newcastle",
    region: "Tyne & Wear",
    shortPitch: "Newcastle, Sunderland, Gateshead — North East mobile tyre fitters.",
    postcodes: "NE, SR, DH",
    hubs: ["Newcastle upon Tyne", "Sunderland", "Gateshead", "South Tyneside", "North Tyneside"],
    faqAnswer: "We cover all five Tyne & Wear boroughs and the A1 / A19 corridors 24/7.",
  },
  {
    slug: "bristol",
    name: "Bristol",
    region: "Bristol & Bath",
    shortPitch: "Bristol, Bath and the wider South West — mobile tyre techs on call.",
    postcodes: "BS, BA",
    hubs: ["Bristol city centre", "Clifton", "Bedminster", "Filton", "Bath", "Keynsham", "Portishead"],
    faqAnswer: "Cover spans Bristol, North Somerset, South Gloucestershire and BANES. M4 / M5 junctions are our specialty.",
  },
  {
    slug: "edinburgh",
    name: "Edinburgh",
    region: "Edinburgh & Lothians",
    shortPitch: "Edinburgh and the Lothians — mobile tyre help across central Scotland.",
    postcodes: "EH",
    hubs: ["Edinburgh city centre", "Leith", "Portobello", "Musselburgh", "Livingston", "Dalkeith"],
    faqAnswer: "We cover the City of Edinburgh, Midlothian, East Lothian and West Lothian, plus the A720 city bypass.",
  },
  {
    slug: "glasgow",
    name: "Glasgow",
    region: "Greater Glasgow",
    shortPitch: "Glasgow, Paisley, East Kilbride — mobile tyre fitters across Greater Glasgow.",
    postcodes: "G, PA, ML",
    hubs: ["Glasgow city centre", "Paisley", "East Kilbride", "Hamilton", "Motherwell", "Clydebank", "Renfrew"],
    faqAnswer: "Coverage includes the M8 / M74 / M77 ring and Renfrewshire, North & South Lanarkshire.",
  },
  {
    slug: "cardiff",
    name: "Cardiff",
    region: "South Wales",
    shortPitch: "Cardiff, Newport, Swansea — mobile tyre techs across South Wales.",
    postcodes: "CF, NP, SA",
    hubs: ["Cardiff", "Newport", "Swansea", "Bridgend", "Caerphilly", "Pontypridd"],
    faqAnswer: "We cover the M4 from the Severn Bridge to Swansea, including the Valleys.",
  },
  {
    slug: "belfast",
    name: "Belfast",
    region: "Northern Ireland",
    shortPitch: "Belfast and surrounds — mobile tyre fitters across Northern Ireland.",
    postcodes: "BT",
    hubs: ["Belfast", "Lisburn", "Bangor", "Newtownabbey", "Carrickfergus"],
    faqAnswer: "Greater Belfast coverage including the M1 / M2 / A2 corridors.",
  },
];

export function getArea(slug: string): Area | undefined {
  return AREAS.find((a) => a.slug === slug);
}
