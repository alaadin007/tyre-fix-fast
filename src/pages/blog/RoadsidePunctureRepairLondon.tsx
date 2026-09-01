import BlogPost from "@/components/blog/BlogPost";

export default function RoadsidePunctureRepairLondon() {
  return (
    <BlogPost
      slug="roadside-puncture-repair-london"
      metaTitle="Roadside Puncture Repair London: Fitter vs AA & RAC"
      metaDesc="Roadside puncture repair London compared: mobile fitter vs AA, RAC and Green Flag — response times, real costs, what they carry, Red Routes and ULEZ."
      title="Roadside Puncture Repair London: Mobile Fitter vs AA, RAC and Green Flag"
      category="London"
      readMinutes={11}
      datePublished="2026-07-15"
      dateModified="2026-08-18"
      heroImage="roadsidePunctureLondon"
      intro="Roadside puncture repair London options come down to two routes: breakdown cover or a mobile tyre fitter. AA, RAC, and Green Flag membership feels like the answer when you break down — until you've actually waited four hours on the North Circular for a van that turns up, inflates your tyre, and tells you to drive it to a garage tomorrow. Here's when a mobile puncture fitter beats the recovery services in London, and when it doesn't."
      blocks={[
        { type: "h2", text: "Roadside puncture repair London: what breakdown cover actually does" },
        { type: "p", html: "AA, RAC, and Green Flag <strong>are not tyre companies</strong>. Their remit for a puncture is:" },
        {
          type: "ol",
          items: [
            "Attempt to fit your spare (if you have one — most modern cars don't)",
            "Use a tyre-inflator sealant kit to get you mobile temporarily",
            "Recover the car to a garage of your choice if the above fails",
          ],
        },
        { type: "p", html: "What they don't do: fit a new tyre on-site, or perform a BS AU 159 internal patch repair. Their patrols don't carry stock and don't have tyre machines in the van." },

        { type: "h2", text: "Mobile fitter vs the recovery services: side by side" },
        {
          type: "table",
          caption: "Typical London figures, 2026. Membership tiers vary — check your policy wording.",
          head: ["Provider", "Typical response", "Cost (non-member)", "Cost (member)", "Carries tyre stock?", "What actually happens"],
          rows: [
            ["Mobile puncture fitter", "30–90 min", "£45–£85 repair / £95–£320 new tyre", "n/a", "Yes — common sizes on the van", "Wheel off, proper repair or replacement, you drive away fixed"],
            ["AA", "60–150 min (30–60 min priority)", "£150+ single callout", "Included in £150+/yr cover", "No", "Spare fitted or sealant used; recovery if that fails"],
            ["RAC", "60–180 min", "£150+ single callout", "Included in cover", "No", "Same as AA — spare/sealant, then recovery"],
            ["Green Flag", "90–180 min (subcontracted)", "£140+ single callout", "Included in cover", "No", "Local recovery partner attends; sealant or tow"],
            ["Start Rescue", "90–180 min", "£120+ single callout", "Included in cover", "No", "Budget cover, similar remit to the above, often longer waits in London"],
          ],
        },
        { type: "p", html: "The pattern across every recovery brand is the same: they get you <em>mobile</em>, not <em>repaired</em>. A mobile tyre fitter is the only option on this list that leaves you with a legally roadworthy tyre at the roadside." },

        { type: "h2", text: "Response times: mobile fitter vs breakdown cover in London" },
        {
          type: "ul",
          items: [
            "<strong>Mobile puncture fitter (emergency):</strong> 30–90 minutes across zones",
            "<strong>AA (standard cover):</strong> 60–150 minutes typical in London, longer in bad weather",
            "<strong>RAC (standard cover):</strong> 60–180 minutes typical",
            "<strong>Green Flag:</strong> 90–180 minutes typical (they subcontract to local recovery)",
            "<strong>Start Rescue:</strong> 90–180 minutes, budget-tier queueing at peak times",
          ],
        },
        { type: "p", html: "AA and RAC premium/priority tiers are faster (30–60 minutes) but still don't solve the underlying problem — they get you drivable, not repaired." },

        { type: "h2", text: "Roadside puncture repair London: the cost comparison" },
        {
          type: "ul",
          items: [
            "<strong>Mobile puncture repair on-site:</strong> £45–£85 depending on time",
            "<strong>Mobile new tyre supplied and fitted on-site:</strong> £95–£320",
            "<strong>AA breakdown attendance (already a member):</strong> 'free' but £150+ annual cover",
            "<strong>AA pay-and-claim single callout (non-member):</strong> £150+",
            "<strong>Recovery to a garage:</strong> included in cover, but then you pay for the repair anyway (£25–£65)",
            "<strong>Taxi home after recovery:</strong> £20–£60",
          ],
        },
        { type: "p", html: "For a driver who already pays for breakdown cover, the maths still often favour calling a mobile fitter directly:" },
        {
          type: "ol",
          items: [
            "Faster arrival",
            "Actual repair on-site — you drive away, no follow-up garage visit",
            "Cheaper new-tyre supply than most garages (mobile fitters buy at wholesale)",
            "One-and-done — no chasing a repair booking the next day",
          ],
        },

        { type: "h2", text: "When to call the AA/RAC instead" },
        { type: "p", html: "Breakdown cover is the right call in three scenarios:" },
        {
          type: "ul",
          items: [
            "<strong>You're on a motorway or the M25 hard shoulder.</strong> Mobile fitters cannot legally attend the motorway hard shoulder — the recovery services can (they're authorised, mobile fitters aren't).",
            "<strong>The problem isn't actually a puncture</strong> — engine warning, battery, dead key fob. A mobile tyre fitter doesn't solve those.",
            "<strong>You need the car recovered elsewhere</strong> (home or a specialist workshop). Recovery is what breakdown cover does best.",
          ],
        },

        { type: "h2", text: "When to call a mobile fitter instead" },
        {
          type: "ul",
          items: [
            "You're anywhere off the motorway network (residential street, car park, driveway)",
            "You know the tyre has a nail, cut, or slow leak — you need it repaired, not just inflated",
            "You want it done now, not \"get to a garage tomorrow\"",
            "You're at Heathrow, Gatwick, City, Luton, or Stansted long-stay",
            "You've already tried the inflator sealant and it didn't seal",
            "You've been given a temporary fix by a patrol and now want the actual repair",
          ],
        },

        { type: "h2", text: "The specific London roadside gotchas" },
        { type: "h3", text: "Red Routes (TfL)" },
        { type: "p", html: "The A-roads with red single/double lines (A2, A3, A4, A11, A13, A40, A501, A406 in parts) are no-stopping 24/7 in enforcement theory. Reality: a genuine breakdown with hazards on is not typically ticketed. If you can safely coast into a side street or bus stop layby, do — the ticket risk drops to zero." },
        { type: "h3", text: "Congestion Charge and ULEZ" },
        { type: "p", html: "A breakdown inside the Congestion Charge Zone or the ULEZ doesn't attract either charge while the car is stationary — only movement is charged. If a mobile fitter has to reposition the car a few streets to reach safe access, that's on the fitter's compliant van, not your account." },
        { type: "h3", text: "The M25 and motorway hard shoulder" },
        { type: "p", html: "Not a place for mobile puncture repair. Call National Highways on 0300 123 5000, get recovered to the next junction, and a mobile fitter can meet you at the service area or the first safe street. National Highways patrols and approved recovery operators are the only parties authorised on the hard shoulder — a mobile tyre fitter turning up there would be breaking the law and putting themselves in the most dangerous strip of road in the country." },
        { type: "h3", text: "The North Circular / South Circular" },
        { type: "p", html: "Technically A-roads, not motorways — mobile fitters can attend but often prefer the driver moves to the nearest side street first because of traffic speed. Ask when you book." },
        { type: "h3", text: "Central London during major events" },
        { type: "p", html: "Marathon, Notting Hill Carnival, state visits, and Pride weekend all close key roads. Response times can double. If your car is inside a closure, we need to route around it — expect delays." },

        { type: "h2", text: "Making the safe-place decision in the first two minutes" },
        { type: "p", html: "Before you call anyone, run through this quickly:" },
        {
          type: "ol",
          items: [
            "<strong>Are you on a motorway or a limited-access dual carriageway?</strong> If yes, hazards on, seatbelts on, and if you can reach a hard shoulder or slip road safely, do — then call National Highways, not a mobile fitter.",
            "<strong>Is the car already off the live carriageway</strong> (side street, lay-by, car park, driveway)? Then a mobile fitter can come straight to you.",
            "<strong>Is it dark, raining, or on a bend with poor visibility?</strong> Stay belted in with hazards on rather than working at the roadside; wait for a fitter or patrol who's trained for it.",
            "<strong>Do you actually know it's just a tyre?</strong> Warning lights, smoke, or a burning smell mean recovery, not a tyre fitter.",
          ],
        },
        { type: "p", html: "The single biggest mistake we see in London is drivers changing a wheel themselves on a live traffic lane rather than moving somewhere safe first, even if that means driving a short distance on a flat at low speed. A ruined wheel is a much cheaper outcome than being clipped by traffic." },

        { type: "h2", text: "Claiming a mobile callout back from your policy" },
        { type: "p", html: "Most comprehensive breakdown policies include a \"pay and claim\" clause for when you arrange your own assistance. It's rarely advertised, but it's usually there:" },
        {
          type: "ol",
          items: [
            "Call your provider first and log the incident — get a reference number before the fitter arrives if you can.",
            "Ask whether they can attend and, crucially, whether they can <em>repair or replace the tyre on-site</em>. If the answer is recovery only, say you'll arrange your own repair and ask about pay-and-claim.",
            "Get an itemised invoice from the mobile fitter showing callout, labour, and parts separately.",
            "Submit the invoice with the reference number. Most reimburse the callout element (typically capped at £50–£150), not the tyre itself.",
          ],
        },
        { type: "p", html: "Green Flag and RAC both operate reimbursement schemes for members; AA handles it case by case. It's not guaranteed, but the paperwork takes ten minutes and often covers the difference." },
        { type: "p", html: "For safety steps while you wait and where you're allowed to be attended in London, see our <a href=\"/blog/emergency-puncture-repair-london\" class=\"text-primary hover:underline\">emergency puncture repair London guide</a>." },

        { type: "h2", text: "Pay-and-claim in practice: a worked example" },
        { type: "p", html: "Driver on a residential street off the A4 near Chiswick with a nail in the tread. AA membership, standard cover. Options compared:" },
        {
          type: "ul",
          items: [
            "<strong>Wait for AA:</strong> patrol arrives in ~75 minutes, fits sealant, advises garage visit — car still not fixed, tomorrow's job outstanding.",
            "<strong>Call a mobile fitter directly:</strong> arrives in 40 minutes, BS AU 159 repair on-site, £55, done in 35 minutes flat.",
            "<strong>Claim back:</strong> AA policy pay-and-claim reimburses £50 of the callout on submission of the invoice — net cost roughly a fiver more than the AA excess would have been, but the car was fixed same-afternoon instead of over two visits.",
          ],
        },

        { type: "h2", text: "The bottom line" },
        { type: "p", html: "For a straightforward puncture on any London road that isn't a motorway hard shoulder, a mobile fitter beats the AA/RAC on time, cost, and outcome. Breakdown cover still earns its keep for motorways, non-tyre problems, and recovery — but for tyres specifically, you're often better off calling us direct and claiming back a callout from your policy where possible." },
      ]}
      faqs={[
        { q: "Can I call a mobile puncture fitter instead of the AA?", a: "Yes, and for a straightforward puncture off the motorway network, it's usually faster and more effective. The AA doesn't carry tyre stock; a mobile fitter does." },
        { q: "Will breakdown cover fix a puncture on the roadside?", a: "No — they'll attempt to fit your spare or inflate with sealant. They don't do internal patch repairs and don't carry replacement tyres." },
        { q: "Can a mobile fitter attend the motorway hard shoulder?", a: "No. Mobile tyre fitters cannot legally attend the motorway hard shoulder in the UK. Call National Highways on 0300 123 5000 and we can meet you at the next junction or service area." },
        { q: "What does a mobile roadside puncture repair cost in London?", a: "£45–£85 depending on the time of day. New tyre supply-and-fit is £95–£320 depending on size." },
        { q: "Does a breakdown on a Red Route or in the Congestion Zone get me a ticket or a charge?", a: "A genuine breakdown with hazards on is not typically ticketed on a Red Route, and a stationary car doesn't attract the Congestion Charge or ULEZ — only movement does." },
        { q: "Is Green Flag or Start Rescue faster than the AA or RAC in London?", a: "No — if anything they're typically slower, since both subcontract to local recovery partners rather than running their own patrol fleet, which can add to response time at peak periods." },
      ]}
      cta={{ headline: "Broken down with a puncture in London?", body: "Send your what3words or postcode and the tyre size — we'll dispatch a mobile fitter who can actually repair or replace the tyre on-site.", label: "Get roadside help →" }}
      areaLinks={[
        { to: "/areas/london", label: "Roadside tyre fitters across London" },
      ]}
      related={[
        { to: "/blog/emergency-puncture-repair-london", label: "Emergency & 24 Hour Puncture Repair London" },
        { to: "/blog/tyre-blowout-on-motorway-what-to-do", label: "Motorway Blowout: What to Do" },
        { to: "/blog/mobile-puncture-repair-london", label: "Mobile Puncture Repair London" },
      ]}
    />
  );
}
