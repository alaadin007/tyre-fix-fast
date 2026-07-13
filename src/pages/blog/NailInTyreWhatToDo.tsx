import BlogPost from "@/components/blog/BlogPost";

export default function NailInTyreWhatToDo() {
  return (
    <BlogPost
      slug="nail-in-tyre-what-to-do"
      metaTitle="Nail In Tyre: What To Do (Leave It In or Pull It Out?) 2026"
      metaDesc="Nail or screw in your tyre? Leave it in, check the location, and get a proper plug-patch. UK guide to nail-in-tyre repair vs replace."
      title="Nail in Your Tyre: Leave It In, and Read This First"
      category="Safety"
      readMinutes={8}
      datePublished="2026-07-13"
      heroImage="tpms"
      intro="A nail or screw in your tyre isn't automatically a new-tyre situation. Most punctures in the tread area can be properly repaired for £25–£40 if handled correctly. The wrong first move — pulling the nail out yourself — can turn a £30 fix into a £180 replacement. Here's what to do in the right order."
      blocks={[
        { type: "h2", text: "Step 1: Don't pull it out" },
        { type: "p", html: "This is the single most important rule. If a nail or screw is in your tyre and the tyre is still holding air, <strong>leave the object in place</strong>. It's acting as a plug. Pulling it out turns a slow leak (which you can drive on carefully) into a rapid deflation (which you can't) and can also complicate the repair by pulling internal cords out of place." },

        { type: "h2", text: "Step 2: Check the location" },
        { type: "p", html: "Only punctures in the tread area — the middle 75% of the tyre's width — can be repaired under British Standard BS AU 159. Anything on the shoulder or sidewall is non-repairable. Take a quick look:" },
        {
          type: "ul",
          items: [
            "<strong>In the main tread grooves or between them:</strong> repairable, in almost all cases.",
            "<strong>On the shoulder (the outer edge of the tread pattern where it meets the sidewall):</strong> non-repairable.",
            "<strong>On the sidewall:</strong> non-repairable, and unsafe to drive on. See our <a href=\"/blog/tyre-sidewall-damage-guide\" class=\"text-primary hover:underline\">sidewall damage guide</a>.",
          ],
        },

        { type: "h2", text: "Step 3: Check the pressure" },
        { type: "p", html: "If the tyre is still at or near the correct pressure and the object is small (nail, screw, small tack), you can drive to a fitter at low speed (under 40 mph) and short distance (under 5 miles). Check pressure again before setting off — if it's dropping by more than 3–5 PSI over 10 minutes, don't drive on it. Call a mobile fitter to the location or get the car recovered." },
        { type: "p", html: "If the tyre is already flat, don't drive on it even a few hundred yards — you'll destroy the sidewall from within seconds of moving. Fit the spare (if there is one), inflate with a repair kit (as a temporary get-home only), or call a mobile fitter." },

        { type: "h2", text: "Step 4: Get a proper plug-patch, not just a plug" },
        { type: "p", html: "There are three levels of puncture \"repair\" and only one is legal for road use:" },
        {
          type: "ul",
          items: [
            "<strong>External plug only (\"string plug\" or rope plug):</strong> pushed in from the outside without removing the tyre. Not compliant with BS AU 159. Fine as a get-you-home fix on remote roads; not a permanent repair.",
            "<strong>Sealant / gunk:</strong> the goo from a manufacturer's repair kit. Not a repair — a one-time temporary measure to get you off the motorway. The tyre must be professionally repaired or replaced within 50 miles / 24 hours.",
            "<strong>Internal mushroom plug-patch:</strong> the only repair method compliant with the UK standard. The tyre is removed from the wheel, the damage is inspected from the inside, buffed, and a combined plug-patch is vulcanised in. £25–£40. This is what a proper mobile fitter or tyre bay will do.",
          ],
        },
        { type: "p", html: "If a fitter offers a £10 external plug and says \"you'll be fine\", you probably will be — but you're driving on a technically non-compliant tyre, and if it fails at motorway speed, insurance and MOT will both take a view. Pay the extra £15 and get it done properly." },

        { type: "h2", text: "Step 5: When repair isn't possible even in the tread area" },
        {
          type: "ul",
          items: [
            "<strong>Puncture hole larger than 6mm.</strong> Beyond the standard's limit.",
            "<strong>Multiple punctures close together</strong> (within 40cm of each other).",
            "<strong>Tread depth below 3mm</strong> in the repair area — a repaired tyre needs to give the plug enough life to justify the work.",
            "<strong>Tyre run flat any distance.</strong> A tyre driven flat for even a mile is internally cooked; the inner liner separates and won't accept a repair.",
            "<strong>Age.</strong> Some fitters won't repair tyres over 6 years old, and none should repair over 10.",
            "<strong>Sidewall bulge or damage elsewhere.</strong> One issue disqualifies the whole tyre.",
          ],
        },

        { type: "h2", text: "How much does a nail-in-tyre repair cost in the UK in 2026?" },
        {
          type: "ul",
          items: [
            "<strong>Mobile fitter internal plug-patch (to your driveway/office):</strong> £30–£45",
            "<strong>Tyre bay internal plug-patch:</strong> £20–£35",
            "<strong>Emergency external plug (get-you-home only):</strong> £10–£15 (don't use as permanent)",
            "<strong>Replacement tyre if unrepairable:</strong> £80–£280 depending on size and brand",
          ],
        },

        { type: "h2", text: "\"But it's been like that for months and it's fine\"" },
        { type: "p", html: "A common story from customers. A screw picked up months ago, tyre topping up on a slow leak, TPMS light nudged out with a top-up every few weeks. Two problems with this:" },
        {
          type: "ol",
          items: [
            "The moisture that's been getting in around the screw is rusting the internal steel belts. Six months in, the tyre may not be repairable even though it looks fine — the internal damage disqualifies it.",
            "The under-inflation from constant slow leaks has been wearing the shoulders faster than the rest of the tyre, and possibly damaging the sidewall structurally from heat.",
          ],
        },
        { type: "p", html: "Deal with punctures within days, not months. It's cheaper." },

        { type: "h2", text: "The specific case: run-flat tyres" },
        { type: "p", html: "Manufacturer policy on run-flat tyre repair is fragmented. Some brands (Bridgestone, Michelin) permit repair on run-flats that haven't been driven on flat. Others (Pirelli, Continental) forbid repair on their run-flats regardless. Check the sidewall for the run-flat marking (RFT, SSR, ZP, RunOnFlat, etc.) and either check the brand's official policy or default to replacement. Run-flats also cost more, so getting the right answer matters." },

        { type: "h2", text: "TL;DR" },
        {
          type: "ul",
          items: [
            "Don't pull the nail out.",
            "Check location — tread area = usually repairable, shoulder/sidewall = replace.",
            "Drive slowly and briefly to a fitter, or call mobile to your location.",
            "Insist on internal plug-patch, not a string plug.",
            "Get it done within days, not weeks.",
          ],
        },
      ]}
      faqs={[
        { q: "Should I pull the nail out of my tyre?", a: "No. Leave it in — it's acting as a plug. Pulling it out turns a slow leak into a rapid deflation and can damage the internal cords." },
        { q: "Can I drive with a nail in my tyre?", a: "If the tyre is still holding pressure and the nail is in the tread area (not the shoulder or sidewall), you can drive short distances at low speed to a fitter. Check pressure first. Don't drive on a flat tyre." },
        { q: "How much does it cost to repair a nail in a tyre in the UK?", a: "£20–£45 for a proper internal plug-patch. If a fitter offers a £10 external string plug, that's not compliant with BS AU 159 — pay the extra for the correct repair." },
        { q: "Can any nail-in-tyre be repaired?", a: "No. Punctures over 6mm, on the shoulder or sidewall, or on tyres driven flat, older than 10 years, or with tread below 3mm cannot be repaired. Location and condition decide it." },
      ]}
      related={[
        { to: "/blog/slow-puncture-uk-guide", label: "Slow Puncture Guide" },
        { to: "/blog/tyre-sidewall-damage-guide", label: "Sidewall Damage Guide" },
        { to: "/blog/can-i-drive-on-a-flat-tyre-uk", label: "Can I Drive on a Flat Tyre?" },
      ]}
    />
  );
}
