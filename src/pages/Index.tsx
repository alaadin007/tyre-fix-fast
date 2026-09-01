import { MessageSquare, Star, ShieldCheck, MapPin, Sparkles, Clock, PoundSterling, Wrench, Phone } from "lucide-react";
import { Link } from "@/lib/router-compat";
import logo from "@/assets/tyrefly-logo.png";
import heroTruck from "@/assets/tyrefly-hero-truck.jpg";
import { WhatsAppChatCta } from "@/components/WhatsAppChatCta";
import { Seo } from "@/components/Seo";
import { AREAS } from "@/data/areas";

import { SUPPORT_WHATSAPP, SUPPORT_WA_DISPLAY, waLink } from "@/lib/whatsapp";

const SMS_NUMBER = SUPPORT_WHATSAPP;
const MSG_BODY = "Hi Tyrefly — I need tyre help";
const WA_HREF = waLink(SUPPORT_WHATSAPP, MSG_BODY);
const SMS_HREF = `sms:${SMS_NUMBER}?&body=${encodeURIComponent(MSG_BODY)}`;

const HOME_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Tyrefly",
    url: "https://www.tyrefly.com/",
    logo: "https://www.tyrefly.com/favicon.png",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Tyrefly",
    url: "https://www.tyrefly.com/",
  },
  {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    "@id": "https://www.tyrefly.com/#business",
    name: "Tyrefly",
    description:
      "24/7 mobile tyre fitting and emergency puncture repair across the UK, booked by WhatsApp. Vetted local technicians come to your car at home, work or roadside.",
    url: "https://www.tyrefly.com/",
    logo: "https://www.tyrefly.com/favicon.png",
    image: "https://www.tyrefly.com/og.jpg",
    telephone: SUPPORT_WA_DISPLAY,
    priceRange: "££",
    areaServed: [
      "London", "Greater Manchester", "West Midlands", "West Yorkshire", "Merseyside",
      "South Yorkshire", "Tyne and Wear", "Bristol", "Edinburgh", "Glasgow", "Cardiff", "Belfast",
    ].map((n) => ({ "@type": "AdministrativeArea", name: n })),
    address: { "@type": "PostalAddress", addressCountry: "GB" },
    currenciesAccepted: "GBP",
    paymentAccepted: "Card, Bank transfer, Cash, Payment link",
    serviceArea: { "@type": "Country", name: "United Kingdom" },
    openingHours: "Mo-Su 00:00-23:59",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "00:00",
        closes: "23:59",
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Mobile tyre fitting and emergency puncture repair",
    provider: { "@id": "https://www.tyrefly.com/#business" },
    areaServed: { "@type": "Country", name: "United Kingdom" },
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: "https://www.tyrefly.com/",
      availableLanguage: "en-GB",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Mobile tyre services",
      itemListElement: [
        "Emergency puncture repair",
        "Mobile tyre replacement",
        "Run-flat tyre fitting",
        "Locking wheel nut removal",
        "Wheel balancing",
        "TPMS and valve replacement",
      ].map((n) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: n } })),
    },
  },

  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "How fast can a mobile tyre fitter get to me?", acceptedAnswer: { "@type": "Answer", text: "Most UK jobs get a quote in under 60 seconds and a vetted technician on-site within 35–90 minutes, 24/7." } },
      { "@type": "Question", name: "How much does Tyrefly cost?", acceptedAnswer: { "@type": "Answer", text: "A £20 booking fee secures your slot and is deducted from your final bill. The technician collects the remainder on-site by card, link, transfer or cash." } },
      { "@type": "Question", name: "Where in the UK do you operate?", acceptedAnswer: { "@type": "Answer", text: "Tyrefly covers all major UK cities and motorways including London, Manchester, Birmingham, Leeds, Liverpool, Sheffield, Newcastle, Bristol, Edinburgh, Glasgow, Cardiff and Belfast — 24/7." } },
      { "@type": "Question", name: "Do you fit tyres at night?", acceptedAnswer: { "@type": "Answer", text: "Yes — Tyrefly operates 24 hours a day, 7 days a week including weekends and bank holidays." } },
    ],
  },
];

const Index = () => {
  return (
    <main
      className="min-h-screen w-full overflow-x-hidden text-white"
      style={{ backgroundColor: "#0D0D0D", fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}
    >
      <Seo
        title="Mobile Tyre Fitter UK — 24/7 Call-Out via WhatsApp | Tyrefly"
        description="Flat tyre? WhatsApp Tyrefly and a vetted mobile tyre fitter UK quotes in 60 seconds. 24/7 call-out across London, Manchester, Birmingham and the UK."
        canonical="/"
        jsonLd={HOME_LD}
      />
      {/* ===== Top nav ===== */}
      <header className="w-full border-b border-white/5">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
          <a href="/" className="flex items-center gap-2.5" aria-label="Tyrefly home">
            <img src={logo} alt="Tyrefly logo" width={36} height={36} className="h-9 w-9 object-contain" />
            <span className="text-[20px] font-bold tracking-tight">
              Tyre<span style={{ color: "#FF6B1A" }}>fly</span>
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm text-white/70">
            <a href="#how" className="hover:text-white">How it works</a>
            <Link to="/services" className="hover:text-white">Services</Link>
            <Link to="/areas" className="hover:text-white">Areas</Link>
            <Link to="/blog" className="hover:text-white">Blog</Link>
            <a href="#reviews" className="hover:text-white">Reviews</a>
            <a href="/technician/login/" className="hover:text-white">For technicians</a>
          </nav>
          <a
            href={WA_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:border-white/40 hover:text-white"
          >
            <Phone className="h-3.5 w-3.5" /> WhatsApp {SUPPORT_WA_DISPLAY}
          </a>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="relative w-full">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 py-12 md:grid-cols-2 md:py-20">
          {/* Left: copy */}
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
              style={{ backgroundColor: "rgba(255,107,26,0.10)", borderColor: "rgba(255,107,26,0.35)", color: "#FF6B1A" }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              WhatsApp AI · live UK-wide
            </div>

            <h1 className="mt-5 text-5xl sm:text-6xl md:text-7xl font-bold leading-[0.95] tracking-tight">
              Flat tyre?<br />
              <span style={{ color: "#FF6B1A" }}>We fly to you.</span>
              <span className="mt-4 block text-xl sm:text-2xl font-semibold tracking-tight text-white/65">
                Mobile tyre fitter UK — 24/7 call-out
              </span>
            </h1>

            <p className="mt-6 text-lg text-white/70 leading-relaxed max-w-lg">
              <span className="text-white font-medium">WhatsApp AI</span> matches you with your nearest mobile tyre fitter UK-wide in seconds.
              One message — your local pro quotes you in under 60 seconds, comes to your kerb, and gets you rolling. Puncture repair,
              tyre replacement or an emergency fit, day or night.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 max-w-md">
              <a
                href={WA_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-col items-center justify-center gap-1.5 rounded-2xl px-4 py-5 text-base font-semibold shadow-lg transition-transform active:scale-[0.97] hover:scale-[1.02]"
                style={{ backgroundColor: "#25D366", color: "#0D0D0D", minHeight: "88px", boxShadow: "0 10px 30px -10px rgba(37,211,102,0.5)" }}
              >
                <MessageSquare className="h-6 w-6" strokeWidth={2.5} />
                WhatsApp us
              </a>
              <a
                href={SMS_HREF}
                className="inline-flex flex-col items-center justify-center gap-1.5 rounded-2xl px-4 py-5 text-base font-semibold shadow-lg transition-transform active:scale-[0.97] hover:scale-[1.02]"
                style={{ backgroundColor: "#FF6B1A", color: "#0D0D0D", minHeight: "88px", boxShadow: "0 10px 30px -10px rgba(255,107,26,0.5)" }}
              >
                <MessageSquare className="h-6 w-6" strokeWidth={2.5} />
                Text us
              </a>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/60">
              <span className="inline-flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5" style={{ color: "#FF6B1A" }} fill="#FF6B1A" /> 4.9 rated · 1,200+ jobs
              </span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Fully insured</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> 24/7 response</span>
            </div>
          </div>

          {/* Right: truck image */}
          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] blur-2xl opacity-40" style={{ backgroundColor: "#FF6B1A" }} />
            <img
              src={heroTruck}
              alt="Tyrefly mobile fitting van with a technician changing a tyre at the kerbside"
              width={1536}
              height={1024}
              className="relative w-full rounded-2xl border border-white/10 object-cover shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section id="how" className="border-y border-white/5 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-6xl px-5 py-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center">How Tyrefly works</h2>
          <p className="mt-3 text-center text-white/60 max-w-xl mx-auto">
            No app. No call centre. Just WhatsApp and a real technician.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Message us",
                body: "WhatsApp or SMS your postcode and a photo of the damage. Our AI gets the basics in seconds.",
                icon: MessageSquare,
              },
              {
                step: "02",
                title: "AI matches your nearest pro",
                body: "We instantly ping verified mobile fitters near you. Our local pro quotes you in under 60 seconds.",
                icon: Sparkles,
              },
              {
                step: "03",
                title: "Pay, confirmed, fitted",
                body: "Tap the deposit link sent on WhatsApp + SMS. Job is booked, your technician is on the way.",
                icon: Wrench,
              },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold" style={{ color: "#FF6B1A" }}>{s.step}</span>
                  <s.icon className="h-5 w-5 text-white/60" />
                </div>
                <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-white/60 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Services ===== */}
      <section id="services" className="mx-auto w-full max-w-6xl px-5 py-16">
        <div className="grid gap-10 md:grid-cols-2 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Whatever the wheel needs.
            </h2>
            <p className="mt-3 text-white/60 leading-relaxed max-w-md">
              From a 2am motorway blowout to a Saturday morning tyre swap — every job comes to you.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2 max-w-md">
              {[
                "Punctures",
                "Blowouts",
                "Tyre changes",
                "Locked wheels",
                "Run-flats",
                "Seasonal swaps",
                "Wheel balancing",
                "Valves & TPMS",
              ].map((s) => (
                <div key={s} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#FF6B1A" }} />
                  {s}
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            {[
              { icon: Clock, title: "Under 60s quote", body: "Our AI dispatcher polls live technicians and surfaces the fastest, cheapest match." },
              { icon: PoundSterling, title: "Transparent pricing", body: "Small booking fee* secures your slot (£20 UK · $25 US/Canada · €25 Europe) — and is deducted from your final bill. Pay the technician on-site by card, link, transfer or cash." },
              { icon: ShieldCheck, title: "Vetted & insured", body: "Every fitter is approved by our team. Public liability + ID verified before they get a job." },
            ].map((b) => (
              <div key={b.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(255,107,26,0.15)" }}>
                    <b.icon className="h-5 w-5" style={{ color: "#FF6B1A" }} />
                  </div>
                  <h3 className="text-lg font-semibold">{b.title}</h3>
                </div>
                <p className="mt-2 text-sm text-white/60 leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Service Areas ===== */}
      <section id="areas" className="border-t border-white/5">
        <div className="mx-auto w-full max-w-6xl px-5 py-16">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#FF6B1A] font-semibold">Coverage</p>
              <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">Mobile tyre fitters across the UK</h2>
              <p className="mt-2 text-white/60 max-w-xl text-sm">From London to Glasgow — pick your area for local coverage and 24/7 dispatch.</p>
            </div>
            <Link to="/areas" className="text-sm text-[#FF6B1A] hover:underline">View all areas →</Link>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {AREAS.map((a) => (
              <Link key={a.slug} to={`/areas/${a.slug}`}
                    className="group rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:border-[#FF6B1A]/40 transition">
                <div className="flex items-center gap-2 text-white/50 text-[10px] uppercase tracking-wider">
                  <MapPin className="h-3 w-3" /> {a.region}
                </div>
                <p className="mt-1.5 font-semibold group-hover:text-[#FF6B1A]">Mobile tyre fitter {a.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Pricing & what we fix ===== */}
      <section id="pricing" className="border-t border-white/5">
        <div className="mx-auto w-full max-w-6xl px-5 py-16">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#FF6B1A] font-semibold">Prices</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
            What mobile tyre fitting costs in the UK
          </h2>
          <p className="mt-3 text-white/60 max-w-2xl text-sm leading-relaxed">
            Every job is quoted before anyone sets off, so there is no meter running and no surprise
            call-out charge on the invoice. These are the typical all-in ranges our vetted technicians
            quote across the UK in 2026 — London and remote rural jobs sit at the top of each band.
          </p>

          <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-white/[0.04] text-white/70">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Job</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Typical all-in price</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Usual arrival</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/75">
                {[
                  ["Mobile puncture repair", "£45 – £70", "35 – 90 mins"],
                  ["Emergency call-out, nights & weekends", "£75 – £110", "40 – 90 mins"],
                  ["Tyre supplied and fitted (common sizes)", "£95 – £180", "1 – 3 hours"],
                  ["Run-flat supplied and fitted", "£150 – £320", "1 – 4 hours"],
                  ["Locking wheel nut removal", "+£20 – £40", "with the job"],
                  ["Wheel balancing (per wheel)", "£12 – £20", "with the job"],
                ].map((r) => (
                  <tr key={r[0]}>
                    <th scope="row" className="px-4 py-3 font-medium text-white/90">{r[0]}</th>
                    <td className="px-4 py-3">{r[1]}</td>
                    <td className="px-4 py-3">{r[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-white/40">
            A £20 booking fee secures the slot and comes off the final bill. The balance is paid to the
            technician on-site.
          </p>
        </div>
      </section>

      {/* ===== Guides ===== */}
      <section id="guides" className="border-t border-white/5 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-6xl px-5 py-16">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#FF6B1A] font-semibold">Guides</p>
              <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">Tyre advice worth reading first</h2>
              <p className="mt-2 text-white/60 max-w-xl text-sm">
                Written by fitters who do this at 2am on the hard shoulder.
              </p>
            </div>
            <Link to="/blog" className="text-sm text-[#FF6B1A] hover:underline">All guides →</Link>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { to: "/blog/emergency-puncture-repair-london", label: "Emergency puncture repair in London" },
              { to: "/blog/puncture-repair-cost-uk", label: "What a puncture repair should cost" },
              { to: "/blog/can-a-puncture-be-repaired-uk", label: "Can your puncture actually be repaired?" },
              { to: "/blog/can-i-drive-on-a-flat-tyre-uk", label: "Can you drive on a flat tyre?" },
              { to: "/blog/tyre-blowout-on-motorway-what-to-do", label: "Blowout on the motorway: what to do" },
              { to: "/blog/uk-tyre-legal-tread-depth", label: "UK legal tread depth explained" },
            ].map((g) => (
              <Link
                key={g.to}
                to={g.to}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-sm hover:border-[#FF6B1A]/40 hover:text-[#FF6B1A] transition"
              >
                {g.label} →
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Reviews ===== */}
      <section id="reviews" className="border-t border-white/5 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-6xl px-5 py-16">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="flex items-center gap-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="h-5 w-5" style={{ color: "#FF6B1A" }} fill="#FF6B1A" />
              ))}
            </div>
            <span className="text-sm text-white/70">4.9 · 1,200+ jobs</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { quote: "Texted at 11pm on the M25. Fitter arrived in 38 mins. Lifesaver.", name: "Sarah K.", meta: "London" },
              { quote: "No app, no faff. One WhatsApp message and sorted in the morning.", name: "James R.", meta: "Manchester" },
              { quote: "Cheaper than the AA and twice as fast. Will use again.", name: "Priya M.", meta: "Birmingham" },
            ].map((t, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center gap-0.5 mb-3">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <Star key={s} className="h-3.5 w-3.5" style={{ color: "#FF6B1A" }} fill="#FF6B1A" />
                  ))}
                </div>
                <p className="text-sm text-white/85 leading-relaxed">"{t.quote}"</p>
                <p className="mt-3 text-xs text-white/50">{t.name} · {t.meta}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Long-form: what we do ===== */}
      <section id="about" className="border-t border-white/5">
        <div className="mx-auto w-full max-w-3xl px-5 py-16 space-y-6 text-white/70 leading-relaxed">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Mobile tyre fitting and puncture repair, wherever you're stuck
          </h2>
          <p>
            Tyrefly is a UK-wide mobile tyre fitting service built for the moment a tyre lets you
            down. There's no app to download and no call centre queue: you send one WhatsApp message
            with your postcode, your number plate and a photo of the damage, and a vetted local
            technician comes to your driveway, your office car park or the hard shoulder. Most
            customers get a fixed quote back inside 60 seconds and a fitter on site within 35 to 90
            minutes, at any hour of the day or night.
          </p>

          <h3 className="text-xl font-semibold text-white">Puncture repair vs. a new tyre</h3>
          <p>
            Not every flat needs a replacement. A puncture repair is legal and safe in the UK when
            the damage sits in the central three-quarters of the tread, the hole is no wider than
            6&nbsp;mm, and the tyre hasn't been driven on while flat. Our technicians carry out a
            proper internal plug-and-patch repair to BS AU 159 standards rather than a temporary
            external plug, so the fix lasts the life of the tyre. If the damage is in the sidewall or
            shoulder, if the inner liner is scuffed from running deflated, or if the tread is already
            close to the 1.6&nbsp;mm legal limit, the honest answer is a new tyre — and we'll tell
            you which it is before you commit to anything. Read more on{" "}
            <Link to="/blog/can-a-puncture-be-repaired-uk" className="underline hover:text-white">
              when a puncture can be repaired
            </Link>{" "}
            and how{" "}
            <Link to="/blog/puncture-repair-cost-uk" className="underline hover:text-white">
              puncture repair costs
            </Link>{" "}
            compare with a replacement.
          </p>

          <h3 className="text-xl font-semibold text-white">What our mobile tyre fitters handle</h3>
          <p>
            The vans carry everything a fixed garage bay would: a mobile tyre changer and balancer,
            torque wrenches, TPMS programming tools, locking-nut removal kits and a working stock of
            common sizes for cars, vans and light commercials. Typical jobs include emergency
            puncture repair, same-day tyre replacement, run-flat fitting, blowout recovery on
            motorways and A-roads, valve and TPMS sensor replacement, wheel balancing, and swapping
            a space-saver back to a full-size wheel. Run-flats and low-profile performance tyres are
            routine work rather than an exception, and every wheel is torqued to the manufacturer's
            spec and rebalanced before the technician leaves.
          </p>

          <h3 className="text-xl font-semibold text-white">Coverage across the UK</h3>
          <p>
            Mobile tyre fitting in London is our busiest service — congestion and parking make a trip
            to a tyre bay a half-day job — but the network runs nationwide. Technicians cover
            Manchester, Birmingham, Leeds, Liverpool, Sheffield, Newcastle, Bristol, Nottingham,
            Glasgow, Edinburgh, Cardiff and Belfast, plus the M25, M1, M6 and M4 corridors. Because
            the fitters are independent and locally based, the person who turns up actually knows the
            roads. You can check{" "}
            <Link to="/areas" className="underline hover:text-white">coverage in your area</Link> or
            browse the full list of{" "}
            <Link to="/services" className="underline hover:text-white">mobile tyre services</Link>.
          </p>

          <h3 className="text-xl font-semibold text-white">Pricing that doesn't move</h3>
          <p>
            The price you're quoted on WhatsApp is the price you pay. A £20 booking fee secures the
            slot and is deducted from the final bill; the technician takes the balance on site by
            card, payment link, bank transfer or cash. There are no call-out surcharges for evenings,
            weekends or bank holidays, and no hidden disposal or balancing extras bolted on at the
            end. If a technician can't complete the job, the booking fee is refunded.
          </p>

          <h3 className="text-xl font-semibold text-white">If you're stranded right now</h3>
          <p>
            Get the vehicle somewhere safe first. On a motorway, pull onto the hard shoulder as far
            left as you can, exit through the passenger door, and wait behind the barrier — never
            attempt a wheel change in a live lane. On an ordinary road, park on level ground, put the
            hazards on, and only change the wheel yourself if you're clear of traffic. Then message
            us your location: a what3words address, a dropped WhatsApp pin or a postcode all work.
            Driving on a fully deflated tyre destroys the sidewall within a few hundred metres and
            can damage the wheel itself, so it's usually cheaper to wait than to limp home.
          </p>
        </div>
      </section>

      {/* ===== FAQs (visible — mirrors FAQPage schema) ===== */}
      <section id="faqs" className="border-t border-white/5">
        <div className="mx-auto w-full max-w-3xl px-5 py-16">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Mobile tyre fitting FAQs</h2>
          <div className="mt-6 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03]">
            {[
              { q: "How fast can a mobile tyre fitter get to me?", a: "Most UK jobs get a quote in under 60 seconds and a vetted technician on-site within 35–90 minutes, 24/7." },
              { q: "How much does Tyrefly cost?", a: "A £20 booking fee secures your slot and is deducted from your final bill. The technician collects the remainder on-site by card, link, transfer or cash." },
              { q: "Where in the UK do you operate?", a: "Tyrefly covers all major UK cities and motorways including London, Manchester, Birmingham, Leeds, Liverpool, Sheffield, Newcastle, Bristol, Edinburgh, Glasgow, Cardiff and Belfast — 24/7." },
              { q: "Do you fit tyres at night?", a: "Yes — Tyrefly operates 24 hours a day, 7 days a week including weekends and bank holidays." },
            ].map((f) => (
              <details key={f.q} className="group p-5">
                <summary className="cursor-pointer list-none font-semibold text-white/90 marker:hidden">
                  <span className="mr-2" style={{ color: "#FF6B1A" }}>+</span>
                  {f.q}
                </summary>
                <p className="mt-3 text-sm text-white/65 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-5 text-sm text-white/55">
            More detail on each job type in our{" "}
            <Link to="/services" className="underline hover:text-white">mobile tyre services</Link> section, or check{" "}
            <Link to="/areas" className="underline hover:text-white">coverage in your area</Link>.
          </p>
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="mx-auto w-full max-w-4xl px-5 py-20 text-center">
        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Tyre giving up? <span style={{ color: "#FF6B1A" }}>Send the message.</span>
        </h2>
        <p className="mt-4 text-white/60 max-w-md mx-auto">
          UK-wide · 24/7 · A real local technician at your kerb.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-3 max-w-md mx-auto">
          <a
            href={WA_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-col items-center justify-center gap-1.5 rounded-2xl px-4 py-5 text-base font-semibold shadow-lg transition-transform active:scale-[0.97] hover:scale-[1.02]"
            style={{ backgroundColor: "#25D366", color: "#0D0D0D", minHeight: "88px", boxShadow: "0 10px 30px -10px rgba(37,211,102,0.5)" }}
          >
            <MessageSquare className="h-6 w-6" strokeWidth={2.5} /> WhatsApp us
          </a>
          <a
            href={SMS_HREF}
            className="inline-flex flex-col items-center justify-center gap-1.5 rounded-2xl px-4 py-5 text-base font-semibold shadow-lg transition-transform active:scale-[0.97] hover:scale-[1.02]"
            style={{ backgroundColor: "#FF6B1A", color: "#0D0D0D", minHeight: "88px", boxShadow: "0 10px 30px -10px rgba(255,107,26,0.5)" }}
          >
            <MessageSquare className="h-6 w-6" strokeWidth={2.5} /> Text us
          </a>
        </div>
      </section>

      {/* ===== Technician CTA ===== */}
      <section className="px-5 pb-12">
        <a
          href="/technician/login/"
          className="block w-full max-w-3xl mx-auto rounded-2xl border border-[#FF6B1A]/40 bg-gradient-to-br from-[#FF6B1A]/15 to-[#FF6B1A]/5 px-6 py-6 text-center hover:border-[#FF6B1A] hover:from-[#FF6B1A]/25 transition-all"
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#FF6B1A] font-semibold">
            Mobile tyre technician?
          </p>
          <p className="mt-2 text-xl font-semibold text-white">
            Get jobs near you · paid direct
          </p>
          <p className="mt-1 text-sm text-white/60">
            Sign in or join the network — verify with WhatsApp
          </p>
        </a>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-white/5">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 flex flex-col gap-4 text-xs text-white/40">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Tyrefly mobile tyre fitting logo" width={20} height={20} className="h-5 w-5 object-contain opacity-70" />
              <span>© Tyrefly · UK-wide mobile tyre fitting</span>
            </div>
            <div className="flex items-center gap-4">
              <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className="hover:text-white/70">WhatsApp {SUPPORT_WA_DISPLAY}</a>
              <a href="/privacy/" className="hover:text-white/70">Privacy</a>
              <a href="/terms/" className="hover:text-white/70">Terms</a>
            </div>
          </div>
          <p className="text-[10px] text-white/30 leading-relaxed">
            *Tyrefly is a marketplace connecting customers with independent vetted technicians across the UK. The work contract is between you and the attending technician. See <a href="/terms/" className="underline hover:text-white/60">Terms</a>.
          </p>
        </div>
      </footer>
    </main>
  );
};

export default Index;
