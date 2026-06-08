import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase, FileText, CheckCircle2, PoundSterling, Users, AlertCircle,
  FolderOpen, FolderClosed, Clock, MapPin, ClipboardCheck,
} from "lucide-react";
import { KpiCard } from "@/components/admin/dashboard/KpiCard";
import { StatusBadge } from "@/components/admin/dashboard/StatusBadge";
import { Card } from "@/components/ui/card";
import { useDashboardData, fmtRelative, shortRef } from "@/hooks/useDashboardData";

const CLOSED_STATUSES = ["completed", "paid", "cancelled", "closed"];

export default function Overview() {
  const { jobs, quotes, techs } = useDashboardData();

  const k = useMemo(() => {
    const openJobs = jobs.filter((j) => !CLOSED_STATUSES.includes(j.status)).length;
    const closedJobs = jobs.filter((j) => CLOSED_STATUSES.includes(j.status)).length;
    const paidJobs = jobs.filter(
      (j) => j.platform_fee_status === "paid" || j.status === "paid",
    ).length;
    const pendingPayment = jobs.filter(
      (j) => j.status === "awaiting_payment" || j.platform_fee_status === "pending",
    ).length;

    const jobsWithQuote = new Set(quotes.map((q) => q.job_id).filter(Boolean) as string[]);
    const waitingForQuotes = jobs.filter(
      (j) => ["broadcasting", "intake_complete"].includes(j.status) && !jobsWithQuote.has(j.id),
    ).length;
    const waitingForApproval = jobs.filter((j) => j.status === "awaiting_approval").length;

    const awaitingDetailsRelease = jobs.filter(
      (j) => j.platform_fee_status === "paid" &&
        !["in_progress", "completed", "paid", "closed", "cancelled"].includes(j.status),
    ).length;

    const activeTechs = techs.filter((t) => t.active && t.approval_status === "approved").length;

    const revenue = quotes
      .filter((q) => q.status === "accepted")
      .reduce((s, q) => s + Number(q.price_gbp ?? 0), 0);

    return {
      openJobs, closedJobs, paidJobs, pendingPayment,
      waitingForQuotes, waitingForApproval, awaitingDetailsRelease, activeTechs, revenue,
    };
  }, [jobs, quotes, techs]);

  const needsAttention = useMemo(() => {
    return jobs.filter((j) =>
      ["awaiting_approval", "awaiting_payment", "broadcasting"].includes(j.status),
    ).slice(0, 10);
  }, [jobs]);

  // Technician coverage by postcode (UK outward code)
  const coverage = useMemo(() => {
    const map = new Map<string, { code: string; techs: number; jobs: number }>();
    const norm = (s: string) => s.trim().toUpperCase().split(/\s+/)[0];
    for (const t of techs) {
      if (!t.active || t.approval_status !== "approved") continue;
      for (const pc of t.service_postcodes ?? []) {
        if (!pc) continue;
        const c = norm(pc);
        if (!c) continue;
        const entry = map.get(c) ?? { code: c, techs: 0, jobs: 0 };
        entry.techs += 1;
        map.set(c, entry);
      }
    }
    for (const j of jobs) {
      if (!j.postcode) continue;
      const c = norm(j.postcode);
      if (!c) continue;
      const entry = map.get(c) ?? { code: c, techs: 0, jobs: 0 };
      entry.jobs += 1;
      map.set(c, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.techs - a.techs || b.jobs - a.jobs);
  }, [techs, jobs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Real-time view of jobs, payments, technicians and coverage.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Open jobs" value={k.openJobs} icon={FolderOpen} accent="sky" />
        <KpiCard label="Closed jobs" value={k.closedJobs} icon={FolderClosed} accent="emerald" />
        <KpiCard label="Paid jobs" value={k.paidJobs} icon={PoundSterling} accent="emerald" />
        <KpiCard label="Pending payment" value={k.pendingPayment} icon={Clock} accent="amber" />
        <KpiCard label="Awaiting quotes" value={k.waitingForQuotes} icon={FileText} accent="amber" />
        <KpiCard label="Awaiting approval" value={k.waitingForApproval} icon={ClipboardCheck} accent="rose" />
        <KpiCard label="Paid — awaiting details" value={k.awaitingDetailsRelease} icon={AlertCircle} accent="amber" />
        <KpiCard label="Active technicians" value={k.activeTechs} icon={Users} accent="primary" />
        <KpiCard
          label="Revenue (accepted)"
          value={`£${k.revenue.toFixed(0)}`}
          icon={PoundSterling}
          accent="emerald"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <AlertCircle className="h-4 w-4 text-rose-300" /> Needs attention
            </div>
            <Link to="/admin/dashboard/jobs" className="text-xs text-primary hover:underline">
              View all jobs →
            </Link>
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
                  <span className="truncate">
                    {j.customer_name ?? "Unknown"} · {j.postcode ?? "—"}
                  </span>
                  <span className="ml-auto">
                    <StatusBadge status={j.status} />
                  </span>
                  <span className="w-20 text-right text-xs text-muted-foreground">
                    {fmtRelative(j.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4 text-sky-300" /> Technician coverage by postcode
            </div>
            <Link
              to="/admin/dashboard/technicians"
              className="text-xs text-primary hover:underline"
            >
              Manage techs →
            </Link>
          </div>
          {coverage.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No postcode coverage yet. Add service postcodes to technicians.
            </div>
          ) : (
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background/80 backdrop-blur text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2 text-left font-medium">Postcode</th>
                    <th className="py-2 text-right font-medium">Technicians</th>
                    <th className="py-2 text-right font-medium">Jobs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {coverage.map((c) => (
                    <tr key={c.code}>
                      <td className="py-2 font-mono">{c.code}</td>
                      <td className="py-2 text-right tabular-nums">{c.techs}</td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">
                        {c.jobs}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card className="border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Briefcase className="h-4 w-4 text-primary" /> Quick links
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link to="/admin/dashboard/jobs" className="rounded border border-white/10 px-3 py-1.5 hover:bg-white/[0.04]">Jobs</Link>
          <Link to="/admin/dashboard/quotes" className="rounded border border-white/10 px-3 py-1.5 hover:bg-white/[0.04]">Quotes</Link>
          <Link to="/admin/dashboard/payments" className="rounded border border-white/10 px-3 py-1.5 hover:bg-white/[0.04]">Payments</Link>
          <Link to="/admin/dashboard/technicians" className="rounded border border-white/10 px-3 py-1.5 hover:bg-white/[0.04]">Technicians</Link>
          <Link to="/admin/dashboard/activity" className="rounded border border-white/10 px-3 py-1.5 hover:bg-white/[0.04]">Activity</Link>
        </div>
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3 w-3 text-emerald-300" />
          Data is read-only from the existing WhatsApp workflow — no changes to the intake flow.
        </div>
      </Card>
    </div>
  );
}
