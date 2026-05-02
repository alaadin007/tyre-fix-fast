import { MessageSquare, Star, ShieldCheck, MapPin } from "lucide-react";

const SMS_NUMBER = "+447447184489";
const SMS_BODY = encodeURIComponent("Hi FTNM — I need tyre help");
// iOS uses &body=, Android uses ?body= — sms:?&body= works on both modern OSes
const SMS_HREF = `sms:${SMS_NUMBER}?&body=${SMS_BODY}`;

const Index = () => {
  return (
    <main
      className="min-h-[100dvh] w-full flex flex-col items-center justify-between px-6 py-8 text-white"
      style={{ backgroundColor: "#0D0D0D", fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}
    >
      {/* Top status pill */}
      <div className="w-full flex justify-center pt-2">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium"
          style={{ backgroundColor: "rgba(255,107,26,0.12)", border: "1px solid rgba(255,107,26,0.35)" }}
        >
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
              style={{ backgroundColor: "#FF6B1A" }}
            />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "#FF6B1A" }} />
          </span>
          <span style={{ color: "#FF6B1A" }}>Live</span>
          <span className="text-white/70">· techs on call near you</span>
        </div>
      </div>

      {/* Centre block */}
      <section className="flex-1 w-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
        <h1 className="text-[56px] sm:text-7xl font-bold leading-[0.95] tracking-tight">
          Flat tyre?
        </h1>
        <p
          className="mt-3 text-[44px] sm:text-6xl font-bold leading-[0.95] tracking-tight"
          style={{ color: "#FF6B1A" }}
        >
          Text us now.
        </p>

        <p className="mt-8 text-base sm:text-lg text-white/60 leading-relaxed max-w-xs">
          One text. A local pro quotes you in under 60 seconds.
        </p>
        <p className="mt-2 text-sm text-white/40">24/7 · No hold music · UK-wide</p>

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
          aria-label="Text us to get help now"
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
      </section>

      {/* Bottom call fallback */}
      <footer className="w-full text-center pb-2">
        <a href="tel:08000000000" className="text-xs text-white/40 hover:text-white/70 transition-colors">
          Or call 0800 000 0000
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
