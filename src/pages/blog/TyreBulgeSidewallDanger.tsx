import BlogPost from "@/components/blog/BlogPost";

export default function TyreBulgeSidewallDanger() {
  return (
    <BlogPost
      slug="tyre-bulge-sidewall-danger"
      metaTitle="Tyre Bulge on the Sidewall: How Dangerous & What To Do (2026)"
      metaDesc="A bulge on your tyre's sidewall means the internal cords are broken. Why it's a replace-now situation, how it happens, and what to do."
      title="Bulge on Your Tyre's Sidewall: The One That Ends Suddenly at 70mph"
      category="Safety"
      readMinutes={7}
      datePublished="2026-07-13"
      heroImage="tpms"
      intro="If you've found a bulge, blister or egg-shaped lump on the sidewall of one of your tyres, stop reading and get the car recovered or a mobile fitter to your location. Don't drive on it — not to work, not to the fitter, not around the corner. A sidewall bulge is one of the very few tyre issues where the failure mode is a full sidewall rupture with no warning at any speed."
      blocks={[
        { type: "h2", text: "What a bulge actually is" },
        { type: "p", html: "A tyre's sidewall is a woven cord structure — usually polyester and steel — encased in rubber. Those cords are what contain the air pressure and give the tyre its structural strength. When the sidewall takes a hard impact (pothole, high-speed kerb strike, running over a badly-shaped speed bump), the internal cords can snap while the outer rubber remains intact." },
        { type: "p", html: "Air pressure then pushes outward against nothing but the outer rubber, and the rubber balloons outward into a visible dome — the bulge. It might be tennis-ball sized, or barely a raised lip. It doesn't matter. The structural integrity of the tyre in that spot is gone." },

        { type: "h2", text: "Why bulges rupture without warning" },
        { type: "p", html: "A slow puncture gives you hours or days of notice. A worn-out tread gives you months. A sidewall bulge gives you nothing. The outer rubber is elastic, and it can hold pressure for a while — an hour, a day, sometimes a couple of weeks — but the failure, when it comes, is a sudden violent tear. There is no whistle, no smell, no gradual softening. One moment the tyre is up, the next it's shredded." },
        { type: "p", html: "That's why a bulge at motorway speed is so dangerous. A front-tyre sidewall rupture at 70 mph on a heavy car can pull the steering hard in the failed tyre's direction, and if the driver overcorrects, put the car across two lanes in under a second." },

        { type: "h2", text: "The common causes" },
        {
          type: "ul",
          items: [
            "<strong>Pothole strikes.</strong> The single most common cause. Deep-edged potholes at any speed above 20 mph can snap sidewall cords, especially if pressures are low.",
            "<strong>Kerb hits.</strong> A hard mount over a kerb — particularly at speed or an angle — pinches the sidewall between the alloy rim and the kerb edge.",
            "<strong>High-speed impacts on speed cushions and bumps.</strong> The corners of a poorly-designed speed cushion can catch the sidewall.",
            "<strong>Under-inflation.</strong> A tyre running 20% low on pressure at motorway speed builds enough sidewall heat to fail the cords without any impact at all. See our <a href=\"/blog/tyre-pressure-guide-uk\" class=\"text-primary hover:underline\">pressure guide</a>.",
            "<strong>Manufacturing defect.</strong> Rare, but does happen — usually shows up in the first few hundred miles.",
            "<strong>Overloading.</strong> Van and 4×4 tyres run over their load rating can bulge even without an impact.",
          ],
        },

        { type: "h2", text: "The (very short) diagnostic checklist" },
        {
          type: "ol",
          items: [
            "Look at both sidewalls with a phone torch (steering on full lock helps expose them).",
            "Run your hand around the whole sidewall. Bulges are usually easier to feel than to see.",
            "Any raised area, dome, egg-shape or ridge = bulge. Yes, replace.",
            "Check the alloy for corresponding damage — pothole hits often bend the rim too. See our <a href=\"/blog/cracked-alloy-from-pothole\" class=\"text-primary hover:underline\">cracked alloy guide</a>.",
            "If bulge is confirmed, do not drive. Call a mobile fitter or recovery.",
          ],
        },

        { type: "h2", text: "Can a bulged tyre be repaired?" },
        { type: "p", html: "No, under any circumstances. British Standard BS AU 159 forbids any sidewall repair. Any \"fitter\" who tells you they can patch it, plug it, seal it, or grind it flat is lying. The tyre is scrap. Nothing you can do to it makes it safe again." },

        { type: "h2", text: "Do you need to replace one tyre or two?" },
        { type: "p", html: "You always need to replace the bulged tyre. Whether you need to replace its pair depends on:" },
        {
          type: "ul",
          items: [
            "<strong>Tread depth of the remaining tyre on that axle.</strong> If the surviving tyre has more than about 2mm difference in tread depth from the new one, replacing in pairs is strongly recommended — different grip levels on the same axle affect braking and handling.",
            "<strong>Whether it's a 4WD/AWD car.</strong> Some AWD systems (Subaru, some Audi Quattro variants) require all four tyres within 3mm of each other or the differential wears out. Check your handbook.",
            "<strong>Whether the surviving tyre is also aged.</strong> If both were fitted at the same time and are over 5 years old, replace both.",
          ],
        },

        { type: "h2", text: "How to prevent bulges" },
        {
          type: "ul",
          items: [
            "Keep pressures correct — under-inflation is the leading contributor to sidewall failure.",
            "Slow down over potholes if you can't avoid them. Braking through a pothole is worse than rolling through it (weight transfers forward, hits the front tyre harder).",
            "Take kerbs slowly and at 90° when parking — angling into them at speed is what pinches the sidewall.",
            "Watch load ratings if you tow or run a heavy van.",
            "Get 4-wheel alignment done after significant impacts, even if the tyre didn't bulge on the day. See our <a href=\"/blog/wheel-alignment-uk-guide\" class=\"text-primary hover:underline\">alignment guide</a>.",
          ],
        },

        { type: "h2", text: "Claiming for pothole damage" },
        { type: "p", html: "If the bulge is from a specific pothole, you can claim from the local council or National Highways — see our <a href=\"/blog/pothole-damage-claim-uk\" class=\"text-primary hover:underline\">pothole claim guide</a>. Photograph the pothole, note the location, and keep the invoice for the replacement tyre." },

        { type: "h2", text: "TL;DR" },
        {
          type: "ul",
          items: [
            "Bulge = broken internal cords, air held back by rubber only.",
            "Can rupture at any moment, especially at motorway speed.",
            "Never repairable — new tyre only.",
            "Don't drive on it. Get mobile fit or recovery.",
            "Consider replacing in pairs if the other tyre on that axle is significantly worn.",
          ],
        },
      ]}
      faqs={[
        { q: "Is it safe to drive with a bulge in my tyre?", a: "No. A sidewall bulge means the internal cords have broken and only the outer rubber is holding pressure. It can rupture without warning at any speed. Don't drive — get recovery or a mobile fitter." },
        { q: "Can a tyre bulge be repaired?", a: "No. British Standard BS AU 159 forbids any sidewall repair. The tyre must be replaced." },
        { q: "How long can I drive on a tyre with a bulge?", a: "You shouldn't drive on it at all. There's no safe distance or speed. The failure mode is a sudden rupture with no warning." },
        { q: "Do I need to replace both tyres if one has a bulge?", a: "Always replace the bulged tyre. Replace the pair if the other tyre has significantly less tread, if you have an AWD car with matched-tyre requirements, or if both are over 5 years old." },
      ]}
      related={[
        { to: "/blog/tyre-sidewall-damage-guide", label: "Sidewall Damage Guide" },
        { to: "/blog/cracked-alloy-from-pothole", label: "Cracked Alloy From Pothole" },
        { to: "/blog/pothole-damage-claim-uk", label: "Pothole Damage Claim UK" },
      ]}
    />
  );
}
