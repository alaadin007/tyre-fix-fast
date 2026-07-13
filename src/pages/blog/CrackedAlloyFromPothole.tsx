import BlogPost from "@/components/blog/BlogPost";

export default function CrackedAlloyFromPothole() {
  return (
    <BlogPost
      slug="cracked-alloy-from-pothole"
      metaTitle="Cracked Alloy From a Pothole: UK Repair, Cost & Claim (2026)"
      metaDesc="What to do after a pothole cracks your alloy — how to tell if it's repairable, what a refurb or replacement costs, and how to claim from the council."
      title="Cracked Alloy From a Pothole: Repair, Replace, or Claim?"
      category="Repair Guide"
      readMinutes={10}
      datePublished="2026-07-13"
      heroImage="flat"
      intro="You hit a pothole, the tyre went flat instantly, and now the alloy is buckled — maybe cracked. This guide explains how to tell repairable from scrap, what a UK refurb realistically costs in 2026, and the paperwork you need to claim the bill from the council or TfL."
      blocks={[
        { type: "h2", text: "First: is the alloy actually cracked?" },
        { type: "p", html: "A pothole hit produces three levels of alloy damage. Getting the diagnosis right is the difference between a £70 refurb and a £400 replacement." },
        {
          type: "ul",
          items: [
            "<strong>Kerb rash</strong> — cosmetic scuffing on the outer face. No structural impact. £60–£120 refurb.",
            "<strong>Buckle</strong> — the rim edge is pushed inward, tyre won't seal fully, you feel a vibration at 40+ mph. Repairable in most cases by a specialist \"wheel straightener\" for £70–£140 per wheel.",
            "<strong>Crack</strong> — a visible hairline (usually on the inner rim, sometimes across a spoke). Air leaks slowly, or the tyre won't hold at all. Structural. See below.",
          ],
        },
        { type: "p", html: "To find a crack: with the wheel off, clean the inside of the rim with brake cleaner and shine a torch along the barrel. Any dark hairline that flexes when the wheel is stressed is a crack. On the front face, look at the paint — cracks often show as a wrinkle in the lacquer before they show in the metal." },

        { type: "h2", text: "Can a cracked alloy be welded?" },
        { type: "p", html: "Sometimes — but it's specialist work and only certain cracks qualify. TIG welding on a cast aluminium alloy requires the wheel to be stripped, pre-heated, welded, re-machined and re-balanced. A competent specialist can do it for <strong>£90–£180 per wheel</strong>, and a properly welded wheel is safe for normal road use." },
        { type: "p", html: "But there are hard limits. Cracks that <strong>run through a bolt hole</strong>, cracks <strong>on the spoke or hub face</strong>, and cracks <strong>on forged or flow-formed wheels</strong> (BMW M, Audi RS, most performance/EV OEM) are usually condemned. Repair welding a load-bearing crack on a forged wheel changes its metallurgy in ways nobody sensible will sign off on." },

        { type: "h2", text: "When you must replace the wheel" },
        {
          type: "ul",
          items: [
            "Multiple cracks or a single crack longer than about 40 mm.",
            "Any crack on the inner face that intersects the bead seat (the tyre won't seal).",
            "Any crack on a forged wheel unless the manufacturer or a specialist explicitly clears it.",
            "The wheel is out-of-round by more than 1.5 mm after straightening — the vibration never fully goes.",
            "The centre bore is oval or the bolt-hole seats are elongated (rare but happens on very hard impacts).",
          ],
        },
        { type: "p", html: "Replacement cost varies wildly. OEM alloys for common cars (Golf, Focus, Corsa, 3-Series) run <strong>£180–£350 used</strong>, <strong>£280–£550 new</strong>. Performance and EV OEM wheels (M3, RS6, Model 3 Performance) can hit <strong>£800–£1,600 each</strong>. Aftermarket replicas are cheaper but check UK TÜV / JWL / VIA certification — anything without it is unsafe and, in some insurance events, uninsured." },

        { type: "h2", text: "The straightening + refurb combo" },
        { type: "p", html: "For a buckled-but-not-cracked wheel, the best-value fix is often a combined straightening and refurb — hydraulic straightening restores the profile, then the wheel is sanded, primed, painted and lacquered so you can't see it ever happened. <strong>Typical UK price:</strong> £110–£180 per wheel, 3–5 working day turnaround. Cheaper than a replacement and, on a common OEM design, indistinguishable." },

        { type: "h2", text: "Getting a mobile fitter to look at it" },
        { type: "p", html: "This is where a lot of drivers get stuck. Mobile tyre fitters don't repair alloys — they fit tyres. But they will:" },
        {
          type: "ul",
          items: [
            "Come to the roadside or your driveway and get a new tyre on so you can drive again.",
            "Inspect the wheel visually and tell you honestly whether it's roadworthy short-term.",
            "Warn you if the wheel won't hold air — in which case they won't refit a tyre to it, and you'll need a spare or recovery.",
            "Recommend a local straightening or refurb specialist and often drop the wheel off for you.",
          ],
        },

        { type: "h2", text: "Claiming the cost back from the council or TfL" },
        { type: "p", html: "UK councils, TfL, National Highways and Transport Scotland are all liable for pothole damage — <em>if</em> they were on notice of the defect and failed to fix it in a reasonable time. The claim rejection rate is high (roughly 40–70% depending on authority), but the ones that succeed usually share the same paperwork." },
        {
          type: "ol",
          items: [
            "<strong>Photograph the pothole immediately</strong> — with a coin or shoe in the frame for scale, and a wider shot showing road context.",
            "<strong>Photograph the damage</strong> — tyre, wheel, any suspension impact.",
            "<strong>Note the exact location</strong> — GPS coordinates or a what3words. \"Near the traffic lights\" won't fly.",
            "<strong>Report the pothole</strong> via <a href=\"https://www.gov.uk/report-pothole\" class=\"text-primary hover:underline\">gov.uk/report-pothole</a> for England, <a href=\"https://tfl.gov.uk/forms/12397.aspx\" class=\"text-primary hover:underline\">TfL</a> for the Red Route network, or the council's website for local roads.",
            "<strong>Get itemised receipts</strong> for the tyre, wheel repair or replacement, wheel alignment, and any recovery fees.",
            "<strong>Submit the claim in writing within 14 days.</strong> Most authorities have an online damage claim form; if not, write to the highways department by recorded delivery.",
          ],
        },
        { type: "p", html: "Under Section 58 of the Highways Act 1980, the authority can defend a claim if it can prove it had a reasonable inspection regime and no prior knowledge of the defect. That's why photos, dates and prior reports (yours or anyone else's — searchable via <a href=\"https://www.fixmystreet.com\" class=\"text-primary hover:underline\">FixMyStreet</a>) matter more than anything else." },

        { type: "h2", text: "Will your insurance cover it?" },
        { type: "p", html: "Yes, comprehensive cover almost always includes pothole damage, but two things make most drivers skip the claim:" },
        {
          type: "ul",
          items: [
            "Your excess (typically £250–£500) is often close to the total repair cost.",
            "A claim usually costs you your No Claims Discount, worth £150–£400/year for 3–5 years — a much bigger long-term hit than the repair itself.",
          ],
        },
        { type: "p", html: "For anything under about £400, most drivers pay out of pocket and try the council claim in parallel. Above that, factor in the NCD hit before you file." },

        { type: "h2", text: "Preventing the next one" },
        {
          type: "ul",
          items: [
            "Increase following distance in wet weather — you can only avoid the pothole you can see.",
            "Check tyre pressures monthly. Under-inflated tyres offer far less protection to the rim in a hit.",
            "On rough routes, consider a higher-profile tyre size if your car allows — 45 profile has twice the sidewall cushion of a 30.",
            "Report every pothole you drive over, even if you're fine. That's what puts the council \"on notice\" for the next driver's claim.",
          ],
        },
      ]}
      faqs={[
        { q: "Can you drive on a cracked alloy?", a: "Only to reach a safe stopping point. A cracked rim can suddenly release the tyre bead — treat it as a wheel that will fail without warning and get a mobile fitter or recovery." },
        { q: "How much does it cost to repair a cracked alloy in the UK?", a: "£90–£180 per wheel for TIG weld and refurb, if the crack is repairable. Non-repairable cracks require replacement — £280–£550 for typical OEM, more for performance or EV wheels." },
        { q: "Will the council pay for pothole damage to my alloy?", a: "Sometimes. You need dated photos, GPS location, itemised receipts and a written claim within 14 days. Success rates are 30–60% depending on prior reports and the authority's inspection record." },
        { q: "Should I claim on my insurance for pothole damage?", a: "Usually only if the bill exceeds £400 or so, because you'll lose your No Claims Discount for 3–5 years. Under that, pay out of pocket and pursue the council claim in parallel." },
      ]}
      related={[
        { to: "/blog/flat-tyre-london", label: "Flat Tyre London Guide" },
        { to: "/blog/wheel-alignment-uk-guide", label: "Wheel Alignment UK Guide" },
        { to: "/blog/slow-puncture-uk-guide", label: "Slow Puncture Guide" },
      ]}
    />
  );
}
