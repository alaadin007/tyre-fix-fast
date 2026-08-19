import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, Phone } from "lucide-react";
import { SUPPORT_WHATSAPP, SUPPORT_WA_DISPLAY, waLink } from "@/lib/whatsapp";
import logo from "@/assets/tyrefly-logo.png";

export function useServiceCtas(message: string) {
  return {
    wa: waLink(SUPPORT_WHATSAPP, message),
    sms: `sms:${SUPPORT_WHATSAPP}?&body=${encodeURIComponent(message)}`,
  };
}

export function CtaPair({ message, className = "" }: { message: string; className?: string }) {
  const { wa, sms } = useServiceCtas(message);
  return (
    <div className={`flex flex-col sm:flex-row gap-3 max-w-md ${className}`}>
      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 text-base font-semibold transition-transform active:scale-[0.98]"
        style={{ backgroundColor: "#25D366", color: "#0D0D0D", height: "58px" }}
      >
        <MessageSquare className="h-5 w-5" strokeWidth={2.5} /> WhatsApp us
      </a>
      <a
        href={sms}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 text-base font-semibold transition-transform active:scale-[0.98]"
        style={{ backgroundColor: "#FF6B1A", color: "#0D0D0D", height: "58px" }}
      >
        <MessageSquare className="h-5 w-5" strokeWidth={2.5} /> Text us
      </a>
    </div>
  );
}

export function ServiceShell({
  breadcrumbs,
  message,
  children,
}: {
  breadcrumbs: { to?: string; label: string }[];
  message: string;
  children: ReactNode;
}) {
  const { wa } = useServiceCtas(message);
  return (
    <main
      className="min-h-screen w-full overflow-x-hidden text-white"
      style={{ backgroundColor: "#0D0D0D", fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}
    >
      <header className="w-full border-b border-white/5">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="Tyrefly" width={36} height={36} className="h-9 w-9 object-contain" />
            <span className="text-[20px] font-bold tracking-tight">
              Tyre<span style={{ color: "#FF6B1A" }}>fly</span>
            </span>
          </Link>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:border-white/40 hover:text-white"
          >
            <Phone className="h-3.5 w-3.5" /> WhatsApp {SUPPORT_WA_DISPLAY}
          </a>
        </div>
      </header>

      <nav aria-label="Breadcrumb" className="mx-auto w-full max-w-6xl px-5 pt-6 text-xs text-white/50">
        {breadcrumbs.map((b, i) => (
          <span key={b.label}>
            {b.to ? (
              <Link to={b.to} className="hover:text-white">
                {b.label}
              </Link>
            ) : (
              <span className="text-white/80">{b.label}</span>
            )}
            {i < breadcrumbs.length - 1 ? " › " : ""}
          </span>
        ))}
      </nav>

      {children}

      <footer className="border-t border-white/5 mt-8">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 flex flex-col gap-4 text-xs text-white/40">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={logo} alt="" width={20} height={20} className="h-5 w-5 object-contain opacity-70" />
              <span>© Tyrefly · UK-wide mobile tyre fitting</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/services" className="hover:text-white/70">Services</Link>
              <Link to="/areas" className="hover:text-white/70">Service areas</Link>
              <Link to="/blog" className="hover:text-white/70">Guides</Link>
              <Link to="/privacy" className="hover:text-white/70">Privacy</Link>
              <Link to="/terms" className="hover:text-white/70">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

export function FaqBlock({ faqs, heading }: { faqs: { q: string; a: string }[]; heading: string }) {
  return (
    <section className="border-t border-white/5 bg-white/[0.02]">
      <div className="mx-auto w-full max-w-3xl px-5 py-14">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{heading}</h2>
        <div className="mt-6 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03]">
          {faqs.map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="cursor-pointer list-none font-semibold text-white/90 marker:hidden">
                <span className="mr-2" style={{ color: "#FF6B1A" }}>+</span>
                {f.q}
              </summary>
              <p className="mt-3 text-sm text-white/65 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
