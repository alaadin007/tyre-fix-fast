import BlogPost from "@/components/blog/BlogPost";

export default function RunFlatVsStandardTyres() {
  return (
    <BlogPost
      slug="run-flat-vs-standard-tyres"
      metaTitle="Run-Flat vs Standard Tyres: Which is Best in 2026? (UK)"
      metaDesc="Run-flat vs standard tyres in the UK — cost, comfort, repairability, and whether you can switch. Honest 2026 comparison for BMW, Mini and Mercedes owners."
      title="Run-Flat vs Standard Tyres: What BMW & Mini Owners Actually Need to Know"
      category="Comparison"
      readMinutes={10}
      datePublished="2026-07-13"
      heroImage="mobileFitter"
      intro="If your car came fitted with run-flat tyres — most modern BMWs, Minis, some Mercedes and a few others — the question of whether to stick with them or switch to conventional tyres comes up at every replacement. This is the plain comparison: what run-flats actually give you, what they cost, and whether switching is a good idea."
      blocks={[
        { type: "h2", text: "What a run-flat tyre actually is" },
        { type: "p", html: "A run-flat tyre has a reinforced sidewall — typically 5–8mm thick versus 2–3mm on a standard tyre — that can support the weight of the car even after the tyre has lost all its air. That structural sidewall lets you keep driving after a puncture, typically at up to 50 mph for around 50 miles, so you can reach a fitter or your home without a roadside change." },
        { type: "p", html: "Common markings on the sidewall: <code>RFT</code> (Bridgestone), <code>ROF / RunOnFlat</code> (Michelin, Goodyear), <code>SSR</code> (Continental), <code>ZP</code> (Michelin Zero Pressure), <code>DSST</code> (Dunlop)." },

        { type: "h2", text: "Why manufacturers fit them" },
        { type: "p", html: "Three reasons — none of them primarily about safety:" },
        {
          type: "ol",
          items: [
            "<strong>To delete the spare wheel.</strong> Removing the spare and its well saves 15–25kg and frees up boot space — critical for meeting fuel-economy and emissions targets.",
            "<strong>To improve emergency handling.</strong> Sudden deflation on a standard tyre pulls the steering hard. Run-flat construction is more stable in the immediate seconds after failure.",
            "<strong>To reduce roadside breakdown callouts.</strong> Ambitious safety and cost story for the manufacturer.",
          ],
        },

        { type: "h2", text: "The real trade-offs" },
        { type: "p", html: "Run-flats aren't a free upgrade. What you gain in puncture continuation, you pay for in:" },
        {
          type: "ul",
          items: [
            "<strong>Ride comfort.</strong> The stiffer sidewall transmits more road noise and small-bump harshness into the cabin. On a BMW with 19s and run-flats, potholes feel sharper than they would with standard tyres.",
            "<strong>Cost.</strong> Run-flats are typically 15–30% more expensive than the equivalent standard tyre.",
            "<strong>Limited choice.</strong> Fewer models available in each size — you're picking from maybe 5–10 tyres instead of 30–50.",
            "<strong>Repair restrictions.</strong> Some brands forbid any repair on a run-flat; others allow it only if the tyre hasn't been driven flat. The industry consensus is drift toward replacement over repair.",
            "<strong>Weight.</strong> Adds unsprung weight, which subtly affects handling and efficiency.",
          ],
        },

        { type: "h2", text: "Can you switch to standard tyres?" },
        { type: "p", html: "Usually yes, but read this carefully. If the car came with run-flats, it typically doesn't have a spare wheel or a jack. Switching to standard tyres means you need to buy:" },
        {
          type: "ul",
          items: [
            "A tyre repair kit (sealant and mini-compressor) — £30–£60.",
            "Or a space-saver spare and jack if space allows — £150–£300 aftermarket.",
            "Or accept that punctures mean a mobile fitter or recovery every time.",
          ],
        },
        { type: "p", html: "The switch is legal, and doesn't affect the MOT. Insurance-wise, you should notify your insurer — most treat it as an equivalent replacement with no premium change. Some manufacturer warranties on newer BMWs will explicitly note that non-run-flat tyres void certain aspects — check before switching." },
        { type: "p", html: "The car's TPMS keeps working with standard tyres. The car will still warn you if you get a puncture — you just can't keep driving on it." },

        { type: "h2", text: "What owners actually report after switching" },
        {
          type: "ul",
          items: [
            "<strong>Ride comfort improvement:</strong> almost universally reported, particularly on BMW 3-series and Mini Cooper with larger wheels.",
            "<strong>Noise reduction:</strong> moderate, most noticeable on motorway journeys.",
            "<strong>Puncture anxiety:</strong> real for the first few weeks, then fades as you realise punctures are rare.",
            "<strong>Cost saving:</strong> £15–£40 per tyre × 4 = £60–£160 per set.",
            "<strong>Regret:</strong> uncommon, but some cite the freedom of a run-flat when a puncture happens at 6am on a Sunday.",
          ],
        },

        { type: "h2", text: "Can you go the other way — from standard to run-flat?" },
        { type: "p", html: "Technically yes, provided the wheel is designed to accept a run-flat (most modern alloys are, but not all). But you're paying more for a technology that only makes sense on cars designed without a spare. On a car that has a spare wheel, running run-flats gets you the comfort penalty without the practical benefit. Not recommended unless there's a specific reason." },

        { type: "h2", text: "Repairability: the sticking point" },
        {
          type: "ul",
          items: [
            "<strong>Bridgestone RFT:</strong> repair permitted if inspected and never driven flat.",
            "<strong>Michelin ZP:</strong> repair permitted with specific criteria (tread only, not driven flat).",
            "<strong>Continental SSR:</strong> Continental recommends replacement.",
            "<strong>Pirelli Run-Flat:</strong> Pirelli policy is replacement.",
            "<strong>Dunlop DSST:</strong> replacement recommended.",
          ],
        },
        { type: "p", html: "Practically, most UK fitters default to replacement on run-flats because a repair that doesn't hold turns into a liability. A £220 replacement instead of a £35 repair is the everyday reality of owning run-flats. That alone is a reason a lot of drivers switch." },

        { type: "h2", text: "The verdict — who should stay, who should switch?" },
        { type: "p", html: "<strong>Stay with run-flats if:</strong>" },
        {
          type: "ul",
          items: [
            "You do a lot of long solo motorway journeys where continuing to a service area after a puncture is genuinely valuable.",
            "You have no boot space for a spare or repair kit.",
            "You prioritise consistency over comfort.",
            "You're on a lease and the return spec requires original tyre type.",
          ],
        },
        { type: "p", html: "<strong>Switch to standard tyres if:</strong>" },
        {
          type: "ul",
          items: [
            "Ride quality on your current tyres bothers you.",
            "You mostly do urban and short-distance driving where mobile fit or recovery is easy to arrange.",
            "You're prepared to carry a repair kit or space-saver.",
            "You want more choice of tyre model at replacement time.",
          ],
        },

        { type: "h2", text: "Cost comparison (2026, 225/45 R18 typical BMW size)" },
        {
          type: "ul",
          items: [
            "Standard mid-range tyre supplied and fitted, mobile: <strong>£140–£190</strong>",
            "Run-flat mid-range tyre supplied and fitted, mobile: <strong>£175–£240</strong>",
            "Per-tyre saving from switching: <strong>£35–£50</strong>",
            "Four-tyre saving: <strong>£140–£200</strong>",
            "One-off cost of a decent repair kit: <strong>£40–£60</strong>",
          ],
        },
      ]}
      faqs={[
        { q: "Can I switch from run-flat to standard tyres on my BMW or Mini?", a: "Yes. It's legal, doesn't affect MOT, and most insurers treat it as equivalent. You'll need to carry a repair kit or space-saver spare, since these cars don't come with one." },
        { q: "Are run-flat tyres more expensive?", a: "Yes — typically 15–30% more than the equivalent standard tyre. Repair is also less commonly available, so replacement costs recur more often." },
        { q: "Are run-flat tyres uncomfortable?", a: "Their stiffer sidewalls transmit more road noise and small-bump harshness. Ride comfort improvement is the most-cited benefit when drivers switch to standard tyres." },
        { q: "How far can you drive on a flat run-flat tyre?", a: "Typically up to 50 miles at up to 50 mph. Check your specific brand's rating. The tyre is scrap afterwards and must be replaced." },
      ]}
      related={[
        { to: "/blog/mobile-tyre-fitting-london", label: "Mobile Fitting London" },
        { to: "/blog/nail-in-tyre-what-to-do", label: "Nail in Tyre" },
        { to: "/blog/mobile-tyre-fitter-vs-garage", label: "Mobile vs Garage" },
      ]}
    />
  );
}
