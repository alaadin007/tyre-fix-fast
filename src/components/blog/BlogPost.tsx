import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import flatTyreHero from "@/assets/blog/flat-tyre-london-hero.jpg";
import runFlatHero from "@/assets/blog/run-flat-tyres-hero.jpg";
import tpmsHero from "@/assets/blog/tpms-warning-hero.jpg";

export type Block =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; html: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; html: string };

export type Faq = { q: string; a: string };

export interface BlogPostProps {
  slug: string;
  title: string; // H1
  metaTitle: string;
  metaDesc: string;
  category: string;
  readMinutes: number;
  datePublished: string; // YYYY-MM-DD
  heroImage?: "flat" | "runflat" | "tpms";
  intro: string;
  blocks: Block[];
  faqs: Faq[];
  cta?: { headline: string; body: string; label: string };
  related?: { to: string; label: string }[];
}

const heroMap = { flat: flatTyreHero, runflat: runFlatHero, tpms: tpmsHero };

export default function BlogPost(p: BlogPostProps) {
  const url = `https://tyrefly.com/blog/${p.slug}`;
  const hero = heroMap[p.heroImage ?? "flat"];
  const imageUrl = `https://tyrefly.com${hero}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.title,
    description: p.metaDesc,
    image: [imageUrl],
    datePublished: p.datePublished,
    dateModified: p.datePublished,
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
      { "@type": "ListItem", position: 3, name: p.title, item: url },
    ],
  };

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

  const jsonLd = faqLd ? [articleLd, breadcrumbLd, faqLd] : [articleLd, breadcrumbLd];

  return (
    <main className="min-h-screen bg-background">
      <Seo
        title={p.metaTitle}
        description={p.metaDesc}
        canonical={`/blog/${p.slug}`}
        ogImage={imageUrl}
        jsonLd={jsonLd}
      />

      <article className="max-w-3xl mx-auto px-6 py-16">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-8">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/blog" className="hover:text-foreground">Blog</Link>
          <span className="mx-2">/</span>
          <span>{p.title}</span>
        </nav>

        <p className="text-sm uppercase tracking-widest text-muted-foreground mb-3">
          {p.category} · {p.readMinutes} min read
        </p>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6">{p.title}</h1>
        <p className="text-lg text-muted-foreground mb-6">{p.intro}</p>

        <div className="mb-8 flex flex-wrap gap-3">
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
          >
            Book a mobile fitter →
          </Link>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-muted transition"
          >
            Get an instant quote
          </Link>
        </div>

        <figure className="mb-10 -mx-6 md:mx-0">
          <img
            src={hero}
            alt={p.title}
            width={1600}
            height={896}
            className="w-full h-auto md:rounded-2xl"
            fetchPriority="high"
          />
        </figure>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 leading-relaxed">
          {p.blocks.map((b, i) => {
            if (b.type === "h2")
              return (
                <h2 key={i} className="text-2xl font-semibold mt-12">
                  {b.text}
                </h2>
              );
            if (b.type === "h3")
              return (
                <h3 key={i} className="text-xl font-semibold mt-6">
                  {b.text}
                </h3>
              );
            if (b.type === "p")
              return <p key={i} dangerouslySetInnerHTML={{ __html: b.html }} />;
            if (b.type === "quote")
              return (
                <blockquote
                  key={i}
                  className="border-l-4 border-primary pl-4 italic text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: b.html }}
                />
              );
            if (b.type === "ul")
              return (
                <ul key={i} className="list-disc pl-6 space-y-2">
                  {b.items.map((it, j) => (
                    <li key={j} dangerouslySetInnerHTML={{ __html: it }} />
                  ))}
                </ul>
              );
            return (
              <ol key={i} className="list-decimal pl-6 space-y-2">
                {b.items.map((it, j) => (
                  <li key={j} dangerouslySetInnerHTML={{ __html: it }} />
                ))}
              </ol>
            );
          })}

          {p.faqs.length > 0 && (
            <>
              <h2 className="text-2xl font-semibold mt-12">Frequently asked questions</h2>
              <div className="space-y-6">
                {p.faqs.map((f, i) => (
                  <div key={i}>
                    <h3 className="text-lg font-semibold">{f.q}</h3>
                    <p className="mt-2">{f.a}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-12 p-6 rounded-2xl border border-border bg-muted/30">
            <p className="font-semibold mb-2">{p.cta?.headline ?? "Need help right now?"}</p>
            <p className="text-muted-foreground mb-4">
              {p.cta?.body ??
                "Send your postcode and tyre size (e.g. 225/45 R17) and we'll dispatch the closest mobile fitter."}
            </p>
            <Link
              to="/"
              className="inline-flex items-center px-5 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
            >
              {p.cta?.label ?? "Get a mobile fitter →"}
            </Link>
          </div>

          {p.related && p.related.length > 0 && (
            <p className="mt-12 text-sm text-muted-foreground">
              Related reading:{" "}
              {p.related.map((r, i) => (
                <span key={r.to}>
                  <Link to={r.to} className="text-primary hover:underline">
                    {r.label}
                  </Link>
                  {i < p.related!.length - 1 ? ", " : ""}
                </span>
              ))}
            </p>
          )}
        </div>
      </article>
    </main>
  );
}
