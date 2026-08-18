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
      url: `https://www.tyrefly.com/areas/${a.slug}`,
      name: `Mobile tyre fitter ${a.name}`,
    })),
  };

  return (
    <main className="min-h-screen w-full text-white" style={{ backgroundColor: "#0D0D0D", fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}>
      <Seo
        title="Mobile Tyre Fitter Service Areas Across the UK | Tyrefly"
        description="Tyrefly covers London, Manchester, Birmingham, Leeds, Liverpool, Glasgow and more. 24/7 mobile tyre fitting and puncture repair via WhatsApp."
        canonical="/areas"
        jsonLd={ld}
      />

      <header className="w-full border-b border-white/5">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="Tyrefly" width={36} height={36} className="h-9 w-9 object-contain" />
            <span className="text-[20px] font-bold tracking-tight">Tyre<span style={{ color: "#FF6B1A" }}>fly</span></span>
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-5 py-14">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">UK service areas</h1>
        <p className="mt-3 text-white/70 max-w-2xl">
          Tyrefly's mobile fitter network spans the UK. Pick your area for local coverage details, postcodes and 24/7 WhatsApp dispatch.
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

      <section className="mx-auto w-full max-w-3xl px-5 pb-16 text-white/75 leading-relaxed text-[15px] space-y-5">
        <h2 className="text-2xl font-bold text-white">How Tyrefly coverage works across the UK</h2>
        <p>
          Tyrefly is a dispatch network, not a single depot. When you send your postcode over WhatsApp, the job is
          broadcast to vetted mobile tyre fitters who already work that area and are on shift at that moment. Whoever
          can reach you fastest quotes a fixed price — parts, labour and call-out included — and you pick the quote you
          want. That model is why coverage stretches from central London and the M25 to Greater Manchester, the West
          Midlands, West Yorkshire, Merseyside, Tyne and Wear, Bristol, Edinburgh, Glasgow, Cardiff and Belfast without
          you ever being told "the nearest van is two hours away".
        </p>
        <h2 className="text-2xl font-bold text-white">What we can do at the roadside</h2>
        <p>
          Most call-outs are one of four jobs: a repairable tread puncture (plug-and-patch to BS AU 159), a
          replacement tyre fitted from van stock, a locking wheel nut removal, or a space-saver / spare fitted to get
          you moving. Fitters carry balancers and torque wrenches, so a replacement is finished properly rather than
          hand-tightened. Sidewall damage, shredded run-flats and buckled alloys are replace-only — the fitter will
          tell you that before charging anything.
        </p>
        <h2 className="text-2xl font-bold text-white">Typical arrival times and prices</h2>
        <p>
          In dense urban areas — inner London, central Manchester, Birmingham city centre — arrival is usually 30 to 60
          minutes. Suburban and motorway call-outs typically land in 45 to 90 minutes. Puncture repairs start around
          £45 to £60, budget replacement tyres fitted from roughly £85 to £110, mid-range from about £110 to £150, and
          run-flats or larger performance sizes higher again. Every quote you receive is the full price, so there are
          no call-out surcharges added after the work.
        </p>
        <h2 className="text-2xl font-bold text-white">Motorways, red routes and clean air zones</h2>
        <p>
          On a live motorway or smart motorway lane, get behind the barrier and call 999 or Highways England first —
          mobile fitters cannot legally work in a running lane. Once you are recovered to a hard shoulder refuge,
          service area or slip road, a fitter can attend. In London, Red Routes and the Congestion Charge zone are
          worked around by the fitter, and ULEZ-compliant vans mean no charge is passed on to you.
        </p>
        <p>
          Not sure whether your postcode is covered? Message us anyway — the network is expanding weekly, and every
          out-of-coverage request is logged so we can recruit fitters where demand is building. Start on the{" "}
          <Link to="/" className="text-[#FF6B1A] underline">Tyrefly home page</Link> or read the{" "}
          <Link to="/blog" className="text-[#FF6B1A] underline">tyre guides</Link> while you wait.
        </p>
      </section>



      <footer className="border-t border-white/5">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 text-xs text-white/40 flex flex-col sm:flex-row justify-between gap-3">
          <span>© Tyrefly · UK-wide mobile tyre fitting</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-white/70">Privacy</Link>
            <Link to="/terms" className="hover:text-white/70">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
