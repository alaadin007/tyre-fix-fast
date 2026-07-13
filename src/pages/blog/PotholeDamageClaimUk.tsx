import BlogPost from "@/components/blog/BlogPost";

export default function PotholeDamageClaimUk() {
  return (
    <BlogPost
      slug="pothole-damage-claim-uk"
      metaTitle="Pothole Damage Claim UK: How To Claim & Win in 2026"
      metaDesc="Damaged tyre or alloy from a UK pothole? Step-by-step guide to claiming from the council or National Highways in 2026, with evidence checklist."
      title="Pothole Damage Claim: How To Actually Win Against a UK Council"
      category="Legal"
      readMinutes={10}
      datePublished="2026-07-13"
      heroImage="flat"
      intro="UK councils reject about 65% of pothole damage claims — mostly because drivers don't submit the right evidence in the right order. It's not that claims never win. It's that most claims lose on paperwork. Here's how to make yours one of the ones that pays out."
      blocks={[
        { type: "h2", text: "Who's actually responsible for the road?" },
        {
          type: "ul",
          items: [
            "<strong>Motorways and major A-roads (mostly):</strong> <a href=\"https://nationalhighways.co.uk\" rel=\"noopener\" target=\"_blank\" class=\"text-primary hover:underline\">National Highways</a> in England, Traffic Scotland, Traffic Wales, DfI in Northern Ireland.",
            "<strong>Local roads (most other roads):</strong> the county, unitary or borough council. Check your local council's website for the exact department (usually \"highways\" or \"street care\").",
            "<strong>Private land:</strong> the landowner (business park, private estate). Not a highways claim — a public liability claim against the owner's insurance.",
          ],
        },
        { type: "p", html: "Getting the responsible authority right is the first step. A claim submitted to the wrong body wastes 6–8 weeks." },

        { type: "h2", text: "Step 1: Do this at the scene (before you move the car)" },
        {
          type: "ol",
          items: [
            "<strong>Get to safety first.</strong> Never inspect a pothole standing in a live lane. Pull into a driveway, verge, or layby.",
            "<strong>Photograph the pothole</strong> from multiple angles. Include one wide shot showing the road context and one close-up with a coin or a phone next to the hole for scale.",
            "<strong>Measure the pothole</strong> if safe — width and depth. Councils generally treat 40mm+ depth as \"actionable\" and shallower as \"routine wear\". A depth photo with a ruler is the single strongest piece of evidence.",
            "<strong>Note the exact location.</strong> Road name, direction of travel, nearest house number or landmark, GPS coordinates from your phone, or What3Words.",
            "<strong>Time and date</strong> stamp on every photo — most phones do this automatically in EXIF.",
            "<strong>Note weather and visibility.</strong> A pothole hidden in standing water is legally different from one clearly visible on a dry road (councils argue the latter is avoidable).",
          ],
        },

        { type: "h2", text: "Step 2: Report the pothole to the authority" },
        { type: "p", html: "This step matters more than most drivers realise. Councils have a legal defence under Section 58 of the Highways Act 1980 if they can show they had a reasonable inspection and repair regime. That defence weakens sharply if you can prove the pothole was reported before your incident and not fixed in time." },
        { type: "p", html: "Report at:" },
        {
          type: "ul",
          items: [
            "Your local council's pothole reporting page (Google \"[council name] report pothole\").",
            "National Highways for motorways/major A-roads: <a href=\"https://nationalhighways.co.uk/contact-us/report-a-road-problem/\" rel=\"noopener\" target=\"_blank\" class=\"text-primary hover:underline\">nationalhighways.co.uk</a>.",
            "<a href=\"https://www.fillthathole.org.uk\" rel=\"noopener\" target=\"_blank\" class=\"text-primary hover:underline\">FillThatHole.org.uk</a> — Cycling UK's independent reporting service that also creates a public record you can reference.",
          ],
        },
        { type: "p", html: "Keep the reference number and screenshot of the confirmation." },

        { type: "h2", text: "Step 3: Get the damage documented and priced" },
        {
          type: "ul",
          items: [
            "Get the tyre or alloy inspected by a fitter and ask for a written report noting the damage is consistent with impact, not wear.",
            "Get a formal quote or invoice showing parts, labour and total.",
            "Photograph the damaged part clearly.",
            "Keep the damaged tyre or alloy if practical — councils sometimes ask to inspect.",
          ],
        },

        { type: "h2", text: "Step 4: Submit the claim in writing" },
        { type: "p", html: "Most councils have an online claims form. If not, write formally to the highways department. Your claim should include:" },
        {
          type: "ol",
          items: [
            "The exact date, time and location of the incident.",
            "Photographs of the pothole with scale reference.",
            "Photographs of the damage to your vehicle.",
            "The fitter's report and invoice/quote.",
            "Any prior reports of the same pothole (yours or from FillThatHole).",
            "A statement that you're claiming under the council's duty of care in respect of highway maintenance.",
          ],
        },
        { type: "p", html: "State clearly the amount you're claiming and provide bank details for payment. Send by email with a delivery receipt, or by post recorded delivery." },

        { type: "h2", text: "Step 5: The Section 58 defence and how to defeat it" },
        { type: "p", html: "Councils will almost always initially respond with a Section 58 defence — \"we have a reasonable inspection regime, therefore we're not liable\". This is a template response. Don't accept it and give up." },
        { type: "p", html: "Submit a <strong>Freedom of Information (FOI) request</strong> asking for:" },
        {
          type: "ul",
          items: [
            "The inspection schedule for the road in question (frequency and last date).",
            "Any prior reports of the pothole in question, in the 3 months before your incident.",
            "Any repair orders raised and their timing.",
          ],
        },
        { type: "p", html: "FOI requests are free and must be answered within 20 working days. If the response shows the pothole was reported and not fixed, the council's Section 58 defence collapses and the claim moves toward payout. This is the single most effective step in a UK pothole claim, and 90% of drivers don't take it." },

        { type: "h2", text: "Step 6: Escalation — small claims court" },
        { type: "p", html: "If the council still refuses after your FOI evidence is in hand, you can escalate to the small claims track of the county court. For claims under £10,000 the process is designed to work without a solicitor, court fees are £35–£185 depending on claim size (added to your claim if you win), and mediation is offered before hearing." },
        { type: "p", html: "Most councils settle at the letter-before-claim stage rather than defend a small claims action they'll likely lose." },

        { type: "h2", text: "What claims typically pay out" },
        {
          type: "ul",
          items: [
            "<strong>Tyre replacement:</strong> £80–£280 depending on size and brand.",
            "<strong>Alloy repair:</strong> £60–£150.",
            "<strong>Alloy replacement:</strong> £180–£500.",
            "<strong>Wheel alignment:</strong> £45–£95.",
            "<strong>Suspension damage:</strong> £200–£1,200 (rare but valid).",
          ],
        },
        { type: "p", html: "Claims are typically paid out at trade prices, not retail. Don't inflate — councils reject inflated claims outright." },

        { type: "h2", text: "Insurance vs council claim — which to use?" },
        { type: "p", html: "For damage under £500, always try the council first. Making a claim on your insurance means losing your no-claims bonus (worth £100–£400/year) and paying an excess (typically £250–£500), often ending up more expensive than the damage itself." },
        { type: "p", html: "For serious damage (£1,000+), file both — an insurance claim to get the car fixed promptly, and a council claim in parallel that (if successful) can reimburse your excess and no-claims impact." },

        { type: "h2", text: "The realistic timeline" },
        {
          type: "ul",
          items: [
            "Initial council acknowledgement: 5–10 working days.",
            "First response (usually Section 58): 4–8 weeks.",
            "FOI response: 20 working days.",
            "Escalation and second response: another 4–6 weeks.",
            "Total from incident to payout: 3–6 months for a successful claim.",
          ],
        },
        { type: "p", html: "Not fast, but genuine money for what's usually a genuine grievance. Most drivers give up at the first Section 58 letter. Don't." },
      ]}
      faqs={[
        { q: "How do I claim for pothole damage in the UK?", a: "Photograph the pothole with a scale reference, report it to the council or National Highways, get a written fitter's report and invoice, then submit a formal claim to the responsible highways authority." },
        { q: "How long do I have to claim for pothole damage?", a: "Legally, up to six years under contract law, but claims are much stronger if filed within a few weeks while the pothole is still there to be inspected." },
        { q: "What's Section 58 of the Highways Act?", a: "It's the council's statutory defence — they're not liable if they can show a reasonable inspection and repair regime. Defeat it with a Freedom of Information request showing the pothole was reported and not fixed in a reasonable timeframe." },
        { q: "Will my insurance go up if I claim for pothole damage?", a: "Only if you claim through your car insurance. Claiming directly from the council doesn't affect your insurance — that's the whole point." },
      ]}
      related={[
        { to: "/blog/cracked-alloy-from-pothole", label: "Cracked Alloy From Pothole" },
        { to: "/blog/tyre-bulge-sidewall-danger", label: "Tyre Bulge Sidewall Danger" },
        { to: "/blog/wheel-alignment-uk-guide", label: "Wheel Alignment Guide" },
      ]}
    />
  );
}
