import BlogPost from "@/components/blog/BlogPost";

export default function MobilePunctureRepairLondon() {
  return (
    <BlogPost
      slug="mobile-puncture-repair-london"
      metaTitle="Mobile Puncture Repair London | Prices, Same Day & Central"
      metaDesc="Mobile puncture repair London from £45: borough pricing, arrival times, what a proper repair includes and ULEZ/Congestion Zone parking notes."
      title="Mobile Puncture Repair London: Prices, Same-Day Slots and Where We Can Park"
      category="London"
      readMinutes={16}
      datePublished="2026-07-15"
      dateModified="2026-08-18"
      heroImage="mobilePunctureRepairLondon"
      intro="Mobile puncture repair in London ranges from £25 to £85 for what looks like the same job. It isn't. This is the complete guide: what a legitimate repair includes, what it costs by borough and zone, how same-day booking windows really work, what changes inside the Congestion Zone, and how to book the right thing the first time."
      blocks={[
        { type: "h2", text: "What \"mobile puncture repair\" actually means" },
        { type: "p", html: "Mobile puncture repair is a van-based fitter coming to your car — driveway, office car park, roadside — with everything a tyre bay has: a tyre machine to break the bead, a wheel balancer, an on-board compressor, and stock of BS AU 159-compliant plug patches. The wheel comes off, the tyre comes off the rim, the puncture is repaired from inside, and the wheel goes back on. It takes 30–45 minutes." },
        { type: "p", html: "This is not the same as: someone showing up with a plug kit and no tyre machine, someone spraying sealant into the valve, or a garage \"mobile service\" that means they'll come pick up your wheel and bring it back tomorrow." },

        { type: "h2", text: "The London price map" },
        {
          type: "ul",
          items: [
            "<strong>£25–£35:</strong> external rope plug only. <em>Illegal on UK roads without an internal patch. Will fail within weeks.</em>",
            "<strong>£45–£65:</strong> proper internal mushroom-style plug patch, BS AU 159, includes rebalance and torque. <em>This is what you should be paying.</em>",
            "<strong>£65–£85:</strong> Zones 1–2 rates, or premium sizes (run-flat, 20\"+ rims), or evening callouts.",
            "<strong>£85+:</strong> overnight, run-flat requiring special handling, or bundled with wheel alignment.",
          ],
        },
        { type: "p", html: "The <strong>£45–£65 band is the actual market</strong> for a legal, warrantied mobile puncture repair in London. Anyone significantly cheaper is cutting the internal patch or skipping the rebalance." },

        { type: "h2", text: "Borough and zone pricing and arrival times" },
        {
          type: "table",
          caption: "Standard daytime repair prices and typical arrival windows by area, 2026.",
          head: ["Area", "Zone", "Repair price", "Typical arrival"],
          rows: [
            ["Westminster, Camden, City of London", "1", "£55–£70", "30–60 min"],
            ["Kensington & Chelsea, Islington, Southwark, Lambeth", "1–2", "£50–£65", "30–60 min"],
            ["Hackney, Tower Hamlets, Wandsworth, Hammersmith & Fulham", "2", "£50–£65", "35–65 min"],
            ["Haringey, Newham, Lewisham, Greenwich", "2–3", "£48–£62", "35–70 min"],
            ["Brent, Ealing, Merton, Croydon", "3", "£45–£60", "40–75 min"],
            ["Barnet, Enfield, Redbridge, Bromley", "4", "£45–£58", "40–80 min"],
            ["Harrow, Hillingdon, Bexley, Sutton, Kingston", "5–6", "£45–£58", "45–90 min"],
            ["Heathrow, Gatwick North Terminal long-stay", "6 / M25 fringe", "£55–£75", "40–80 min"],
          ],
        },
        { type: "p", html: "Prices assume a straightforward tread-centre puncture during standard daytime hours. Evening (6pm–10pm) typically adds £10–£20; overnight (10pm–6am) adds £15–£35." },

        { type: "h2", text: "What's included in a proper £45 repair" },
        {
          type: "ol",
          items: [
            "<strong>Wheel removal and hub inspection</strong> — checks for corrosion or damage from driving flat",
            "<strong>Tyre demount</strong> — the tyre comes fully off the rim so the inside can be inspected",
            "<strong>Internal condition check</strong> — the fitter looks for run-flat damage (cord failure, delamination). This is where a repair can turn into a replacement recommendation.",
            "<strong>Puncture prep</strong> — area is buffed, cleaned with vulcanising fluid",
            "<strong>Combined plug-patch fitted</strong> — the plug fills the wound, the patch seals it from inside. This is what BS AU 159 requires.",
            "<strong>Rebalancing</strong> — the wheel is spun on an on-van balancer and weights adjusted. Skipping this causes steering vibration at 50–70mph.",
            "<strong>Refit and torque</strong> — hub-face cleaned, torqued to manufacturer spec, valve cap replaced",
            "<strong>Photo record + 12-month warranty</strong> — from any credible operator",
          ],
        },

        { type: "h2", text: "When mobile puncture repair isn't possible" },
        { type: "p", html: "About one in five punctures we see turn out to be non-repairable when the tyre comes off the rim. The usual reasons:" },
        {
          type: "ul",
          items: [
            "<strong>Sidewall or shoulder damage</strong> — the flexible parts of the tyre can't be safely patched",
            "<strong>Wound over 6mm diameter</strong> — beyond the safe repair standard",
            "<strong>Multiple punctures within 400mm of each other</strong>",
            "<strong>Tread depth under 1.6mm</strong> — legally the tyre needs replacing anyway",
            "<strong>Run-flat driven on flat</strong> — internal delamination usually means the tyre is scrap",
            "<strong>Wound in the tyre for more than 24 hours</strong> — moisture/rust in the belt package can mean patch failure",
          ],
        },
        { type: "p", html: "In those cases a good mobile fitter should carry stock in your size and be able to fit a replacement on the spot for a fixed price you were quoted before the van left. The full standards detail is in our <a href=\"/blog/can-a-puncture-be-repaired-uk\" class=\"text-primary hover:underline\">BS AU 159 repairability guide</a>." },

        { type: "h2", text: "How to spot a bad mobile puncture repair operator" },
        {
          type: "ul",
          items: [
            "Won't quote a firm price on the phone — \"we'll see when we get there\"",
            "Doesn't ask for the tyre size or a sidewall photo",
            "Says \"external plug only\" or \"we can do it without taking the wheel off\"",
            "No mention of rebalancing",
            "No warranty offered",
            "Cash only, no receipt",
          ],
        },
        { type: "p", html: "Any of the above and you're likely paying for a temporary fix that will fail — often within a week." },

        { type: "h2", text: "Same-day puncture repair in London: how the windows really work" },
        { type: "p", html: "For mobile operators in London, <strong>same day</strong> means a slot added to today's route after your booking. The van fits you in between existing jobs, usually within 2–4 hours. That's different from an <a href=\"/blog/emergency-puncture-repair-london\" class=\"text-primary hover:underline\">emergency callout</a>, which jumps the queue for £15–£30 more." },
        {
          type: "ul",
          items: [
            "<strong>Emergency:</strong> next available van, no queue — 30–90 minutes, £15–£30 extra",
            "<strong>Same-day next-slot:</strong> the very next opening on the schedule — 90 minutes typical",
            "<strong>Same day pre-booked:</strong> you pick a 90-minute window on today's calendar",
            "<strong>Next day:</strong> tomorrow, any 90-minute window you like",
          ],
        },

        { type: "h3", text: "What time you book decides what you get" },
        {
          type: "ul",
          items: [
            "<strong>Book before 9am:</strong> almost any slot before 6pm available",
            "<strong>Book 9am–noon:</strong> afternoon slots typically 1pm–7pm",
            "<strong>Book noon–3pm:</strong> late-afternoon and early-evening slots",
            "<strong>Book after 3pm:</strong> becomes an emergency booking — 90-minute arrival, £15–£30 uplift",
            "<strong>Book after 7pm:</strong> evening/overnight rates apply",
          ],
        },
        { type: "p", html: "The pattern to notice: <strong>booking before noon nearly always gets a normal-rate same-day slot</strong>. After 3pm you're paying evening rates or waiting until tomorrow." },

        { type: "h3", text: "Same-day slots by time of day" },
        {
          type: "table",
          caption: "How booking time affects your same-day slot in London.",
          head: ["You book at", "Realistic slot today", "Rate"],
          rows: [
            ["Before 9am", "Any window before 6pm", "Standard"],
            ["9am–noon", "1pm–7pm window", "Standard"],
            ["Noon–3pm", "Late afternoon / early evening", "Standard, evening uplift if after 6pm"],
            ["3pm–7pm", "Next available van, 30–90 min", "Emergency, +£15–£30"],
            ["After 7pm", "Overnight slot if urgent, else tomorrow", "Evening/overnight rate, +£15–£35"],
          ],
        },

        { type: "h3", text: "Same-day cost vs emergency" },
        {
          type: "ul",
          items: [
            "<strong>Same-day mobile puncture repair London:</strong> £45–£65",
            "<strong>Emergency (right now):</strong> £55–£85",
            "<strong>Difference:</strong> £10–£20 for the guaranteed 90-minute arrival",
          ],
        },

        { type: "h3", text: "How to guarantee a same-day slot" },
        {
          type: "ol",
          items: [
            "<strong>Book before 11am.</strong> After that, the route is full and you're competing for cancellations.",
            "<strong>Send the tyre size upfront.</strong> Missing stock is the number one reason a same-day job flips to next-day.",
            "<strong>Send a photo of the puncture and sidewall.</strong> Confirms repair vs replace in advance.",
            "<strong>Give a flexible 3-hour window if you can.</strong> \"Any time between 1pm and 4pm\" is much easier to schedule than \"exactly 2pm\".",
            "<strong>Say if you'll be at the car or leaving the keys.</strong> Keys-with-reception jobs are the easiest to slot in.",
          ],
        },

        { type: "h3", text: "When same-day isn't possible" },
        {
          type: "ul",
          items: [
            "<strong>Rare tyre size not in van stock</strong> — needs a depot pickup, typically pushes to tomorrow",
            "<strong>Run-flat replacement in unusual size</strong> — most vans carry the top 10 run-flat sizes only",
            "<strong>Central London during a major closure</strong> (Marathon, Notting Hill Carnival, state visits)",
            "<strong>Severe weather</strong> — mobile fitters do work in rain, but ice/snow can force delays",
            "<strong>Booked too late</strong> — after 4pm in busy periods, next-day is often the honest answer",
          ],
        },
        { type: "p", html: "The best time of day to book is <strong>10am–2pm</strong>: rush hour is over, office jobs route easily, and fitters are at their fastest. The worst is 4pm–7pm, when school pickups, evening traffic and every same-day cancellation are competing for the same van." },

        { type: "h2", text: "Central London: Congestion Charge, ULEZ and where the van can park" },
        { type: "p", html: "Central London is the hardest patch of the country to break down in — Red Routes, Congestion Charge, permit-only bays, wardens, and streets barely wide enough for a Transit. For our purposes, <strong>central London</strong> is anything inside the Congestion Charge Zone: roughly Marylebone Road, Euston Road, Tower Bridge, Vauxhall Bridge and Park Lane, about 8 square miles." },

        { type: "h3", text: "What it costs inside Zone 1" },
        {
          type: "ul",
          items: [
            "<strong>Standard mobile puncture repair:</strong> £50–£70",
            "<strong>Congestion Charge surcharge (weekdays 7am–6pm):</strong> +£5–£15",
            "<strong>Weekend / evening (no charge day):</strong> no surcharge",
            "<strong>Emergency callout:</strong> +£15–£30",
            "<strong>Central London new tyre supply and fit:</strong> £105–£340 depending on size",
          ],
        },
        { type: "p", html: "The Congestion Charge itself is £15/day for a car, but a van covers 6–10 jobs inside the zone in a day, so the per-job impact is small — the uplift covers a share, not the full charge." },

        { type: "h3", text: "ULEZ, in practice" },
        { type: "p", html: "ULEZ runs 24/7 across all of Greater London and costs £12.50/day for non-compliant cars. It is <strong>separate</strong> from the Congestion Charge — a non-compliant car in central London on a weekday pays both, £27.50/day. For the repair itself ULEZ is not a factor: the fitter's van is compliant, so it never appears on your invoice. It only matters when you drive your own car afterwards. And your parked car doesn't attract the Congestion Charge — only movement does." },

        { type: "h3", text: "Where a mobile fitter can actually stop in Zone 1" },
        {
          type: "ul",
          items: [
            "<strong>Best:</strong> off-street car parks (NCP, Q-Park), private driveways and mews, hotel forecourts, office loading bays, estate parking with reception's OK",
            "<strong>Workable — tell us first:</strong> paid meter bays (feed it for an hour), single yellows outside restricted hours, residents' bays where you hold the permit",
            "<strong>Avoid:</strong> Red Routes, bus lanes in operational hours, loading bays during restricted hours, and the narrowest Soho/Covent Garden streets where the van physically won't fit",
          ],
        },

        { type: "h3", text: "Central London response times" },
        {
          type: "ul",
          items: [
            "<strong>Weekday mornings (before rush hour):</strong> 25–45 minutes",
            "<strong>Weekday rush (7.30–9.30am, 4.30–7pm):</strong> 45–90 minutes",
            "<strong>Weekday off-peak:</strong> 30–60 minutes",
            "<strong>Weekends:</strong> 30–60 minutes",
            "<strong>Overnight (10pm–5am):</strong> 25–50 minutes — often the fastest window",
          ],
        },
        { type: "p", html: "The most common Zone 1 callouts: hotels in Mayfair, Marylebone and Belgravia; office car parks in the City, Canary Wharf and Southbank; private estates via a porter; members' clubs in Soho; and NCP/Q-Park sites, which are ideal working conditions." },

        { type: "h3", text: "Booking tips specific to central London" },
        {
          type: "ol",
          items: [
            "<strong>Specify the exact street</strong> — not just the postcode. Postcodes cover multiple blocks; wardens don't have that patience.",
            "<strong>Say what the parking situation is</strong> upfront (bay, loading zone, driveway, hotel forecourt)",
            "<strong>Book off-peak if you can</strong> — 10am–3pm or after 7pm",
            "<strong>Give a contact who can move the car</strong> if the fitter has to reposition",
            "<strong>Prefer weekends</strong> — no Congestion Charge, less traffic, faster arrival",
          ],
        },

        { type: "h2", text: "Best locations across the rest of London" },
        {
          type: "ul",
          items: [
            "<strong>Your driveway or off-street parking</strong> — ideal. Zero risk of parking wardens, plenty of space.",
            "<strong>Office car park</strong> — most operators are happy to do it while you're at your desk",
            "<strong>Residents' parking bay</strong> — fine, we just need 3m clearance behind the wheel being worked on",
            "<strong>Supermarket or NCP car park</strong> — check with staff; most allow it",
            "<strong>On the street with a paid meter</strong> — feed the meter for an hour",
          ],
        },

        { type: "h2", text: "What to have ready before the van arrives" },
        {
          type: "ol",
          items: [
            "Locking wheel-nut key location (glove box, boot floor, spare wheel well)",
            "Space around the affected wheel — move any recycling bins, park a metre off other cars",
            "Contactless card or ready-to-pay app — most mobile fitters take contactless in the van",
            "The V5C or reg plate for warranty registration",
            "Postcode <em>and</em> the exact street or bay number where the car will be at arrival time",
          ],
        },

        { type: "h2", text: "The 90-second booking flow" },
        { type: "p", html: "Send postcode, reg, tyre size (photo of the sidewall), and where the puncture is. You get a firm all-in quote, a specific ETA, and a live update when the van is 10 minutes away. That's what mobile puncture repair in London should look like in 2026 — anything more complicated and you're using the wrong service. For area coverage and postcodes, see our <a href=\"/areas/london\" class=\"text-primary hover:underline\">mobile tyre fitting London</a> page." },
      ]}
      faqs={[
        { q: "How much does mobile puncture repair cost in London?", a: "£45–£65 for a proper internal plug-patch fitted to BS AU 159, including rebalance and torque. Central London is £50–£70, and evening or overnight jobs add £10–£40." },
        { q: "Can I get a puncture repaired the same day in London?", a: "Yes — book before noon and almost any slot before 6pm is available. Book after 3pm and it becomes an emergency booking with a £15–£30 uplift." },
        { q: "How long does mobile puncture repair take?", a: "30–45 minutes from the van arriving to you driving away, including rebalancing." },
        { q: "Can a mobile fitter come inside the Congestion Zone?", a: "Yes, every day. The van is Congestion Charge and ULEZ compliant; a small £5–£15 per-job uplift covers a share of the daily charge during charging hours." },
        { q: "Where can a mobile fitter park in central London?", a: "Off-street car parks, private driveways, hotel forecourts, office loading bays, and residents' bays where you hold the permit. Avoid red routes and active bus lanes." },
        { q: "Can any puncture be repaired?", a: "Only tread-centre punctures under 6mm on tyres with 1.6mm+ tread. Sidewall, shoulder, and multiple-hole damage all mean a new tyre." },
        { q: "Do mobile puncture repairs come with a warranty?", a: "Yes — any reputable London operator offers 12 months on the repair itself." },
        { q: "Does price vary much by borough?", a: "Yes, modestly — Zone 1 and inner boroughs run £50–£70, while outer boroughs like Bexley, Sutton and Harrow are usually £45–£58, reflecting van travel time rather than the job itself." },
      ]}
      cta={{ headline: "Book a mobile puncture repair now", body: "Send your postcode, reg, and tyre size and we'll dispatch the closest London fitter with a firm all-in quote.", label: "Get a mobile fitter →" }}
      areaLinks={[
        { to: "/areas/london", label: "Mobile puncture repair across London" },
      ]}
      related={[
        { to: "/areas/london", label: "Mobile Tyre Fitting London" },
        { to: "/blog/emergency-puncture-repair-london", label: "Emergency & 24 Hour Puncture Repair London" },
        { to: "/blog/puncture-repair-cost-uk", label: "Puncture Repair Cost UK" },
      ]}
    />
  );
}
