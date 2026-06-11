import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import heroImg from "@/assets/blog/run-flat-tyres-hero.jpg";

export default function RunFlatTyresUk() {
  const url = "https://tyrefly.com/blog/run-flat-tyres-uk-guide";
  const imageUrl = `https://tyrefly.com${heroImg}`;
  const datePublished = "2026-06-11";

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: "Run-Flat Tyres UK: How They Work, Costs & When to Replace (2026 Guide)",
    description:
      "Everything UK drivers need to know about run-flat tyres — markings (RFT, ROF, ZP, SSR, EMT), how far you can drive flat, repair rules, costs and mobile replacement.",
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
      { "@type": "ListItem", position: 3, name: "Run-Flat Tyres UK Guide", item: url },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How far can I drive on a run-flat tyre after a puncture?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Most manufacturers rate run-flats for 50 miles at up to 50 mph after total air loss. BMW and Mini quote the same. Always check your handbook — some performance run-flats are limited to 30 miles.",
        },
      },
      {
        "@type": "Question",
        name: "Can a run-flat tyre be repaired?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Most tyre manufacturers (Bridgestone, Michelin, Pirelli, Continental, Goodyear) advise against repairing run-flats once they have been driven on flat. The reinforced sidewall hides internal damage. Replacement is the safe option.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need run-flats if my car came with them?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "If your car has no spare wheel and no repair kit, yes — switching to standard tyres leaves you stranded after a puncture and may affect ride quality tuned for run-flats. If you fit a spare or carry a sealant kit, standard tyres are legal and often cheaper and more comfortable.",
        },
      },
      {
        "@type": "Question",
        name: "How much do run-flat tyres cost in the UK?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Budget run-flats start around £110 fitted, mid-range £140–£190 and premium (Michelin, Bridgestone, Pirelli) £180–£320 per tyre fitted. SUV and performance sizes can exceed £400.",
        },
      },
    ],
  };

  return (
    <main className="min-h-screen bg-background">
      <Seo
        title="Run-Flat Tyres UK: How They Work, Costs & When to Replace (2026)"
        description="UK guide to run-flat tyres — markings (RFT, ROF, ZP, SSR, EMT), how far you can drive flat, repair rules, prices and mobile replacement."
        canonical="/blog/run-flat-tyres-uk-guide"
        ogImage={imageUrl}
        jsonLd={[articleLd, breadcrumbLd, faqLd]}
      />

      <article className="max-w-3xl mx-auto px-6 py-16">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">Home</Link> <span className="mx-1">/</span>{" "}
          <Link to="/blog" className="hover:text-foreground">Blog</Link> <span className="mx-1">/</span>{" "}
          <span>Run-Flat Tyres UK Guide</span>
        </nav>

        <header className="mb-8">
          <p className="text-sm uppercase tracking-widest text-muted-foreground mb-3">Guide</p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">
            Run-Flat Tyres UK: How They Work, Costs & When to Replace
          </h1>
          <p className="text-lg text-muted-foreground">
            Run-flats let you keep moving after a puncture — but only briefly, only under speed limits, and almost never after a repair. Here's the honest UK driver's guide.
          </p>
          <time className="block mt-4 text-sm text-muted-foreground">11 June 2026 · 9 min read</time>
        </header>

        <img
          src={heroImg}
          alt="Run-flat tyre on a modern alloy wheel at dusk on a British road"
          width={1600}
          height={896}
          className="w-full h-auto rounded-2xl mb-10"
        />

        <section className="prose prose-invert max-w-none space-y-6 text-foreground/90 leading-relaxed">
          <h2 className="text-2xl font-semibold">What is a run-flat tyre?</h2>
          <p>
            A run-flat tyre (RFT) has a reinforced sidewall — typically 6–10 mm of extra rubber and a heat-resistant insert — that can carry the weight of the car for a limited distance after total air loss. The point isn't to ignore the puncture; it's to get you off a live lane on the M25, off a dark country road, or to the nearest safe place without changing a wheel in the rain.
          </p>
          <p>
            BMW, Mini, some Mercedes, Lexus, Cadillac and many newer SUVs ship from the factory with run-flats and no spare wheel. The car's TPMS (tyre pressure monitoring system) is what actually warns you — the tyre itself feels almost normal at first, which is exactly the danger.
          </p>

          <h2 className="text-2xl font-semibold">Run-flat markings: RFT, ROF, ZP, SSR, EMT</h2>
          <p>Manufacturers use different letters. They all mean self-supporting run-flat:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>RFT</strong> — Bridgestone Run-Flat Technology</li>
            <li><strong>ROF</strong> — Goodyear / Dunlop Run-On-Flat</li>
            <li><strong>ZP</strong> — Michelin Zero Pressure</li>
            <li><strong>SSR</strong> — Continental Self-Supporting Run-flat</li>
            <li><strong>EMT</strong> — Goodyear Extended Mobility Technology</li>
            <li><strong>DSST / RFT</strong> — Dunlop Self-Supporting Technology</li>
            <li><strong>HRS</strong> — Hankook Run-flat System</li>
          </ul>
          <p>
            If you can't see any of those on the sidewall, the tyre is not a run-flat — don't drive on it deflated.
          </p>

          <h2 className="text-2xl font-semibold">How far can you actually drive on one flat?</h2>
          <p>
            The industry standard is <strong>50 miles at 50 mph</strong> with the tyre completely deflated, loaded normally. That's a ceiling, not a target. Real-world advice:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Cut your speed immediately — under 50 mph (80 km/h).</li>
            <li>Avoid hard cornering, kerbs and potholes — the sidewall is doing all the work.</li>
            <li>Don't carry maximum passengers/load.</li>
            <li>Head to the nearest safe stop (services, layby, side road) — not "home, 38 miles away".</li>
          </ul>

          <h2 className="text-2xl font-semibold">Can a run-flat be repaired?</h2>
          <p>
            Almost never. Bridgestone, Michelin, Pirelli, Continental and Goodyear all advise replacement once a run-flat has been driven on flat. The reinforced sidewall hides internal abrasion — a plug repair could fail at 70 mph weeks later. A few independents will repair tread-area punctures under strict conditions (tyre never run deflated, less than 6 mm cut, in the central tread band). If in doubt, replace.
          </p>

          <h2 className="text-2xl font-semibold">Run-flat vs. standard tyre — which is right for you?</h2>
          <p>
            Run-flats trade ride comfort and rolling resistance for safety after a puncture. If your car was designed around them (BMW, Mini), the suspension is tuned for the stiffer sidewall — going to standard tyres will feel softer but can affect handling balance and you'll have no spare. If your car came with a spare or a sealant kit, standard tyres are perfectly legal and usually £20–£60 cheaper per corner.
          </p>

          <h2 className="text-2xl font-semibold">Run-flat tyre prices in the UK (2026)</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Budget run-flats (17"): from £110 fitted</li>
            <li>Mid-range (Hankook, Falken, Kumho): £140–£190 fitted</li>
            <li>Premium (Michelin Pilot Sport, Bridgestone Turanza, Pirelli P Zero): £180–£320 fitted</li>
            <li>SUV / performance 19–21": £260–£480 fitted</li>
          </ul>
          <p>
            Mobile fitting at home or roadside adds £20–£40 in most cities; out-of-hours adds another £20–£40.
          </p>

          <h2 className="text-2xl font-semibold">Mobile fitting for run-flats</h2>
          <p>
            Run-flats are stiffer and need a tyre machine with a proper run-flat function — most modern mobile vans carry one. Tell the fitter your car make, model and tyre size when booking. The fitter will also reset the TPMS sensor where required and torque to spec (BMW M-cars need 140 Nm; many alloys need 110–120 Nm).
          </p>
          <p>
            Need a run-flat replaced at the roadside today? <Link to="/" className="text-primary underline">Get a mobile fitter on the way</Link> — most London jobs are completed in 35–60 minutes.
          </p>

          <h2 className="text-2xl font-semibold">FAQs</h2>
          <h3 className="text-xl font-semibold">Do I have to replace run-flats in pairs?</h3>
          <p>
            Best practice: yes on the same axle if tread depths differ by more than 2 mm. All four only if the others are near the legal 1.6 mm limit.
          </p>
          <h3 className="text-xl font-semibold">Will my TPMS light stay on after a new run-flat?</h3>
          <p>
            Sometimes. Many cars relearn within 10–20 minutes of driving above 25 mph. Others (BMW, Mercedes) need a menu reset or an OBD tool — the mobile fitter will do this before leaving.
          </p>
          <h3 className="text-xl font-semibold">Can I mix run-flats with standard tyres?</h3>
          <p>
            Not recommended. Different stiffness front to rear affects ABS, ESC and handling. UK MOT doesn't ban it, but most manufacturers do.
          </p>
        </section>

        <div className="mt-12 p-6 rounded-2xl bg-card border border-border">
          <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Need help now?</p>
          <p className="text-lg mb-4">Mobile tyre fitters across London and the UK, 24/7.</p>
          <Link to="/" className="inline-block px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium">
            Get a quote in 60 seconds →
          </Link>
        </div>
      </article>
    </main>
  );
}
