import BlogPost from "@/components/blog/BlogPost";

export default function SlowPunctureUkGuide() {
  return (
    <BlogPost
      slug="slow-puncture-uk-guide"
      metaTitle="Slow Puncture UK Guide: Causes, Repair & Cost (2026)"
      metaDesc="How to spot a slow puncture, whether it's repairable under UK rules, and what a mobile repair really costs in 2026."
      title="Slow Puncture UK: How to Spot It, Fix It, and What It Really Costs"
      category="Repair Guide"
      readMinutes={10}
      datePublished="2026-07-13"
      heroImage="flat"
      intro="A slow puncture is the tyre problem you can ignore for three weeks — right up until the morning you can't. This guide covers how to identify one properly, whether British Standard rules allow it to be repaired, and what a mobile fix actually costs in 2026."
      blocks={[
        { type: "h2", text: "How to tell if you have a slow puncture" },
        { type: "p", html: "Slow punctures leak between 1 and 5 PSI a day. You'll rarely see the tyre visibly flat — instead you'll notice one or more of these:" },
        {
          type: "ul",
          items: [
            "The car pulls gently to one side on a straight, level road.",
            "One tyre looks slightly \"squashed\" at the bottom compared to its opposite.",
            "The TPMS light comes on cold in the morning and goes off after 20 minutes of driving (heat re-pressurises the tyre).",
            "You're topping up the same tyre at the petrol station every couple of weeks.",
            "A faint hissing when you crouch by the wheel, or a wet patch on the tread that dries suspiciously slowly.",
          ],
        },
        { type: "p", html: "The classic self-test: park on a level surface, spray washing-up liquid diluted in water around the tread, sidewall and valve, and watch for bubbles. It works nine times out of ten." },

        { type: "h2", text: "What causes a slow puncture" },
        {
          type: "ul",
          items: [
            "<strong>Screw or nail in the tread</strong> — the classic. Because it plugs its own hole, air only escapes slowly.",
            "<strong>Perished valve stem</strong> — rubber valves crack after 5–6 years and leak silently around the base.",
            "<strong>Corroded alloy bead</strong> — common on older alloys where the aluminium oxidises and the tyre no longer seals cleanly against the rim.",
            "<strong>Sidewall micro-cut</strong> — from kerbing or debris. Not repairable.",
            "<strong>Damaged tyre bead</strong> — usually from a bad fit or a previous tyre change.",
          ],
        },

        { type: "h2", text: "Is your slow puncture repairable? The UK rules" },
        { type: "p", html: "The British Standard <strong>BS AU 159</strong> defines what a UK tyre fitter can and cannot legally repair. It's stricter than most drivers realise, and any reputable fitter will follow it — no matter how much you argue:" },
        {
          type: "ul",
          items: [
            "The puncture must be in the <strong>central tread area</strong> only — specifically within the middle three-quarters of the tread width.",
            "The hole must be <strong>no larger than 6 mm</strong>.",
            "There can be <strong>no sidewall damage</strong>, no bulges, no cuts.",
            "The tyre must have <strong>at least 1.6 mm of tread</strong> remaining across the central three-quarters.",
            "The tyre must not be showing signs of running flat (rubber dust inside, delaminated cords).",
            "Run-flat tyres (RFT, ROF, ZP, SSR, EMT) that have been driven flat <strong>cannot be repaired</strong> — sidewall reinforcement is compromised.",
          ],
        },
        { type: "p", html: "A correct repair is a <strong>combination plug-and-patch</strong> from the inside of the tyre — the fitter removes the tyre from the wheel, cleans and abrades the puncture area, inserts a mushroom-shaped patch and vulcanises it. External-only plugs (\"string repairs\") are a get-you-home fix and are not compliant with BS AU 159. Any repair that ignores those rules is illegal and voids insurance." },

        { type: "h2", text: "What a slow puncture repair costs in the UK (2026)" },
        {
          type: "ul",
          items: [
            "<strong>Mobile puncture repair (single, BS AU 159 compliant):</strong> £35–£55 average across the UK.",
            "<strong>At a fixed garage:</strong> £25–£45 — cheaper if you can get the car there.",
            "<strong>Valve replacement (rubber snap-in):</strong> £5–£10 when done as part of a tyre change; £20–£35 as a standalone job.",
            "<strong>Bead reseal on a corroded alloy:</strong> £25–£45.",
            "<strong>Puncture repair out-of-hours:</strong> add £15–£30.",
          ],
        },
        { type: "p", html: "If the puncture is in the shoulder or sidewall, the repair converts to a replacement tyre. The repair fee should be waived — you should never pay for both. If a fitter tries to charge both, walk away." },

        { type: "h2", text: "Sealant kits and slow punctures: read this first" },
        { type: "p", html: "If you have a sealant-and-compressor kit in the boot instead of a spare, don't use it on a slow puncture that's easily reachable by a fitter. Sealant contaminates the inside of the tyre and most fitters will refuse to do a proper repair afterwards — you'll be forced into a new tyre. Sealant is for emergencies where you're stuck with no other option, not for a Sunday-morning \"top-up\" fix." },

        { type: "h2", text: "How long can you drive on a slow puncture?" },
        { type: "p", html: "Short answer: as long as you check and top-up the pressure daily, you can drive on a slow puncture for weeks without doing structural damage — provided the tyre never drops below about 25 PSI. But there are three real risks:" },
        {
          type: "ol",
          items: [
            "The puncture object can work deeper and enlarge the hole to the point where the tyre can no longer be repaired.",
            "The tyre can lose pressure suddenly at motorway speed if the object dislodges — turning a slow puncture into a blowout.",
            "You're relying on your own pressure checks. Miss two and the tyre may be at 15 PSI, which flexes the sidewall enough to destroy the carcass in one long drive.",
          ],
        },
        { type: "p", html: "The economic answer: it costs £45 to fix and £140 to replace. Fix it this week." },

        { type: "h2", text: "The TPMS trap" },
        { type: "p", html: "Modern cars flash the TPMS warning when a tyre drops around 20–25% below its target. On a slow puncture the light often goes on and off — cold in the morning, off once heat re-inflates the tyre. Drivers get used to it and start ignoring it. Don't. A cycling TPMS light on the same wheel is a slow puncture until proven otherwise. See our <a href=\"/blog/tpms-warning-light\" class=\"text-primary hover:underline\">TPMS warning light guide</a> for how to interpret the different flash patterns." },

        { type: "h2", text: "When a mobile fitter is the smart call" },
        { type: "p", html: "For a slow puncture, mobile is often the best value because you're not paying with your morning off work. A fitter comes to the driveway or office car park, has the wheel off the car in five minutes, does a BS AU 159 repair in 20, and you never rearrange your day. Send a WhatsApp with your postcode, the tyre size, and a photo of the object (if visible) — you'll usually get a fixed price back in minutes." },
      ]}
      faqs={[
        { q: "How do I know if a puncture is repairable in the UK?", a: "It's repairable if the hole is under 6 mm, in the central three-quarters of the tread, with no sidewall damage or bulges, and the tyre has at least 1.6 mm of tread. Run-flats driven flat cannot be repaired." },
        { q: "How much does a slow puncture repair cost in 2026?", a: "£35–£55 for a mobile BS AU 159 repair; £25–£45 at a fixed garage." },
        { q: "Is it safe to drive with a slow puncture?", a: "Only if you top up the pressure daily and never let it drop below 25 PSI. It's not a long-term solution and can convert to a blowout at motorway speed." },
        { q: "Why does my TPMS light come on and off?", a: "Almost always a slow puncture. Cold air overnight drops the pressure below the threshold; driving warms the air enough to re-inflate the tyre and the light goes off." },
      ]}
      related={[
        { to: "/blog/tpms-warning-light", label: "TPMS Warning Light Guide" },
        { to: "/blog/tyre-pressure-guide-uk", label: "UK Tyre Pressure Guide" },
        { to: "/blog/flat-tyre-london", label: "Flat Tyre London Guide" },
      ]}
    />
  );
}
