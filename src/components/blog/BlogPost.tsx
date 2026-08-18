import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import flatTyreHero from "@/assets/blog/flat-tyre-london-hero.jpg";
import runFlatHero from "@/assets/blog/run-flat-tyres-hero.jpg";
import tpmsHero from "@/assets/blog/tpms-warning-hero.jpg";
import emergencyPunctureLondon from "@/assets/blog/emergency-puncture-london-hero.jpg";
import mobilePunctureRepairLondon from "@/assets/blog/mobile-puncture-repair-london-hero.jpg";
import twentyFourHrPunctureLondon from "@/assets/blog/24-hour-puncture-repair-london-hero.jpg";
import punctureRepairCostUk from "@/assets/blog/puncture-repair-cost-uk-hero.jpg";
import sameDayPunctureLondon from "@/assets/blog/same-day-puncture-repair-london-hero.jpg";
import punctureRepairCentralLondon from "@/assets/blog/puncture-repair-central-london-hero.jpg";
import roadsidePunctureLondon from "@/assets/blog/roadside-puncture-repair-london-hero.jpg";
import canPunctureBeRepairedUk from "@/assets/blog/can-a-puncture-be-repaired-uk-hero.jpg";
import punctureVsNewTyre from "@/assets/blog/puncture-repair-vs-new-tyre-hero.jpg";
import runFlatPunctureLondon from "@/assets/blog/run-flat-puncture-repair-london-hero.jpg";

export type Block =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; html: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; html: string }
  | { type: "table"; caption?: string; head: string[]; rows: string[][] };


export type Faq = { q: string; a: string };

export interface BlogPostProps {
  slug: string;
  title: string;
  metaTitle: string;
  metaDesc: string;
  category: string;
  readMinutes: number;
  datePublished: string;
  dateModified?: string;
  heroImage?:
    | "flat"
    | "runflat"
    | "tpms"
    | "emergencyPunctureLondon"
    | "mobilePunctureRepairLondon"
    | "twentyFourHrPunctureLondon"
    | "punctureRepairCostUk"
    | "sameDayPunctureLondon"
    | "punctureRepairCentralLondon"
    | "roadsidePunctureLondon"
    | "canPunctureBeRepairedUk"
    | "punctureVsNewTyre"
    | "runFlatPunctureLondon";
  intro: string;
  blocks: Block[];
  faqs: Faq[];
  cta?: { headline: string; body: string; label: string };
  related?: { to: string; label: string }[];
}

const heroMap = {
  flat: flatTyreHero,
  runflat: runFlatHero,
  tpms: tpmsHero,
  emergencyPunctureLondon,
  mobilePunctureRepairLondon,
  twentyFourHrPunctureLondon,
  punctureRepairCostUk,
  sameDayPunctureLondon,
  punctureRepairCentralLondon,
  roadsidePunctureLondon,
  canPunctureBeRepairedUk,
  punctureVsNewTyre,
  runFlatPunctureLondon,
};

// Contextual autolinking: a small number of descriptive, high-value links per
// article pointing at the most relevant destination (not everything to "/").
type LinkTarget = { pattern: RegExp; href: string };

const LINK_TARGETS: LinkTarget[] = [
  { pattern: /\bmobile tyre fitting in london\b/i, href: "/areas/london" },
  { pattern: /\bmobile tyre fitting london\b/i, href: "/areas/london" },
  { pattern: /\bmobile tyre fitter in london\b/i, href: "/areas/london" },
  { pattern: /\bmobile tyre fitting in manchester\b/i, href: "/areas/greater-manchester" },
  { pattern: /\bmobile tyre fitting manchester\b/i, href: "/areas/greater-manchester" },
  { pattern: /\bmobile tyre fitting in birmingham\b/i, href: "/areas/west-midlands" },
  { pattern: /\bmobile tyre fitting birmingham\b/i, href: "/areas/west-midlands" },
  { pattern: /\bpuncture repair cost(s)?\b/i, href: "/blog/puncture-repair-cost-uk" },
  { pattern: /\bcost of (a )?puncture repair\b/i, href: "/blog/puncture-repair-cost-uk" },
  { pattern: /\brun-?flat tyres?\b/i, href: "/blog/run-flat-tyres-uk-guide" },
  { pattern: /\bsidewall damage\b/i, href: "/blog/tyre-sidewall-damage-guide" },
  { pattern: /\blegal tread depth\b/i, href: "/blog/uk-tyre-legal-tread-depth" },
  { pattern: /\blocking wheel[- ]nut key\b/i, href: "/blog/locking-wheel-nut-lost-uk" },
  { pattern: /\bmobile tyre fitter(s)?\b/i, href: "/" },
];

const LINK_CLS =
  "text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent font-medium";

// Max contextual autolinks per ARTICLE (not per paragraph).
const AUTOLINK_CAP = 3;

function autolink(html: string, state: { used: number; hrefs: Set<string>; slug: string }): string {
  if (state.used >= AUTOLINK_CAP) return html;
  // Split around existing anchors so we don't nest links, then linkify the rest.
  const parts = html.split(/(<a\b[^>]*>.*?<\/a>)/i);
  for (let idx = 0; idx < parts.length; idx++) {
    if (state.used >= AUTOLINK_CAP) break;
    const seg = parts[idx];
    if (/^<a\b/i.test(seg)) continue;
    let next = seg;
    for (const { pattern, href } of LINK_TARGETS) {
      if (state.used >= AUTOLINK_CAP) break;
      if (state.hrefs.has(href)) continue; // one link per destination per article
      if (href === `/blog/${state.slug}`) continue; // never self-link
      const m = next.match(pattern);
      if (!m || m.index === undefined) continue;
      next =
        next.slice(0, m.index) +
        `<a href="${href}" class="${LINK_CLS}">${m[0]}</a>` +
        next.slice(m.index + m[0].length);
      state.used++;
      state.hrefs.add(href);
    }
    parts[idx] = next;
  }
  return parts.join("");
}


// Rotating micro-CTAs inserted between sections so users always have a way home.
const MICRO_CTAS = [
  { text: "Flat tyre right now?", label: "Message a mobile fitter →" },
  { text: "Need a quote in 30 seconds?", label: "Get an instant price →" },
  { text: "Stuck on the roadside?", label: "Send us your postcode →" },
  { text: "Nail in the tread?", label: "Book a mobile repair →" },
];

const SITE = "https://www.tyrefly.com";

// London content cluster — every London post links to the others (topical authority).
const LONDON_CLUSTER: { to: string; label: string }[] = [
  { to: "/blog/mobile-tyre-fitting-london", label: "Mobile tyre fitting London" },
  { to: "/blog/emergency-puncture-repair-london", label: "Emergency & 24 hour puncture repair London" },
  { to: "/blog/mobile-puncture-repair-london", label: "Mobile puncture repair London" },
  { to: "/blog/roadside-puncture-repair-london", label: "Mobile fitter vs AA & RAC (London roadside)" },
  { to: "/blog/run-flat-puncture-repair-london", label: "Run flat puncture repair London" },
  { to: "/blog/twenty-four-hour-tyre-change-london", label: "24 hour tyre change London" },
  { to: "/blog/flat-tyre-london", label: "Flat tyre in London" },
  { to: "/blog/mobile-tyre-fitter-m25", label: "Mobile tyre fitter on the M25" },
  { to: "/areas/london", label: "Areas we cover in London" },
];

export default function BlogPost(p: BlogPostProps) {
  const url = `${SITE}/blog/${p.slug}`;
  const hero = heroMap[p.heroImage ?? "flat"];
  const imageUrl = `${SITE}${hero}`;
  const isLondon = /london|m25/i.test(`${p.category} ${p.slug}`);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.title,
    description: p.metaDesc,
    image: [imageUrl],
    datePublished: p.datePublished,
    dateModified: p.dateModified ?? p.datePublished,
    inLanguage: "en-GB",
    author: { "@type": "Organization", name: "Tyrefly", url: `${SITE}/` },
    publisher: {
      "@type": "Organization",
      name: "Tyrefly",
      logo: { "@type": "ImageObject", url: `${SITE}/og.jpg` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
      { "@type": "ListItem", position: 3, name: p.title, item: url },
    ],
  };

  // Local service schema so London posts can surface for "near me" style intent.
  const serviceLd = isLondon
    ? {
        "@context": "https://schema.org",
        "@type": "Service",
        name: "Mobile tyre fitting and puncture repair in London",
        serviceType: "Mobile tyre fitting, puncture repair and tyre replacement",
        provider: {
          "@type": "Organization",
          name: "Tyrefly",
          url: `${SITE}/`,
          areaServed: { "@type": "City", name: "London" },
        },
        areaServed: { "@type": "City", name: "London" },
        availableChannel: {
          "@type": "ServiceChannel",
          serviceUrl: `${SITE}/`,
          availableLanguage: "en-GB",
        },
        hoursAvailable: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          opens: "00:00",
          closes: "23:59",
        },
      }
    : null;

  const faqLd = p.faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: p.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

  const jsonLd = [articleLd, breadcrumbLd, serviceLd, faqLd].filter(Boolean) as Record<
    string,
    unknown
  >[];


  // Insert a micro-CTA every ~4 blocks (but not immediately after another CTA/heading pair)
  const CTA_EVERY = 3;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Seo
        title={p.metaTitle}
        description={p.metaDesc}
        canonical={`/blog/${p.slug}`}
        ogImage={imageUrl}
        jsonLd={jsonLd}
      />

      <article className="max-w-2xl mx-auto px-6 py-16">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-8">
          <Link to="/" className="hover:text-accent">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/blog" className="hover:text-accent">Blog</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground/70">{p.title}</span>
        </nav>

        <p className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-4">
          {p.category} · {p.readMinutes} min read
        </p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-[1.1]">
          {p.title}
        </h1>
        <p className="text-xl text-muted-foreground mb-8 leading-relaxed">{p.intro}</p>

        <div className="mb-10 flex flex-wrap gap-3">
          <Link
            to="/"
            className="inline-flex items-center px-5 py-2.5 rounded-full bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90 transition shadow-[var(--shadow-accent)]"
          >
            Book a mobile fitter →
          </Link>
          <Link
            to="/"
            className="inline-flex items-center px-5 py-2.5 rounded-full border border-border text-sm font-semibold hover:bg-muted transition"
          >
            Get an instant quote
          </Link>
        </div>

        <figure className="mb-12 -mx-6 md:mx-0">
          <img
            src={hero}
            alt={p.title}
            width={1600}
            height={896}
            className="w-full h-auto md:rounded-2xl"
            fetchPriority="high"
          />
        </figure>

        <div className="max-w-none space-y-7 text-[17px] leading-[1.85] text-foreground/90">
          {(() => {
            const rendered: JSX.Element[] = [];
            let ctaCount = 0;
            const linkState = { used: 0, hrefs: new Set<string>(), slug: p.slug };
            p.blocks.forEach((b, i) => {
              if (b.type === "h2")
                rendered.push(
                  <h2 key={i} className="text-2xl md:text-3xl font-bold mt-14 mb-2 tracking-tight">
                    {b.text}
                  </h2>
                );
              else if (b.type === "h3")
                rendered.push(
                  <h3 key={i} className="text-xl font-semibold mt-8 mb-1">{b.text}</h3>
                );
              else if (b.type === "p")
                rendered.push(
                  <p key={i} dangerouslySetInnerHTML={{ __html: autolink(b.html, linkState) }} />
                );

              else if (b.type === "quote")
                rendered.push(
                  <blockquote
                    key={i}
                    className="border-l-4 border-accent pl-5 italic text-muted-foreground my-6"
                    dangerouslySetInnerHTML={{ __html: b.html }}
                  />
                );
              else if (b.type === "ul")
                rendered.push(
                  <ul key={i} className="list-disc pl-6 space-y-3 marker:text-accent">
                    {b.items.map((it, j) => (
                      <li key={j} dangerouslySetInnerHTML={{ __html: it }} />
                    ))}
                  </ul>
                );
              else if (b.type === "table")
                rendered.push(
                  <figure key={i} className="not-prose my-8 -mx-6 md:mx-0 overflow-x-auto">
                    <table className="w-full min-w-[520px] text-[15px] border border-border rounded-xl overflow-hidden">
                      <thead className="bg-muted/60">
                        <tr>
                          {b.head.map((h, j) => (
                            <th key={j} className="text-left font-semibold px-4 py-3 border-b border-border">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {b.rows.map((row, j) => (
                          <tr key={j} className="odd:bg-muted/20">
                            {row.map((cell, k) => (
                              <td
                                key={k}
                                className="px-4 py-3 align-top border-b border-border/60"
                                dangerouslySetInnerHTML={{ __html: cell }}
                              />
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {b.caption && (
                      <figcaption className="mt-2 px-6 md:px-0 text-sm text-muted-foreground">
                        {b.caption}
                      </figcaption>
                    )}
                  </figure>
                );
              else
                rendered.push(
                  <ol key={i} className="list-decimal pl-6 space-y-3 marker:text-accent marker:font-semibold">
                    {b.items.map((it, j) => (
                      <li key={j} dangerouslySetInnerHTML={{ __html: it }} />
                    ))}
                  </ol>
                );


              // Insert a slim inline CTA every N blocks, but only after a paragraph/list (not a heading)
              const isBreakable = b.type !== "h2" && b.type !== "h3";
              if (isBreakable && (i + 1) % CTA_EVERY === 0 && i < p.blocks.length - 2) {
                const cta = MICRO_CTAS[ctaCount % MICRO_CTAS.length];
                ctaCount++;
                rendered.push(
                  <Link
                    key={`micro-${i}`}
                    to="/"
                    className="not-prose group my-4 flex items-center justify-between gap-4 px-5 py-4 rounded-xl border border-accent/30 bg-accent/5 hover:bg-accent/10 transition"
                  >
                    <span className="font-semibold text-foreground">{cta.text}</span>
                    <span className="text-sm font-semibold text-accent group-hover:translate-x-0.5 transition">
                      {cta.label}
                    </span>
                  </Link>
                );
              }

              // Bigger mid-article CTA card at the halfway point
              if (i === Math.floor(p.blocks.length / 2)) {
                rendered.push(
                  <aside
                    key={`cta-mid-${i}`}
                    className="not-prose my-12 p-6 md:p-7 rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/10 to-accent/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div>
                      <p className="font-bold text-lg mb-1">Stuck now? Skip the reading.</p>
                      <p className="text-sm text-muted-foreground">
                        Send your postcode on the{" "}
                        <Link to="/" className="text-accent font-semibold underline underline-offset-4">
                          Tyrefly home page
                        </Link>{" "}
                        and we'll dispatch the nearest mobile fitter.
                      </p>
                    </div>
                    <Link
                      to="/"
                      className="inline-flex shrink-0 items-center px-5 py-2.5 rounded-full bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90 transition shadow-[var(--shadow-accent)]"
                    >
                      Get help now →
                    </Link>
                  </aside>
                );
              }
            });
            return rendered;
          })()}

          {p.faqs.length > 0 && (
            <>
              <h2 className="text-2xl md:text-3xl font-bold mt-16 mb-4 tracking-tight">
                Frequently asked questions
              </h2>
              <div className="space-y-6">
                {p.faqs.map((f, i) => (
                  <div key={i} className="p-5 rounded-xl border border-border bg-card">
                    <h3 className="text-lg font-semibold mb-2">{f.q}</h3>
                    <p className="text-foreground/80 leading-relaxed">{f.a}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-14 p-7 md:p-8 rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]">
            <p className="font-bold text-xl mb-2">{p.cta?.headline ?? "Need help right now?"}</p>
            <p className="opacity-80 mb-5 leading-relaxed">
              {p.cta?.body ??
                "Send your postcode and tyre size (e.g. 225/45 R17) and we'll dispatch the closest mobile fitter."}
            </p>
            <Link
              to="/"
              className="inline-flex items-center px-6 py-3 rounded-full bg-accent text-accent-foreground font-semibold hover:opacity-90 transition"
            >
              {p.cta?.label ?? "Get a mobile fitter →"}
            </Link>
          </div>

          {p.related && p.related.length > 0 && (
            <div className="mt-14 pt-8 border-t border-border">
              <p className="text-sm uppercase tracking-widest text-muted-foreground mb-4 font-semibold">
                Related reading
              </p>
              <ul className="grid sm:grid-cols-2 gap-3">
                {p.related.map((r) => (
                  <li key={r.to}>
                    <Link
                      to={r.to}
                      className="block p-4 rounded-xl border border-border hover:border-accent hover:bg-accent/5 transition font-medium"
                    >
                      {r.label} →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isLondon && (
            <div className="mt-14 pt-8 border-t border-border">
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                More London tyre guides
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                Everything we've written about mobile tyre fitting and puncture repair across
                Greater London.
              </p>
              <ul className="grid sm:grid-cols-2 gap-2">
                {LONDON_CLUSTER.filter((l) => !l.to.endsWith(`/${p.slug}`)).map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="block px-4 py-2.5 rounded-lg text-sm hover:bg-accent/5 hover:text-accent transition"
                    >
                      {l.label} →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}


          <div className="mt-10 text-center">
            <Link to="/" className="text-accent font-semibold hover:underline underline-offset-4">
              ← Back to Tyrefly home
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
