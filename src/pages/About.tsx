import { Link } from "@/lib/router-compat";
import { Phone, MapPin, Mail, Clock } from "lucide-react";
import { Seo } from "@/components/Seo";
import ServiceLinks from "@/components/blog/ServiceLinks";
import { SUPPORT_WHATSAPP, SUPPORT_WA_DISPLAY, waLink } from "@/lib/whatsapp";
import { AREAS } from "@/data/areas";
import logo from "@/assets/tyrefly-logo.png";

// ---------------------------------------------------------------------------
// Real entity details. Fill these in with the registered values and they will
// appear in the "Company information" section below. Left blank, the lines are
// simply hidden so nothing fabricated ships to the live site.
// ---------------------------------------------------------------------------
const COMPANY_LEGAL_NAME = ""; // e.g. "Tyrefly Ltd"
const COMPANY_NUMBER = ""; // e.g. "12345678" (Companies House)
const REGISTERED_ADDRESS = ""; // e.g. "1 Example Street, London EC1 1AA"
const JURISDICTION = "England and Wales";

const CONTACT_EMAIL = "hello@tyrefly.com";
const WA_HREF = waLink(SUPPORT_WHATSAPP, "Hi Tyrefly, I have a question about a booking.");

const ABOUT_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://www.tyrefly.com/#organization",
  name: "Tyrefly",
  url: "https://www.tyrefly.com/",
  logo: "https://www.tyrefly.com/favicon.png",
  description:
    "Tyrefly is a UK-wide 24/7 mobile tyre fitting and puncture repair marketplace that connects drivers with a network of vetted, independent mobile tyre technicians.",
  areaServed: "United Kingdom",
  email: CONTACT_EMAIL,
  telephone: SUPPORT_WA_DISPLAY,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    telephone: SUPPORT_WA_DISPLAY,
    email: CONTACT_EMAIL,
    availableLanguage: "English",
  },
  ...(COMPANY_LEGAL_NAME ? { legalName: COMPANY_LEGAL_NAME } : {}),
  ...(COMPANY_NUMBER
    ? {
        identifier: {
          "@type": "PropertyValue",
          name: "Companies House Number",
          value: COMPANY_NUMBER,
        },
      }
    : {}),
  ...(REGISTERED_ADDRESS
    ? {
        address: {
          "@type": "PostalAddress",
          streetAddress: REGISTERED_ADDRESS,
          addressCountry: "GB",
        },
      }
    : {}),
};

const About = () => {
  return (
    <main
      className="min-h-[100dvh] w-full text-white px-6 py-8"
      style={{ backgroundColor: "#0D0D0D", fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}
    >
      <Seo
        title="About Tyrefly | 24/7 Mobile Tyre Fitting Marketplace UK"
        description="Who Tyrefly is: a UK-wide 24/7 mobile tyre fitting and puncture repair marketplace connecting drivers with vetted independent technicians. Company information and contact."
        canonical="/about"
        jsonLd={ABOUT_LD}
      />
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="flex items-center gap-2.5 mb-8" aria-label="Tyrefly home">
          <img src={logo} alt="Tyrefly logo" width={36} height={36} className="h-9 w-9 object-contain" />
          <span className="text-[20px] font-bold tracking-tight leading-none">
            Tyre<span style={{ color: "#FF6B1A" }}>fly</span>
          </span>
        </Link>

        <h1 className="text-4xl font-bold tracking-tight mb-2">About Tyrefly</h1>
        <p className="text-sm text-white/50 mb-8">
          24/7 mobile tyre fitting and puncture repair, anywhere in the UK.
        </p>

        <div className="space-y-8 text-white/80 leading-relaxed text-[15px]">
          {/* Who we are */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Who we are</h2>
            <p>
              Tyrefly is a UK-wide marketplace that connects drivers with a network of independent, vetted mobile
              tyre technicians. Instead of one depot with a single van, we broadcast your job &mdash; postcode, vehicle
              and issue &mdash; to fitters who already work your area and are on shift right now. Whoever can reach
              you fastest quotes a fixed price, parts and labour included, and you choose the quote you want.
            </p>
            <p className="mt-3">
              That model is why we can cover central London at rush hour, a layby on the M62 at 2am, and a driveway
              in Glasgow on a Sunday &mdash; all through the same WhatsApp message. We handle the dispatch, the
              booking fee and the communication; the attending technician carries out the repair or replacement on
              your driveway, at the roadside or wherever you've broken down.
            </p>
          </section>

          {/* What we do */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">What we do</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Mobile puncture repair (plug-and-patch to{" "}
                <Link to="/blog/can-a-puncture-be-repaired-uk" className="text-[#FF6B1A] underline">
                  BS AU 159
                </Link>
                ) at the roadside.
              </li>
              <li>
                Replacement tyres fitted from van stock &mdash;{" "}
                <Link to="/services/tyre-replacement" className="text-[#FF6B1A] underline">
                  tyre replacement
                </Link>{" "}
                balanced and torqued properly.
              </li>
              <li>
                <Link to="/services/emergency-tyre-fitting" className="text-[#FF6B1A] underline">
                  Emergency tyre fitting
                </Link>{" "}
                and space-saver / spare swaps to get you moving.
              </li>
              <li>Locking wheel nut removal and TPMS resets where needed.</li>
            </ul>
            <p className="mt-3">
              Every job starts the same way: text us your postcode and what's wrong. Our AI assistant triages the
              message, gathers the details we need (registration, location, issue) and routes you to a live fitter.
              See our{" "}
              <Link to="/services" className="text-[#FF6B1A] underline">
                services
              </Link>{" "}
              and{" "}
              <Link to="/areas" className="text-[#FF6B1A] underline">
                coverage areas
              </Link>{" "}
              for local detail.
            </p>
          </section>

          {/* How the network works */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">How the network works</h2>
            <p>
              Tyrefly is a dispatch network, not a single fleet. Technicians are independent operators who pass our
              vetting &mdash; qualifications, equipment, insurance and track record &mdash; before they receive
              jobs. When you message us, your job goes out to the fitters covering your area at that moment. The
              quote you accept is the contract price with the attending technician; we facilitate the booking fee
              and the conversation. You can read the full arrangement in our{" "}
              <Link to="/terms" className="text-[#FF6B1A] underline">
                Terms
              </Link>
              .
            </p>
          </section>

          {/* Coverage */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Where we cover</h2>
            <p>
              Coverage currently spans {AREAS.length} city regions &mdash; London, Greater Manchester, the West
              Midlands, West Yorkshire, Merseyside, South Yorkshire, Tyne and Wear, Bristol, Edinburgh, Glasgow,
              Cardiff and Belfast &mdash; and the motorway network between them. Each area page lists the
              postcodes, typical arrival times and local pricing.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {AREAS.map((a) => (
                <Link
                  key={a.slug}
                  to={`/areas/${a.slug}`}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/70 hover:border-[#FF6B1A]/40 hover:text-white"
                >
                  <MapPin className="h-3 w-3" /> {a.name}
                </Link>
              ))}
            </div>
          </section>

          {/* Company information */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Company information</h2>
            <p>
              Tyrefly operates a 24/7 mobile tyre fitting and puncture repair marketplace across the United
              Kingdom. We are the data controller for the personal information described in our{" "}
              <Link to="/privacy" className="text-[#FF6B1A] underline">
                Privacy Policy
              </Link>
              .
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              {COMPANY_LEGAL_NAME && (
                <div className="flex gap-2">
                  <dt className="text-white/40 w-40 shrink-0">Legal name</dt>
                  <dd className="text-white/80">{COMPANY_LEGAL_NAME}</dd>
                </div>
              )}
              {COMPANY_NUMBER && (
                <div className="flex gap-2">
                  <dt className="text-white/40 w-40 shrink-0">Company number</dt>
                  <dd className="text-white/80">{COMPANY_NUMBER}</dd>
                </div>
              )}
              {REGISTERED_ADDRESS && (
                <div className="flex gap-2">
                  <dt className="text-white/40 w-40 shrink-0">Registered office</dt>
                  <dd className="text-white/80">{REGISTERED_ADDRESS}</dd>
                </div>
              )}
              <div className="flex gap-2">
                <dt className="text-white/40 w-40 shrink-0">Jurisdiction</dt>
                <dd className="text-white/80">{JURISDICTION}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-white/50">
              To add or correct the legal name, company number or registered office, contact{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#FF6B1A] underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Contact Tyrefly</h2>
            <p>The fastest way to reach us is WhatsApp &mdash; that's also how you book a fitter.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <a
                href={WA_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:border-[#FF6B1A]/40"
              >
                <Phone className="h-5 w-5 text-[#FF6B1A]" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40">WhatsApp</p>
                  <p className="text-sm font-medium">{SUPPORT_WA_DISPLAY}</p>
                </div>
              </a>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:border-[#FF6B1A]/40"
              >
                <Mail className="h-5 w-5 text-[#FF6B1A]" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40">Email</p>
                  <p className="text-sm font-medium">{CONTACT_EMAIL}</p>
                </div>
              </a>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <Clock className="h-5 w-5 text-[#FF6B1A]" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40">Hours</p>
                  <p className="text-sm font-medium">24 hours, 7 days</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <ServiceLinks heading="Mobile tyre fitting services" />

        <div className="mt-10 pt-6 border-t border-white/10 flex gap-4 text-sm">
          <Link to="/" className="text-white/60 hover:text-white">
            ← Back to home
          </Link>
          <Link to="/terms" className="text-white/60 hover:text-white">
            Terms & Conditions
          </Link>
          <Link to="/privacy" className="text-white/60 hover:text-white">
            Privacy Policy
          </Link>
        </div>
      </div>
    </main>
  );
};

export default About;
