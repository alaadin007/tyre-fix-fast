import { Link } from "@/lib/router-compat";

const LINKS = [
  { to: "/services/puncture-repair", label: "Mobile puncture repair UK" },
  { to: "/services/tyre-replacement", label: "Mobile tyre replacement UK" },
  { to: "/services/emergency-tyre-fitting", label: "Emergency mobile tyre fitting" },
  { to: "/services/run-flat-tyre-fitting", label: "Run-flat tyre fitting" },
  { to: "/areas/london", label: "Mobile tyre fitting London" },
  { to: "/areas/manchester", label: "Mobile tyre fitting Manchester" },
  { to: "/areas/birmingham", label: "Mobile tyre fitting Birmingham" },
  { to: "/areas", label: "All service areas" },
  { to: "/services", label: "All mobile tyre services" },
];

export default function ServiceLinks({ heading = "Book a mobile tyre fitter" }: { heading?: string }) {
  return (
    <div className="mt-14 pt-8 border-t border-border">
      <p className="text-sm uppercase tracking-widest text-muted-foreground mb-4 font-semibold">{heading}</p>
      <div className="flex flex-wrap gap-2">
        {LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-accent hover:text-accent transition"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
