import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/admin/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDashboardData, fmtRelative } from "@/hooks/useDashboardData";
import { Star, MapPin, Phone } from "lucide-react";

export default function TechniciansPage() {
  const { techs, quotes, jobs } = useDashboardData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "pending">("all");

  const enriched = useMemo(() => {
    return techs.map((t) => {
      const tQuotes = quotes.filter((q) => q.technician_id === t.id);
      const pending = tQuotes.filter((q) => q.status === "pending").length;
      const accepted = tQuotes.filter((q) => q.status === "accepted").length;
      const assigned = jobs.filter((j) => j.assigned_technician_id === t.id).length;
      return { ...t, pending, accepted, assigned };
    });
  }, [techs, quotes, jobs]);

  const filtered = enriched.filter((t) => {
    if (filter === "active" && !t.active) return false;
    if (filter === "pending" && t.approval_status !== "pending") return false;
    if (search && !`${t.name} ${t.phone ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Technicians</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} of {techs.length}</p>
      </div>

      <Card className="border-white/10 bg-white/[0.03] p-3">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px]"
          />
          {(["all", "active", "pending"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="border-white/10 bg-white/[0.03]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Jobs</TableHead>
              <TableHead>Pending quotes</TableHead>
              <TableHead>Accepted</TableHead>
              <TableHead>Last location</TableHead>
              <TableHead>Phone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-sm font-medium">{t.name}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <StatusBadge status={t.approval_status} />
                    {t.active ? null : <span className="text-[10px] text-muted-foreground">inactive</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 text-sm">
                    <Star className="h-3 w-3 text-amber-400" />
                    {t.rating?.toFixed(1) ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="text-sm tabular-nums">{t.jobs_completed}</TableCell>
                <TableCell className="text-sm tabular-nums">{t.pending}</TableCell>
                <TableCell className="text-sm tabular-nums">{t.accepted}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {t.last_location_at ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {fmtRelative(t.last_location_at)}
                    </span>
                  ) : "—"}
                </TableCell>
                <TableCell className="text-xs">
                  {t.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{t.phone}</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
