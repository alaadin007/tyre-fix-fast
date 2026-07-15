import BlogPost from "@/components/blog/BlogPost";

export default function RoadsidePunctureRepairLondon() {
  return (
    <BlogPost
      slug="roadside-puncture-repair-london"
      metaTitle="Roadside Puncture Repair London: Mobile Fitter vs AA (2026)"
      metaDesc="Roadside puncture repair in London: when to call a mobile fitter, when to call the AA/RAC, response times, prices, and where mobile can't legally attend."
      title="Roadside Puncture Repair London: When to Call Us Instead of the AA"
      category="London"
      readMinutes={9}
      datePublished="2026-07-15"
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

        { type: "h2", text: "What to do at the roadside while you wait" },
        {
          type: "ol",
          items: [
            "<strong>Turn hazards on</strong> immediately",
            "<strong>Coast off the running lane</strong> if possible (into a bus stop, side street, layby)",
            "<strong>Get out on the passenger side</strong> away from traffic",
            "<strong>Move behind a barrier</strong> — never stand between the car and oncoming traffic",
            "<strong>Put out a warning triangle</strong> if you have one (10m urban, 45m motorway — but see motorway note above)",
            "<strong>Send the exact location</strong> (what3words, Google Maps pin, road name and nearest side street)",
            "<strong>Photograph the tyre sidewall</strong> for the tyre size",
          ],
        },

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
        { to: "/blog/emergency-puncture-repair-london", label: "Emergency Puncture Repair London" },
        { to: "/blog/tyre-blowout-on-motorway-what-to-do", label: "Motorway Blowout: What to Do" },
        { to: "/blog/24-hour-puncture-repair-london", label: "24 Hour Puncture Repair London" },
      ]}
    />
  );
}
