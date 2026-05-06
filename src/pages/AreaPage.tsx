import { Link, useParams, Navigate } from "react-router-dom";
import { MessageSquare, Phone, Clock, ShieldCheck, MapPin, Sparkles, Star, PoundSterling } from "lucide-react";
import { Seo } from "@/components/Seo";
import { getArea, AREAS } from "@/data/areas";
import { SUPPORT_WHATSAPP, SUPPORT_WA_DISPLAY, waLink } from "@/lib/whatsapp";
import logo from "@/assets/tyrefly-logo.png";

const MSG_BODY = "Hi Tyre Fly — I need a mobile tyre fitter";

export default function AreaPage() {
  const { slug = "" } = useParams();
  const area = getArea(slug);
  if (!area) return <Navigate to="/" replace />;

  const WA_HREF = waLink(SUPPORT_WHATSAPP, `${MSG_BODY} in ${area.name}`);
  const SMS_HREF = `sms:${SUPPORT_WHATSAPP}?&body=${encodeURIComponent(`${MSG_BODY} in ${area.name}`)}`;

  const title = `Mobile Tyre Fitter ${area.name} — 24/7 Call-Out | Tyre Fly`;
  const description = `Flat tyre in ${area.name}? WhatsApp Tyre Fly and a vetted mobile tyre fitter is at your kerb fast. 24/7 across ${area.region}. Quote in 60 seconds.`;

  const localBusinessLd = {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    name: `Tyre Fly — ${area.name}`,
    description,
    url: `https://tyrefly.com/areas/${area.slug}`,
    image: "https://tyrefly.com/og.jpg",
    telephone: "+44-800-000-0000",
    areaServed: { "@type": "AdministrativeArea", name: area.region },
    priceRange: "££",
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
      opens: "00:00",
      closes: "23:59",
    },
    aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "1200" },
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Do you cover all of ${area.region}?`,
        acceptedAnswer: { "@type": "Answer", text: area.faqAnswer },
      },
      {
        "@type": "Question",
        name: `How fast can a mobile tyre fitter reach me in ${area.name}?`,
        acceptedAnswer: { "@type": "Answer", text: `Most jobs in ${area.name} get a quote within 60 seconds and a fitter on-site within 35–90 minutes, 24/7.` },
      },
      {
        "@type": "Question",
        name: "How much does it cost?",
        acceptedAnswer: { "@type": "Answer", text: "A £20 booking fee secures your slot and is deducted from your final bill. The technician collects the remainder on-site by card, link, transfer or cash." },
      },
      {
        "@type": "Question",
        name: "Do you fit tyres at night?",
        acceptedAnswer: { "@type": "Answer", text: `Yes — Tyre Fly operates 24/7 across ${area.region}, including weekends and bank holidays.` },
      },
    ],
  };

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://tyrefly.com/" },
      { "@type": "ListItem", position: 2, name: "Service Areas", item: "https://tyrefly.com/areas" },
      { "@type": "ListItem", position: 3, name: area.name, item: `https://tyrefly.com/areas/${area.slug}` },
    ],
  };

  return (
    <main
      className="min-h-screen w-full overflow-x-hidden text-white"
      style={{ backgroundColor: "#0D0D0D", fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}
    >
      <Seo
        title={title}
        description={description}
        canonical={`/areas/${area.slug}`}
        jsonLd={[localBusinessLd, faqLd, breadcrumbsLd]}
      />

      {/* Nav */}
      <header className="w-full border-b border-white/5">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="Tyre Fly" width={36} height={36} className="h-9 w-9 object-contain" />
            <span className="text-[20px] font-bold tracking-tight">
              Tyre <span style={{ color: "#FF6B1A" }}>Fly</span>
            </span>
          </Link>
          <a href={WA_HREF} target="_blank" rel="noopener noreferrer"
             className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:border-white/40 hover:text-white">
            <Phone className="h-3.5 w-3.5" /> WhatsApp {SUPPORT_WA_DISPLAY}
          </a>
        </div>
      </header>

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mx-auto w-full max-w-6xl px-5 pt-6 text-xs text-white/50">
        <Link to="/" className="hover:text-white">Home</Link> ›{" "}
        <Link to="/areas" className="hover:text-white">Service areas</Link> ›{" "}
        <span className="text-white/80">{area.name}</span>
      </nav>

      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-5 py-12 md:py-16">
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
             style={{ backgroundColor: "rgba(255,107,26,0.10)", borderColor: "rgba(255,107,26,0.35)", color: "#FF6B1A" }}>
          <MapPin className="h-3.5 w-3.5" /> Serving {area.region}
        </div>
        <h1 className="mt-5 text-4xl sm:text-6xl font-bold leading-[0.95] tracking-tight">
          Mobile tyre fitter<br />
          in <span style={{ color: "#FF6B1A" }}>{area.name}</span>
        </h1>
        <p className="mt-5 text-lg text-white/70 leading-relaxed max-w-2xl">
          {area.shortPitch} WhatsApp us — a vetted local technician quotes you in under 60 seconds and is at your kerb 24/7.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md">
          <a href={WA_HREF} target="_blank" rel="noopener noreferrer"
             className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 text-base font-semibold transition-transform active:scale-[0.98]"
             style={{ backgroundColor: "#25D366", color: "#0D0D0D", height: "58px" }}>
            <MessageSquare className="h-5 w-5" strokeWidth={2.5} /> WhatsApp us
          </a>
          <a href={SMS_HREF}
             className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 text-base font-semibold transition-transform active:scale-[0.98]"
             style={{ backgroundColor: "#FF6B1A", color: "#0D0D0D", height: "58px" }}>
            <MessageSquare className="h-5 w-5" strokeWidth={2.5} /> Text us
          </a>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-white/5 bg-white/[0.02]">
        <div className="mx-auto grid w-full max-w-6xl gap-4 px-5 py-10 sm:grid-cols-3">
          {[
            { icon: Clock, title: "60-second quote", body: `Live ${area.name} technicians, AI-matched.` },
            { icon: PoundSterling, title: "£20 booking fee*", body: "Deducted from final bill. Pay tech on-site." },
            { icon: ShieldCheck, title: "Vetted & insured", body: "Public liability + ID-checked fitters." },
          ].map((b) => (
            <div key={b.title} className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                   style={{ backgroundColor: "rgba(255,107,26,0.15)" }}>
                <b.icon className="h-5 w-5" style={{ color: "#FF6B1A" }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{b.title}</h3>
                <p className="text-xs text-white/60 mt-0.5">{b.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Coverage */}
      <section className="mx-auto w-full max-w-6xl px-5 py-14">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Areas we cover in {area.region}
        </h2>
        <p className="mt-2 text-sm text-white/60">
          Postcodes: <span className="text-white/80">{area.postcodes}</span>
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {area.hubs.map((h) => (
            <span key={h} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/80">
              {h}
            </span>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="border-t border-white/5 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-6xl px-5 py-14">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Mobile tyre services in {area.name}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Puncture repair", body: `Fast roadside puncture repair across ${area.name}. We assess and either plug, patch or replace.` },
              { title: "Emergency tyre replacement", body: `Run-flat, blowout or sidewall damage — new tyre fitted at your location, day or night.` },
              { title: "Run-flat fitting", body: `BMW, Mini & Mercedes run-flats stocked across our ${area.region} fitter network.` },
              { title: "Locking wheel nut removal", body: `Lost the key? Our techs carry master sets and can remove and replace.` },
              { title: "TPMS reset", body: `Tyre pressure sensor diagnostics and replacements available on most jobs.` },
              { title: "Fleet & van support", body: `Account-billed mobile tyre support for ${area.name} fleets and last-mile couriers.` },
            ].map((s) => (
              <div key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-white/60 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto w-full max-w-3xl px-5 py-14">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">FAQ — {area.name}</h2>
        <div className="mt-6 space-y-4">
          {[
            { q: `Do you cover all of ${area.region}?`, a: area.faqAnswer },
            { q: `How fast can a mobile tyre fitter reach me in ${area.name}?`, a: `Most jobs in ${area.name} get a quote within 60 seconds and a fitter on-site within 35–90 minutes, 24/7.` },
            { q: "How much does it cost?", a: "A £20 booking fee secures your slot and is deducted from your final bill. The technician collects the remainder on-site by card, link, transfer or cash." },
            { q: "Do you fit tyres at night?", a: `Yes — Tyre Fly operates 24/7 across ${area.region}, including weekends and bank holidays.` },
          ].map((f) => (
            <details key={f.q} className="group rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <summary className="cursor-pointer list-none font-semibold flex items-center justify-between">
                {f.q}
                <span className="text-[#FF6B1A] group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-3 text-sm text-white/70 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section className="border-t border-white/5 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-6xl px-5 py-14">
          <div className="flex items-center gap-2 mb-6">
            {[0,1,2,3,4].map((i) => (
              <Star key={i} className="h-5 w-5" style={{ color: "#FF6B1A" }} fill="#FF6B1A" />
            ))}
            <span className="text-sm text-white/70">4.9 · trusted by drivers across {area.region}</span>
          </div>
          <p className="text-white/80 max-w-2xl">
            "Texted Tyre Fly from a layby in {area.name}. Quote in 40 seconds, fitter at my kerb in under an hour. Brilliant."
            <span className="block mt-2 text-xs text-white/50">— verified customer · {area.name}</span>
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto w-full max-w-4xl px-5 py-20 text-center">
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
          Stuck in {area.name}? <span style={{ color: "#FF6B1A" }}>Send the message.</span>
        </h2>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
          <a href={WA_HREF} target="_blank" rel="noopener noreferrer"
             className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 text-base font-semibold transition-transform active:scale-[0.98]"
             style={{ backgroundColor: "#25D366", color: "#0D0D0D", height: "58px" }}>
            <MessageSquare className="h-5 w-5" strokeWidth={2.5} /> WhatsApp us
          </a>
          <a href={SMS_HREF}
             className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 text-base font-semibold transition-transform active:scale-[0.98]"
             style={{ backgroundColor: "#FF6B1A", color: "#0D0D0D", height: "58px" }}>
            <MessageSquare className="h-5 w-5" strokeWidth={2.5} /> Text us
          </a>
        </div>
      </section>

      {/* Other areas */}
      <section className="border-t border-white/5">
        <div className="mx-auto w-full max-w-6xl px-5 py-12">
          <h2 className="text-sm uppercase tracking-[0.2em] text-white/50 font-semibold">Other service areas</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {AREAS.filter((a) => a.slug !== area.slug).map((a) => (
              <Link key={a.slug} to={`/areas/${a.slug}`}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70 hover:border-white/30 hover:text-white">
                {a.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 text-xs text-white/40">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <span>© Tyre Fly · UK-wide mobile tyre fitting</span>
            <div className="flex items-center gap-4">
              <Link to="/areas" className="hover:text-white/70">All areas</Link>
              <Link to="/privacy" className="hover:text-white/70">Privacy</Link>
              <Link to="/terms" className="hover:text-white/70">Terms</Link>
            </div>
          </div>
          <p className="mt-4 text-[10px] text-white/30 leading-relaxed">
            *Tyre Fly is a marketplace connecting customers with independent vetted technicians across the UK. The work contract is between you and the attending technician. See <Link to="/terms" className="underline hover:text-white/60">Terms</Link>.
          </p>
        </div>
      </footer>
    </main>
  );
}
