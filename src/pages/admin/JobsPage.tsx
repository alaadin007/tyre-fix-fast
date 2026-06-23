import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/admin/dashboard/StatusBadge";
import { useDashboardData, shortRef, fmtRelative } from "@/hooks/useDashboardData";
import { JobDetailDrawer } from "@/pages/admin/JobDetailDrawer";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Briefcase, Clock, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { JOB_STATUS_FILTERS, paymentStatusLabel } from "@/lib/jobStatus";
import { cn } from "@/lib/utils";

export default function JobsPage() {
  const { jobs, quotes, allocations, techs } = useDashboardData();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [params, setParams] = useSearchParams();
  const openId = params.get("open");

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (status !== "all" && j.status !== status) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !(`${j.customer_name ?? ""} ${j.postcode ?? ""} ${j.customer_phone ?? ""} ${j.vehicle_reg ?? ""} ${j.tyre_size ?? ""} ${shortRef(j.id)}`
            .toLowerCase().includes(s))
        ) return false;
      }
      return true;
    });
  }, [jobs, search, status]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: jobs.length };
    for (const j of jobs) c[j.status] = (c[j.status] ?? 0) + 1;
    return c;
  }, [jobs]);

  const stats = useMemo(() => {
    const open = jobs.filter(j => !["completed", "paid", "closed", "cancelled"].includes(j.status)).length;
    const done = jobs.filter(j => ["completed", "paid", "closed"].includes(j.status)).length;
    const urgent = jobs.filter(j => ["pending", "intake_pending", "awaiting_approval"].includes(j.status)).length;
    return { open, done, urgent };
  }, [jobs]);

  const openJob = openId ? jobs.find((j) => j.id === openId) ?? null : null;

  const setOpen = (id: string | null) => {
    const p = new URLSearchParams(params);
    if (id) p.set("open", id); else p.delete("open");
    setParams(p, { replace: true });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filtered.length}</span> of {jobs.length} · live WhatsApp intake
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard label="Total" value={jobs.length} icon={Briefcase} tone="default" />
        <StatCard label="Open" value={stats.open} icon={Clock} tone="info" />
        <StatCard label="Needs Action" value={stats.urgent} icon={AlertTriangle} tone="warn" />
        <StatCard label="Completed" value={stats.done} icon={CheckCircle2} tone="success" />
      </div>

      {/* Filters */}
      <Card className="border-border/60 bg-card/60 p-3 shadow-sm backdrop-blur">
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search ref, name, postcode, phone, reg, tyre size…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="-mx-3 flex flex-nowrap gap-1.5 overflow-x-auto whitespace-nowrap px-3 pb-1 md:mx-0 md:flex-wrap md:px-0 md:pb-0">
            {JOB_STATUS_FILTERS.map((s) => {
              const active = status === s.value;
              const n = counts[s.value] ?? 0;
              return (
                <button
                  key={s.value}
                  onClick={() => setStatus(s.value)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-all",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  <span>{s.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] tabular-nums",
                      active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {n}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden border-border/60 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/50 backdrop-blur">
              <TableRow className="border-b border-border/60 hover:bg-transparent">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ref</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Customer</TableHead>
                <TableHead className="hidden text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">WhatsApp</TableHead>
                <TableHead className="hidden text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Postcode</TableHead>
                <TableHead className="hidden text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Location</TableHead>
                <TableHead className="hidden text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Vehicle</TableHead>
                <TableHead className="hidden text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Tyre</TableHead>
                <TableHead className="hidden text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Issue</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="hidden text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Payment</TableHead>
                <TableHead className="hidden text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Tech</TableHead>
                <TableHead className="hidden text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((j) => {
                const tech = techs.find((t) => t.id === j.assigned_technician_id);
                const wheels = (j.affected_wheels ?? []).join(", ");
                const tyre = [j.tyre_size, j.tyre_brand].filter(Boolean).join(" · ");
                const initials = (j.customer_name ?? "?")
                  .split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join("") || "?";
                return (
                  <TableRow
                    key={j.id}
                    className="group cursor-pointer border-b border-border/40 transition-colors hover:bg-primary/[0.04]"
                    onClick={() => setOpen(j.id)}
                  >
                    <TableCell className="font-mono text-xs font-semibold text-primary">#{shortRef(j.id)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                          {initials}
                        </span>
                        <span className="text-sm font-medium">{j.customer_name ?? "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-sm tabular-nums text-muted-foreground md:table-cell">{j.customer_phone ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {j.postcode ? (
                        <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-0.5 font-mono text-xs">
                          {j.postcode}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {j.lat != null && j.lng != null ? (
                        <a
                          href={`https://maps.google.com/?q=${j.lat},${j.lng}`}
                          target="_blank" rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-primary hover:bg-primary/10"
                        >
                          <MapPin className="h-3 w-3" /> Map
                        </a>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs uppercase md:table-cell">{j.vehicle_reg ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {wheels && <div className="font-medium text-foreground">{wheels}</div>}
                      {tyre && <div>{tyre}</div>}
                      {!wheels && !tyre && "—"}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-sm text-muted-foreground md:max-w-[220px]">
                      {j.damage_summary || j.issue_type || "—"}
                    </TableCell>
                    <TableCell><StatusBadge status={j.status} /></TableCell>
                    <TableCell className="hidden md:table-cell">
                      <PaymentPill status={j.platform_fee_status} />
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">
                      {tech?.name ?? <span className="text-muted-foreground">Unassigned</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{fmtRelative(j.created_at)}</TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Briefcase className="h-8 w-8 opacity-40" />
                      <div className="text-sm font-medium">No jobs match your filters</div>
                      <div className="text-xs">Try clearing the search or selecting "All"</div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <JobDetailDrawer
        job={openJob}
        open={!!openJob}
        onOpenChange={(v) => { if (!v) setOpen(null); }}
        quotes={quotes}
        allocations={allocations}
        techs={techs}
      />
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, tone,
}: { label: string; value: number; icon: any; tone: "default" | "info" | "warn" | "success" }) {
  const tones = {
    default: "bg-muted text-foreground",
    info: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    warn: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  };
  return (
    <Card className="flex items-center gap-2 border-border/60 bg-card p-3 shadow-sm transition-shadow hover:shadow-md md:gap-3 md:p-4">
      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg md:h-10 md:w-10", tones[tone])}>
        <Icon className="h-4 w-4 md:h-5 md:w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground md:text-xs">{label}</div>
        <div className="text-lg font-semibold tabular-nums md:text-2xl">{value}</div>
      </div>
    </Card>
  );
}

function PaymentPill({ status }: { status: string | null | undefined }) {
  const map: Record<string, string> = {
    paid: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    refunded: "bg-muted text-muted-foreground border-border",
    failed: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  };
  const cls = map[status ?? ""] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", cls)}>
      {paymentStatusLabel(status)}
    </span>
  );
}
