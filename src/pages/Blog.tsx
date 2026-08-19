import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import flatTyreHero from "@/assets/blog/flat-tyre-london-hero.jpg";
import emergencyLondonHero from "@/assets/blog/emergency-puncture-london-hero.jpg";
import costHero from "@/assets/blog/puncture-repair-cost-uk-hero.jpg";

type Post = { slug: string; title: string; excerpt: string };

const featured: (Post & { image: string; alt: string })[] = [
  {
    slug: "emergency-puncture-repair-london",
    title: "Emergency Puncture Repair London: 24/7 Call-Out, Costs & Arrival Times",
    excerpt:
      "What a genuine 24-hour London call-out costs, how fast a van actually reaches you borough by borough, and when a repair is off the table.",
    image: emergencyLondonHero,
    alt: "Mobile tyre technician repairing a puncture at night on a London street under van floodlights",
  },
  {
    slug: "puncture-repair-cost-uk",
    title: "Puncture Repair Cost UK 2026: London vs the Rest of the Country",
    excerpt:
      "Real 2026 prices for mobile and garage repair, London vs regional, run-flat surcharges, and why the £20 fix usually isn't one.",
    image: costHero,
    alt: "A repaired car tyre on a workshop tyre machine with tools and a price list beside it",
  },
  {
    slug: "flat-tyre-london",
    title: "Flat Tyre in London: Causes, Emergency Steps & Mobile Fitter Guide",
    excerpt:
      "Why London eats tyres, what to do in the first 60 seconds, and how not to end up stranded on the North Circular at 2am.",
    image: flatTyreHero,
    alt: "A car with a flat front tyre stopped at the kerb on a busy London road",
  },
];

const groups: { heading: string; blurb: string; posts: Post[] }[] = [
  {
    heading: "Emergencies & roadside",
    blurb: "You're stopped at the side of the road right now. Start here.",
    posts: [
      { slug: "can-i-drive-on-a-flat-tyre-uk", title: "Can I Drive on a Flat Tyre? UK Rules & Real Limits", excerpt: "How far you can realistically move a flat, what it destroys, and when to stop immediately." },
      { slug: "tyre-blowout-on-motorway-what-to-do", title: "Tyre Blowout on the Motorway: What to Do", excerpt: "The steering, braking and hard-shoulder procedure that keeps a blowout survivable." },
      { slug: "nail-in-tyre-what-to-do", title: "Nail in Your Tyre: Pull It Out or Leave It?", excerpt: "Why removing the nail is usually the worst move, and what to do instead." },
      { slug: "slow-puncture-uk-guide", title: "Slow Puncture: How to Find and Fix One", excerpt: "Spotting the leak, the soapy-water test, and how long you can safely leave it." },
      { slug: "locking-wheel-nut-lost-uk", title: "Lost Locking Wheel Nut Key: UK Options & Costs", excerpt: "How mobile fitters remove locked nuts without a key, and what it adds to the bill." },
      { slug: "cracked-alloy-from-pothole", title: "Cracked Alloy From a Pothole: Repair or Replace", excerpt: "Which cracks are weldable, which wheels are scrap, and how to claim." },
      { slug: "tpms-warning-light", title: "TPMS Warning Light: What It Means and What to Do", excerpt: "Amber horseshoe on the dash — safe to drive, how to reset, when to call a fitter." },
    ],
  },
  {
    heading: "Puncture repair: cost & decisions",
    blurb: "Repair it, replace it, or get robbed. The honest version.",
    posts: [
      { slug: "can-a-puncture-be-repaired-uk", title: "Can Any Puncture Be Repaired? The UK Rules (BS AU 159)", excerpt: "The repair zone, the 6mm limit, sidewall damage and why some tyres are refused." },
      { slug: "puncture-repair-vs-new-tyre", title: "Puncture Repair vs New Tyre: Which Is Cheaper Long-Term", excerpt: "The tread-depth and tyre-age maths that decides whether a repair is money well spent." },
      { slug: "mobile-puncture-repair-london", title: "Mobile Puncture Repair London: What £45 Actually Buys", excerpt: "The eight steps a proper mobile repair includes, and the corners cheap operators cut." },
      { slug: "roadside-puncture-repair-london", title: "Roadside Puncture Repair London: Mobile Fitter vs AA & RAC", excerpt: "Cost, arrival times and outcomes compared against breakdown cover." },
      { slug: "run-flat-puncture-repair-london", title: "Run-Flat Puncture Repair London: When It's Possible", excerpt: "Why most run-flats are replaced rather than repaired, and the exceptions." },
      { slug: "mobile-tyre-fitter-vs-garage", title: "Mobile Tyre Fitter vs Garage: Cost, Time & Quality", excerpt: "What you actually pay for convenience, and where a garage still wins." },
    ],
  },
  {
    heading: "Mobile tyre fitting near you",
    blurb: "Local prices, call-out times and the quirks of each city.",
    posts: [
      { slug: "mobile-tyre-fitting-london", title: "Mobile Tyre Fitting London: Prices & Call-Out Times", excerpt: "Borough-by-borough arrival times, ULEZ and congestion charge effects on price." },
      { slug: "mobile-tyre-fitting-manchester", title: "Mobile Tyre Fitting Manchester: Prices & Coverage", excerpt: "Greater Manchester call-out costs and how the M60 ring affects timings." },
      { slug: "mobile-tyre-fitting-birmingham", title: "Mobile Tyre Fitting Birmingham: Prices & Coverage", excerpt: "West Midlands pricing, Clean Air Zone rules and typical arrival windows." },
      { slug: "twenty-four-hour-tyre-change-london", title: "24 Hour Tyre Change London: What's Open at 3am", excerpt: "Who genuinely operates overnight in London and what the night premium looks like." },
      { slug: "mobile-tyre-fitter-m25", title: "Mobile Tyre Fitter on the M25: Rules & Safety", excerpt: "Hard shoulder law, smart motorway refuges, and who is allowed to attend." },
    ],
  },
  {
    heading: "Tyre knowledge & buying",
    blurb: "The stuff that stops the next emergency happening.",
    posts: [
      { slug: "uk-tyre-legal-tread-depth", title: "UK Legal Tread Depth: 1.6mm, Fines & MOT Rules", excerpt: "The law, the £2,500-per-tyre penalty, and the depth you should actually replace at." },
      { slug: "tyre-pressure-guide-uk", title: "Tyre Pressure Guide UK: Correct PSI for Your Car", excerpt: "Where to find your placard figures, loaded vs unloaded, and cold-check rules." },
      { slug: "tyre-age-when-to-replace", title: "Tyre Age: How to Read the DOT Code and When to Replace", excerpt: "Decoding the four-digit date stamp and the age at which rubber stops being safe." },
      { slug: "tyre-sidewall-damage-guide", title: "Tyre Sidewall Damage & Bulges: When It's Fatal", excerpt: "Cuts, gouges and egg-shaped bulges — what's cosmetic and what's a blowout waiting." },
      { slug: "wheel-alignment-uk-guide", title: "Wheel Alignment UK Guide: Symptoms, Cost & Timing", excerpt: "Why tyres wear on one edge, what tracking costs, and when it's worth doing." },
      { slug: "run-flat-tyres-uk-guide", title: "Run-Flat Tyres UK: How They Work, Costs & Replacement", excerpt: "RFT, ROF, ZP, SSR and EMT decoded, plus how run-flats compare with standard tyres." },
      { slug: "budget-vs-premium-tyres-uk", title: "Budget vs Premium Tyres UK: Is the Difference Real?", excerpt: "Wet braking distances, lifespan and the cost-per-1,000-miles comparison." },
      { slug: "all-season-vs-winter-tyres-uk", title: "All-Season vs Winter Tyres UK: Which Do You Need?", excerpt: "The 7°C rule, UK weather reality, and whether a second set is worth it." },
      { slug: "pothole-damage-claim-uk", title: "Pothole Damage Claim UK: How to Get Paid Back", excerpt: "Evidence to gather at the scene, who to claim from, and realistic success rates." },
    ],
  },
];

const BLOG_LD = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "Tyrefly Journal",
  url: "https://www.tyrefly.com/blog",
  description:
    "Mobile tyre fitting, puncture repair and roadside safety guides for UK drivers, written by working tyre technicians.",
  publisher: { "@type": "Organization", name: "Tyrefly", url: "https://www.tyrefly.com/" },
};

export default function Blog() {
  return (
    <main className="min-h-screen bg-background">
      <Seo
        title="Tyre Guides: Puncture Repair & Mobile Fitting | Tyrefly"
        description="Mobile tyre fitting prices, emergency puncture repair, blowouts, tread depth and tyre buying advice — practical UK guides written by working tyre fitters."
        canonical="/blog"
        jsonLd={BLOG_LD}
      />

      <section className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-sm uppercase tracking-widest text-muted-foreground mb-3">Tyrefly Journal</p>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">
          Tyre guides for drivers who'd rather not get stranded
        </h1>
        <p className="text-lg text-muted-foreground mb-6">
          Puncture repair costs, emergency roadside steps, and the tyre knowledge that keeps you off the
          hard shoulder — from a team that fits tyres at the kerbside for a living.
        </p>
        <p className="mb-12">
          <Link to="/" className="text-primary font-medium hover:underline">
            Flat tyre right now? Message a mobile fitter →
          </Link>
        </p>

        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-6">Start here</h2>
        <ul className="space-y-8">
          {featured.map((p) => (
            <li key={p.slug} className="border-b border-border pb-8">
              <Link to={`/blog/${p.slug}`} className="group block">
                <img
                  src={p.image}
                  alt={p.alt}
                  width={1536}
                  height={864}
                  loading="lazy"
                  className="w-full h-auto rounded-2xl mb-5"
                />
                <h3 className="text-2xl md:text-3xl font-semibold group-hover:text-primary transition-colors">
                  {p.title}
                </h3>
                <p className="mt-3 text-muted-foreground">{p.excerpt}</p>
                <span className="mt-4 inline-block text-sm font-medium text-primary">Read the guide →</span>
              </Link>
            </li>
          ))}
        </ul>

        {groups.map((g) => (
          <section key={g.heading} className="mt-16 pt-10 border-t border-border">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">{g.heading}</h2>
            <p className="text-muted-foreground mb-6">{g.blurb}</p>
            <ul className="space-y-4">
              {g.posts.map((p) => (
                <li key={p.slug}>
                  <Link
                    to={`/blog/${p.slug}`}
                    className="block rounded-xl px-4 py-3.5 -mx-4 hover:bg-primary/5 transition"
                  >
                    <h3 className="font-medium leading-snug">{p.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{p.excerpt}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="mt-16 pt-10 border-t border-border">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">Areas we cover</h2>
          <p className="text-muted-foreground mb-4">
            24/7 mobile tyre fitting across every major UK city and motorway corridor.
          </p>
          <Link to="/areas" className="text-primary font-medium hover:underline">
            Browse all coverage areas →
          </Link>
        </section>
      </section>
    </main>
  );
}
