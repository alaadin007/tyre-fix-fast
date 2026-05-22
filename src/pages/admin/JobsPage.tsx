import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/admin/dashboard/StatusBadge";
import { useDashboardData, shortRef, fmtRelative } from "@/hooks/useDashboardData";
import { JobDetailDrawer } from "@/pages/admin/JobDetailDrawer";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

const STATUS_OPTIONS = [
  "all", "pending", "intake_pending", "broadcasting", "awaiting_approval",
  "accepted", "awaiting_payment", "in_progress", "completed", "paid", "cancelled",
];

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
          !(`${j.customer_name ?? ""} ${j.postcode ?? ""} ${j.customer_phone ?? ""} ${j.vehicle_reg ?? ""} ${shortRef(j.id)}`
            .toLowerCase().includes(s))
        ) return false;
      }
      return true;
    });
  }, [jobs, search, status]);

  const openJob = openId ? jobs.find((j) => j.id === openId) ?? null : null;

  const setOpen = (id: string | null) => {
    const p = new URLSearchParams(params);
    if (id) p.set("open", id); else p.delete("open");
    setParams(p, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Jobs</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} of {jobs.length} jobs</p>
      </div>

      <Card className="border-white/10 bg-white/[0.03] p-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search ref, name, postcode, phone, reg…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {STATUS_OPTIONS.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={status === s ? "default" : "outline"}
                onClick={() => setStatus(s)}
                className="h-8"
              >
                {s.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="border-white/10 bg-white/[0.03]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Postcode</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Broadcasts</TableHead>
              <TableHead>Quotes</TableHead>
              <TableHead>Tech</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((j) => {
              const jq = quotes.filter((q) => q.job_id === j.id).length;
              const ja = allocations.filter((a) => a.job_id === j.id).length;
              const tech = techs.find((t) => t.id === j.assigned_technician_id);
              return (
                <TableRow key={j.id} className="cursor-pointer" onClick={() => setOpen(j.id)}>
                  <TableCell className="font-mono text-xs">#{shortRef(j.id)}</TableCell>
                  <TableCell className="text-sm">{j.customer_name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{j.postcode ?? "—"}</TableCell>
                  <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                    {j.damage_summary || j.issue_type || "—"}
                  </TableCell>
                  <TableCell><StatusBadge status={j.status} /></TableCell>
                  <TableCell className="text-sm tabular-nums">{ja}</TableCell>
                  <TableCell className="text-sm tabular-nums">{jq}</TableCell>
                  <TableCell className="text-sm">{tech?.name ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtRelative(j.created_at)}</TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground">No jobs match.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
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
