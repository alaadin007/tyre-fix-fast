import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import heroImg from "@/assets/blog/tpms-warning-hero.jpg";

export default function TpmsWarningLight() {
  const url = "https://tyrefly.com/blog/tpms-warning-light";
  const imageUrl = `https://tyrefly.com${heroImg}`;
  const datePublished = "2026-06-11";

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: "TPMS Warning Light: What It Means and What to Do (UK Guide 2026)",
    description:
      "Your TPMS light just came on — here's what it means, whether it's safe to keep driving, how to reset it, and when to call a mobile tyre fitter.",
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
      { "@type": "ListItem", position: 3, name: "TPMS Warning Light", item: url },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is it safe to drive with the TPMS light on?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Only briefly, and only at reduced speed. The light means at least one tyre is 25% below the recommended pressure. Drive to the nearest petrol station or safe stop, check pressures, and re-inflate. If a tyre is visibly flat or losing air fast, stop and call a mobile fitter.",
        },
      },
      {
        "@type": "Question",
        name: "Why is my TPMS light on but tyres look fine?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Cold weather drops tyre pressure by ~1 PSI per 10°C, so a chilly UK morning can trigger TPMS even with no leak. Other causes: slow puncture from a small nail, a failed TPMS sensor battery (5–10 year life), or a sensor knocked off during a tyre change.",
        },
      },
      {
        "@type": "Question",
        name: "How do I reset the TPMS light?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "First, inflate all four tyres to the correct pressure (driver's door jamb or fuel filler flap). For indirect systems, drive 10–20 minutes above 25 mph or press the reset button. For direct sensors, some cars relearn automatically; others need a menu reset or an OBD tool.",
        },
      },
      {
        "@type": "Question",
        name: "How much does a TPMS sensor cost in the UK?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Universal programmable sensors cost £25–£45 each. OEM sensors (BMW, Audi, Mercedes) are £55–£110. Fitting and programming adds £15–£25 per wheel. A full set of four typically lands at £160–£360 fitted.",
        },
      },
    ],
  };

  return (
    <main className="min-h-screen bg-background">
      <Seo
        title="TPMS Warning Light: What It Means & What to Do (UK 2026)"
        description="Your TPMS tyre pressure light just came on — what it means, is it safe to drive, how to reset it, and when to call a mobile tyre fitter."
        canonical="/blog/tpms-warning-light"
        ogImage={imageUrl}
        jsonLd={[articleLd, breadcrumbLd, faqLd]}
      />

      <article className="max-w-3xl mx-auto px-6 py-16">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">Home</Link> <span className="mx-1">/</span>{" "}
          <Link to="/blog" className="hover:text-foreground">Blog</Link> <span className="mx-1">/</span>{" "}
          <span>TPMS Warning Light</span>
        </nav>

        <header className="mb-8">
          <p className="text-sm uppercase tracking-widest text-muted-foreground mb-3">Guide</p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">
            TPMS Warning Light: What It Means and What to Do
          </h1>
          <p className="text-lg text-muted-foreground">
            That amber horseshoe with an exclamation mark isn't decorative. Here's the calm UK driver's playbook — when to keep going, when to stop, and when to call a fitter.
          </p>
          <time className="block mt-4 text-sm text-muted-foreground">11 June 2026 · 8 min read</time>
        </header>

        <img
          src={heroImg}
          alt="TPMS warning light glowing amber on a car dashboard at night in the rain"
          width={1600}
          height={896}
          className="w-full h-auto rounded-2xl mb-10"
        />

        <section className="prose prose-invert max-w-none space-y-6 text-foreground/90 leading-relaxed">
          <h2 className="text-2xl font-semibold">What the TPMS light actually means</h2>
          <p>
            TPMS stands for Tyre Pressure Monitoring System. UK and EU law has required it on every new passenger car sold since November 2014. The familiar amber symbol — an open horseshoe with an exclamation mark inside — comes on when one or more tyres are at least <strong>25% below the recommended pressure</strong>, or when the system itself has a fault.
          </p>
          <p>
            Two warning behaviours matter:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Solid amber</strong> — at least one tyre is under-inflated. Reduce speed, check pressures soon.</li>
            <li><strong>Flashing for ~60 seconds, then solid</strong> — the TPMS system itself has a fault (failed sensor, dead sensor battery, missing wheel). The system can't monitor pressure until fixed.</li>
          </ul>

          <h2 className="text-2xl font-semibold">Is it safe to keep driving?</h2>
          <p>
            Short answer: get to a safe stop, then check. A 25% under-inflated tyre runs hotter, flexes more in the sidewall, increases stopping distance and burns more fuel. At motorway speed it can fail catastrophically within 50–100 miles.
          </p>
          <p>
            If the tyre looks visibly flat or you can hear hissing — stop. Don't try to "make it home". Call a mobile fitter or recovery. If the tyre still looks normal, drive at moderate speed to the nearest petrol station and check all four pressures.
          </p>

          <h2 className="text-2xl font-semibold">Common reasons the light comes on</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li><strong>Cold weather.</strong> Tyre pressure drops about 1 PSI for every 10°C fall. A car parked overnight in November can lose 3–4 PSI by morning — enough to trip TPMS without any leak.</li>
            <li><strong>Slow puncture.</strong> A small nail or screw causes a gradual drop over hours or days. Often the tyre still looks round but is 6–10 PSI low.</li>
            <li><strong>Dead sensor battery.</strong> Direct TPMS sensors have a sealed battery that lasts 5–10 years. After that, the sensor goes silent and the system flags a fault.</li>
            <li><strong>Sensor knocked off during a tyre change.</strong> A careless tyre bay can damage the sensor stem when breaking the bead.</li>
            <li><strong>Wrong winter wheels.</strong> Switched to a second set of alloys without TPMS sensors? Light will be on permanently until sensors are fitted and programmed.</li>
            <li><strong>Aftermarket sealant.</strong> Tyre sealant from emergency kits can clog the sensor port. Tell your fitter — most can clean and re-seat it.</li>
          </ol>

          <h2 className="text-2xl font-semibold">How to reset the TPMS light</h2>
          <p>
            First, fix the underlying cause — inflate to the correct pressure or replace the faulty tyre/sensor. Reset method depends on which system you have:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Indirect TPMS</strong> (uses ABS sensors — most VW, Renault, Vauxhall pre-2018): drive 10–20 minutes above 25 mph, or press the TPMS reset button on the dash / in the menu.</li>
            <li><strong>Direct TPMS</strong> (sensor inside each wheel — BMW, Mercedes, Audi, most premium): many relearn automatically within 10 minutes of driving. Others need a menu reset (BMW iDrive → Vehicle → Tyre Pressure → Reset) or an OBD/TPMS programming tool.</li>
          </ul>
          <p>
            If the light returns within a day, you almost certainly have a slow puncture or a failing sensor — not a "false alarm".
          </p>

          <h2 className="text-2xl font-semibold">Correct tyre pressures — where to find them</h2>
          <p>
            Don't guess. Manufacturer pressures are printed on a sticker in one of these spots:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Driver's door jamb (most common)</li>
            <li>Inside of the fuel filler flap</li>
            <li>Glovebox lid</li>
            <li>Owner's handbook</li>
          </ul>
          <p>
            Check cold — first thing in the morning, before driving more than a mile. Pressures rise 3–5 PSI when tyres are warm.
          </p>

          <h2 className="text-2xl font-semibold">TPMS sensor cost in the UK (2026)</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Universal programmable sensor: £25–£45 each</li>
            <li>OEM sensor (BMW, Audi, Mercedes, Tesla): £55–£110 each</li>
            <li>Programming and fitting: £15–£25 per wheel</li>
            <li>Full set of 4 fitted and programmed: typically £160–£360</li>
          </ul>

          <h2 className="text-2xl font-semibold">When to call a mobile fitter</h2>
          <p>Call rather than drive if:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>A tyre is visibly flat or losing air faster than you can inflate it.</li>
            <li>The TPMS light came on with a bang, vibration or steering pull.</li>
            <li>You're on a motorway hard shoulder — never attempt repairs in a live lane.</li>
            <li>You've added air twice in 48 hours and it keeps going down.</li>
          </ul>
          <p>
            <Link to="/" className="text-primary underline">Book a mobile tyre fitter</Link> — most jobs across London and major UK cities are completed in 35–60 minutes, including TPMS reset on the way out.
          </p>

          <h2 className="text-2xl font-semibold">Related reading</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><Link to="/blog/flat-tyre-london" className="text-primary underline">Flat tyre in London: emergency steps & mobile fitter guide</Link></li>
            <li><Link to="/blog/run-flat-tyres-uk-guide" className="text-primary underline">Run-flat tyres UK: how they work, costs & when to replace</Link></li>
          </ul>
        </section>

        <div className="mt-12 p-6 rounded-2xl bg-card border border-border">
          <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Light still on?</p>
          <p className="text-lg mb-4">Mobile tyre fitters with TPMS tools — across London and the UK, 24/7.</p>
          <Link to="/" className="inline-block px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium">
            Get a quote in 60 seconds →
          </Link>
        </div>
      </article>
    </main>
  );
}
