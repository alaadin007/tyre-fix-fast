import { MessageSquare, Star, ShieldCheck, MapPin } from "lucide-react";
import logo from "@/assets/tyrefly-logo.png";

const SMS_NUMBER = "+447447184489";
const SMS_BODY = encodeURIComponent("Hi Tyre Fly — I need tyre help");
// iOS uses &body=, Android uses ?body= — sms:?&body= works on both modern OSes
const SMS_HREF = `sms:${SMS_NUMBER}?&body=${SMS_BODY}`;

const Index = () => {
  return (
    <main
      className="min-h-[100dvh] w-full max-w-full overflow-x-hidden flex flex-col items-center px-6 pt-5 pb-8 text-white"
      style={{ backgroundColor: "#0D0D0D", fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}
    >
      {/* Header */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5" aria-label="Tyre Fly home">
          <img
            src={logo}
            alt="Tyre Fly logo"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
          />
          <span className="text-[20px] font-bold tracking-tight leading-none">
            Tyre <span style={{ color: "#FF6B1A" }}>Fly</span>
          </span>
        </a>

        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium"
          style={{ backgroundColor: "rgba(255,107,26,0.12)", border: "1px solid rgba(255,107,26,0.35)" }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
              style={{ backgroundColor: "#FF6B1A" }}
            />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: "#FF6B1A" }} />
          </span>
          <span style={{ color: "#FF6B1A" }}>Live</span>
          <span className="text-white/70">· UK-wide</span>
        </div>
      </header>

      {/* Centre block */}
      <section className="flex-1 w-full flex flex-col items-center justify-center text-center max-w-md mx-auto pt-10 sm:pt-6">
        <h1 className="text-[56px] sm:text-7xl font-bold leading-[0.95] tracking-tight">
          Flat tyre?
        </h1>
        <p
          className="mt-3 text-[40px] sm:text-5xl font-bold leading-[0.95] tracking-tight"
          style={{ color: "#FF6B1A" }}
        >
          Text us. We fly to you.
        </p>

        <p className="mt-8 text-base sm:text-lg text-white/60 leading-relaxed max-w-xs">
          One text. A local pro quotes you in under 60 seconds.
        </p>
        <p className="mt-2 text-sm text-white/40">24/7 · No hold music · UK-wide</p>

        {/* Services strip */}
        <div className="mt-6 w-full max-w-xs">
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-white/55">
            <span className="px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.03]">Punctures</span>
            <span className="px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.03]">Tyre changes</span>
            <span className="px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.03]">Blowouts</span>
            <span className="px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.03]">Locked wheels</span>
            <span className="px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.03]">Seasonal swaps</span>
          </div>
          <p className="mt-2 text-[11px] text-white/35">
            Get in touch for all — emergency or routine.
          </p>
        </div>

        {/* Primary CTA */}
        <a
          href={SMS_HREF}
          className="mt-10 w-full inline-flex items-center justify-center gap-3 rounded-2xl text-lg font-semibold transition-transform active:scale-[0.98]"
          style={{
            backgroundColor: "#FF6B1A",
            color: "#0D0D0D",
            height: "60px",
            boxShadow: "0 0 0 0 rgba(255,107,26,0.7)",
            animation: "ftnm-pulse 2s infinite",
          }}
          aria-label="Text Tyre Fly to get help now"
        >
          <MessageSquare className="h-5 w-5" strokeWidth={2.5} />
          Text us — get help now
        </a>

        {/* Trust badges */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-white/60">
          <span className="inline-flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5" style={{ color: "#FF6B1A" }} fill="#FF6B1A" />
            4.9 rated
          </span>
          <span className="text-white/20">·</span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Fully insured
          </span>
          <span className="text-white/20">·</span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            UK-wide
          </span>
        </div>

        {/* Testimonials */}
        <div className="mt-10 w-full">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex items-center gap-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="h-4 w-4" style={{ color: "#FF6B1A" }} fill="#FF6B1A" />
              ))}
            </div>
            <span className="text-xs text-white/60">4.9 · 1,200+ jobs</span>
          </div>

          <div className="space-y-2.5">
            {[
              {
                quote: "Texted at 11pm on the M25. Fitter arrived in 38 mins. Lifesaver.",
                name: "Sarah K.",
                meta: "London",
              },
              {
                quote: "No app, no faff. One message and sorted in the morning.",
                name: "James R.",
                meta: "Manchester",
              },
              {
                quote: "Cheaper than the AA and twice as fast. Will use again.",
                name: "Priya M.",
                meta: "Birmingham",
              },
            ].map((t, i) => (
              <div
                key={i}
                className="text-left rounded-xl px-4 py-3 border border-white/10 bg-white/[0.03]"
              >
                <div className="flex items-center gap-0.5 mb-1.5">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <Star key={s} className="h-3 w-3" style={{ color: "#FF6B1A" }} fill="#FF6B1A" />
                  ))}
                </div>
                <p className="text-[13px] text-white/80 leading-snug">"{t.quote}"</p>
                <p className="mt-1.5 text-[11px] text-white/40">
                  {t.name} · {t.meta}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom call fallback */}
      <footer className="w-full text-center pb-2 space-y-1">
        <a href="tel:08000000000" className="block text-xs text-white/40 hover:text-white/70 transition-colors">
          Or call 0800 000 0000
        </a>
        <a href="/technician/login" className="block text-xs text-white/30 hover:text-white/60 transition-colors">
          Technicians: sign in →
        </a>
      </footer>

      {/* Pulse keyframes */}
      <style>{`
        @keyframes ftnm-pulse {
          0%   { box-shadow: 0 0 0 0   rgba(255,107,26,0.55); }
          70%  { box-shadow: 0 0 0 22px rgba(255,107,26,0);   }
          100% { box-shadow: 0 0 0 0   rgba(255,107,26,0);    }
        }
      `}</style>
    </main>
  );
};

export default Index;
