import BlogPost from "@/components/blog/BlogPost";

export default function TyrePressureGuideUk() {
  return (
    <BlogPost
      slug="tyre-pressure-guide-uk"
      metaTitle="UK Tyre Pressure Guide: Correct PSI & Cold Check (2026)"
      metaDesc="How to set the right tyre pressure for your car in the UK — where to find the correct PSI, the laden vs unladen figures, and the cold check rule."
      title="UK Tyre Pressure Guide: Correct PSI, Cold Checks and the Laden Rule"
      category="Maintenance"
      readMinutes={9}
      datePublished="2026-07-13"
      heroImage="tpms"
      intro="Correct tyre pressure is the single cheapest thing you can do to make your car safer, more efficient and longer-lived — and about 60% of UK drivers get it wrong. This guide covers where to find the right number, how to check it properly, and the difference between the everyday and the loaded pressure."
      blocks={[
        { type: "h2", text: "Where to find your correct tyre pressure" },
        { type: "p", html: "Two places, and only two. Ignore what's printed on the sidewall of the tyre — that's the <em>maximum</em> the tyre can safely hold, not the pressure your car should run at." },
        {
          type: "ol",
          items: [
            "<strong>Driver's door jamb sticker.</strong> Open the driver's door and look at the B-pillar or the door edge. A white or black sticker lists the recommended cold pressures for the OE tyre sizes, typically with separate figures for \"normal load\" and \"full load\".",
            "<strong>Fuel filler flap or owner's handbook.</strong> Many European brands print pressures inside the fuel-filler flap. All handbooks list them under \"wheels and tyres\".",
          ],
        },
        { type: "p", html: "If the car has been fitted with different-size tyres from stock (e.g. winter wheels or aftermarket alloys), use the tyre manufacturer's load-inflation table for the new size — a good fitter will supply the correct figure on request." },

        { type: "h2", text: "The units: PSI, bar, kPa" },
        { type: "p", html: "The UK uses <strong>PSI</strong> (pounds per square inch) as the everyday unit, but many European cars list pressures in <strong>bar</strong> or <strong>kPa</strong>. Quick conversion:" },
        {
          type: "ul",
          items: [
            "1 bar = 14.5 PSI = 100 kPa",
            "2.2 bar ≈ 32 PSI ≈ 220 kPa (typical family car front)",
            "2.5 bar ≈ 36 PSI ≈ 250 kPa (typical family car rear, or laden)",
          ],
        },

        { type: "h2", text: "Cold vs hot: the check rule that gets ignored" },
        { type: "p", html: "All manufacturer pressures are quoted <strong>cold</strong> — meaning the car has been parked for at least three hours, or driven less than a mile at low speed. A tyre that's been driven for 20 minutes reads 3–5 PSI higher than its cold pressure due to heat. If you check at a warm petrol station forecourt after a 15-minute drive, you'll set the pressure too low." },
        { type: "p", html: "The practical fix: check pressures first thing in the morning on your driveway, or add 3 PSI to the recommended figure if you have to check warm. Better still, buy a £15 digital gauge and check cold at home." },

        { type: "h2", text: "Normal load vs full load" },
        { type: "p", html: "Nearly every UK car has two sets of pressures on the door sticker. The higher \"full load\" figures apply when:" },
        {
          type: "ul",
          items: [
            "You have 4+ occupants and a boot full of luggage.",
            "You're towing.",
            "You're on a long motorway trip at sustained high speed.",
            "The car has a roof-box or roof-mounted bikes.",
          ],
        },
        { type: "p", html: "Running normal-load pressures with a fully laden car overheats the sidewalls, wears the outer edges of the tread, and — at motorway speeds in summer — is a leading cause of holiday blowouts. Before every long trip, reset to the higher figure. It takes two minutes." },

        { type: "h2", text: "The under-inflation problem" },
        { type: "p", html: "Under-inflation is more common than over-inflation and does more damage:" },
        {
          type: "ul",
          items: [
            "<strong>Fuel economy drops.</strong> A tyre at 24 PSI instead of 32 PSI costs roughly 3–5% in miles per gallon.",
            "<strong>Wear pattern changes.</strong> The outer edges of the tread wear faster than the centre, cutting tyre life by up to 30%.",
            "<strong>Sidewall heat rises.</strong> Continuous flexing generates heat until the sidewall cords delaminate — the classic under-inflation blowout.",
            "<strong>Handling degrades.</strong> Steering feels vague, lane changes feel unstable, cornering grip drops.",
            "<strong>EV range drops.</strong> An EV on 10% low pressure loses about 3–5% of its range immediately.",
          ],
        },

        { type: "h2", text: "The over-inflation problem" },
        { type: "p", html: "Less common but also expensive:" },
        {
          type: "ul",
          items: [
            "<strong>Centre-tread wear.</strong> Only the middle of the tread contacts the road properly.",
            "<strong>Reduced grip.</strong> Smaller contact patch = less traction, especially in the wet.",
            "<strong>Harsher ride.</strong> Sidewall flex is what absorbs small road imperfections.",
            "<strong>Higher pothole damage risk.</strong> A rigid tyre transfers more impact directly to the alloy.",
          ],
        },

        { type: "h2", text: "How often to check" },
        {
          type: "ul",
          items: [
            "<strong>Monthly minimum</strong> — a slow puncture can lose 5 PSI in a fortnight without visible signs.",
            "<strong>Before every long trip</strong> — especially if you'll be laden.",
            "<strong>After a temperature swing</strong> — pressure drops about 1 PSI for every 5°C drop in temperature. A cold snap in November will drop most cars' tyres 3–5 PSI overnight.",
            "<strong>Whenever the TPMS light comes on</strong> — even if it goes off again. See our <a href=\"/blog/tpms-warning-light\" class=\"text-primary hover:underline\">TPMS guide</a>.",
          ],
        },

        { type: "h2", text: "The petrol station forecourt vs a home gauge" },
        { type: "p", html: "Forecourt air machines are convenient but inaccurate. A study by Which? in 2023 found nearly a third of UK petrol station gauges read 2 PSI or more out. A £15 digital tyre pressure gauge and a £30 pocket compressor kept in the boot is a one-time investment that eliminates the problem. Use the forecourt for top-ups; use your own gauge for measurement." },

        { type: "h2", text: "Nitrogen fills: worth it?" },
        { type: "p", html: "Some fitters offer a nitrogen fill for £5–£10 per tyre. In theory, nitrogen molecules leak more slowly than oxygen and pressure stays more stable across temperature swings. In practice, air is already 78% nitrogen, and the difference over a 6-month period on a road car is about 1 PSI. For F1 and airline tyres it matters; for a Ford Focus it doesn't. Skip it and put the money toward a good gauge instead." },

        { type: "h2", text: "Special cases" },
        {
          type: "ul",
          items: [
            "<strong>Run-flat tyres.</strong> Use exactly the manufacturer's cold pressure. Under-inflation kills the reinforced sidewall structure just as it kills a standard tyre.",
            "<strong>EVs.</strong> Battery weight pushes recommended pressures higher — often 38–42 PSI. Follow the door sticker, not \"what the last car ran\".",
            "<strong>Winter tyres.</strong> Same PSI as summer unless the car handbook specifies otherwise. Do check more often — temperature swings hit winter compounds harder.",
            "<strong>Tow cars.</strong> The full-load rear figure is a minimum, not a target. Some caravans recommend +2 PSI over that.",
          ],
        },
      ]}
      faqs={[
        { q: "Where do I find the correct tyre pressure for my car?", a: "The driver's door jamb sticker or the fuel filler flap. Ignore the number moulded into the tyre sidewall — that's the maximum, not the target." },
        { q: "Should I check tyre pressure hot or cold?", a: "Cold — parked at least three hours, or driven under a mile. A warm tyre reads 3–5 PSI higher than cold." },
        { q: "How often should I check my tyre pressure?", a: "Monthly minimum, plus before every long trip and after any big temperature change. Pressure drops around 1 PSI per 5°C drop in ambient temperature." },
        { q: "Is nitrogen better than air for car tyres?", a: "For a road car, the difference over 6 months is about 1 PSI. Not worth the £5–£10 per tyre for most drivers." },
      ]}
      related={[
        { to: "/blog/tpms-warning-light", label: "TPMS Warning Light Guide" },
        { to: "/blog/slow-puncture-uk-guide", label: "Slow Puncture Guide" },
        { to: "/blog/tyre-blowout-on-motorway-what-to-do", label: "Motorway Blowout Guide" },
      ]}
    />
  );
}
