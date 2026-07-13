import BlogPost from "@/components/blog/BlogPost";

export default function TyreSidewallDamageGuide() {
  return (
    <BlogPost
      slug="tyre-sidewall-damage-guide"
      metaTitle="Tyre Sidewall Damage: Repairable or Replace? (2026)"
      metaDesc="UK guide to sidewall damage — cuts, bulges, kerb rash, cracks. What's repairable, what's not, and what BS AU 159 says about it."
      title="Tyre Sidewall Damage: What's Repairable and What's a Replace-Now"
      category="Safety"
      readMinutes={9}
      datePublished="2026-07-13"
      heroImage="tpms"
      intro="Sidewall damage is the one category of tyre problem where there's very little grey area. The tread you can repair. The sidewall you almost always can't. Here's the plain-English rule set — what to look for, what BS AU 159 (the UK repair standard) says, and when you're driving on a bomb."
      blocks={[
        { type: "h2", text: "Why the sidewall is different from the tread" },
        { type: "p", html: "The tread is a rigid, reinforced structure — layers of steel and polyester belts under a thick rubber cap, all backed against a road that supports it. Damage to the tread has geometry on its side: the belts contain and reinforce a small puncture, and a proper mushroom-plug patch bonds directly to the inner liner." },
        { type: "p", html: "The sidewall has none of that. It's a thin, flexible structure of woven cords in rubber, designed to flex thousands of times a minute as the tyre rotates and absorbs road impacts. There's no backing surface, no rigid cap. Any repair patch you glue to it will flex too — until it separates. That's why the British Standard, tyre manufacturers, and every reputable fitter say the same thing: <strong>sidewall damage means a new tyre</strong>." },

        { type: "h2", text: "The BS AU 159 rule (what UK fitters actually follow)" },
        { type: "p", html: "British Standard BS AU 159 defines the \"minor repair area\" of a tyre — the crown of the tread across the middle 75% of the tread width. Damage inside that area, up to 6mm diameter, on a tyre with sufficient remaining tread and no other issues, can be plug-patch repaired from inside." },
        { type: "p", html: "Damage <em>outside</em> that area — including the shoulder and any part of the sidewall — is <strong>non-repairable, full stop</strong>. Any fitter offering to plug a sidewall for you is breaching the standard and gambling with your life. Walk out." },

        { type: "h2", text: "Category 1: Sidewall bulges (replace now, don't drive)" },
        { type: "p", html: "A bulge or blister on the sidewall means the internal cords have broken — usually from a pothole strike or kerb hit. Air pressure is now being held back by nothing but the outer rubber. Bulges rupture with no warning, often at motorway speed, and the failure is violent." },
        { type: "p", html: "If you see a bulge, don't drive to the fitter. Get the car recovered, or call a mobile fitter to the driveway. See our <a href=\"/blog/tyre-bulge-sidewall-danger\" class=\"text-primary hover:underline\">bulge-specific guide</a> for more." },

        { type: "h2", text: "Category 2: Sidewall cuts and gouges (usually replace)" },
        { type: "p", html: "Anything sharp on the road — kerb edges, broken glass, metal debris — can gouge the sidewall. The rule of thumb: if the cut goes deep enough to expose the cord layer (usually a lighter beige or white material under the black rubber), the tyre is scrap. If it's a superficial rubber scuff with no cord visible, the tyre is usually fine to keep." },
        { type: "p", html: "The test: press either side of the cut with your thumbs. If any air escapes or the cut opens to reveal cord, it's a replace." },

        { type: "h2", text: "Category 3: Kerb rash and sidewall abrasion" },
        { type: "p", html: "Cosmetic kerb rash on the sidewall — the fine scuffing from parallel-parking against a kerb — is rarely structural. The rubber is soft on the outer surface, and light scuffing just removes a bit of that surface layer without touching the cords underneath. Ugly, but not dangerous." },
        { type: "p", html: "The line to worry about: if the rash goes deep enough to leave a raised lip or expose lighter-coloured cord, treat it as a gouge (Category 2). Also inspect the alloy — hard kerb hits often damage both." },

        { type: "h2", text: "Category 4: Sidewall cracking (age or ozone)" },
        { type: "p", html: "Fine parallel lines running around the sidewall are the hallmark of aged rubber. Ozone in normal air combined with UV exposure breaks down the surface compound, causing the crazing. If the cracks are surface-only, monitor. If any crack exceeds 2mm in depth or you can see cord through it, replace. Sidewall cracking is a classic indicator that <strong>all four tyres are due for replacement</strong> — the whole set has aged together. See our <a href=\"/blog/tyre-age-when-to-replace\" class=\"text-primary hover:underline\">tyre age guide</a>." },

        { type: "h2", text: "Category 5: Impact ruptures (replace now, don't drive)" },
        { type: "p", html: "Sometimes a pothole splits the sidewall clean open — a slit or star-shaped tear. The tyre may still hold air for a while as the internal liner keeps things together, but it's not going to last. Impact ruptures are non-repairable and unsafe. Recover or mobile-fit only, never drive." },

        { type: "h2", text: "The specific case: nail or screw in the sidewall" },
        { type: "p", html: "It happens rarely because sidewalls don't usually contact debris on the road, but it does happen (bricks in the road, workshop screws in the car park). Any puncturing object in the sidewall means the tyre is scrap, even if the object is still in place and holding air. Don't remove it — recover the car or call a mobile fitter." },

        { type: "h2", text: "How to inspect your own sidewalls" },
        {
          type: "ol",
          items: [
            "Turn the steering to full lock so each front tyre swings out — this exposes both the outer and (a lot of) the inner sidewall.",
            "Use a phone torch. Sidewall damage often hides in the shadow of the wheel arch.",
            "Run your hand slowly around the whole sidewall — feel for bulges, ridges, or raised areas. Your fingertips find these before your eyes do.",
            "Look at the shoulder — the transition from sidewall to tread. Damage often starts here after a kerb hit.",
            "Repeat on the inside sidewall — this is where you'll find damage from potholes and mid-road debris. It's the one most drivers never check.",
          ],
        },

        { type: "h2", text: "Insurance and warranty" },
        { type: "p", html: "Comprehensive car insurance sometimes covers pothole and vandalism damage to tyres, but most policies exclude tyres by default. Check for a \"tyre and alloy\" add-on if you commute on poor roads. Manufacturer tyre warranties cover manufacturing defects only, not impact or road-hazard damage. Some premium tyres (Michelin, Continental) sell a road-hazard warranty at time of purchase for around 3–5% of the tyre price — worth considering for expensive fitments." },
      ]}
      faqs={[
        { q: "Can a sidewall puncture be repaired?", a: "No. British Standard BS AU 159 restricts repairs to the middle 75% of the tread. Sidewall damage of any kind means the tyre is scrap." },
        { q: "Is a bulge on the sidewall dangerous?", a: "Yes — a bulge means the internal cords have broken and only the outer rubber is holding pressure. Bulges rupture without warning, often at motorway speed. Recover the car; don't drive on it." },
        { q: "Is kerb rash on the sidewall dangerous?", a: "Superficial scuffing that only affects the outer rubber is cosmetic. Damage deep enough to expose the cord layer or leave a raised lip is a replace." },
        { q: "Are cracks on my sidewall dangerous?", a: "Fine surface crazing is age-related and worth monitoring; cracks deeper than 2mm or that expose cord mean replace. Widespread crazing usually indicates the whole set is due." },
      ]}
      related={[
        { to: "/blog/tyre-bulge-sidewall-danger", label: "Tyre Bulge Sidewall Danger" },
        { to: "/blog/tyre-age-when-to-replace", label: "Tyre Age Guide" },
        { to: "/blog/slow-puncture-uk-guide", label: "Slow Puncture Guide" },
      ]}
    />
  );
}
