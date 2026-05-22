import { useMemo } from "react";
import { Clock, Send, MessageSquare, FileText, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import type { DashJob, DashQuote, DashAllocation, DashTech } from "@/hooks/useDashboardData";
import { fmtRelative } from "@/hooks/useDashboardData";

type Event = {
  at: string;
  icon: any;
  title: string;
  detail?: string;
  tone: "primary" | "emerald" | "amber" | "sky" | "rose";
};

export function JobTimeline({
  job, quotes, allocations, techs,
}: {
  job: DashJob;
  quotes: DashQuote[];
  allocations: DashAllocation[];
  techs: DashTech[];
}) {
  const techName = (id: string | null) =>
    techs.find((t) => t.id === id)?.name ?? (id ? id.slice(0, 6) : "—");

  const events = useMemo<Event[]>(() => {
    const ev: Event[] = [];
    ev.push({
      at: job.created_at, icon: AlertCircle, tone: "sky",
      title: "Job created",
      detail: `${job.customer_name ?? "Customer"} · ${job.postcode ?? ""} · ${job.issue_type ?? ""}`,
    });
    // Allocations / broadcasts
    for (const a of allocations.filter((x) => x.job_id === job.id)) {
      ev.push({
        at: a.created_at, icon: Send, tone: "primary",
        title: `Sent to ${techName(a.technician_id)}`,
        detail: `Status: ${a.status}${a.match_score != null ? ` · score ${Number(a.match_score).toFixed(2)}` : ""}`,
      });
      if (a.approved_at) {
        ev.push({
          at: a.approved_at, icon: CheckCircle2, tone: "emerald",
          title: `Allocation approved (${techName(a.technician_id)})`,
          detail: a.approved_by ?? undefined,
        });
      }
    }
    // Quotes
    for (const q of quotes.filter((x) => x.job_id === job.id)) {
      ev.push({
        at: q.created_at, icon: FileText, tone: q.status === "accepted" ? "emerald" : q.status === "lost" ? "rose" : "amber",
        title: `Quote ${q.status} — £${q.price_gbp ?? "?"} · ${q.eta_minutes ?? "?"} min`,
        detail: `From ${techName(q.technician_id)}${q.tyre_included ? " · incl. tyre" : ""}`,
      });
    }
    // Payment
    if (job.platform_fee_paid_at) {
      ev.push({
        at: job.platform_fee_paid_at, icon: CreditCard, tone: "emerald",
        title: "Platform fee paid",
      });
    }
    if (job.platform_fee_refunded_at) {
      ev.push({
        at: job.platform_fee_refunded_at, icon: CreditCard, tone: "rose",
        title: "Platform fee refunded",
      });
    }
    if (["completed", "paid"].includes(job.status)) {
      ev.push({ at: job.updated_at, icon: CheckCircle2, tone: "emerald", title: "Job completed" });
    }
    return ev.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [job, quotes, allocations, techs]);

  const toneClass: Record<string, string> = {
    primary: "bg-primary/15 text-primary",
    emerald: "bg-emerald-500/15 text-emerald-300",
    amber: "bg-amber-500/15 text-amber-300",
    sky: "bg-sky-500/15 text-sky-300",
    rose: "bg-rose-500/15 text-rose-300",
  };

  return (
    <div className="space-y-3">
      {events.length === 0 && <div className="text-sm text-muted-foreground">No timeline events yet.</div>}
      {events.map((e, i) => {
        const Icon = e.icon;
        return (
          <div key={i} className="flex gap-3">
            <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${toneClass[e.tone]}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 border-b border-white/5 pb-3">
              <div className="text-sm">{e.title}</div>
              {e.detail && <div className="text-xs text-muted-foreground">{e.detail}</div>}
              <div className="mt-0.5 flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <Clock className="h-3 w-3" />
                {new Date(e.at).toLocaleString()} · {fmtRelative(e.at)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
