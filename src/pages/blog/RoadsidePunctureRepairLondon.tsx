import BlogPost from "@/components/blog/BlogPost";

export default function RoadsidePunctureRepairLondon() {
  return (
    <BlogPost
      slug="roadside-puncture-repair-london"
      metaTitle="Mobile Tyre Fitter vs AA & RAC London | Roadside Puncture"
      metaDesc="Mobile fitter vs AA, RAC and Green Flag for a London roadside puncture: what each actually does, response times, real costs, and how to claim a callout back."
      title="Mobile Tyre Fitter vs AA, RAC and Green Flag: Who to Call for a London Roadside Puncture"
      category="London"
      readMinutes={9}
      datePublished="2026-07-15"
      dateModified="2026-08-18"
      heroImage="roadsidePunctureLondon"
      intro="AA, RAC, and Green Flag membership feels like the answer when you break down — until you've actually waited four hours on the North Circular for a van that turns up, inflates your tyre, and tells you to drive it to a garage tomorrow. Here's when a mobile puncture fitter beats the recovery services in London, and when it doesn't."
      blocks={[
        { type: "h2", text: "What breakdown cover actually does for a puncture" },
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

        { type: "h2", text: "Response times: mobile fitter vs breakdown cover in London" },
        {
          type: "ul",
          items: [
            "<strong>Mobile puncture fitter (emergency):</strong> 30–90 minutes across zones",
            "<strong>AA (standard cover):</strong> 60–150 minutes typical in London, longer in bad weather",
            "<strong>RAC (standard cover):</strong> 60–180 minutes typical",
            "<strong>Green Flag:</strong> 90–180 minutes typical (they subcontract to local recovery)",
          ],
        },
        { type: "p", html: "AA and RAC premium/priority tiers are faster (30–60 minutes) but still don't solve the underlying problem — they get you drivable, not repaired." },

        { type: "h2", text: "The cost comparison" },
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
        { type: "h3", text: "The M25" },
        { type: "p", html: "Not a place for mobile puncture repair. Call National Highways on 0300 123 5000, get recovered to the next junction, and a mobile fitter can meet you at the service area or the first safe street." },
        { type: "h3", text: "The North Circular / South Circular" },
        { type: "p", html: "Technically A-roads, not motorways — mobile fitters can attend but often prefer the driver moves to the nearest side street first because of traffic speed. Ask when you book." },
        { type: "h3", text: "Central London during major events" },
        { type: "p", html: "Marathon, Notting Hill Carnival, state visits, and Pride weekend all close key roads. Response times can double. If your car is inside a closure, we need to route around it — expect delays." },

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

        { type: "h2", text: "The bottom line" },
        { type: "p", html: "For a straightforward puncture on any London road that isn't a motorway hard shoulder, a mobile fitter beats the AA/RAC on time, cost, and outcome. Breakdown cover still earns its keep for motorways, non-tyre problems, and recovery — but for tyres specifically, you're often better off calling us direct and claiming back a callout from your policy where possible." },
      ]}
      faqs={[
        { q: "Can I call a mobile puncture fitter instead of the AA?", a: "Yes, and for a straightforward puncture off the motorway network, it's usually faster and more effective. The AA doesn't carry tyre stock; a mobile fitter does." },
        { q: "Will breakdown cover fix a puncture on the roadside?", a: "No — they'll attempt to fit your spare or inflate with sealant. They don't do internal patch repairs and don't carry replacement tyres." },
        { q: "Can a mobile fitter attend the motorway hard shoulder?", a: "No. Mobile tyre fitters cannot legally attend the motorway hard shoulder in the UK. Call National Highways on 0300 123 5000 and we can meet you at the next junction." },
        { q: "What does a mobile roadside puncture repair cost in London?", a: "£45–£85 depending on the time of day. New tyre supply-and-fit is £95–£320 depending on size." },
      ]}
      cta={{ headline: "Broken down with a puncture in London?", body: "Send your what3words or postcode and the tyre size — we'll dispatch a mobile fitter who can actually repair or replace the tyre on-site.", label: "Get roadside help →" }}
      related={[
        { to: "/blog/emergency-puncture-repair-london", label: "Emergency & 24 Hour Puncture Repair London" },
        { to: "/blog/tyre-blowout-on-motorway-what-to-do", label: "Motorway Blowout: What to Do" },
        { to: "/blog/mobile-puncture-repair-london", label: "Mobile Puncture Repair London" },
      ]}
    />
  );
}
