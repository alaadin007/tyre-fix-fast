import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/admin/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useDashboardData, fmtRelative, type DashTech } from "@/hooks/useDashboardData";
import { Star, MapPin, Phone, Plus, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TechnicianEditDialog } from "./TechnicianEditDialog";
import { TechnicianDetailDrawer } from "./TechnicianDetailDrawer";

export default function TechniciansPage() {
  const { techs, quotes, jobs, allocations } = useDashboardData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "pending">("all");
  const [postcode, setPostcode] = useState("");
  const [selected, setSelected] = useState<DashTech | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editMode, setEditMode] = useState<"create" | "edit">("create");

  const enriched = useMemo(() => {
    return techs.map((t) => {
      const tQuotes = quotes.filter((q) => q.technician_id === t.id);
      const tJobs = jobs.filter(
        (j) => j.assigned_technician_id === t.id || tQuotes.some((q) => q.job_id === j.id),
      );
      const pending = tQuotes.filter((q) => q.status === "pending").length;
      const completed = tJobs.filter((j) => ["completed", "paid", "closed"].includes(j.status)).length;
      const cancelled = tJobs.filter((j) => ["cancelled", "declined"].includes(j.status)).length;
      const etas = tQuotes
        .filter((q) => q.status === "accepted")
        .map((q) => q.eta_minutes)
        .filter((n): n is number => typeof n === "number");
      const avgEta = etas.length ? Math.round(etas.reduce((a, b) => a + b, 0) / etas.length) : null;
      const liveFresh = t.live_location_until && new Date(t.live_location_until) > new Date();
      return { ...t, pending, completed, cancelled, avgEta, liveFresh };
    });
  }, [techs, quotes, jobs]);

  const filtered = enriched.filter((t) => {
    if (filter === "active" && !t.active) return false;
    if (filter === "inactive" && t.active) return false;
    if (filter === "pending" && t.approval_status !== "pending") return false;
    if (search && !`${t.name} ${t.phone ?? ""} ${t.whatsapp ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (postcode && !(t.service_postcodes ?? []).some((p) => p.toUpperCase().includes(postcode.toUpperCase()))) return false;
    return true;
  });

  const openCreate = () => { setEditMode("create"); setSelected(null); setEditOpen(true); };
  const openEdit = (t: DashTech) => { setEditMode("edit"); setSelected(t); setEditOpen(true); };
  const openDetail = (t: DashTech) => { setSelected(t); setDrawerOpen(true); };

  const toggleActive = async (t: DashTech) => {
    const { error } = await supabase.from("technicians").update({ active: !t.active }).eq("id", t.id);
    if (error) toast.error(error.message);
    else toast.success(!t.active ? `${t.name} active` : `${t.name} inactive`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Technicians</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {techs.length}</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-1 h-4 w-4" /> Add technician</Button>
      </div>

      <Card className="border-white/10 bg-white/[0.03] p-3">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search name, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[200px] flex-1"
          />
          <Input
            placeholder="Postcode…"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            className="w-[140px]"
          />
          {(["all", "active", "inactive", "pending"] as const).map((f) => (
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
              <TableHead>Tech ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Postcodes</TableHead>
              <TableHead>Availability</TableHead>
              <TableHead>Live</TableHead>
              <TableHead>Avg ETA</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Cancelled</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Active</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => (
              <TableRow key={t.id} className="cursor-pointer" onClick={() => openDetail(t)}>
                <TableCell className="text-xs font-mono">
                  {t.tech_code ? <span className="rounded bg-primary/15 px-1.5 py-0.5 text-primary">{t.tech_code}</span> : "—"}
                </TableCell>
                <TableCell className="text-sm font-medium">
                  <div>{t.name}</div>
                  <div className="text-[10px] text-muted-foreground"><StatusBadge status={t.approval_status} /></div>
                </TableCell>
                <TableCell className="text-xs">
                  {(t.whatsapp || t.phone) && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" />{t.whatsapp || t.phone}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {(t.service_postcodes ?? []).slice(0, 4).join(", ") || "—"}
                  {(t.service_postcodes?.length ?? 0) > 4 ? ` +${(t.service_postcodes!.length - 4)}` : ""}
                </TableCell>
                <TableCell className="text-xs">
                  {t.availability_now ? <span className="text-emerald-400">Available</span> : <span className="text-muted-foreground">Off</span>}
                </TableCell>
                <TableCell className="text-xs">
                  {t.last_lat != null && t.last_lng != null ? (
                    <a
                      href={`https://www.google.com/maps?q=${t.last_lat},${t.last_lng}`}
                      target="_blank" rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-primary underline"
                    >
                      <MapPin className="h-3 w-3" />{t.liveFresh ? "live" : "last"}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : "—"}
                  {t.last_location_at && <div className="text-[10px] text-muted-foreground">{fmtRelative(t.last_location_at)}</div>}
                </TableCell>
                <TableCell className="text-sm tabular-nums">{t.avgEta != null ? `${t.avgEta}m` : "—"}</TableCell>
                <TableCell className="text-sm tabular-nums">{t.completed}</TableCell>
                <TableCell className="text-sm tabular-nums">{t.cancelled}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 text-sm">
                    <Star className="h-3 w-3 text-amber-400" />
                    {t.rating?.toFixed(1) ?? "—"}
                  </span>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Switch checked={t.active} onCheckedChange={() => toggleActive(t)} />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="outline" onClick={() => openEdit(t)}>Edit</Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-8 text-center text-sm text-muted-foreground">
                  No technicians match.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <TechnicianEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode={editMode}
        tech={editMode === "edit" ? selected : null}
      />
      <TechnicianDetailDrawer
        tech={selected}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        jobs={jobs}
        quotes={quotes}
        allocations={allocations}
        onEdit={() => { setEditMode("edit"); setEditOpen(true); }}
      />
    </div>
  );
}
