import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { Seo } from "@/components/Seo";
import { AREAS } from "@/data/areas";
import logo from "@/assets/tyrefly-logo.png";

export default function AreasIndex() {
  const ld = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: AREAS.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://tyrefly.com/areas/${a.slug}`,
      name: `Mobile tyre fitter ${a.name}`,
    })),
  };

  return (
    <main className="min-h-screen w-full text-white" style={{ backgroundColor: "#0D0D0D", fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}>
      <Seo
        title="Mobile Tyre Fitter Service Areas Across the UK | Tyre Fly"
        description="Tyre Fly covers London, Manchester, Birmingham, Leeds, Liverpool, Sheffield, Newcastle, Bristol, Edinburgh, Glasgow, Cardiff & Belfast. 24/7 mobile tyre fitting via WhatsApp."
        canonical="/areas"
        jsonLd={ld}
      />

      <header className="w-full border-b border-white/5">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="Tyre Fly" width={36} height={36} className="h-9 w-9 object-contain" />
            <span className="text-[20px] font-bold tracking-tight">Tyre <span style={{ color: "#FF6B1A" }}>Fly</span></span>
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-5 py-14">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">UK service areas</h1>
        <p className="mt-3 text-white/70 max-w-2xl">
          Tyre Fly's mobile fitter network spans the UK. Pick your area for local coverage details, postcodes and 24/7 WhatsApp dispatch.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AREAS.map((a) => (
            <Link key={a.slug} to={`/areas/${a.slug}`}
                  className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-[#FF6B1A]/40 transition">
              <div className="flex items-center gap-2 text-[#FF6B1A]">
                <MapPin className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">{a.region}</span>
              </div>
              <h2 className="mt-2 text-xl font-semibold group-hover:text-[#FF6B1A]">{a.name}</h2>
              <p className="mt-1.5 text-sm text-white/60 leading-relaxed">{a.shortPitch}</p>
              <p className="mt-3 text-[11px] text-white/40">Postcodes: {a.postcodes}</p>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/5">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 text-xs text-white/40 flex flex-col sm:flex-row justify-between gap-3">
          <span>© Tyre Fly · UK-wide mobile tyre fitting</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-white/70">Privacy</Link>
            <Link to="/terms" className="hover:text-white/70">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
