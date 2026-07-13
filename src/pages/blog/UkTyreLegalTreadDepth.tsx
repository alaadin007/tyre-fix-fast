import BlogPost from "@/components/blog/BlogPost";

export default function UkTyreLegalTreadDepth() {
  return (
    <BlogPost
      slug="uk-tyre-legal-tread-depth"
      metaTitle="UK Legal Tyre Tread Depth: 1.6mm Rule Explained (2026)"
      metaDesc="The UK 1.6mm legal tread depth rule, fines, MOT tests, how to measure tread yourself, and when tyres are legal but unsafe."
      title="UK Legal Tyre Tread Depth: The 1.6mm Rule, Fines and What's Actually Safe"
      category="Legal"
      readMinutes={9}
      datePublished="2026-07-13"
      heroImage="tpms"
      intro="The UK minimum legal tread depth is 1.6mm — a number most drivers can recite but very few understand properly. This guide covers what it actually means, how the police and MOT centres measure it, the fines, and why 1.6mm is legal but not remotely safe once the rain arrives."
      blocks={[
        { type: "h2", text: "The rule, in one sentence" },
        { type: "p", html: "In the UK, every car, light van and trailer tyre must have <strong>at least 1.6mm of tread depth across the central three-quarters of the tread width, around the entire circumference</strong>. That's the wording of the Motor Vehicles (Construction and Use) Regulations 1986, Regulation 27, and it hasn't changed in decades." },
        { type: "p", html: "Three phrases in there matter:" },
        {
          type: "ul",
          items: [
            "<strong>1.6mm</strong> — the minimum, not the target.",
            "<strong>Central three-quarters</strong> — the outer edges can be lower, but the middle 75% of the tread must all measure 1.6mm or more.",
            "<strong>Around the entire circumference</strong> — one bald patch anywhere and the tyre fails.",
          ],
        },

        { type: "h2", text: "The penalty" },
        { type: "p", html: "It's severe by UK standards: <strong>£2,500 fine and 3 penalty points per tyre</strong>. Four illegal tyres is £10,000 and 12 points — a driving ban. Insurance also treats illegal tyres as a policy breach, so any claim after a collision on bald rubber is likely to be reduced or refused." },
        { type: "p", html: "MOT: any tyre below 1.6mm on the central three-quarters is an automatic MOT failure. So is a tyre with a cut over 25mm or 10% of the section width, a bulge, exposed cord, an incorrect size or speed rating, or a persistent TPMS fault." },

        { type: "h2", text: "How to check your own tread depth" },
        { type: "p", html: "Three ways, in ascending order of accuracy:" },
        {
          type: "ol",
          items: [
            "<strong>The 20p test.</strong> A 20p coin has an outer rim about 2.5mm wide. Slot it into the main tread groove. If you can still see the outer band of the coin, the tread is below 2.5mm — time to replace, well before legal minimum.",
            "<strong>Tread wear indicators (TWI).</strong> Small rubber bars moulded into the base of the tread grooves at 1.6mm. When the tread wears flush with these bars, you're at the legal limit.",
            "<strong>A tread depth gauge.</strong> £3 from any motor factor. Push the probe into the groove, read the millimetres. Measure at three points across the width and at three points around the circumference — you're looking for the lowest number.",
          ],
        },

        { type: "h2", text: "1.6mm is legal. It is not safe." },
        { type: "p", html: "This is the single most important thing to understand. The 1.6mm limit was set in 1992, when tyres and roads and expectations were all different. Modern tyre and road research is consistent: braking performance in the wet degrades sharply below about 3mm of tread." },
        {
          type: "ul",
          items: [
            "At <strong>7–8mm</strong> (new tyre): wet braking from 50mph in around 25 metres.",
            "At <strong>3mm</strong>: same braking test in around 35 metres — a 40% increase.",
            "At <strong>1.6mm</strong>: same braking test in 45–50 metres — nearly double the new-tyre distance, and 15+ metres beyond the 3mm point.",
          ],
        },
        { type: "p", html: "That extra 15 metres is the difference between stopping at the pedestrian crossing and stopping in it. This is why every major UK safety body — TyreSafe, RoSPA, Highways England — recommends replacement at <strong>3mm</strong>, not 1.6mm." },

        { type: "h2", text: "How the police actually check" },
        { type: "p", html: "Two scenarios: a routine roadside stop, and a post-collision inspection." },
        { type: "p", html: "In a routine stop the officer will look for visible baldness in the centre of the tread, cuts, bulges or exposed cord, and often push a small gauge into the main grooves at two or three points. It takes about 30 seconds per tyre. A borderline tyre — 1.6 to 2mm — usually gets a warning or a vehicle rectification notice, not a fine. Clearly bald tyres are prosecuted straight away." },
        { type: "p", html: "After a collision, the tyres are measured with a calibrated depth gauge by a vehicle examiner, at multiple points around the circumference. Any tyre below 1.6mm in the central three-quarters becomes part of the incident report — and that report goes to your insurer." },

        { type: "h2", text: "The under-3mm cluster: why they get missed" },
        { type: "p", html: "Most tyres fail the 3mm safety mark long before they fail the 1.6mm legal one. Drivers rarely look at their tread until the MOT — so you'll typically fit new front tyres about every 20,000 miles on a front-wheel-drive car and simply not notice that the last 8,000 of those miles were on tread below 3mm." },
        { type: "p", html: "A quick habit that fixes this: on the first day of every month, walk around the car and look at the tread. Ninety seconds. If you can see the tread wear indicators, or if the 20p test is showing the outer band, book a fitter that week — you'll pay the same £140 for a new tyre either way, but you won't spend a season braking on 45-metre stopping distances." },

        { type: "h2", text: "Uneven wear: what it tells you" },
        {
          type: "ul",
          items: [
            "<strong>Worn only in the centre:</strong> chronically over-inflated. Reduce pressure to the manufacturer's spec.",
            "<strong>Worn only on both outer edges:</strong> chronically under-inflated, or the tyre has been overloaded.",
            "<strong>Worn on the inside edge only:</strong> negative camber or worn suspension bushes — get an alignment check.",
            "<strong>Worn on the outside edge only:</strong> positive camber or aggressive cornering with a soft sidewall.",
            "<strong>Feathering or saw-tooth wear:</strong> toe misalignment. Alignment fixes it before it destroys the tyre.",
          ],
        },
        { type: "p", html: "See our <a href=\"/blog/wheel-alignment-uk-guide\" class=\"text-primary hover:underline\">wheel alignment guide</a> for the full breakdown of what these patterns cost you in tyre life." },

        { type: "h2", text: "Different rules for different vehicles" },
        {
          type: "ul",
          items: [
            "<strong>Cars, light vans, trailers, caravans:</strong> 1.6mm minimum.",
            "<strong>Motorcycles over 50cc:</strong> 1mm across three-quarters of the tread breadth.",
            "<strong>Motorcycles up to 50cc:</strong> visible tread across all main grooves — no specific millimetre.",
            "<strong>HGV, PSV, LGV over 3.5t:</strong> 1mm minimum.",
            "<strong>Winter or all-season tyres marketed for winter use:</strong> the industry convention is a 4mm change point, though the legal minimum remains 1.6mm.",
          ],
        },

        { type: "h2", text: "One final rule: sidewalls, cuts and bulges" },
        { type: "p", html: "Tread depth is only one of the tests. A tyre with 6mm of tread but a 1cm bulge in the sidewall is illegal, dangerous and an MOT failure. So is any cut deeper than the fabric, any exposed cord, and any tyre with the wrong size or speed rating for the car. Bulges never get better. Replace immediately." },
      ]}
      faqs={[
        { q: "What is the UK legal minimum tyre tread depth?", a: "1.6mm across the central three-quarters of the tread width, around the entire circumference. £2,500 fine and 3 penalty points per illegal tyre." },
        { q: "Is 3mm tread depth OK in the UK?", a: "Legally yes, but wet braking performance degrades sharply below 3mm. UK safety bodies recommend replacement at 3mm, not the 1.6mm legal minimum." },
        { q: "How do I check tread depth without a gauge?", a: "Use a 20p coin — slot it into the main tread groove. If you can still see the outer band of the coin, the tread is below 2.5mm and replacement is due soon." },
        { q: "Are winter tyres held to a different tread depth in the UK?", a: "Legal minimum is still 1.6mm, but winter and all-season tyres lose their cold-weather grip below about 4mm. Industry convention is to replace at 4mm for a winter tyre." },
      ]}
      related={[
        { to: "/blog/tyre-age-when-to-replace", label: "Tyre Age: When to Replace" },
        { to: "/blog/wheel-alignment-uk-guide", label: "Wheel Alignment Guide" },
        { to: "/blog/all-season-vs-winter-tyres-uk", label: "All-Season vs Winter Tyres" },
      ]}
    />
  );
}
