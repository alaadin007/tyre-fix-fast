// UK service areas — used to generate SEO landing pages at /areas/:slug
export interface Area {
  slug: string;
  name: string;       // "London"
  region: string;     // "Greater London"
  shortPitch: string; // hero subline
  postcodes: string;  // sample postcode districts to look local
  hubs: string[];     // sub-areas / towns we list as covered
  faqAnswer: string;  // unique FAQ snippet
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
  },
  {
    slug: "greater-manchester",
    name: "Manchester",
    region: "Greater Manchester",
    shortPitch: "From Salford Quays to Stockport — mobile tyre techs across Greater Manchester.",
    postcodes: "M, BL, OL, SK, WA, WN",
    hubs: ["Manchester city centre", "Salford", "Trafford", "Stockport", "Bolton", "Bury", "Oldham", "Rochdale", "Tameside", "Wigan"],
    faqAnswer: "We cover all 10 Greater Manchester boroughs plus the M60 ring. Average arrival on the M60 is under 50 minutes.",
  },
  {
    slug: "west-midlands",
    name: "Birmingham",
    region: "West Midlands",
    shortPitch: "Birmingham, Coventry, Wolverhampton — mobile fitters across the West Midlands.",
    postcodes: "B, CV, DY, WS, WV",
    hubs: ["Birmingham", "Coventry", "Wolverhampton", "Dudley", "Sandwell", "Solihull", "Walsall"],
    faqAnswer: "Our network covers all seven metropolitan boroughs and the M6 corridor through Spaghetti Junction. We're 24/7.",
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
