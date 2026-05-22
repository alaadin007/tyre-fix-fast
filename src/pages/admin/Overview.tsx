import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase, FileText, CheckCircle2, PoundSterling, Users, Send, AlertCircle,
} from "lucide-react";
import { KpiCard } from "@/components/admin/dashboard/KpiCard";
import { StatusBadge } from "@/components/admin/dashboard/StatusBadge";
import { Card } from "@/components/ui/card";
import { useDashboardData, fmtRelative, shortRef } from "@/hooks/useDashboardData";

function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function daysAgo(n: number) { return new Date(Date.now() - n * 86400_000); }

export default function Overview() {
  const { jobs, quotes, allocations, techs } = useDashboardData();

  const k = useMemo(() => {
    const today = startOfDay();
    const week = daysAgo(7);
    const jobsToday = jobs.filter((j) => new Date(j.created_at) >= today).length;
    const jobsWeek = jobs.filter((j) => new Date(j.created_at) >= week).length;
    const broadcasts = allocations.filter((a) => new Date(a.created_at) >= week).length;
    const quotesWeek = quotes.filter((q) => new Date(q.created_at) >= week).length;
    const accepted = quotes.filter((q) => q.status === "accepted").length;
    const completed = jobs.filter((j) => ["completed","paid"].includes(j.status)).length;
    const revenue = quotes
      .filter((q) => q.status === "accepted")
      .reduce((s, q) => s + Number(q.price_gbp ?? 0), 0);
    const fees = jobs.filter((j) => j.platform_fee_status === "paid").length;
    const activeTechs = techs.filter((t) => t.active && t.approval_status === "approved").length;
    return { jobsToday, jobsWeek, broadcasts, quotesWeek, accepted, completed, revenue, fees, activeTechs };
  }, [jobs, quotes, allocations, techs]);

  const needsAttention = useMemo(() => {
    return jobs.filter((j) =>
      ["awaiting_approval", "awaiting_payment", "broadcasting"].includes(j.status)
    ).slice(0, 10);
  }, [jobs]);

  // funnel
  const funnel = useMemo(() => {
    const created = jobs.length;
    const quotedSet = new Set(quotes.map((q) => q.job_id).filter(Boolean) as string[]);
    const quoted = jobs.filter((j) => quotedSet.has(j.id)).length;
    const accepted = jobs.filter((j) => ["accepted","awaiting_payment","in_progress","completed","paid"].includes(j.status)).length;
    const inProg = jobs.filter((j) => j.status === "in_progress").length;
    const completed = jobs.filter((j) => ["completed","paid"].includes(j.status)).length;
    const paid = jobs.filter((j) => j.platform_fee_status === "paid").length;
    return [
      { label: "Created", value: created },
      { label: "Quoted", value: quoted },
      { label: "Accepted", value: accepted },
      { label: "In progress", value: inProg },
      { label: "Completed", value: completed },
      { label: "Paid", value: paid },
    ];
  }, [jobs, quotes]);

  const max = Math.max(1, ...funnel.map((f) => f.value));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">Real-time view of the entire job lifecycle.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Jobs today" value={k.jobsToday} delta={`${k.jobsWeek} this week`} icon={Briefcase} accent="sky" />
        <KpiCard label="Broadcasts (7d)" value={k.broadcasts} icon={Send} accent="primary" />
        <KpiCard label="Quotes (7d)" value={k.quotesWeek} delta={`${k.accepted} accepted total`} icon={FileText} accent="amber" />
        <KpiCard label="Completed" value={k.completed} icon={CheckCircle2} accent="emerald" />
        <KpiCard label="Revenue (accepted)" value={`£${k.revenue.toFixed(0)}`} icon={PoundSterling} accent="emerald" />
        <KpiCard label="Platform fees paid" value={k.fees} icon={PoundSterling} accent="emerald" />
        <KpiCard label="Active techs" value={k.activeTechs} icon={Users} accent="sky" />
        <KpiCard label="Needs attention" value={needsAttention.length} icon={AlertCircle} accent={needsAttention.length ? "rose" : "primary"} />
      </div>

      <Card className="border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 text-sm font-semibold">Funnel</div>
        <div className="space-y-2">
          {funnel.map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <div className="w-28 text-xs text-muted-foreground">{f.label}</div>
              <div className="relative h-6 flex-1 overflow-hidden rounded bg-white/[0.04]">
                <div
                  className="h-full bg-gradient-to-r from-primary/40 to-primary"
                  style={{ width: `${(f.value / max) * 100}%` }}
                />
              </div>
              <div className="w-12 text-right text-sm tabular-nums">{f.value}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Needs attention</div>
          <Link to="/admin/dashboard/jobs" className="text-xs text-primary hover:underline">View all jobs →</Link>
        </div>
        {needsAttention.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nothing pending. 🎉</div>
        ) : (
          <div className="divide-y divide-white/5">
            {needsAttention.map((j) => (
              <Link
                key={j.id}
                to={`/admin/dashboard/jobs?open=${j.id}`}
                className="flex items-center gap-3 py-2 text-sm hover:bg-white/[0.03]"
              >
                <span className="font-mono text-xs text-muted-foreground">#{shortRef(j.id)}</span>
                <span className="truncate">{j.customer_name ?? "Unknown"} · {j.postcode ?? "—"}</span>
                <span className="ml-auto"><StatusBadge status={j.status} /></span>
                <span className="w-20 text-right text-xs text-muted-foreground">{fmtRelative(j.created_at)}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
