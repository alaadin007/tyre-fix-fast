import { Link } from "@/lib/router-compat";
import { Seo } from "@/components/Seo";
import { SERVICES } from "@/data/services";
import { AREAS } from "@/data/areas";
import { ServiceShell, CtaPair, FaqBlock } from "@/components/service/ServiceLayout";
import { DirectAnswer } from "@/components/service/DirectAnswer";
import { NATIONAL_PRICING, BOOKING_FEE, range, surcharge, runFlatRange } from "@/data/pricing";

const MSG = "Hi Tyrefly — I need a mobile tyre fitter";

const P = NATIONAL_PRICING;

const PRICE_ROWS: { service: string; price: string; time: string; best: string }[] = [
  {
    service: "Mobile puncture repair",
    price: range(P.puncture),
    time: "20–30 min on site",
    best: "Nail, screw or slow leak in the central tread",
  },
  {
    service: "Mobile tyre replacement",
    price: `${range(P.budget)} budget · ${range(P.midRange)} premium`,
    time: "30–45 min on site",
    best: "Worn, aged or unrepairable tyres, planned or urgent",
  },
  {
    service: "Emergency tyre fitting",
    price: `${range(P.budget)}+ depending on size`,
    time: "Dispatched immediately, 24/7",
    best: "Blowout, shredded tyre, stranded roadside or at night",
  },
  {
    service: "Run-flat tyre fitting",
    price: runFlatRange(P),
    time: "40–60 min on site",
    best: "BMW, Mini and Mercedes run-flats needing a specialist machine",
  },
];

const FAQS = [
  {
    q: "Which mobile tyre service do I need?",
    a: "If the tyre still holds some air and the damage is a nail or screw in the central tread, start with a puncture repair. If the sidewall or shoulder is damaged, the tread is below 1.6mm, or the tyre has been driven on flat, it needs replacing. If you are stranded now, choose emergency fitting and we dispatch the nearest available technician straight away.",
  },
  {
    q: "How much do mobile tyre services cost in the UK?",
    a: `Puncture repairs are ${range(P.puncture)}. A budget tyre supplied and fitted is ${range(P.budget)}, mid-range premium ${range(P.midRange)}, and performance, SUV or run-flat ${range(P.performance)}. Overnight work between 10pm and 6am adds ${surcharge(P.overnight)}. The price you are quoted by message is the price you pay — there is no separate call-out charge.`,
  },
  {
    q: "Is there a call-out fee?",
    a: `No separate call-out fee. A £${BOOKING_FEE} booking fee secures the technician and slot, and it is deducted from the final bill, so it is not an extra cost on top of your quote.`,
  },
  {
    q: "How quickly can a technician reach me?",
    a: `Typically ${P.response?.[0] ?? 30}–${P.response?.[1] ?? 60} minutes in our core city coverage, and we operate 24 hours a day including weekends and bank holidays. Outside those areas we will tell you the honest arrival window before you commit to anything.`,
  },
  {
    q: "Can you fit tyres at my home or workplace?",
    a: "Yes. Most jobs are done on a driveway, in a car park, on a work forecourt or at the roadside. The technician needs a reasonably flat, safe place to jack the car. If the car is in an unsafe position on a live carriageway, get behind a barrier first and tell us — we will coordinate with recovery where needed.",
  },
  {
    q: "Do you carry my tyre size in stock?",
    a: "Common car, van and SUV sizes are carried or sourced locally the same day. Rare performance, run-flat and light commercial sizes are checked against local supply before we quote, so you are told up front whether it is same-day or next-day rather than after the van arrives.",
  },
];

export default function ServicesIndex() {
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.tyrefly.com/" },
        { "@type": "ListItem", position: 2, name: "Services", item: "https://www.tyrefly.com/services/" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Mobile tyre services UK",
      description:
        "Mobile tyre services UK-wide: puncture repair, tyre replacement, emergency fitting and run-flat fitting, 24/7 at your home, work or roadside.",
      serviceType: "Mobile tyre services",
      url: "https://www.tyrefly.com/services/",
      provider: {
        "@type": "AutoRepair",
        "@id": "https://www.tyrefly.com/#business",
        name: "Tyrefly",
        url: "https://www.tyrefly.com/",
      },
      areaServed: { "@type": "Country", name: "United Kingdom" },
      availableChannel: {
        "@type": "ServiceChannel",
        serviceUrl: "https://www.tyrefly.com/services/",
        availableLanguage: "en-GB",
      },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Mobile tyre services",
        itemListElement: SERVICES.map((s) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: s.name, serviceType: s.keyword, url: `https://www.tyrefly.com/services/${s.slug}/` },
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: SERVICES.map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: s.name,
        url: `https://www.tyrefly.com/services/${s.slug}/`,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];


  return (
    <ServiceShell message={MSG} breadcrumbs={[{ to: "/", label: "Home" }, { label: "Services" }]}>
      <Seo
        title="Mobile Tyre Services UK — Repair, Replacement, Run-Flat"
        description="Mobile tyre services UK-wide: puncture repair, tyre replacement, emergency and run-flat fitting. Text your postcode for a fixed price, 24/7."
        canonical="/services"
        jsonLd={ld}
      />

      <section className="mx-auto w-full max-w-6xl px-5 py-12 md:py-16">
        <h1 className="text-4xl sm:text-6xl font-bold leading-[0.95] tracking-tight">
          Mobile tyre services <span style={{ color: "#FF6B1A" }}>UK</span><br />
          <span className="text-3xl sm:text-4xl text-white/70">Repair, replacement, run-flat — 24/7</span>
        </h1>
        <p className="mt-5 text-lg text-white/70 leading-relaxed max-w-2xl">
          Every mobile tyre services UK job starts with one text. Send your postcode and what's wrong — a vetted local
          technician quotes you in about 60 seconds and comes to your car, 24 hours a day, anywhere from{" "}
          <Link to="/areas/london" className="underline hover:text-white">London</Link> to{" "}
          <Link to="/areas/glasgow" className="underline hover:text-white">Glasgow</Link>.
        </p>
        <CtaPair message={MSG} className="mt-8" />
        <DirectAnswer service="mobile tyre fitting" place="the UK" className="mt-8 max-w-2xl" />
      </section>

      <section className="border-t border-white/5 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-6xl px-5 py-14">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Mobile tyre services UK: what we do</h2>
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
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">What each mobile tyre service covers</h2>
        <div className="mt-6 space-y-8 max-w-3xl text-sm text-white/70 leading-relaxed">
          <div>
            <h3 className="text-lg font-semibold text-white">Mobile puncture repair</h3>
            <p className="mt-2">
              The technician removes the wheel, dismounts the tyre and inspects it from the inside — the only way to
              know whether a puncture is genuinely repairable. Repairs are done to BS AU 159, the British Standard that
              governs permanent tyre repairs: a combined plug-patch fitted from inside the casing, with the injury
              cleaned and sealed rather than plugged from the outside. Damage must sit in the central three-quarters of
              the tread and be no wider than 6mm. Anything in the sidewall or shoulder, any tyre run flat for more than
              a short distance, and any casing with internal chafing fails inspection and is replaced instead. The wheel
              is rebalanced and torqued to the manufacturer's setting before the van leaves. Full detail on{" "}
              <Link to="/services/puncture-repair" className="underline hover:text-white">mobile puncture repair</Link>.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Mobile tyre replacement</h3>
            <p className="mt-2">
              A new tyre supplied, fitted, balanced and inflated at your home, workplace or the roadside, with the old
              casing taken away for recycling. Budget, mid-range and premium options are quoted side by side before
              anything is ordered, so you choose the tyre rather than being sold one. New valves or TPMS service kits
              are fitted where the vehicle uses them, and the wheel is balanced on a mobile balancer in the van — not
              simply swapped and sent on its way. See{" "}
              <Link to="/services/tyre-replacement" className="underline hover:text-white">mobile tyre replacement</Link>.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Emergency tyre fitting</h3>
            <p className="mt-2">
              For blowouts, shredded tyres and cars stranded at unsociable hours. The nearest available technician is
              dispatched immediately rather than slotted into a schedule, and you get a live arrival window by message.
              Overnight work between 10pm and 6am carries a small surcharge which is shown in the quote, never added
              afterwards. See{" "}
              <Link to="/services/emergency-tyre-fitting" className="underline hover:text-white">emergency tyre fitting</Link>.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Run-flat tyre fitting</h3>
            <p className="mt-2">
              Run-flats have reinforced sidewalls that need a machine with a proper assist arm — fitting one on standard
              kit risks damaging both the tyre bead and the alloy. Technicians handling BMW, Mini and Mercedes run-flats
              carry that equipment and reset the TPMS afterwards. Most manufacturers do not permit repairing a run-flat
              that has been driven on while deflated, so these jobs are usually a replacement. See{" "}
              <Link to="/services/run-flat-tyre-fitting" className="underline hover:text-white">run-flat tyre fitting</Link>.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-6xl px-5 py-14">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">When to choose which service</h2>
          <div className="mt-6 max-w-3xl space-y-4 text-sm text-white/70 leading-relaxed">
            <p>
              <strong className="text-white">The tyre is losing air slowly.</strong> A slow leak that needs topping up
              every week or two is usually a nail or a corroded valve. Book a puncture repair — most slow leaks are
              repairable if the tyre has not been driven flat.
            </p>
            <p>
              <strong className="text-white">The tyre is flat and you are still at home.</strong> Book a repair, and the
              technician will replace it on the spot if inspection fails. Quoting both up front means one visit, not two.
            </p>
            <p>
              <strong className="text-white">The tyre is flat and you are on the road right now.</strong> Choose
              emergency fitting. Dispatch takes priority over price comparison, and you are given the arrival window
              before you commit.
            </p>
            <p>
              <strong className="text-white">The tread is near 1.6mm or the tyre is over six years old.</strong> Replace
              it. A legal-limit tyre is not worth repairing, and ageing rubber hardens regardless of tread depth.
            </p>
            <p>
              <strong className="text-white">The sidewall is cut, bulging or kerbed.</strong> Replace it. Sidewall damage
              is never repairable, whatever the tyre costs.
            </p>
            <p>
              <strong className="text-white">The car runs run-flats.</strong> Say so in your first message so the right
              technician and the right machine are dispatched, and stock is checked for your exact size before you are
              quoted.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-14">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Price comparison across our services</h2>
        <p className="mt-2 max-w-3xl text-sm text-white/60">
          UK-wide ranges, all-in: tyre, fitting, balancing, valve and disposal. City prices vary slightly — check your{" "}
          <Link to="/areas" className="underline hover:text-white">local area page</Link> for exact figures.
        </p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-white/[0.05] text-xs uppercase tracking-[0.12em] text-white/50">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Service</th>
                <th scope="col" className="px-4 py-3 font-semibold">Typical all-in price</th>
                <th scope="col" className="px-4 py-3 font-semibold">Time on site</th>
                <th scope="col" className="px-4 py-3 font-semibold">Best for</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {PRICE_ROWS.map((r) => (
                <tr key={r.service}>
                  <th scope="row" className="px-4 py-4 font-semibold text-white/90">{r.service}</th>
                  <td className="px-4 py-4 text-white/75">{r.price}</td>
                  <td className="px-4 py-4 text-white/65">{r.time}</td>
                  <td className="px-4 py-4 text-white/65">{r.best}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-3xl text-xs text-white/50">
          Overnight work (10pm–6am) adds {surcharge(P.overnight)}. Locking wheel nut removal without a key adds{" "}
          {surcharge(P.lockingNut)}. A £{BOOKING_FEE} booking fee secures your slot and is deducted from the final bill.
        </p>
        <CtaPair message={MSG} className="mt-8" />
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
      <FaqBlock heading="Mobile tyre services: common questions" faqs={FAQS} />
    </ServiceShell>
  );
}
