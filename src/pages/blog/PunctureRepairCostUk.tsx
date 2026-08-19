import BlogPost from "@/components/blog/BlogPost";

export default function PunctureRepairCostUk() {
  return (
    <BlogPost
      slug="puncture-repair-cost-uk"
      metaTitle="Puncture Repair Cost UK 2026: Mobile & Garage Prices"
      metaDesc="Puncture repair cost UK: real 2026 mobile and garage prices, London vs regional differences, run-flat surcharges and the £20 fix to avoid."
      title="Puncture Repair Cost UK 2026: London vs the Rest of the Country"
      category="Pricing"
      readMinutes={11}
      datePublished="2026-07-15"
      dateModified="2026-08-18"
      heroImage="punctureRepairCostUk"
      intro="A puncture repair should cost between £25 and £75 in 2026 — but the difference between £25 and £75 is huge, and paying the wrong end can cost you the tyre a fortnight later. Here's a real breakdown of what puncture repair costs across the UK: garage vs mobile, London vs regional, standard tyres vs run-flats, by tyre size, and what the price should actually include."
      blocks={[
        { type: "h2", text: "The 2026 UK puncture repair price map" },
        { type: "p", html: "Averages from around 400 UK mobile and garage operators, sampled quarterly:" },
        {
          type: "ul",
          items: [
            "<strong>Garage puncture repair (drive-in):</strong> £20–£35 nationally, £30–£45 in London",
            "<strong>Mobile puncture repair (they come to you):</strong> £40–£65 nationally, £45–£70 in London",
            "<strong>Fast-fit chain (Kwik Fit, Halfords, ATS):</strong> £25–£45",
            "<strong>Independent mobile 24/7:</strong> £60–£110 depending on time",
            "<strong>Run-flat puncture repair (when possible):</strong> +£15–£25",
            "<strong>Motorbike puncture repair (tubeless):</strong> £30–£50",
          ],
        },

        { type: "h2", text: "Price by tyre size band" },
        { type: "p", html: "Tyre size affects repair cost less than most drivers expect — the labour is almost identical whatever the diameter — but bigger wheels take longer to demount safely and larger tyres are more often run-flat or low-profile, both of which push the price up slightly. Here's the realistic 2026 spread by size band:" },
        {
          type: "table",
          caption: "Puncture repair cost by tyre size band, 2026 UK averages.",
          head: ["Size band", "Garage / fast-fit", "Mobile (daytime)", "Mobile (out-of-hours)"],
          rows: [
            ["15\" (small hatchbacks, city cars)", "£20–£30", "£40–£55", "£65–£90"],
            ["16–17\" (family hatchback, saloon, small SUV)", "£25–£35", "£45–£65", "£70–£100"],
            ["18\"+ (large SUV, performance, low-profile)", "£30–£45", "£55–£75", "£80–£115"],
            ["Run-flat, any size (when repairable)", "£40–£55", "£60–£85", "£90–£130"],
          ],
        },

        { type: "h2", text: "Why the £20 quote is usually not what you think" },
        { type: "p", html: "The advertised £20 puncture repair from small independents is almost always one of three things:" },
        {
          type: "ol",
          items: [
            "<strong>External rope plug only</strong> — a strip of rubber jammed through the hole from outside. Not legal on UK roads without an internal patch. Fails often.",
            "<strong>Puncture inspection charge</strong>, with the actual repair added on if they proceed (usually another £15–£25).",
            "<strong>Genuine but volume-based</strong> — the fast-fit chains price aggressively because you're already in the shop; they'll upsell alignment, wipers, and often try to sell you a new tyre.",
          ],
        },
        { type: "p", html: "A legitimate BS AU 159 combined plug-patch repair — the only kind that's road-legal for the long term — realistically costs a workshop £10–£15 in materials, labour, and rebalance time. £20 is below that floor without cutting the standard. See our full breakdown of what's actually permitted under <a href=\"/blog/can-a-puncture-be-repaired-uk\" class=\"text-primary hover:underline\">BS AU 159</a> if you want the technical detail." },

        { type: "h2", text: "What actually drives the price" },
        { type: "p", html: "Six factors explain almost all of the variation between a £25 quote and a £95 quote for what looks like the same job:" },
        {
          type: "ul",
          items: [
            "<strong>Time of day.</strong> Daytime weekday work is the cheapest slot for every operator; evenings, weekends and bank holidays carry a genuine cost premium because it's overtime labour.",
            "<strong>Location and drive time.</strong> A mobile fitter's real cost is the van's time, not the repair itself. A callout 25 minutes from base costs the operator far less than one 60 minutes away, and rural quotes reflect that.",
            "<strong>Wheel access.</strong> Locking wheel nuts with no key, corroded alloys, or low-profile tyres that are harder to break the bead on all add time and therefore cost.",
            "<strong>Tyre construction.</strong> Run-flats and reinforced (XL) tyres take longer to demount and inspect properly.",
            "<strong>Business model.</strong> A high-street chain spreads its rent and staff costs across volume; an independent 24/7 mobile operator prices each job to cover the van, the fuel, and being on-call.",
            "<strong>Competitive density.</strong> Areas with more operators per postcode tend to have tighter, more competitive pricing than genuinely remote areas.",
          ],
        },

        { type: "h2", text: "Why London is a bit more expensive" },
        { type: "p", html: "London mobile puncture repair sits £5–£10 above the national average because of:" },
        {
          type: "ul",
          items: [
            "<strong>Higher operating costs</strong> — insurance, parking, ULEZ-compliant vans, higher wages",
            "<strong>Congestion Zone (£15/day when applicable)</strong> — spread across jobs",
            "<strong>Traffic-driven route inefficiency</strong> — fewer jobs per van per day",
            "<strong>Higher demand density</strong> — but also higher no-show / cancelled-in-transit rates",
          ],
        },
        { type: "p", html: "Manchester and Birmingham are broadly similar to national averages; Edinburgh and Glasgow are a touch lower; rural Wales, the Highlands, and parts of Cornwall run £10–£15 above London because the drive time per callout is much longer." },

        { type: "h2", text: "London vs regional: a direct comparison" },
        {
          type: "table",
          caption: "Same job — standard 16\" tyre, straightforward central puncture, daytime.",
          head: ["Region", "Garage / drive-in", "Mobile fitter"],
          rows: [
            ["Central/Greater London", "£30–£45", "£50–£70"],
            ["Manchester / Birmingham", "£22–£35", "£40–£60"],
            ["Edinburgh / Glasgow", "£20–£32", "£38–£58"],
            ["Rural England / Wales / Highlands", "£25–£38", "£55–£75"],
          ],
        },

        { type: "h2", text: "What a fair £45–£65 mobile repair includes" },
        {
          type: "ol",
          items: [
            "Wheel off the car with a torque wrench",
            "Tyre demounted fully from the rim",
            "Internal inspection — this is where a repair becomes a replacement 20% of the time",
            "Puncture area buffed and cleaned",
            "Combined plug-patch bonded from inside (BS AU 159)",
            "Wheel rebalanced on an on-van balancer",
            "Refit, torqued to manufacturer spec, valve cap replaced",
            "12-month warranty on the repair",
          ],
        },
        { type: "p", html: "If any of those steps is missing — especially the rebalance — the price should drop, or you should walk away." },

        { type: "h2", text: "Run-flat puncture repair: when it's possible and what it costs" },
        { type: "p", html: "Most tyre manufacturers officially advise against repairing run-flats because it's impossible to inspect the internal reinforcement for damage caused by driving flat. In practice:" },
        {
          type: "ul",
          items: [
            "<strong>Run-flat, punctured but not driven on:</strong> repairable by many mobile operators, £60–£85",
            "<strong>Run-flat, driven any distance on flat:</strong> not safely repairable — replace",
            "<strong>Run-flat with sidewall damage:</strong> never repairable — replace",
          ],
        },
        { type: "p", html: "If you have a BMW, Mini, or any Mercedes fitted with staggered run-flats, factor in that <strong>you often can't just replace one</strong> — the wear difference across the axle can trip stability control. Our <a href=\"/blog/run-flat-tyres-uk-guide\" class=\"text-primary hover:underline\">run-flat tyres guide</a> covers this in detail." },

        { type: "h2", text: "When to repair vs replace" },
        { type: "p", html: "Simple rule of thumb:" },
        {
          type: "ul",
          items: [
            "<strong>Tread 4mm+ and puncture is central:</strong> repair. £45–£65 well spent.",
            "<strong>Tread 3–4mm:</strong> repair if the tyre is under 4 years old, otherwise consider replacing",
            "<strong>Tread under 3mm:</strong> replace. Repairing a nearly-worn tyre buys you a few months and you'll pay full price for a new one anyway",
            "<strong>Sidewall or shoulder damage:</strong> replace, no exceptions",
            "<strong>Tyre over 6–7 years old:</strong> replace even if repair is technically possible",
          ],
        },
        { type: "p", html: "For the full cost-versus-replace decision framework — including the cost-per-mile maths — see <a href=\"/blog/puncture-repair-vs-new-tyre\" class=\"text-primary hover:underline\">puncture repair vs new tyre</a>." },

        { type: "h2", text: "When repairing is false economy" },
        { type: "p", html: "A repair is technically possible far more often than it's actually the sensible choice. It becomes false economy when:" },
        {
          type: "ul",
          items: [
            "The tyre already has under 3mm of tread — you're paying £45–£65 to buy a few thousand miles before paying full replacement price anyway.",
            "The other tyres on the axle are significantly more worn — a repaired tyre with better tread than its partner can create a mismatch that affects handling.",
            "It's a budget tyre nearing end of life — the repair cost as a percentage of the tyre's remaining value stops making sense below roughly 2–3mm.",
            "The car uses a matched staggered set (many performance and premium cars) and the punctured tyre no longer matches its partner's wear closely enough.",
            "The tyre is over 6–7 years old regardless of tread — ageing rubber and repair adhesion don't mix well, and most workshops won't warranty it.",
          ],
        },
        { type: "p", html: "In all of these cases, a good fitter will tell you upfront rather than repair something that's due for replacement within a few months anyway." },

        { type: "h2", text: "Hidden costs that show up on the invoice" },
        {
          type: "ul",
          items: [
            "<strong>Locking wheel-nut removal (no key):</strong> +£20–£40",
            "<strong>Corroded alloy causing air leak:</strong> +£25–£45 for hub-face refurb",
            "<strong>New valve stem:</strong> +£5",
            "<strong>TPMS sensor replacement (if damaged):</strong> +£45–£120 depending on car",
            "<strong>Rebalance weights on premium wheels:</strong> included by good operators, +£3–£5 elsewhere",
            "<strong>Congestion Zone / ULEZ recovery:</strong> +£5–£15 in central London",
          ],
        },

        { type: "h2", text: "How to compare quotes properly" },
        {
          type: "ol",
          items: [
            "Ask for an <strong>all-in price</strong> — not \"from £X\"",
            "Confirm it's a <strong>combined plug-patch to BS AU 159</strong>, not an external plug",
            "Confirm <strong>rebalance is included</strong>",
            "Ask what happens if the tyre turns out to be non-repairable — is there a callout fee, and what does replacement stock cost in your size?",
            "Ask about the <strong>warranty</strong> — 12 months minimum is standard",
            "Get the quote in writing (text or WhatsApp) before the fitter arrives, so there's no renegotiating on the driveway",
          ],
        },

        { type: "h2", text: "The bottom line" },
        { type: "p", html: "In 2026 UK, expect to pay <strong>£45–£65 for a proper mobile puncture repair</strong>, £25–£45 if you drive to a garage or fast-fit, and £75–£110 for genuine 24-hour service. Anything under £25 is a temporary fix. Anything over £85 in daytime is either a niche size, a corroded alloy problem, or someone taking the mickey." },
      ]}
      faqs={[
        { q: "How much does a puncture repair cost in the UK?", a: "£20–£35 at a garage, £45–£65 mobile, £75–£110 for 24-hour emergency mobile. London mobile is typically £5–£10 above the national average." },
        { q: "Why is mobile puncture repair more expensive than a garage?", a: "You're paying for the van coming to you — no towing, no lost afternoon, no rebooking. For most drivers the £15–£20 premium is easily worth it." },
        { q: "Can you repair a run-flat tyre?", a: "Only if it hasn't been driven on flat. £60–£85 typically. If it's been driven flat any distance, it must be replaced." },
        { q: "Is a £20 puncture repair legitimate?", a: "Usually not. It's typically an external rope plug (not road-legal without an internal patch) or an inspection charge with the repair added on." },
        { q: "Does tyre size affect puncture repair cost?", a: "A little. Labour is similar across sizes, but 18\"+ wheels, low-profile and run-flat tyres take longer to demount and inspect safely, adding roughly £10–£20 to the price." },
        { q: "Why do quotes vary so much between operators in the same city?", a: "Time of day, drive distance from the fitter's base, wheel access (locking nuts, corrosion), and whether the tyre is standard or run-flat all move the price far more than the postcode does." },
        { q: "Is it worth repairing a puncture on a nearly worn tyre?", a: "Usually not. Below about 3mm of tread, a £45–£65 repair often just delays an inevitable full-price replacement by a few months — ask the fitter for a tread reading before agreeing." },
      ]}
      cta={{ headline: "Get a firm puncture repair quote in 60 seconds", body: "Send your postcode, tyre size, and where the puncture is — we'll give you an all-in price with no add-ons.", label: "Get a mobile fitter →" }}
      related={[
        { to: "/blog/mobile-puncture-repair-london", label: "Mobile Puncture Repair London" },
        { to: "/blog/puncture-repair-vs-new-tyre", label: "Puncture Repair vs New Tyre" },
        { to: "/blog/can-a-puncture-be-repaired-uk", label: "Can Any Puncture Be Repaired?" },
      ]}
    />
  );
}
