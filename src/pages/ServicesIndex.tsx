import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { SERVICES } from "@/data/services";
import { AREAS } from "@/data/areas";
import { ServiceShell, CtaPair } from "@/components/service/ServiceLayout";

const MSG = "Hi Tyrefly — I need a mobile tyre fitter";

export default function ServicesIndex() {
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.tyrefly.com/" },
        { "@type": "ListItem", position: 2, name: "Services", item: "https://www.tyrefly.com/services" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: SERVICES.map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: s.name,
        url: `https://www.tyrefly.com/services/${s.slug}`,
      })),
    },
  ];

  return (
    <ServiceShell message={MSG} breadcrumbs={[{ to: "/", label: "Home" }, { label: "Services" }]}>
      <Seo
        title="Mobile Tyre Services UK — 24/7 Call-Out | Tyrefly"
        description="Mobile puncture repair, tyre replacement, emergency fitting and run-flat fitting across the UK. Text your postcode for a fixed price in 60 seconds, 24/7."
        canonical="/services"
        jsonLd={ld}
      />

      <section className="mx-auto w-full max-w-6xl px-5 py-12 md:py-16">
        <h1 className="text-4xl sm:text-6xl font-bold leading-[0.95] tracking-tight">
          Mobile tyre services<br />
          across the <span style={{ color: "#FF6B1A" }}>UK</span>
        </h1>
        <p className="mt-5 text-lg text-white/70 leading-relaxed max-w-2xl">
          Every Tyrefly job starts with one text. Send your postcode and what's wrong — a vetted local
          technician quotes you in about 60 seconds and comes to your car, 24 hours a day.
        </p>
        <CtaPair message={MSG} className="mt-8" />
      </section>

      <section className="border-t border-white/5 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-6xl px-5 py-14">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">What we do</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {SERVICES.map((s) => (
              <Link
                key={s.slug}
                to={`/services/${s.slug}`}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:border-[#FF6B1A]/40 transition"
              >
                <h3 className="text-lg font-semibold">{s.name}</h3>
                <p className="mt-2 text-sm text-white/65 leading-relaxed">{s.tagline}</p>
                <p className="mt-3 text-xs" style={{ color: "#FF6B1A" }}>{s.priceLine} →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-14">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Service by city</h2>
        <p className="mt-2 text-sm text-white/60">
          Pick your city for local prices, coverage and arrival times — or see all{" "}
          <Link to="/areas" className="underline hover:text-white">service areas</Link>.
        </p>
        <div className="mt-8 space-y-8">
          {SERVICES.map((s) => (
            <div key={s.slug}>
              <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-white/50">{s.name}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {AREAS.map((a) => (
                  <Link
                    key={a.slug}
                    to={`/services/${s.slug}/${a.slug}`}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/80 hover:border-[#FF6B1A]/50 hover:text-[#FF6B1A]"
                  >
                    {s.keyword} in {a.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </ServiceShell>
  );
}
