import BlogPost from "@/components/blog/BlogPost";

export default function CanIDriveOnAFlatTyreUk() {
  return (
    <BlogPost
      slug="can-i-drive-on-a-flat-tyre-uk"
      metaTitle="Can I Drive on a Flat Tyre? UK Rules & Risks (2026)"
      metaDesc="How far you can safely drive on a flat tyre in the UK, when it's illegal, and the difference between standard and run-flat tyres."
      title="Can I Drive on a Flat Tyre in the UK? The Honest Answer"
      category="Emergency Guide"
      readMinutes={10}
      datePublished="2026-07-13"
      heroImage="flat"
      intro="You've felt the wobble, you've heard the flap, and now you're deciding whether to keep going to the next petrol station or stop right here. This is the honest answer — legal, mechanical and financial — for UK drivers in 2026."
      blocks={[
        { type: "h2", text: "The short answer" },
        { type: "p", html: "For a <strong>standard tyre</strong>, the answer is essentially no. You can drive at very low speed for 100–200 metres to reach a safe stopping point, but any further and the tyre carcass tears itself apart, damages the alloy wheel, and often takes out the wheel bearing or brake line on the way. For a <strong>genuine run-flat tyre</strong>, you can drive up to 50 miles at a maximum of 50 mph after a complete pressure loss — that's it. If you don't know which type you have, assume standard." },

        { type: "h2", text: "What actually happens when you drive on a flat" },
        { type: "p", html: "A tyre is a load-bearing structure held in shape by air pressure — usually around 30–36 PSI. Take the air away and the sidewall folds every time the wheel turns. Within seconds the rubber overheats; within a hundred metres the internal cords delaminate; within a mile the sidewall shreds and the alloy rim is riding directly on the road surface. From that point you're grinding metal against tarmac and the wheel itself becomes scrap." },
        { type: "p", html: "The cost curve is brutal. A single mid-range replacement tyre fitted mobile in the UK averages £140. Add a destroyed alloy and you're at £400–£900. Add a bent lower control arm from a wheel that locked and skipped, and you're looking at a full suspension job — often over £1,500. All of that from the two extra miles you drove to reach a garage." },

        { type: "h2", text: "Is it illegal to drive on a flat tyre in the UK?" },
        { type: "p", html: "Yes — and the wording matters. Regulation 27 of the Road Vehicles (Construction and Use) Regulations 1986 requires tyres to be \"fit for the use to which the vehicle is being put\" and \"correctly inflated to the manufacturer's recommended pressure\". A visibly flat tyre fails both tests. The penalty is a <strong>£2,500 fine and 3 penalty points per tyre</strong>. If you're stopped by police mid-drive with a flat, you can also be charged with driving without due care and attention." },
        { type: "p", html: "Insurance is the second, quieter risk. If you have a collision on a deflated tyre, most UK insurers will investigate whether the tyre condition contributed — and if it did, they'll reduce or void the payout. That's a signed-off engineering report, not a subjective call." },

        { type: "h2", text: "The one exception: genuine run-flat tyres" },
        { type: "p", html: "Run-flats have a reinforced sidewall stiff enough to hold the wheel up without air. They're common on BMW, Mini, some Mercedes and increasingly on EVs. You'll see one of these codes on the sidewall:" },
        {
          type: "ul",
          items: [
            "<strong>RFT</strong> — Run-Flat Tyre (Bridgestone, Yokohama)",
            "<strong>ROF</strong> — Run On Flat (Goodyear, Dunlop)",
            "<strong>ZP</strong> — Zero Pressure (Michelin)",
            "<strong>SSR</strong> — Self-Supporting Run-flat (Continental)",
            "<strong>EMT</strong> — Extended Mobility Tyre (Goodyear)",
          ],
        },
        { type: "p", html: "The rules for run-flats are strict: <strong>maximum 50 mph, maximum 50 miles</strong>, and only after the TPMS has warned you of a pressure loss. Beyond that, the internal reinforcement fails and the tyre disintegrates just like a standard one. Run-flats are also <strong>not repairable</strong> once driven flat — no matter how tempting the puncture location looks." },

        { type: "h2", text: "What about the emergency repair kit in the boot?" },
        { type: "p", html: "Most new UK cars ship without a spare wheel. In its place you get a can of sealant and a small compressor. These kits are marketed as \"tyre repair kits\" but they're strictly emergency get-you-home tools with three big limitations." },
        {
          type: "ol",
          items: [
            "They only work on small punctures in the central tread — a nail, a screw, a shard of glass. Anything on the shoulder or sidewall is untouchable.",
            "The sealant contaminates the inside of the tyre, which means most reputable fitters will refuse to do a proper permanent repair afterwards — you're forced into a new tyre.",
            "The pressure they achieve is temporary. You should not exceed 50 mph or 50 miles on a sealant-repaired tyre.",
          ],
        },
        { type: "p", html: "Use the kit only if the alternative is being stuck on a live carriageway. In every other scenario, a mobile fitter is faster, cheaper long-term and won't ruin the tyre." },

        { type: "h2", text: "Space-saver spare wheels — the 50/50 rule" },
        { type: "p", html: "If you've got a narrow \"skinny\" spare in the boot, treat it as an appointment-keeper, not a solution. UK space-savers are speed-restricted to <strong>50 mph</strong> and rated for around <strong>50 miles</strong>. They also disable ABS and stability control on some cars — the ECU sees the size mismatch and switches to a limp-home map. Fit it, drive gently to a fitter or home, and swap back to a full-size wheel as soon as you can." },

        { type: "h2", text: "What to do if you're already driving and the tyre goes down" },
        {
          type: "ol",
          items: [
            "<strong>Don't brake hard.</strong> Ease off the accelerator and let the car slow itself.",
            "<strong>Grip the wheel with both hands.</strong> A front deflation pulls sharply toward the failed side.",
            "<strong>Indicate early and steer for the nearside.</strong> Hard shoulder, layby, petrol station, quiet side street — anywhere off a live lane.",
            "<strong>Do not attempt to \"limp\" to your usual garage.</strong> Even two more miles is enough to destroy the alloy.",
            "<strong>Once stopped, get everyone out and behind a barrier.</strong> Then call a mobile fitter or, on a motorway, 999.",
          ],
        },

        { type: "h2", text: "How far a mobile fitter will realistically travel to you" },
        { type: "p", html: "In and around London, Birmingham, Manchester, Leeds and Bristol you can expect a mobile fitter within 35–75 minutes 24/7. In rural areas the wait can stretch to 90–120 minutes, particularly overnight. That's still shorter than the recovery-truck route (2–4 hours in many regions) and it means you keep the car and drive away on a new tyre rather than being deposited at a garage that opens at nine tomorrow morning." },

        { type: "h2", text: "So — can you drive on it?" },
        { type: "p", html: "If it's a standard tyre: only to reach a safe stopping point, and only at walking pace. If it's a run-flat: yes, up to 50 miles at 50 mph, once. In every other reading of the question, the answer is a firm no — the maths of a £140 tyre versus a £900 alloy-and-suspension bill isn't close." },
      ]}
      faqs={[
        { q: "Can I drive 1 mile on a flat tyre?", a: "On a standard tyre, no — a mile is enough to shred the sidewall and often buckle or crack the alloy. On a genuine run-flat, yes, provided you stay under 50 mph." },
        { q: "How long can you drive on a flat tyre before damage?", a: "For a standard tyre, damage begins within about 100 metres and the tyre is unrepairable within 200–300 metres. For a run-flat, up to 50 miles at 50 mph." },
        { q: "Is driving on a flat tyre illegal in the UK?", a: "Yes. It breaches the Road Vehicles (Construction and Use) Regulations 1986 and carries a £2,500 fine and 3 penalty points per tyre." },
        { q: "Will insurance cover damage from driving on a flat?", a: "Usually not. Most UK insurers will reduce or void a claim if driving on a deflated tyre contributed to the incident." },
        { q: "What if I only have a repair kit, not a spare?", a: "Use it only if the alternative is unsafe. Sealant kits work only on small tread punctures, contaminate the tyre so it can't be properly repaired afterwards, and limit you to 50 mph." },
      ]}
      related={[
        { to: "/blog/flat-tyre-london", label: "Flat Tyre London Guide" },
        { to: "/blog/run-flat-tyres-uk-guide", label: "Run-Flat Tyres UK Guide" },
        { to: "/blog/tyre-blowout-on-motorway-what-to-do", label: "Blowout on the Motorway" },
      ]}
    />
  );
}
