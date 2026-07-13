import BlogPost from "@/components/blog/BlogPost";

export default function TyreAgeWhenToReplace() {
  return (
    <BlogPost
      slug="tyre-age-when-to-replace"
      metaTitle="Tyre Age: When To Replace Even With Good Tread (2026)"
      metaDesc="Tyres age even when they're not used. How to read the DOT date code, why 6-10 years is the safe upper limit, and what old tyres feel like."
      title="Tyre Age: When to Replace Even If the Tread Looks Fine"
      category="Legal"
      readMinutes={9}
      datePublished="2026-07-13"
      heroImage="tpms"
      intro="A tyre with 6mm of tread on a caravan or a low-mileage classic can still be dangerously old. Rubber degrades whether the wheel is turning or not, and every year adds risk regardless of the tread. Here's how to read tyre age, what the industry actually recommends, and when to replace even a perfect-looking tyre."
      blocks={[
        { type: "h2", text: "The DOT date code — where and how to read it" },
        { type: "p", html: "Every tyre made for sale in the UK carries a Department of Transportation (DOT) code on the sidewall. It looks like this: <code>DOT ABCD EF3823</code>. The last four digits are what matter — they're the week and year of manufacture. In this example, <strong>38</strong> is the week and <strong>23</strong> is the year: this tyre was built in week 38 of 2023, which is mid-September 2023." },
        { type: "p", html: "The DOT code is usually on the inner sidewall only (the side facing the car), so you may need to crouch and use a phone torch. If you can't see it on the outside, that's normal — check the other side of the wheel." },

        { type: "h2", text: "The industry recommendations" },
        { type: "p", html: "There's no UK law setting a maximum tyre age for cars. But the industry consensus is clear:" },
        {
          type: "ul",
          items: [
            "<strong>Michelin, Continental, Pirelli, Bridgestone:</strong> inspect annually after 5 years, replace at 10 years regardless of tread.",
            "<strong>British Rubber Manufacturers' Association (BRMA):</strong> tyres over 6 years should be inspected regularly by a qualified fitter.",
            "<strong>UK caravan and motorhome trade bodies:</strong> replace at 5–7 years due to load stress and static ageing.",
            "<strong>Public service vehicles (PSV — buses, coaches):</strong> tyres over 10 years are prohibited on the front axle by law since 2020.",
          ],
        },
        { type: "p", html: "The practical rule: <strong>replace car tyres at 6 years if they see regular use, 10 years absolute maximum</strong>. Motorhomes and caravans replace at 5–7 years. Vintage or barely-driven cars — the ones where the tread looks unused — are the highest risk group, not the lowest." },

        { type: "h2", text: "Why rubber ages" },
        { type: "p", html: "Tyres are made from a complex compound of natural and synthetic rubbers, carbon black, silica, oils and vulcanising agents. Three things degrade that compound over time:" },
        {
          type: "ul",
          items: [
            "<strong>Oxidation.</strong> Oxygen molecules bond with the rubber's polymer chains, gradually hardening them. It happens whether the tyre is used or not — sitting still can be worse because heat and flex don't refresh the surface oils.",
            "<strong>UV exposure.</strong> Sunlight breaks down the surface layer of rubber, producing the fine crazing pattern you see on old tyres.",
            "<strong>Ozone attack.</strong> Ozone in normal air attacks the sidewall, especially on tyres parked near electrical equipment (generators, refrigeration units, some workshops).",
          ],
        },
        { type: "p", html: "The result: over 6–10 years the rubber loses flexibility. Grip drops, especially in the wet. Sidewalls lose their ability to absorb kerb strikes without cracking. Cornering becomes vaguer. Braking distances lengthen." },

        { type: "h2", text: "The visual signs of an aged tyre" },
        {
          type: "ul",
          items: [
            "<strong>Fine cracking on the sidewall.</strong> Small parallel lines running around the sidewall, especially near the tread edge. \"Ozone crazing.\"",
            "<strong>Cracks in the tread grooves.</strong> Rubber pulling apart at the base of the tread pattern.",
            "<strong>Discolouration.</strong> Old tyres go from a deep black to a chalky grey-brown.",
            "<strong>Sidewall hardness.</strong> A new tyre sidewall gives slightly under thumb pressure. A 10-year-old tyre feels like plastic.",
            "<strong>Bulges near the sidewall-tread transition.</strong> Belt separation from age-related delamination.",
          ],
        },
        { type: "p", html: "Any two of these on the same tyre = replace. All five = don't drive the car until you have." },

        { type: "h2", text: "The specific case: buying a used car" },
        { type: "p", html: "Always check DOT codes on used-car tyres before you sign anything. A car with \"barely any wear\" might have original 2015 tyres — 10-year-old rubber that looks fine but performs like a wet bar of soap. Common on:" },
        {
          type: "ul",
          items: [
            "Low-mileage classics and weekend cars.",
            "Ex-fleet vehicles that lived in a car park for their first two years.",
            "\"One careful lady owner\" small city cars that did 20,000 miles in ten years.",
            "Motorhomes and caravans, especially with only one set of tyres in their history.",
          ],
        },
        { type: "p", html: "If the DOT is over 6 years, factor a full set of tyres into the purchase price — that's often £400–£800 you can knock off, or walk." },

        { type: "h2", text: "The spare wheel trap" },
        { type: "p", html: "Space-saver and full-size spares often stay in the boot for the life of the car. That means a 15-year-old car might have a 15-year-old spare wheel. It's fine sitting still, but the moment you actually need it — usually in the rain, on the motorway, at speed — a 15-year-old space-saver behaves nothing like a new one. Check the DOT on your spare. If it's over 10 years, replace it or price a new-condition secondhand one from a breaker." },

        { type: "h2", text: "How age interacts with tread" },
        { type: "p", html: "Two different problems, and you need to check both. A tyre with 6mm of tread and a 2015 DOT is unsafe. A tyre with 2mm of tread and a 2023 DOT is unsafe. Neither category cancels the other. The safe combination is <strong>at least 3mm of tread and under 6 years old</strong>." },

        { type: "h2", text: "What to do if your tyres are old but the tread looks good" },
        {
          type: "ol",
          items: [
            "Read the DOT on all five (four road, one spare).",
            "If any are 6–10 years, plan replacement within 12 months, or immediately if you tow, do motorway miles, or drive in the wet a lot.",
            "If any are 10+ years, replace now regardless of tread.",
            "Check the sidewalls in bright light for the crazing pattern — that's a replace-now signal on its own.",
            "Book a mobile fitter for the driveway — no reason to burn a Saturday morning on this.",
          ],
        },

        { type: "h2", text: "Storage matters more than most people think" },
        { type: "p", html: "If you take tyres off for winter or store a spare set, the difference between good and bad storage is easily 3–4 years of usable life. Keep them cool, dry, out of direct sunlight, away from ozone sources (fridges, electric motors), and either flat and stacked or hanging by the tread. Never lean a tyre against a heat source or store it under weight — flat-spotting is permanent." },
      ]}
      faqs={[
        { q: "How do I find the age of my tyre?", a: "Look for the DOT code on the sidewall. The last four digits are the week and year of manufacture — e.g. 3823 means week 38 of 2023." },
        { q: "How old is too old for a car tyre?", a: "Industry consensus is 6 years for annual inspection and 10 years absolute maximum, regardless of tread. Motorhomes and caravans replace at 5–7 years." },
        { q: "Is there a UK law on maximum tyre age?", a: "Only for public service vehicles (buses, coaches) — front-axle tyres over 10 years are prohibited. No specific age limit for cars, but a visibly aged tyre can still fail an MOT under the general safety criteria." },
        { q: "What happens if you drive on tyres that are 15 years old?", a: "Rubber becomes hard and brittle. Grip drops significantly in the wet, braking distances lengthen, and the risk of sidewall failure or belt separation at speed rises sharply." },
      ]}
      related={[
        { to: "/blog/uk-tyre-legal-tread-depth", label: "UK Legal Tread Depth" },
        { to: "/blog/tyre-pressure-guide-uk", label: "UK Tyre Pressure Guide" },
        { to: "/blog/all-season-vs-winter-tyres-uk", label: "All-Season vs Winter Tyres" },
      ]}
    />
  );
}
