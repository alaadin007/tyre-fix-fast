import { MessageSquare, Star, ShieldCheck, MapPin, Sparkles, Clock, PoundSterling, Wrench, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/tyrefly-logo.png";
import heroTruck from "@/assets/tyrefly-hero-truck.jpg";
import { WhatsAppChatCta } from "@/components/WhatsAppChatCta";
import { Seo } from "@/components/Seo";
import { AREAS } from "@/data/areas";

import { SUPPORT_WHATSAPP, SUPPORT_WA_DISPLAY, waLink } from "@/lib/whatsapp";

const SMS_NUMBER = SUPPORT_WHATSAPP;
const MSG_BODY = "Hi Tyre Fly — I need tyre help";
const WA_HREF = waLink(SUPPORT_WHATSAPP, MSG_BODY);
const SMS_HREF = `sms:${SMS_NUMBER}?&body=${encodeURIComponent(MSG_BODY)}`;

const HOME_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Tyre Fly",
    url: "https://tyrefly.com/",
    logo: "https://tyrefly.com/favicon.png",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Tyre Fly",
    url: "https://tyrefly.com/",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "How fast can a mobile tyre fitter get to me?", acceptedAnswer: { "@type": "Answer", text: "Most UK jobs get a quote in under 60 seconds and a vetted technician on-site within 35–90 minutes, 24/7." } },
      { "@type": "Question", name: "How much does Tyre Fly cost?", acceptedAnswer: { "@type": "Answer", text: "A £20 booking fee secures your slot and is deducted from your final bill. The technician collects the remainder on-site by card, link, transfer or cash." } },
      { "@type": "Question", name: "Where in the UK do you operate?", acceptedAnswer: { "@type": "Answer", text: "Tyre Fly covers all major UK cities and motorways including London, Manchester, Birmingham, Leeds, Liverpool, Sheffield, Newcastle, Bristol, Edinburgh, Glasgow, Cardiff and Belfast — 24/7." } },
      { "@type": "Question", name: "Do you fit tyres at night?", acceptedAnswer: { "@type": "Answer", text: "Yes — Tyre Fly operates 24 hours a day, 7 days a week including weekends and bank holidays." } },
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
        title="Mobile Tyre Fitter UK — 24/7 Call-Out via WhatsApp | Tyre Fly"
        description="Flat tyre? WhatsApp Tyre Fly and a vetted local mobile tyre fitter quotes in 60 seconds and is at your kerb fast. 24/7 across the UK — London, Manchester, Birmingham & nationwide."
        canonical="/"
        jsonLd={HOME_LD}
      />
      {/* ===== Top nav ===== */}
      <header className="w-full border-b border-white/5">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
          <a href="/" className="flex items-center gap-2.5" aria-label="Tyre Fly home">
            <img src={logo} alt="Tyre Fly logo" width={36} height={36} className="h-9 w-9 object-contain" />
            <span className="text-[20px] font-bold tracking-tight">
              Tyre <span style={{ color: "#FF6B1A" }}>Fly</span>
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm text-white/70">
            <a href="#how" className="hover:text-white">How it works</a>
            <a href="#services" className="hover:text-white">Services</a>
            <Link to="/areas" className="hover:text-white">Areas</Link>
            <Link to="/blog" className="hover:text-white">Blog</Link>
            <a href="#reviews" className="hover:text-white">Reviews</a>
            <a href="/technician/login" className="hover:text-white">For technicians</a>
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
            </h1>

            <p className="mt-6 text-lg text-white/70 leading-relaxed max-w-lg">
              <span className="text-white font-medium">WhatsApp AI</span> matches you with your nearest mobile tyre technician in seconds.
              One message — our local pro quotes you in under 60 seconds, comes to your kerb, and gets you rolling.
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
              alt="Tyre Fly mobile fitting van with a technician changing a tyre at the kerbside"
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
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center">How Tyre Fly works</h2>
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
          href="/technician/login"
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
              <img src={logo} alt="" width={20} height={20} className="h-5 w-5 object-contain opacity-70" />
              <span>© Tyre Fly · UK-wide mobile tyre fitting</span>
            </div>
            <div className="flex items-center gap-4">
              <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className="hover:text-white/70">WhatsApp {SUPPORT_WA_DISPLAY}</a>
              <a href="/privacy" className="hover:text-white/70">Privacy</a>
              <a href="/terms" className="hover:text-white/70">Terms</a>
            </div>
          </div>
          <p className="text-[10px] text-white/30 leading-relaxed">
            *Tyre Fly is a marketplace connecting customers with independent vetted technicians across the UK. The work contract is between you and the attending technician. See <a href="/terms" className="underline hover:text-white/60">Terms</a>.
          </p>
        </div>
      </footer>
    </main>
  );
};

export default Index;
