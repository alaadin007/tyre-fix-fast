import { Link, Navigate, useParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { getService, SERVICES } from "@/data/services";
import { getArea, AREAS } from "@/data/areas";
import { ServiceShell, CtaPair, FaqBlock } from "@/components/service/ServiceLayout";

export default function ServiceAreaPage() {
  const { service = "", city = "" } = useParams();
  const svc = getService(service);
  const area = getArea(city);
  if (!svc) return <Navigate to="/services" replace />;
  if (!area) return <Navigate to={`/services/${svc.slug}`} replace />;

  const MSG = `Hi Tyrefly — I need ${svc.keyword} in ${area.name}`;
  const path = `/services/${svc.slug}/${area.slug}`;
  const url = `https://www.tyrefly.com${path}`;

  const cap = svc.keyword.charAt(0).toUpperCase() + svc.keyword.slice(1);
  const title = `${cap} ${area.name} | 24/7 Mobile | Tyrefly`.slice(0, 62);
  const description =
    `Mobile ${svc.keyword} in ${area.name}, 24/7 across ${area.region}. ${svc.priceLine}. Text your postcode for a fixed quote in 60 seconds.`.slice(0, 158);

  const intro = svc.cityIntro(area.name, area.region);
  const sections = svc.citySections(area.name, area.region, area.postcodes);
  const faqs = svc.cityFaqs(area.name, area.region);

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: `${cap} in ${area.name}`,
      serviceType: svc.keyword,
      description,
      url,
      provider: {
        "@type": "AutoRepair",
        name: `Tyrefly — ${area.name}`,
        url: `https://www.tyrefly.com/areas/${area.slug}`,
        telephone: "+44-800-000-0000",
        priceRange: "££",
        areaServed: { "@type": "AdministrativeArea", name: area.region },
        openingHoursSpecification: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          opens: "00:00",
          closes: "23:59",
        },
        aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "1200" },
      },
      areaServed: { "@type": "AdministrativeArea", name: area.region },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
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
        { "@type": "ListItem", position: 3, name: svc.name, item: `https://www.tyrefly.com/services/${svc.slug}` },
        { "@type": "ListItem", position: 4, name: area.name, item: url },
      ],
    },
  ];

  const otherServices = SERVICES.filter((s) => s.slug !== svc.slug);
  const nearbyCities = AREAS.filter((a) => a.slug !== area.slug).slice(0, 6);

  return (
    <ServiceShell
      message={MSG}
      breadcrumbs={[
        { to: "/", label: "Home" },
        { to: "/services", label: "Services" },
        { to: `/services/${svc.slug}`, label: svc.name },
        { label: area.name },
      ]}
    >
      <Seo title={title} description={description} canonical={path} jsonLd={ld} />

      <section className="mx-auto w-full max-w-6xl px-5 py-12 md:py-16">
        <div
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
          style={{ backgroundColor: "rgba(255,107,26,0.10)", borderColor: "rgba(255,107,26,0.35)", color: "#FF6B1A" }}
        >
          24/7 across {area.region}
        </div>
        <h1 className="mt-5 text-4xl sm:text-6xl font-bold leading-[0.95] tracking-tight">
          {cap}<br />
          in <span style={{ color: "#FF6B1A" }}>{area.name}</span>
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
        <p className="text-base text-white/75 leading-relaxed">{intro}</p>
        {sections.map((sec, idx) => (
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
            {idx === 0 && (
              <div className="mt-8 rounded-2xl border border-[#FF6B1A]/35 bg-[#FF6B1A]/10 p-6">
                <h3 className="text-lg font-semibold">Need {svc.keyword} in {area.name} now?</h3>
                <p className="mt-2 text-sm text-white/70">
                  Text your postcode — fixed price back in about 60 seconds, any hour.
                </p>
                <CtaPair message={MSG} className="mt-5" />
              </div>
            )}
          </div>
        ))}

        <p className="mt-10 text-sm text-white/60 leading-relaxed">
          Looking for the full picture on our {area.name} coverage, prices and technicians? See our{" "}
          <Link to={`/areas/${area.slug}`} className="underline hover:text-white">
            mobile tyre fitting in {area.name}
          </Link>{" "}
          page, or browse all{" "}
          <Link to="/services" className="underline hover:text-white">mobile tyre services</Link>.
        </p>
      </article>

      <FaqBlock faqs={faqs} heading={`${cap} in ${area.name} — FAQs`} />

      <section className="mx-auto w-full max-w-6xl px-5 py-14">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Other services in {area.name}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {otherServices.map((s) => (
            <Link
              key={s.slug}
              to={`/services/${s.slug}/${area.slug}`}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-[#FF6B1A]/40 transition"
            >
              <h3 className="font-semibold text-sm">{s.name} in {area.name}</h3>
              <p className="mt-1.5 text-xs text-white/60 leading-relaxed">{s.priceLine}</p>
            </Link>
          ))}
        </div>

        <h2 className="mt-12 text-2xl sm:text-3xl font-bold tracking-tight">{cap} in nearby cities</h2>
        <div className="mt-6 flex flex-wrap gap-2">
          {nearbyCities.map((a) => (
            <Link
              key={a.slug}
              to={`/services/${svc.slug}/${a.slug}`}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/80 hover:border-[#FF6B1A]/50 hover:text-[#FF6B1A]"
            >
              {a.name}
            </Link>
          ))}
        </div>

        <h2 className="mt-12 text-2xl sm:text-3xl font-bold tracking-tight">Related guides</h2>
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
