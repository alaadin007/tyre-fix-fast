import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import flatTyreHero from "@/assets/blog/flat-tyre-london-hero.jpg";

const posts = [
  {
    slug: "flat-tyre-london",
    title: "Flat Tyre in London: Causes, Emergency Steps & Mobile Fitter Guide (2026)",
    excerpt:
      "A complete London driver's guide to flat tyres — why they happen, what to do in the first 60 seconds, when to call a mobile fitter, and how to avoid getting stranded on the North Circular at 2am.",
    date: "2026-06-11",
    readMinutes: 12,
    image: flatTyreHero,
  },
];

export default function Blog() {
  return (
    <main className="min-h-screen bg-background">
      <Seo
        title="Tyrefly Blog — Mobile Tyre Tips, Guides & UK Road Help"
        description="Practical guides for UK drivers: flat tyre emergencies, mobile tyre fitting, run-flats, TPMS warnings and roadside safety advice from Tyrefly."
        canonical="/blog"
      />
      <section className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-sm uppercase tracking-widest text-muted-foreground mb-3">Tyrefly Journal</p>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">
          Guides for drivers who'd rather not get stranded.
        </h1>
        <p className="text-lg text-muted-foreground mb-12">
          Mobile tyre advice from a team that fits tyres on the hard shoulder for a living.
        </p>

        <ul className="space-y-8">
          {posts.map((p) => (
            <li key={p.slug} className="border-b border-border pb-8">
              <Link to={`/blog/${p.slug}`} className="group block">
                <img
                  src={p.image}
                  alt={p.title}
                  width={1600}
                  height={896}
                  loading="lazy"
                  className="w-full h-auto rounded-2xl mb-5"
                />
                <time className="text-xs text-muted-foreground">
                  {new Date(p.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · {p.readMinutes} min read
                </time>
                <h2 className="mt-2 text-2xl md:text-3xl font-semibold group-hover:text-primary transition-colors">
                  {p.title}
                </h2>
                <p className="mt-3 text-muted-foreground">{p.excerpt}</p>
                <span className="mt-4 inline-block text-sm font-medium text-primary">Read the guide →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
