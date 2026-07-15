import BlogPost from "@/components/blog/BlogPost";

export default function PunctureRepairVsNewTyre() {
  return (
    <BlogPost
      slug="puncture-repair-vs-new-tyre"
      metaTitle="Puncture Repair vs New Tyre: When Each Makes Sense (2026)"
      metaDesc="Puncture repair vs new tyre — the honest UK decision framework. Tread depth thresholds, tyre age, matching pairs, run-flat rules, and the real cost per mile."
      title="Puncture Repair vs New Tyre: When Each One Actually Makes Sense"
      category="Decision Guide"
      readMinutes={8}
      datePublished="2026-07-15"
      heroImage="punctureVsNewTyre"
      intro="Repair a £45 puncture on a tyre worth £120 with 4mm of tread — obvious. But what about 3mm of tread and a five-year-old tyre? What about a run-flat, or a matched premium pair? Here's the decision framework mobile fitters actually use in the UK in 2026."
      blocks={[
        { type: "h2", text: "The short version" },
        {
          type: "ul",
          items: [
            "<strong>Tread 4mm+, tyre under 5 years, central puncture:</strong> repair",
            "<strong>Tread 3–4mm, tyre 4–6 years:</strong> repair if the other tyres on the axle are similar; replace if this is your last old tyre",
            "<strong>Tread under 3mm:</strong> replace",
            "<strong>Tyre over 7 years, any condition:</strong> replace",
            "<strong>Sidewall or shoulder damage:</strong> replace, no exceptions",
            "<strong>Run-flat driven on flat:</strong> replace",
          ],
        },

        { type: "h2", text: "The five factors that decide" },
        { type: "h3", text: "1. Remaining tread depth" },
        { type: "p", html: "UK legal minimum is <strong>1.6mm</strong>. Safe braking distance in the wet drops sharply below 3mm. Practical thresholds:" },
        {
          type: "ul",
          items: [
            "<strong>7mm+ (new):</strong> obviously repair",
            "<strong>5–6mm:</strong> repair. You've got 30,000+ miles left.",
            "<strong>4mm:</strong> repair. About half the tyre's useful life remaining.",
            "<strong>3mm:</strong> borderline. Repair if the rest of the axle matches; replace if it doesn't.",
            "<strong>2mm:</strong> replace. You'll be back for the tyre in 3–6 months anyway.",
            "<strong>Under 1.6mm:</strong> illegal — replace, and you should have replaced sooner",
          ],
        },
        { type: "h3", text: "2. Tyre age" },
        { type: "p", html: "Rubber degrades regardless of use. Check the four-digit DOT code on the sidewall: <strong>1224</strong> means week 12 of 2024. Rules:" },
        {
          type: "ul",
          items: [
            "<strong>Under 4 years:</strong> age not a factor",
            "<strong>4–6 years:</strong> repair still fine; consider whether to replace on wear grounds",
            "<strong>6–7 years:</strong> lean towards replacement even if repairable",
            "<strong>Over 7 years:</strong> replace regardless — most manufacturers do not warrant a repair on tyres this age",
          ],
        },
        { type: "h3", text: "3. Position on the car" },
        { type: "p", html: "For most modern cars with disc brakes and electronic stability control, position matters more than it used to:" },
        {
          type: "ul",
          items: [
            "<strong>Front axle:</strong> takes most steering, braking, and (on FWD) driving load. Wear differences matter more here.",
            "<strong>Rear axle:</strong> lower load. Small wear mismatch is tolerable.",
            "<strong>New tyres go on the rear</strong> in the UK by convention — better rear grip prevents oversteer",
          ],
        },
        { type: "h3", text: "4. The other tyre on the axle" },
        { type: "p", html: "If replacing, most modern cars benefit from a <strong>matched pair per axle</strong>:" },
        {
          type: "ul",
          items: [
            "<strong>4WD/AWD:</strong> often need all four the same make/model/wear — check owner's manual",
            "<strong>Performance cars with staggered wheels:</strong> tyres often can't be rotated; match per axle",
            "<strong>Standard front-drive hatchback:</strong> matched pair per axle preferred but not mandatory",
          ],
        },
        { type: "h3", text: "5. Value of the tyre" },
        { type: "p", html: "A £45 repair on a £320 run-flat tyre with 4mm of tread is obviously worth doing. A £45 repair on a £75 budget tyre with 2mm of tread is not — replace." },

        { type: "h2", text: "The economic argument, done properly" },
        { type: "p", html: "Think in <strong>cost per mile of remaining tyre life</strong>, not absolute cost." },
        { type: "p", html: "Example 1: Repair £45 on a tyre with 30,000 miles of life left = <strong>0.15p/mile</strong>. Excellent value." },
        { type: "p", html: "Example 2: Repair £45 on a tyre with 3,000 miles of life left = <strong>1.5p/mile</strong>. Then buy a new tyre for £120 lasting 30,000 miles = <strong>0.4p/mile</strong> total for the sequence. Just replace." },
        { type: "p", html: "Example 3: Replace £120 immediately on a tyre with 3,000 miles left = <strong>0.4p/mile</strong>. Cheaper than the repair-then-replace path above by £45." },

        { type: "h2", text: "When \"replace both on the axle\" is real vs upsell" },
        { type: "p", html: "Fast-fit chains often insist on replacing tyres in pairs. Sometimes it's genuine, sometimes it's an upsell. The honest test:" },
        {
          type: "ul",
          items: [
            "<strong>Wear difference under 2mm:</strong> single replacement is fine",
            "<strong>Wear difference 2–3mm:</strong> matched pair recommended for front axle, optional for rear",
            "<strong>Wear difference 3mm+:</strong> matched pair for safety",
            "<strong>AWD/4WD:</strong> always check the owner's manual — some really do need all four",
          ],
        },

        { type: "h2", text: "Run-flat: the special case" },
        { type: "p", html: "Run-flats push the decision toward replacement more often because:" },
        {
          type: "ul",
          items: [
            "Manufacturers officially advise against repair",
            "Internal cord damage from driving flat is invisible externally",
            "New run-flats are 30–50% more expensive than standard — the price of a mistake is higher",
            "Insurance may not cover a subsequent blowout on a repaired run-flat",
          ],
        },
        { type: "p", html: "If you have a BMW, Mini, or Mercedes with staggered run-flats and the punctured tyre has been driven flat for more than a mile: <strong>replace, and consider matching the pair</strong>." },

        { type: "h2", text: "The five-question decision test" },
        {
          type: "ol",
          items: [
            "Is the puncture in the central tread (not sidewall or shoulder)? If no: <strong>replace</strong>.",
            "Is the tread depth above 3mm? If no: <strong>replace</strong>.",
            "Is the tyre under 6 years old? If no: <strong>replace</strong>.",
            "Was the tyre driven any real distance flat? If yes: <strong>replace</strong>.",
            "Is it a run-flat with unknown flat-driving history? If yes: <strong>replace</strong>.",
          ],
        },
        { type: "p", html: "Five \"good\" answers = repair. Any one \"bad\" answer = strongly consider replacement." },

        { type: "h2", text: "The bottom line" },
        { type: "p", html: "Most punctures in the UK — probably 65–70% — are repairable and it's the right call. About 20% are technically repairable but on tyres so worn or old that replacement is genuinely cheaper per mile. The remaining 10–15% are non-repairable by BS AU 159 rules. A good mobile fitter will show you the tyre, the tread depth, and the puncture location before deciding — and take your input, not just tell you what you're buying." },
      ]}
      faqs={[
        { q: "Should I repair a puncture or buy a new tyre?", a: "Repair if tread is 4mm+, tyre is under 6 years old, and the puncture is in the central tread. Replace if any of those fail or the tyre is a run-flat driven on flat." },
        { q: "Do I need to replace both tyres on the axle if one is punctured?", a: "Not usually. Only if the wear difference between the two would be more than 2–3mm, or on AWD/4WD cars where the manual specifies matched sets." },
        { q: "Is it cheaper to repair or replace?", a: "Repair is £45–£65; replacement is £95–£320+. Repair per remaining mile is almost always cheaper unless the tyre is nearly worn out already." },
        { q: "Can you repair a nearly-new tyre?", a: "Absolutely — new tyres benefit most from repair because you preserve 100% of the useful life for £45." },
      ]}
      cta={{ headline: "Not sure — repair or replace?", body: "Send us the tyre size, the tread depth (or photo of a coin in the groove), and where the puncture is. We'll give you an honest recommendation before the van leaves.", label: "Get an honest quote →" }}
      related={[
        { to: "/blog/can-a-puncture-be-repaired-uk", label: "Can Any Puncture Be Repaired?" },
        { to: "/blog/puncture-repair-cost-uk", label: "Puncture Repair Cost UK" },
        { to: "/blog/uk-tyre-legal-tread-depth", label: "UK Legal Tread Depth" },
      ]}
    />
  );
}
