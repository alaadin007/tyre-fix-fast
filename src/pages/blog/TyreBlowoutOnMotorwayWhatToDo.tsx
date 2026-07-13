import BlogPost from "@/components/blog/BlogPost";

export default function TyreBlowoutOnMotorwayWhatToDo() {
  return (
    <BlogPost
      slug="tyre-blowout-on-motorway-what-to-do"
      metaTitle="Tyre Blowout on the Motorway: What To Do (UK 2026)"
      metaDesc="Step-by-step for surviving a tyre blowout on a UK motorway or smart motorway — steering, stopping, calling 999, and getting rescued fast."
      title="Tyre Blowout on the Motorway: What To Do in the First 30 Seconds"
      category="Emergency Guide"
      readMinutes={11}
      datePublished="2026-07-13"
      heroImage="flat"
      intro="A motorway blowout is loud, sudden and disorientating — and the wrong reflex will put you in a hedge. Here's what to actually do in the first thirty seconds, based on National Highways guidance and what our mobile fitters see every week on the M25, M6 and M1."
      blocks={[
        { type: "h2", text: "What a blowout feels like" },
        { type: "p", html: "A blowout is not a slow puncture. It's an instant, violent loss of pressure — usually a bang, a pull to one side (sometimes hard), a flapping noise and, on a rear tyre, a fishtailing feel in the back of the car. On a front tyre the steering goes heavy and the car lurches toward the failed side. On a rear the car snakes and the steering feels weirdly normal, which is what catches most drivers out." },
        { type: "p", html: "Blowouts at motorway speed are rare — most punctures are slow leaks discovered in a car park. But when they do happen, they're almost always caused by one of three things: an under-inflated tyre that's overheated over 60+ miles, a large piece of road debris (bolt, exhaust bracket, spring), or a sidewall that was cut or bulged by a kerb strike days or weeks earlier." },

        { type: "h2", text: "The 30-second survival sequence" },
        {
          type: "ol",
          items: [
            "<strong>Do NOT slam the brakes.</strong> This is the single most important instinct to fight. Braking on a deflated tyre unloads the good tyres, transfers weight forward, and dramatically increases the pull to one side. Cars end up sideways this way.",
            "<strong>Grip the wheel with both hands at 9 and 3.</strong> Don't wrench it back — apply firm, gentle counter-pressure to keep the car straight. Small inputs.",
            "<strong>Ease off the accelerator.</strong> Let the car coast down under its own drag. From 70 mph you'll lose about 10 mph every 5 seconds without touching the brake.",
            "<strong>Once you're below 40 mph, brake gently and indicate left.</strong> Aim for the hard shoulder or the next Emergency Refuge Area (ERA). Don't cross lanes to reach the nearside — filter one lane at a time as speed drops.",
            "<strong>Stop as far left on the hard shoulder as possible.</strong> Wheels turned toward the verge. Hazards on. Engine off. Handbrake hard.",
          ],
        },

        { type: "h2", text: "Getting out of the car — the part that saves lives" },
        { type: "p", html: "National Highways data is unambiguous: the most dangerous place on a motorway isn't a moving car, it's a stationary car with people in or beside it. Once you've stopped:" },
        {
          type: "ol",
          items: [
            "Leave the car through the <strong>nearside (passenger) doors only</strong>. Never the driver's door onto the live carriageway.",
            "Get every passenger — including pets — behind the Armco barrier and up the embankment.",
            "Take phones, keys and reflective jackets if you have them. Leave everything else.",
            "Face the traffic so you can see anything drifting toward you.",
            "Do <strong>not</strong> put out a warning triangle on a motorway. It's not required and puts you back on the carriageway.",
          ],
        },

        { type: "h2", text: "Smart motorways: what changes" },
        { type: "p", html: "On a smart motorway (no permanent hard shoulder, or one that opens as a live lane at busy times), the rules shift. If you can reach an ERA (orange-painted refuge with an SOS phone), take it. If you can't, and you're stuck in a live lane:" },
        {
          type: "ul",
          items: [
            "Keep hazards on, seatbelts on, and stay in the car if traffic is moving past you at speed — a hedge is safer than the hard verge in this specific case.",
            "Call <strong>999</strong> immediately. Highways controllers can close your lane on the overhead gantries within seconds using a red X.",
            "If you're in the leftmost lane and it's safe to exit, do so — but only if there's a clear escape to the verge and traffic behind you has slowed.",
          ],
        },
        { type: "p", html: "The red X above your lane is a legal instruction to other drivers to leave that lane. Ignoring it is a £100 fine and 3 points, and it's the single biggest protective tool between you and a following HGV." },

        { type: "h2", text: "Who to call, in what order" },
        {
          type: "ol",
          items: [
            "<strong>999</strong> if you're in a live lane, injured, or in immediate danger. Ask for Highways.",
            "<strong>National Highways on 0300 123 5000</strong> if you're safely on the hard shoulder or in an ERA but need the incident logged.",
            "<strong>Your breakdown provider</strong> (AA, RAC, Green Flag) to arrange recovery or a mobile fitter.",
            "<strong>A mobile tyre fitter</strong> once you're recovered off the motorway — the vast majority of national breakdown recovery firms will not fit tyres roadside on a motorway for safety reasons. They'll tow you to a safe location first.",
          ],
        },

        { type: "h2", text: "Why mobile fitters won't come to a live motorway" },
        { type: "p", html: "This surprises drivers, but it's non-negotiable. Working next to live motorway traffic is one of the highest-risk jobs on UK roads, and independent mobile fitters aren't licensed or insured to operate there. National Highways contractors with lane-closure authority are the only people who work motorway carriageways safely, and even they close lanes to do it. Your fitter will meet you at the next services, in a layby off the sliproad, or at your home once you've been recovered off the motorway." },

        { type: "h2", text: "What causes a motorway blowout" },
        {
          type: "ul",
          items: [
            "<strong>Under-inflation.</strong> A tyre at 22 PSI instead of 32 PSI flexes more on every rotation, generating heat until the sidewall fails. Number-one cause.",
            "<strong>Overloading.</strong> A car packed for a holiday, roof-boxed and running on standard pressures is well over the tyre's load index at speed.",
            "<strong>Age.</strong> Tyres over 6–7 years old lose sidewall flexibility even with good tread.",
            "<strong>Prior kerb damage.</strong> A sidewall bulge from a pothole three weeks ago that no one noticed.",
            "<strong>Debris strike.</strong> Metal off a lorry or the aftermath of another blowout.",
          ],
        },

        { type: "h2", text: "How to prevent it happening again" },
        {
          type: "ul",
          items: [
            "Check cold tyre pressures every month and before any long trip. Use the higher \"laden\" figure inside the fuel-filler flap.",
            "Inspect sidewalls after any hard pothole hit or kerbing — bulges = replace, no exceptions.",
            "Rotate front-to-back every 6,000 miles so wear is even.",
            "Don't run standard tyres over 6 years old on a car that regularly does motorway miles.",
            "If you tow or run heavily loaded, use tyres with an XL (Extra Load) marking and check pressures loaded.",
          ],
        },

        { type: "h2", text: "The mindset that gets you through it" },
        { type: "p", html: "Nearly every serious blowout outcome comes from the driver braking hard or swerving in the first two seconds. If you can hold the wheel straight and let the car coast for five seconds before doing anything, you've already survived it. Practise the sequence in your head next time you're on the motorway — it's the only way it becomes automatic when the moment comes." },
      ]}
      faqs={[
        { q: "Should I brake if I have a blowout on the motorway?", a: "No — not initially. Ease off the accelerator, hold the wheel firm, and let the car slow itself. Only brake gently once you're below 40 mph and ready to filter to the hard shoulder." },
        { q: "Can a mobile tyre fitter come to me on the motorway?", a: "No. Independent mobile fitters are not licensed to work on live motorway carriageways. You'll be recovered to a services, layby or home, and the fitter will meet you there." },
        { q: "What number do I call if I break down on a smart motorway?", a: "999 if you're in a live lane or in immediate danger — ask for Highways. National Highways on 0300 123 5000 if you're safely in an ERA or on the hard shoulder." },
        { q: "How common are tyre blowouts on UK motorways?", a: "Rare compared to slow punctures — the AA estimates roughly 15% of motorway breakdowns are tyre-related, and only a small share of those are true blowouts. Most are caused by low pressure or old sidewall damage that failed at speed." },
      ]}
      related={[
        { to: "/blog/can-i-drive-on-a-flat-tyre-uk", label: "Can I Drive on a Flat Tyre?" },
        { to: "/blog/mobile-tyre-fitter-m25", label: "M25 Mobile Tyre Fitter" },
        { to: "/blog/tyre-pressure-guide-uk", label: "UK Tyre Pressure Guide" },
      ]}
    />
  );
}
