import BlogPost from "@/components/blog/BlogPost";

export default function EmergencyPunctureRepairLondon() {
  return (
    <BlogPost
      slug="emergency-puncture-repair-london"
      metaTitle="Emergency Puncture Repair London: Who's Open Right Now (2026)"
      metaDesc="Emergency puncture repair London: what it costs, how fast a mobile fitter arrives, and who's actually available 24/7 across every borough. Book in 60 seconds."
      title="Emergency Puncture Repair in London: Who's Actually Open Right Now"
      category="London"
      readMinutes={9}
      datePublished="2026-07-15"
      heroImage="emergencyPunctureLondon"
      intro="You've got a nail in the tread, the pressure warning light is on, and you need someone to come to your car in the next hour — not a slot at a garage next Tuesday. This is the honest guide to emergency puncture repair in London: prices, response times, what actually happens on-site, and the mistakes that turn a £45 repair into a £250 tyre replacement."
      blocks={[
        { type: "h2", text: "What counts as an emergency puncture in London" },
        { type: "p", html: "For our purposes, an <strong>emergency puncture</strong> is any loss of pressure that stops you driving safely right now — a nail you can see, a valve leaking audibly, a tyre that was fine at breakfast and is on 15 PSI by lunch. It's separate from a slow puncture (losing a few PSI over days) and from a blowout (sidewall gone, tyre unrepairable). Slow punctures can wait until the weekend. An emergency puncture can't." },
        { type: "p", html: "In London specifically, the emergency version is more common than most drivers expect. Roadworks are constant, kerbs are aggressive, and the sheer density of construction sites means more debris in the road than almost anywhere else in the UK. On any given day there are around 400 emergency puncture callouts across the M25." },

        { type: "h2", text: "The realistic response time (by area)" },
        { type: "p", html: "The single most useful thing to know is how fast someone can actually get to you. Real numbers from mobile operators working across the capital in 2026:" },
        {
          type: "ul",
          items: [
            "<strong>Zones 1–2 (Central + inner):</strong> 30–60 minutes typical, 20 minutes on a good day",
            "<strong>Zones 3–4 (Hackney, Camden, Wandsworth, Ealing, etc.):</strong> 45–75 minutes",
            "<strong>Zones 5–6 (Bromley, Croydon, Enfield, Kingston):</strong> 60–90 minutes",
            "<strong>Just outside the M25:</strong> 75–120 minutes",
          ],
        },
        { type: "p", html: "Weekday rush hour (7.30–9.30am and 4.30–7pm) adds 15–30 minutes. Weekends before noon are the fastest window — vans are staged and traffic is light. If someone quotes you a 15-minute arrival in Zone 6 at 8am on a Tuesday, they're guessing. Ask when the van will actually leave and where it's coming from." },

        { type: "h2", text: "What emergency puncture repair costs in London" },
        {
          type: "ul",
          items: [
            "<strong>Standard mobile puncture repair (weekday, daytime):</strong> £45–£65",
            "<strong>Evening callout (7pm–10pm):</strong> £55–£80",
            "<strong>Overnight (10pm–7am):</strong> £70–£110",
            "<strong>Central London / Congestion Zone surcharge:</strong> +£5–£15",
            "<strong>Locking wheel nut removal (no key):</strong> +£20–£40",
          ],
        },
        { type: "p", html: "That's the repair — a proper mushroom-style plug patch fitted from inside the tyre, following BS AU 159. It should include: wheel off, tyre off the rim, internal inspection, area buffed, plug patch bonded, rebalanced, refitted, torqued. Anything cheaper than £45 is usually an external plug (illegal for road use in the UK on its own) or a temporary fix that will fail." },
        { type: "p", html: "If the tyre can't be repaired — sidewall damage, tread damage in the shoulder zone, or a wound over 6mm — you're looking at a new tyre. Mobile fit prices in London currently sit between £95 (budget 195/65 R15) and £320 (premium 245/40 R19 run-flat). Any credible fitter carries stock for the top 40 UK sizes and can quote you an all-in figure inside 90 seconds." },

        { type: "h2", text: "What actually happens when the van arrives" },
        {
          type: "ol",
          items: [
            "The fitter verifies the wheel/tyre size against what you sent — mismatched stock is the number-one reason callouts fail.",
            "Wheel comes off with a torque wrench, hub cleaned.",
            "Tyre is broken off the rim and inspected internally. This is where 20% of \"punctures\" turn into replacements — internal damage from driving on it flat.",
            "If repairable, the puncture area is buffed, cleaned, and a combined plug-patch is bonded from inside. It takes about eight minutes to set.",
            "Wheel is rebalanced on-van (any real mobile operator carries a balancer), refitted, and torqued to manufacturer spec.",
            "You get a photo record and, on most operators, a 12-month warranty on the repair.",
          ],
        },

        { type: "h2", text: "The five biggest mistakes on an emergency callout" },
        { type: "h3", text: "1. Driving on it \"to somewhere safer\"" },
        { type: "p", html: "Every metre you roll on a flat tyre kills the sidewall. Somewhere safer is almost always further than the tyre will survive. A £45 repair becomes a £180 tyre becomes a £900 alloy+bearing job in about 400 metres. Turn the engine off." },
        { type: "h3", text: "2. Not sending a photo of the tyre size" },
        { type: "p", html: "The stamped code on the sidewall (e.g. 225/45 R17 94W) determines everything. Photograph it and send it before the van leaves. It shaves 20 minutes off the callout because we can confirm stock instantly." },
        { type: "h3", text: "3. Losing the locking wheel-nut key" },
        { type: "p", html: "The single most common £30 add-on. It lives in the glove box, the boot floor tool tray, or the spare wheel well. If you genuinely can't find it, say so upfront — we bring a locking-nut removal set, but it takes an extra 15 minutes." },
        { type: "h3", text: "4. Choosing the cheapest quote from a Facebook post" },
        { type: "p", html: "The London Facebook groups are full of people who own a jack and a compressor. A real mobile puncture repair requires a tyre machine (to break the bead), a balancer, and stock of BS AU 159 plug patches. A £25 quote is almost always a rope plug from outside — not legal, not safe, and it will fail." },
        { type: "h3", text: "5. Trying to inflate a tyre with a nail still in it" },
        { type: "p", html: "The nail is what's stopping the air from escaping faster. Pulling it out drops the tyre in under a minute. Leave it in until the fitter is on-site." },

        { type: "h2", text: "Where you're allowed to be repaired in London" },
        { type: "p", html: "Mobile puncture repair is legal on any road where you can safely stop. Practically:" },
        {
          type: "ul",
          items: [
            "<strong>Residential streets:</strong> fine anywhere with hazards on",
            "<strong>Red Routes:</strong> avoid if possible, but for a genuine breakdown enforcement is essentially never applied",
            "<strong>Bus lanes:</strong> after 7pm most boroughs are unenforced, but night buses still run — pick another spot if you can",
            "<strong>Car parks (supermarket, station, NCP):</strong> the ideal location, request it if you can move the car safely",
            "<strong>Motorway hard shoulder (M25 etc.):</strong> call National Highways first; a mobile fitter usually can't legally attend and you'll need recovery to leave the motorway",
          ],
        },

        { type: "h2", text: "The 60-second booking checklist" },
        {
          type: "ol",
          items: [
            "Postcode you're at",
            "Car make, model, year (or reg)",
            "Tyre size (photo of sidewall)",
            "Location of the puncture if visible (nail in tread / sidewall / valve)",
            "Whether the car is currently drivable a short distance",
            "Locking wheel-nut key: yes or no",
          ],
        },
        { type: "p", html: "Send those six things and you'll have a firm quote, ETA, and van dispatched inside two minutes. That's the whole point of mobile — no towing, no garage appointment, no losing the afternoon." },
      ]}
      faqs={[
        { q: "How much is an emergency puncture repair in London?", a: "£45–£65 in daytime hours, £55–£80 in the evening, £70–£110 overnight. Central London and Congestion Zone jobs typically carry a £5–£15 uplift." },
        { q: "How fast can someone come out for an emergency puncture in London?", a: "30–60 minutes across Zones 1–2, 45–75 minutes in Zones 3–4, and 60–90 minutes in Zones 5–6. Add 15–30 minutes for rush hour." },
        { q: "Can every puncture be repaired?", a: "No. Punctures in the tread centre under 6mm are usually repairable to BS AU 159. Sidewall damage, shoulder damage, and any wound over 6mm mean a new tyre." },
        { q: "Is it worth repairing an emergency puncture or just replacing the tyre?", a: "If the tread is 4mm+ and the puncture is central, repair. If it's under 3mm or near the sidewall, replace. A good mobile fitter will show you photos and let you decide." },
        { q: "What if I don't have my locking wheel-nut key?", a: "Say so when you book. Mobile fitters carry a removal set — it adds around £20–£40 and 15 minutes to the job." },
      ]}
      cta={{ headline: "Puncture right now? Send your postcode.", body: "Tell us where you are and the tyre size — we'll dispatch the closest mobile fitter in London and give you a firm ETA in under two minutes.", label: "Get emergency puncture repair →" }}
      related={[
        { to: "/blog/mobile-puncture-repair-london", label: "Mobile Puncture Repair London" },
        { to: "/blog/24-hour-puncture-repair-london", label: "24 Hour Puncture Repair London" },
        { to: "/blog/nail-in-tyre-what-to-do", label: "Nail in Tyre: What to Do" },
      ]}
    />
  );
}
