import { Link, Navigate, useParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { getService } from "@/data/services";
import { AREAS } from "@/data/areas";
import { ServiceShell, CtaPair, FaqBlock } from "@/components/service/ServiceLayout";

export default function ServicePage() {
  const { service = "" } = useParams();
  const svc = getService(service);
  if (!svc) return <Navigate to="/services" replace />;

  const MSG = `Hi Tyrefly — I need ${svc.keyword}`;
  const url = `https://www.tyrefly.com/services/${svc.slug}`;
  const cap0 = svc.keyword.charAt(0).toUpperCase() + svc.keyword.slice(1);
  const title = `Mobile ${svc.keyword} UK — 24/7 Call-Out | Tyrefly`.slice(0, 62);
  const description = `${svc.tagline} ${svc.priceLine}. Text your postcode for a fixed price in 60 seconds, 24/7 UK-wide.`.slice(0, 158);

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: svc.name,
      serviceType: svc.keyword,
      description,
      url,
      provider: { "@type": "AutoRepair", name: "Tyrefly", url: "https://www.tyrefly.com/" },
      areaServed: { "@type": "Country", name: "United Kingdom" },
      availableChannel: { "@type": "ServiceChannel", serviceUrl: url, availableLanguage: "en-GB" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: svc.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.tyrefly.com/" },
        { "@type": "ListItem", position: 2, name: "Services", item: "https://www.tyrefly.com/services" },
        { "@type": "ListItem", position: 3, name: svc.name, item: url },
      ],
    },
  ];

  return (
    <ServiceShell
      message={MSG}
      breadcrumbs={[{ to: "/", label: "Home" }, { to: "/services", label: "Services" }, { label: svc.name }]}
    >
      <Seo title={title} description={description} canonical={`/services/${svc.slug}`} jsonLd={ld} />

      <section className="mx-auto w-full max-w-6xl px-5 py-12 md:py-16">
        <div
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
          style={{ backgroundColor: "rgba(255,107,26,0.10)", borderColor: "rgba(255,107,26,0.35)", color: "#FF6B1A" }}
        >
          {svc.priceLine}
        </div>
        <h1 className="mt-5 text-4xl sm:text-6xl font-bold leading-[0.95] tracking-tight">
          {svc.name}<br />
          <span style={{ color: "#FF6B1A" }}>anywhere in the UK</span>
        </h1>
        <p className="mt-5 text-lg text-white/70 leading-relaxed max-w-2xl">{svc.tagline}</p>
        <CtaPair message={MSG} className="mt-8" />
      </section>

      <section className="border-y border-white/5 bg-white/[0.02]">
        <div className="mx-auto grid w-full max-w-6xl gap-3 px-5 py-10 sm:grid-cols-2">
          {svc.bullets.map((b) => (
            <p key={b} className="text-sm text-white/75">
              <span style={{ color: "#FF6B1A" }}>✓</span> {b}
            </p>
          ))}
        </div>
      </section>

      <article className="mx-auto w-full max-w-3xl px-5 py-14">
        <p className="text-base text-white/75 leading-relaxed">{svc.intro}</p>
        {svc.sections.map((sec) => (
          <div key={sec.h2} className="mt-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{sec.h2}</h2>
            {sec.paragraphs.map((p, i) => (
              <p key={i} className="mt-4 text-base text-white/70 leading-relaxed">{p}</p>
            ))}
            {sec.bullets && (
              <ul className="mt-4 space-y-2">
                {sec.bullets.map((b) => (
                  <li key={b} className="text-sm text-white/70 leading-relaxed">
                    <span style={{ color: "#FF6B1A" }}>•</span> {b}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        <div className="mt-12 rounded-2xl border border-[#FF6B1A]/35 bg-[#FF6B1A]/10 p-6">
          <h2 className="text-xl font-semibold">Need {svc.keyword} right now?</h2>
          <p className="mt-2 text-sm text-white/70">
            Text your postcode and we'll come to you — 24/7, fixed price up front.
          </p>
          <CtaPair message={MSG} className="mt-5" />
        </div>
      </article>

      <section className="border-t border-white/5">
        <div className="mx-auto w-full max-w-6xl px-5 py-14">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{svc.name} by city</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {AREAS.map((a) => (
              <Link
                key={a.slug}
                to={`/services/${svc.slug}/${a.slug}`}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/80 hover:border-[#FF6B1A]/50 hover:text-[#FF6B1A]"
              >
                {svc.keyword} in {a.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <FaqBlock faqs={svc.faqs} heading={`${svc.name} FAQs`} />

      <section className="mx-auto w-full max-w-6xl px-5 py-14">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Related guides</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {svc.guides.map((g) => (
            <Link
              key={g.to}
              to={g.to}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-sm hover:border-[#FF6B1A]/40 hover:text-[#FF6B1A] transition"
            >
              {g.label} →
            </Link>
          ))}
        </div>
      </section>
    </ServiceShell>
  );
}
