import BlogPost from "@/components/blog/BlogPost";

export default function TyrePressureGuideUk() {
  return (
    <BlogPost
      slug="tyre-pressure-guide-uk"
      metaTitle="UK Tyre Pressure Guide: Correct PSI & Cold Check (2026)"
      metaDesc="How to set the right tyre pressure for your car in the UK — where to find the correct PSI, typical PSI by popular car model, laden vs unladen figures, and the cold check rule."
      title="UK Tyre Pressure Guide: Correct PSI, Cold Checks and the Laden Rule"
      category="Maintenance"
      readMinutes={11}
      datePublished="2026-07-13"
      dateModified="2026-08-18"
      heroImage="tpms"
      intro="Correct tyre pressure is the single cheapest thing you can do to make your car safer, more efficient and longer-lived — and about 60% of UK drivers get it wrong. This guide covers where to find the right number, typical PSI for popular UK cars, how to check it properly, and the difference between the everyday and the loaded pressure."
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

        { type: "h2", text: "Typical PSI by popular UK car" },
        { type: "p", html: "The table below gives typical cold-inflation figures for common UK cars, based on the sort of values you'll usually find on the door placard. <strong>Treat this as a general reference only</strong> — trim level, engine, wheel size and model year all shift the exact number. Always check your own door sticker or handbook before setting pressures; it is the only authoritative source for your specific car." },
        {
          type: "table",
          caption: "Typical cold tyre pressures, popular UK vehicles (PSI). Always confirm against your door placard.",
          head: ["Vehicle", "Front (normal)", "Rear (normal)", "Front/Rear (laden)"],
          rows: [
            ["Ford Fiesta", "30–32", "29–31", "33 / 33"],
            ["Ford Focus", "30–33", "28–31", "35 / 35"],
            ["Volkswagen Golf", "29–32", "28–31", "35 / 38"],
            ["Vauxhall Corsa", "29–32", "26–29", "32 / 35"],
            ["Nissan Qashqai", "32–33", "32–33", "35 / 38"],
            ["BMW 3 Series", "31–33", "31–34", "34 / 37"],
            ["Mercedes A-Class", "32–35", "32–35", "35 / 38"],
            ["Audi A3", "29–32", "29–32", "35 / 38"],
            ["Toyota Yaris", "32–33", "32–33", "33 / 33"],
            ["Range Rover Evoque", "32–35", "32–35", "38 / 41"],
            ["Ford Transit Custom (van)", "42–50", "50–65", "up to 80 rear when fully laden"],
          ],
        },
        { type: "p", html: "Vans like the Transit Custom show the widest swing between empty and laden pressures — commercial vehicles are designed around carrying variable loads, so it's worth checking the payload-specific plate inside the door or the handbook chart rather than guessing." },

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

        { type: "h2", text: "Load and how it changes the numbers" },
        { type: "p", html: "Every extra passenger and every kilogram in the boot adds weight the tyres must carry, and the door sticker's \"laden\" figure exists specifically to compensate. A few practical points that catch drivers out:" },
        {
          type: "ul",
          items: [
            "<strong>Rear pressures usually rise more than front</strong> when laden, because passengers and luggage load the rear axle disproportionately in most family cars.",
            "<strong>Estate cars and SUVs with a full boot</strong> should generally run the laden figure even for a normal school run if regularly loaded near capacity.",
            "<strong>Roof boxes and bike racks</strong> add both weight and aerodynamic drag — treat the car as laden even if the cabin is empty.",
            "<strong>Caravan and trailer towing</strong> needs the tow vehicle's full-load rear pressure as a minimum; some caravan manufacturers recommend a couple of PSI above that on the tow car.",
          ],
        },

        { type: "h2", text: "Temperature and seasonal pressure loss" },
        { type: "p", html: "Tyre pressure tracks ambient temperature closely — roughly <strong>1 PSI for every 5–6°C change</strong>. This matters most at the two seasonal turning points UK drivers hit every year:" },
        {
          type: "ul",
          items: [
            "<strong>Autumn into winter:</strong> a car that was correctly set at 32 PSI in September can be down to 27–28 PSI by a cold December morning without any leak at all — just thermal contraction.",
            "<strong>Winter into spring:</strong> the reverse happens; pressures creep back up as temperatures rise, so it's worth rechecking rather than assuming winter settings still apply.",
            "<strong>A cold snap overnight</strong> (a sudden drop of 10°C or more) can lose 2 PSI in a single night — check pressures the morning after any sharp weather change.",
          ],
        },

        { type: "h2", text: "EVs and the weight factor" },
        { type: "p", html: "Electric vehicles run heavier than their petrol/diesel equivalents because of battery mass — often 300–500kg more. That extra weight means EV-specific or higher-load-rated tyres, and correspondingly higher recommended pressures, often <strong>38–42 PSI</strong> rather than the 30–33 PSI typical of an equivalent combustion car." },
        {
          type: "ul",
          items: [
            "Always use the EV's own door placard — don't assume the pressure from a previous petrol car of similar size.",
            "Under-inflation costs EVs more in range than it does combustion cars: roughly 3–5% range loss per 10% under-inflation, compounding with cold-weather range loss.",
            "EV-rated tyres (often marked with an additional manufacturer code) are built for the extra torque and weight — fitting standard tyres at EV pressures doesn't fully substitute for the correct tyre.",
          ],
        },

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
        { q: "Are the PSI figures in your car model table exact for my car?", a: "No — treat them as typical starting points only. Trim, engine, wheel size and load all change the correct figure. Your door placard or handbook is always the authoritative source for your specific vehicle." },
        { q: "Why do vans like the Transit Custom need such high rear pressure?", a: "Commercial vans are designed to carry variable, often heavy loads in the rear. The laden rear pressure can be nearly double the unladen figure, which is why vans carry a separate load-specific pressure plate." },
        { q: "Does cold weather really deflate my tyres without a puncture?", a: "Yes. Roughly 1 PSI is lost for every 5–6°C drop in temperature, purely from air contracting. A sharp autumn cold snap can leave correctly set tyres several PSI low within days." },
        { q: "Do electric cars need different tyre pressure to petrol cars?", a: "Usually yes, and higher — often 38–42 PSI versus 30–33 PSI for an equivalent combustion car — because of the extra weight from the battery pack. Always use the EV's own door placard." },
      ]}
      related={[
        { to: "/blog/tpms-warning-light", label: "TPMS Warning Light Guide" },
        { to: "/blog/slow-puncture-uk-guide", label: "Slow Puncture Guide" },
        { to: "/blog/tyre-blowout-on-motorway-what-to-do", label: "Motorway Blowout Guide" },
      ]}
    />
  );
}
