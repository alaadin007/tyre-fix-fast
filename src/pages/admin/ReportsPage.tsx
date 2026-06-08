import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart3, PoundSterling, Briefcase, Clock, MapPin, Users,
  AlertCircle, XCircle, TrendingUp, Download,
} from "lucide-react";
import { useDashboardData, type DashJob, type DashQuote } from "@/hooks/useDashboardData";
import { JOB_STATUS_FILTERS, jobStatusLabel } from "@/lib/jobStatus";

const CLOSED = ["completed", "paid", "closed", "cancelled"];
const PAY_STATUSES = ["all", "paid", "pending", "failed", "refunded"];

type Granularity = "day" | "week" | "month";

function bucketKey(iso: string, g: Granularity): string {
  const d = new Date(iso);
  if (g === "day") return d.toISOString().slice(0, 10);
  if (g === "month") return d.toISOString().slice(0, 7);
  // week: ISO week start (Mon)
  const day = (d.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}

function normPc(s: string | null | undefined): string {
  return (s ?? "").trim().toUpperCase().split(/\s+/)[0];
}

function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((r) => r.map((c) => {
      const s = String(c ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","))
    .join("\n");
}

function downloadCsv(name: string, rows: (string | number)[][]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { jobs, quotes, techs, loading } = useDashboardData();

  // Filters
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [pc, setPc] = useState("");
  const [techId, setTechId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [payStatus, setPayStatus] = useState<string>("all");
  const [granularity, setGranularity] = useState<Granularity>("day");

  const filteredJobs = useMemo<DashJob[]>(() => {
    const fromTs = new Date(from + "T00:00:00Z").getTime();
    const toTs = new Date(to + "T23:59:59Z").getTime();
    const pcNorm = normPc(pc);
    return jobs.filter((j) => {
      const t = new Date(j.created_at).getTime();
      if (t < fromTs || t > toTs) return false;
      if (pcNorm && normPc(j.postcode) !== pcNorm) return false;
      if (techId !== "all" && j.assigned_technician_id !== techId) return false;
      if (status !== "all" && j.status !== status) return false;
      if (payStatus !== "all" && j.platform_fee_status !== payStatus) return false;
      return true;
    });
  }, [jobs, from, to, pc, techId, status, payStatus]);

  const jobIds = useMemo(() => new Set(filteredJobs.map((j) => j.id)), [filteredJobs]);
  const filteredQuotes = useMemo<DashQuote[]>(
    () => quotes.filter((q) => q.job_id && jobIds.has(q.job_id)),
    [quotes, jobIds],
  );

  // KPIs
  const kpi = useMemo(() => {
    const total = filteredJobs.length;
    const open = filteredJobs.filter((j) => !CLOSED.includes(j.status)).length;
    const closed = filteredJobs.filter((j) => CLOSED.includes(j.status)).length;
    const paid = filteredJobs.filter(
      (j) => j.platform_fee_status === "paid" || j.status === "paid",
    );
    const revenue = filteredQuotes
      .filter((q) => q.status === "accepted")
      .reduce((s, q) => s + Number(q.price_gbp ?? 0), 0);
    const priced = filteredQuotes.filter((q) => q.price_gbp != null);
    const avgPrice = priced.length
      ? priced.reduce((s, q) => s + Number(q.price_gbp), 0) / priced.length
      : 0;
    const etas = filteredQuotes.filter((q) => q.eta_minutes != null);
    const avgEta = etas.length
      ? etas.reduce((s, q) => s + Number(q.eta_minutes), 0) / etas.length
      : 0;
    const unassigned = filteredJobs.filter(
      (j) => !j.assigned_technician_id && !CLOSED.includes(j.status),
    ).length;
    const cancelled = filteredJobs.filter((j) => j.status === "cancelled").length;
    const paymentRequested = filteredJobs.filter(
      (j) => j.platform_fee_status === "paid" || j.platform_fee_status === "pending" ||
        j.stripe_checkout_url,
    ).length;
    const conversion = paymentRequested ? (paid.length / paymentRequested) * 100 : 0;
    return { total, open, closed, paid: paid.length, revenue, avgPrice, avgEta, unassigned, cancelled, conversion };
  }, [filteredJobs, filteredQuotes]);

  // Time series
  const series = useMemo(() => {
    const map = new Map<string, { key: string; total: number; closed: number; revenue: number }>();
    for (const j of filteredJobs) {
      const k = bucketKey(j.created_at, granularity);
      const e = map.get(k) ?? { key: k, total: 0, closed: 0, revenue: 0 };
      e.total += 1;
      if (CLOSED.includes(j.status)) e.closed += 1;
      map.set(k, e);
    }
    for (const q of filteredQuotes) {
      if (q.status !== "accepted" || !q.job_id) continue;
      const j = filteredJobs.find((x) => x.id === q.job_id);
      if (!j) continue;
      const k = bucketKey(j.created_at, granularity);
      const e = map.get(k) ?? { key: k, total: 0, closed: 0, revenue: 0 };
      e.revenue += Number(q.price_gbp ?? 0);
      map.set(k, e);
    }
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredJobs, filteredQuotes, granularity]);

  const maxBar = Math.max(1, ...series.map((s) => s.total));

  // Jobs by postcode
  const byPostcode = useMemo(() => {
    const map = new Map<string, { code: string; jobs: number; paid: number }>();
    for (const j of filteredJobs) {
      const code = normPc(j.postcode);
      if (!code) continue;
      const e = map.get(code) ?? { code, jobs: 0, paid: 0 };
      e.jobs += 1;
      if (j.platform_fee_status === "paid" || j.status === "paid") e.paid += 1;
      map.set(code, e);
    }
    return Array.from(map.values()).sort((a, b) => b.jobs - a.jobs).slice(0, 25);
  }, [filteredJobs]);

  // Tech performance
  const techPerf = useMemo(() => {
    const map = new Map<string, { id: string; name: string; jobs: number; revenue: number; avgPrice: number; quotes: number }>();
    const nameOf = (id: string) => techs.find((t) => t.id === id)?.name ?? id.slice(0, 6);
    for (const j of filteredJobs) {
      const id = j.assigned_technician_id;
      if (!id) continue;
      const e = map.get(id) ?? { id, name: nameOf(id), jobs: 0, revenue: 0, avgPrice: 0, quotes: 0 };
      e.jobs += 1;
      map.set(id, e);
    }
    for (const q of filteredQuotes) {
      if (!q.technician_id) continue;
      const e = map.get(q.technician_id) ?? { id: q.technician_id, name: nameOf(q.technician_id), jobs: 0, revenue: 0, avgPrice: 0, quotes: 0 };
      e.quotes += 1;
      if (q.status === "accepted") e.revenue += Number(q.price_gbp ?? 0);
      map.set(q.technician_id, e);
    }
    const list = Array.from(map.values()).map((e) => ({
      ...e,
      avgPrice: e.jobs ? e.revenue / e.jobs : 0,
    }));
    return list.sort((a, b) => b.jobs - a.jobs || b.revenue - a.revenue).slice(0, 15);
  }, [filteredJobs, filteredQuotes, techs]);

  const exportSummary = () => {
    downloadCsv(`reports-summary-${from}-to-${to}.csv`, [
      ["Metric", "Value"],
      ["Total jobs", kpi.total],
      ["Open", kpi.open],
      ["Closed", kpi.closed],
      ["Paid", kpi.paid],
      ["Revenue (GBP)", kpi.revenue.toFixed(2)],
      ["Avg quote (GBP)", kpi.avgPrice.toFixed(2)],
      ["Avg ETA (min)", kpi.avgEta.toFixed(1)],
      ["Unassigned", kpi.unassigned],
      ["Cancelled", kpi.cancelled],
      ["Payment conversion %", kpi.conversion.toFixed(1)],
    ]);
  };

  const exportJobs = () => {
    downloadCsv(`reports-jobs-${from}-to-${to}.csv`, [
      ["Ref", "Created", "Status", "Postcode", "Customer", "Tech", "Pay status"],
      ...filteredJobs.map((j) => [
        j.id.slice(0, 6),
        j.created_at,
        j.status,
        j.postcode ?? "",
        j.customer_name ?? "",
        j.assigned_technician_id ?? "",
        j.platform_fee_status,
      ]),
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Operational insights across jobs, quotes, payments and technicians.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportSummary}>
            <Download className="mr-1 h-4 w-4" /> Summary CSV
          </Button>
          <Button size="sm" variant="outline" onClick={exportJobs}>
            <Download className="mr-1 h-4 w-4" /> Jobs CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-white/10 bg-white/[0.03] p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Postcode</label>
            <Input placeholder="e.g. SW1" value={pc} onChange={(e) => setPc(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Technician</label>
            <Select value={techId} onValueChange={setTechId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">All</SelectItem>
                {techs.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Job status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {JOB_STATUS_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Payment status</label>
            <Select value={payStatus} onValueChange={setPayStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAY_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s === "all" ? "All" : s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
        <Kpi label="Total jobs" value={kpi.total} icon={Briefcase} />
        <Kpi label="Open" value={kpi.open} icon={Clock} />
        <Kpi label="Closed" value={kpi.closed} icon={BarChart3} />
        <Kpi label="Paid" value={kpi.paid} icon={PoundSterling} />
        <Kpi label="Revenue" value={`£${kpi.revenue.toFixed(0)}`} icon={PoundSterling} />
        <Kpi label="Avg quote" value={`£${kpi.avgPrice.toFixed(0)}`} icon={TrendingUp} />
        <Kpi label="Avg ETA" value={`${kpi.avgEta.toFixed(0)}m`} icon={Clock} />
        <Kpi label="Unassigned" value={kpi.unassigned} icon={AlertCircle} />
        <Kpi label="Cancelled" value={kpi.cancelled} icon={XCircle} />
        <Kpi label="Pay conversion" value={`${kpi.conversion.toFixed(0)}%`} icon={TrendingUp} />
      </div>

      {/* Time series */}
      <Card className="border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4 text-primary" /> Jobs over time
          </div>
          <div className="flex gap-1">
            {(["day", "week", "month"] as const).map((g) => (
              <Button
                key={g}
                size="sm"
                variant={granularity === g ? "default" : "outline"}
                onClick={() => setGranularity(g)}
              >
                {g}
              </Button>
            ))}
          </div>
        </div>
        {series.length === 0 ? (
          <div className="text-sm text-muted-foreground">No jobs in this range.</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex h-48 items-end gap-1 min-w-full">
              {series.map((s) => {
                const totalH = (s.total / maxBar) * 100;
                const closedH = (s.closed / maxBar) * 100;
                return (
                  <div key={s.key} className="flex flex-1 min-w-[18px] flex-col items-center gap-1">
                    <div className="relative flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-t bg-primary/30"
                        style={{ height: `${totalH}%` }}
                        title={`Total: ${s.total}`}
                      />
                      <div
                        className="absolute bottom-0 w-full rounded-t bg-emerald-400/60"
                        style={{ height: `${closedH}%` }}
                        title={`Closed: ${s.closed}`}
                      />
                    </div>
                    <div className="rotate-45 origin-left text-[10px] text-muted-foreground whitespace-nowrap">
                      {s.key.slice(5)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-primary/40" /> Total
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-emerald-400/70" /> Closed
              </span>
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Postcode */}
        <Card className="border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-sky-300" /> Jobs by postcode
          </div>
          {byPostcode.length === 0 ? (
            <div className="text-sm text-muted-foreground">No data.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Postcode</TableHead>
                  <TableHead className="text-right">Jobs</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byPostcode.map((p) => (
                  <TableRow key={p.code}>
                    <TableCell className="font-mono">{p.code}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.jobs}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{p.paid}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Tech performance */}
        <Card className="border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-emerald-300" /> Best-performing technicians
          </div>
          {techPerf.length === 0 ? (
            <div className="text-sm text-muted-foreground">No technician activity.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Technician</TableHead>
                  <TableHead className="text-right">Jobs</TableHead>
                  <TableHead className="text-right">Quotes</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {techPerf.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="truncate max-w-[160px]">{t.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.jobs}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{t.quotes}</TableCell>
                    <TableCell className="text-right tabular-nums">£{t.revenue.toFixed(0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {loading && <div className="text-xs text-muted-foreground">Loading…</div>}
    </div>
  );
}

function Kpi({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <Card className="border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </Card>
  );
}
