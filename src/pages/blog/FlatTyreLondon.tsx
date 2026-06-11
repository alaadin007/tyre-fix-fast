import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import heroImg from "@/assets/blog/flat-tyre-london-hero.jpg";
import fitterImg from "@/assets/blog/flat-tyre-london-fitter.jpg";

export default function FlatTyreLondon() {
  const url = "https://tyrefly.com/blog/flat-tyre-london";
  const imageUrl = `https://tyrefly.com${heroImg}`;
  const datePublished = "2026-06-11";

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: "Flat Tyre in London: Causes, Emergency Steps & Mobile Fitter Guide (2026)",
    description:
      "Complete London guide to flat tyres — causes, what to do in the first 60 seconds, legal duties, and how to get a mobile tyre fitter to you fast.",
    image: [imageUrl],
    datePublished,
    dateModified: datePublished,
    author: { "@type": "Organization", name: "Tyrefly", url: "https://tyrefly.com" },
    publisher: {
      "@type": "Organization",
      name: "Tyrefly",
      logo: { "@type": "ImageObject", url: "https://tyrefly.com/og.jpg" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://tyrefly.com/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://tyrefly.com/blog" },
      { "@type": "ListItem", position: 3, name: "Flat Tyre London", item: url },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What should I do immediately after getting a flat tyre in London?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Don't brake hard. Ease off the accelerator, grip the wheel firmly, indicate and aim for a safe spot (hard shoulder, layby, petrol station or side street). Put hazards on, get everyone out behind a barrier, and call a mobile tyre fitter or recovery.",
        },
      },
      {
        "@type": "Question",
        name: "How much does a mobile tyre fitter cost in London?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Puncture repairs run £35–£55. Replacement tyres fitted at the roadside in London typically cost £85–£130 for budget tyres, £150–£240 for premium brands and £220–£420 for performance or SUV sizes. Out-of-hours work adds £20–£40.",
        },
      },
      {
        "@type": "Question",
        name: "Can I keep driving on a flat tyre?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Only if it's a genuine run-flat tyre (marked RFT, ROF, EMT, ZP or SSR), and only up to 50 miles at 50 mph. Standard tyres driven flat for more than 100–200 metres are destroyed and may damage the alloy and suspension.",
        },
      },
      {
        "@type": "Question",
        name: "Is a flat tyre an MOT failure?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes if tread depth drops below 1.6 mm across the central three-quarters of the tread, or if there are visible cuts, bulges or exposed cord. Each illegal tyre carries a £2,500 fine and 3 penalty points.",
        },
      },
    ],
  };

  return (
    <main className="min-h-screen bg-background">
      <Seo
        title="Flat Tyre London: Causes & Emergency Steps (2026 Guide)"
        description="What to do if you get a flat tyre in London — causes, first 60 seconds, legal duties, mobile fitter costs and how to avoid roadside scams."
        canonical="/blog/flat-tyre-london"
        ogImage={imageUrl}
        jsonLd={[articleLd, breadcrumbLd, faqLd]}
      />

      <article className="max-w-3xl mx-auto px-6 py-16">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-8">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/blog" className="hover:text-foreground">Blog</Link>
          <span className="mx-2">/</span>
          <span>Flat Tyre London</span>
        </nav>

        <p className="text-sm uppercase tracking-widest text-muted-foreground mb-3">
          Emergency Guide · 12 min read
        </p>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6">
          Flat Tyre in London: Causes, Emergency Steps & Mobile Fitter Guide
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          You're on the A406 in the rain, the steering pulls, and a flapping noise starts under the
          wheel arch. Welcome to the most common roadside problem in the capital. This guide walks
          you through exactly what to do — from the first 60 seconds to getting a mobile fitter on
          the way — written by a team that does this every night across all 33 London boroughs.
        </p>

        <figure className="mb-10 -mx-6 md:mx-0">
          <img
            src={heroImg}
            alt="Flat car tyre on a wet London street at night with a red double-decker bus passing in the background"
            width={1600}
            height={896}
            className="w-full h-auto md:rounded-2xl"
            fetchPriority="high"
          />
          <figcaption className="text-xs text-muted-foreground mt-2 px-6 md:px-0">
            Most London flats happen on wet nights — visibility drops and potholes fill with water.
          </figcaption>
        </figure>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 leading-relaxed">
          <h2 className="text-2xl font-semibold mt-12">Why London is brutal on tyres</h2>
          <p>
            London is statistically one of the worst places in the UK to own a set of tyres.
            Transport for London logs hundreds of thousands of potholes every year, and the
            combination of stop-start traffic, kerbs designed to dissuade parking, road debris from
            construction sites, and 24-hour delivery vans means rubber takes a constant beating. If
            you drive five days a week inside the M25, the odds are roughly one flat tyre every
            18–24 months. For private-hire and delivery drivers, that figure can drop to twice a
            year.
          </p>
          <p>
            The good news: most London flats are not catastrophic blowouts. Around 80% are slow
            punctures from a screw, nail or shard of metal — meaning if you handle the first few
            minutes correctly, you can almost always avoid further wheel or suspension damage.
          </p>

          <h2 className="text-2xl font-semibold mt-12">The most common causes of a flat tyre in London</h2>
          <h3 className="text-xl font-semibold mt-6">1. Potholes</h3>
          <p>
            The single biggest cause. London's freeze-thaw winters open up cracks in asphalt, and
            heavy bus routes accelerate the damage. A pothole hit at 30 mph can pinch the sidewall
            against the wheel rim — instant flat, often with a buckled alloy. Hot spots in our job
            data include the A40 westbound near Hanger Lane, the A406 around Brent Cross, the A2
            into Blackheath, and almost every back-street in Hackney and Camden after a wet winter.
          </p>
          <h3 className="text-xl font-semibold mt-6">2. Screws, nails and construction debris</h3>
          <p>
            London is permanently under construction. Roofing screws, drywall nails and the
            occasional bolt fall off contractor vans and end up in tyres — usually in the rear,
            because the front wheel flicks them upright for the back wheel to roll over. These are
            classic "slow puncture" causes: you'll notice the tyre soft the next morning, not
            instantly.
          </p>
          <h3 className="text-xl font-semibold mt-6">3. Kerbing</h3>
          <p>
            Tight residential streets, pinch points and parallel-parking pressure mean drivers
            scuff sidewalls against kerbs constantly. Even a low-speed kerb strike can cut the
            sidewall or knock the tyre off its bead. Sidewall damage is never repairable — it
            always means a replacement.
          </p>
          <h3 className="text-xl font-semibold mt-6">4. Valve failure</h3>
          <p>
            Rubber valves perish over time, especially on cars older than six years. A cracked
            valve stem leaks slowly and is often misdiagnosed as a puncture. A mobile fitter can
            replace a valve in five minutes.
          </p>
          <h3 className="text-xl font-semibold mt-6">5. Under-inflation and overload</h3>
          <p>
            Running at 22 PSI instead of 32 PSI flexes the sidewall on every revolution, generates
            heat and eventually causes a blowout — usually at motorway speed. London delivery and
            removal vans loaded above their plate rating are particularly vulnerable.
          </p>
          <h3 className="text-xl font-semibold mt-6">6. Vandalism</h3>
          <p>
            Less common, but real. Slashed tyres show a clean straight cut, usually on the sidewall.
            If you suspect vandalism, photograph the damage before the fitter touches the tyre —
            you'll need it for the police report and insurance.
          </p>

          <h2 className="text-2xl font-semibold mt-12">What to do in the first 60 seconds</h2>
          <p>
            How you react in the first minute decides whether you pay £120 for a single tyre or
            £900 for a tyre, an alloy wheel and a tracking job. Read this section before you need
            it.
          </p>
          <ol className="list-decimal pl-6 space-y-3">
            <li>
              <strong>Don't brake hard.</strong> Ease off the accelerator and let the car slow
              naturally. Hard braking on a deflated tyre can tear it off the rim.
            </li>
            <li>
              <strong>Grip the wheel firmly with both hands.</strong> A front-tyre blowout pulls
              the car sharply toward the failed side. Expect it and counter-steer gently.
            </li>
            <li>
              <strong>Indicate early and aim for the hard shoulder, a layby, a petrol station or a
              quiet side street.</strong> Driving slowly on a flat for 200–300 metres to reach
              safety is better than stopping in a live lane. The tyre is already ruined; the wheel
              is what you're trying to save.
            </li>
            <li>
              <strong>Stop on a flat, hard surface.</strong> Never on a hill, never on a soft verge
              — a jack will sink or slip.
            </li>
            <li>
              <strong>Hazards on. Handbrake hard. Engine off.</strong> Put it in first gear (or
              Park for automatics).
            </li>
            <li>
              <strong>Everyone out, behind the barrier.</strong> If you're on a motorway or
              smart-motorway lane, get every passenger out of the nearside doors and well behind
              the Armco. National Highways data is unambiguous: standing next to a stopped car on a
              live lane kills people.
            </li>
            <li>
              <strong>Triangle? Only on a 30–40 mph road.</strong> Never deploy a warning triangle
              on a motorway in the UK — it's actively dangerous and not legally required.
            </li>
          </ol>

          <h2 className="text-2xl font-semibold mt-12">Where you are matters: London-specific stopping advice</h2>
          <p>
            <strong>Motorway or smart motorway (M25, M4, M1, A1(M)):</strong> reach the hard
            shoulder or an Emergency Refuge Area. If you cannot, stay belted in with hazards on
            and call 999 — National Highways can close the lane via overhead gantries within
            seconds.
          </p>
          <p>
            <strong>Red Routes (TfL):</strong> stopping is technically prohibited, but in a genuine
            breakdown you will not be penalised. Pull as far left as possible, hazards on,
            photograph the tyre, and move on as soon as the fitter arrives.
          </p>
          <p>
            <strong>Bus lanes:</strong> avoid stopping in an active bus lane during operating
            hours. If unavoidable, get out and stand on the pavement — never sit in the car with
            buses moving past your door.
          </p>
          <p>
            <strong>Residential side streets:</strong> easiest scenario. Park considerately, leave
            room for the fitter's van (around 6 metres) and a clear working space on the damaged
            side.
          </p>
          <p>
            <strong>Underground car parks:</strong> note the level and bay number. Some mobile
            fitters can't enter car parks with under-2-metre clearance, so confirm height when
            booking.
          </p>

          <h2 className="text-2xl font-semibold mt-12">Can you keep driving on a flat?</h2>
          <p>
            Almost never. A standard tyre run flat for more than 100–200 metres is structurally
            destroyed, and continuing risks the alloy, the wheel bearing and the brake line. The
            single exception is genuine <em>run-flat</em> tyres (RFT), marked with RFT, ROF, EMT,
            ZP or SSR on the sidewall — these are designed to be driven up to 50 miles at 50 mph
            after a complete pressure loss. If you don't know whether your car has run-flats,
            assume it doesn't.
          </p>

          <h2 className="text-2xl font-semibold mt-12">Spare wheel, space-saver or repair kit?</h2>
          <p>
            Modern cars sold in London almost never come with a full-size spare. You'll have one of
            three things in the boot:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Full-size spare</strong> — rare, mostly on older or larger SUVs. Fit it,
              torque the bolts, and you can drive normally.
            </li>
            <li>
              <strong>Space-saver ("skinny") spare</strong> — limited to 50 mph and around 50
              miles. Get to a fitter or home, not a holiday.
            </li>
            <li>
              <strong>Tyre repair kit (sealant + compressor)</strong> — only works on small tread
              punctures, useless on sidewall damage, and will void most repair warranties because
              the sealant contaminates the inside of the tyre. Many tyre shops also refuse to
              repair a tyre that's had sealant pumped into it.
            </li>
          </ul>
          <p>
            If you're not confident changing a wheel on a busy London road — and most drivers
            shouldn't be — calling a mobile fitter is safer, faster and often cheaper than the
            knock-on damage of a botched change.
          </p>

          <figure className="my-10 -mx-6 md:mx-0">
            <img
              src={fitterImg}
              alt="Mobile tyre fitter changing a wheel kerbside on a London residential street at dusk"
              width={1600}
              height={896}
              loading="lazy"
              className="w-full h-auto md:rounded-2xl"
            />
            <figcaption className="text-xs text-muted-foreground mt-2 px-6 md:px-0">
              A mobile fitter swaps a damaged tyre kerbside — typical job time is 25–40 minutes.
            </figcaption>
          </figure>

          <h2 className="text-2xl font-semibold mt-12">When to call a mobile tyre fitter vs recovery</h2>
          <p>
            Call a <strong>mobile tyre fitter</strong> when:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>The car is in a safe, accessible spot (kerbside, driveway, petrol station, car park).</li>
            <li>The damage is to the tyre only — wheel looks intact.</li>
            <li>You know the tyre size (printed on the sidewall, e.g. 225/45 R17 91W).</li>
          </ul>
          <p>
            Call <strong>recovery</strong> (your insurer, breakdown cover or 999 on a smart
            motorway) when:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>You're in a live motorway lane or any unsafe position.</li>
            <li>The wheel is buckled, cracked or the car is sitting on the brake disc.</li>
            <li>Multiple tyres are damaged.</li>
            <li>There has been a collision.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-12">How much does a flat tyre cost in London?</h2>
          <p>
            Real 2026 numbers from across our London network:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Puncture repair (mobile, single plug):</strong> £35–£55</li>
            <li><strong>Budget replacement tyre fitted at the roadside:</strong> £85–£130</li>
            <li><strong>Mid-range premium (Michelin, Continental, Bridgestone) fitted:</strong> £150–£240</li>
            <li><strong>Performance / SUV tyre fitted:</strong> £220–£420</li>
            <li><strong>Run-flat replacement:</strong> add £40–£90 on top of equivalent standard tyre</li>
            <li><strong>Out-of-hours surcharge (10pm–6am):</strong> typically £20–£40</li>
          </ul>
          <p>
            Watch out for two London-specific scams: cash-only "roadside fitters" with no van
            branding who charge £300+ for a £90 tyre, and recovery operators who tow you to a
            partner garage that bills triple. Always ask for the total price before agreeing, and
            insist on a written or WhatsApp quote with the tyre brand and model named.
          </p>

          <h2 className="text-2xl font-semibold mt-12">Your legal duties as a UK driver</h2>
          <p>
            The law is short and strict. Each tyre must have at least <strong>1.6 mm of tread
            depth</strong> across the central three-quarters of the tread and around the full
            circumference. Driving on a tyre below the limit, or with a visible cut, bulge or cord
            showing, is a <strong>£2,500 fine and 3 penalty points per tyre</strong> — that's
            £10,000 and a driving ban for one set. Insurance will also typically void a claim if
            illegal tyres are found at the scene.
          </p>
          <p>
            If your TPMS warning light is on, you must investigate before driving further. A
            persistent TPMS fault is an MOT failure.
          </p>

          <h2 className="text-2xl font-semibold mt-12">After the fitter leaves: the 24-hour checklist</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Re-check pressures cold the next morning — a new tyre can settle.</li>
            <li>Have the wheel alignment checked within a week if you hit a pothole; uneven wear starts within 500 miles.</li>
            <li>Keep the receipt and tyre details for your service history.</li>
            <li>If you suspect a pothole caused the damage, report it to <a href="https://tfl.gov.uk/forms/12397.aspx" className="text-primary hover:underline">TfL</a> or your borough council within 14 days — you may be able to claim back the cost.</li>
            <li>Photograph the location, the pothole and the damage. No photos, no claim.</li>
          </ol>

          <h2 className="text-2xl font-semibold mt-12">How to avoid your next flat</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Check pressures monthly</strong> — most petrol stations have free gauges, or buy a £15 digital one for the glovebox.</li>
            <li><strong>Rotate front-to-back every 6,000 miles</strong> — front tyres on FWD cars wear roughly twice as fast.</li>
            <li><strong>Replace in pairs on the same axle</strong> — mismatched grip levels destabilise braking and ABS.</li>
            <li><strong>Buy from a fitter who balances on the wheel</strong> — a £5 weight saves a £400 set of bushes.</li>
            <li><strong>Inspect after every kerb strike</strong> — look for bulges on the sidewall; they always become blowouts.</li>
            <li><strong>Avoid the worst potholes</strong> — keep distance from the car in front so you can actually see road surface ahead.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-12">Bottom line</h2>
          <p>
            A flat tyre in London is unpleasant but rarely an emergency if you handle the first
            minute correctly: slow down gently, reach a safe spot, get everyone behind a barrier,
            and call a properly-branded mobile fitter who'll quote the total cost up front. Don't
            keep driving on a deflated tyre, don't accept cash-only roadside deals, and don't ignore
            the TPMS light.
          </p>
          <p>
            Tyrefly's mobile fitters operate across every London borough 24/7, with typical
            arrival inside the North &amp; South Circular of 35–60 minutes. If you're stuck right
            now, send a WhatsApp with your postcode and tyre size from the sidewall — we'll quote
            in minutes and dispatch the nearest van.
          </p>

          <div className="mt-12 p-6 rounded-2xl border border-border bg-muted/30">
            <p className="font-semibold mb-2">Need help right now?</p>
            <p className="text-muted-foreground mb-4">
              Send your postcode and tyre size (e.g. 225/45 R17) and we'll dispatch the closest
              mobile fitter.
            </p>
            <Link
              to="/"
              className="inline-flex items-center px-5 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
            >
              Get a mobile fitter →
            </Link>
          </div>

          <p className="mt-12 text-sm text-muted-foreground">
            See also our area pages for{" "}
            <Link to="/areas/london" className="text-primary hover:underline">London</Link>,{" "}
            <Link to="/areas/west-midlands" className="text-primary hover:underline">Birmingham</Link>{" "}
            and{" "}
            <Link to="/areas/greater-manchester" className="text-primary hover:underline">Manchester</Link>.
          </p>
        </div>
      </article>
    </main>
  );
}
