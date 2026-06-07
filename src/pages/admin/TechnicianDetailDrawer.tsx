import { useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/admin/dashboard/StatusBadge";
import { fmtRelative, shortRef } from "@/hooks/useDashboardData";
import type { DashTech, DashJob, DashQuote, DashAllocation } from "@/hooks/useDashboardData";
import { jobStatusLabel } from "@/lib/jobStatus";
import { Phone, MapPin, Mail, Car, Star, ExternalLink, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export function TechnicianDetailDrawer({
  tech, open, onOpenChange, jobs, quotes, allocations, onEdit,
}: {
  tech: DashTech | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jobs: DashJob[];
  quotes: DashQuote[];
  allocations: DashAllocation[];
  onEdit: () => void;
}) {
  if (!tech) return null;

  const tQuotes = quotes.filter((q) => q.technician_id === tech.id);
  const tAllocs = allocations.filter((a) => a.technician_id === tech.id);
  const tJobs = jobs.filter(
    (j) => j.assigned_technician_id === tech.id || tQuotes.some((q) => q.job_id === j.id),
  );

  const completed = tJobs.filter((j) => ["completed", "paid", "closed"].includes(j.status)).length;
  const cancelled = tJobs.filter((j) => ["cancelled", "declined"].includes(j.status)).length;
  const acceptedQuotes = tQuotes.filter((q) => q.status === "accepted");
  const etas = acceptedQuotes.map((q) => q.eta_minutes).filter((n): n is number => typeof n === "number");
  const avgEta = etas.length ? Math.round(etas.reduce((a, b) => a + b, 0) / etas.length) : null;

  const liveLocation = useMemo(() => {
    if (tech.last_lat == null || tech.last_lng == null) return null;
    const fresh = tech.live_location_until && new Date(tech.live_location_until) > new Date();
    return {
      url: `https://www.google.com/maps?q=${tech.last_lat},${tech.last_lng}`,
      fresh,
      when: tech.last_location_at,
    };
  }, [tech]);

  const toggleActive = async () => {
    const { error } = await supabase
      .from("technicians").update({ active: !tech.active }).eq("id", tech.id);
    if (error) toast.error(error.message);
    else toast.success(!tech.active ? "Marked active" : "Marked inactive");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-2">
            <span>{tech.name}</span>
            <StatusBadge status={tech.approval_status} />
            {!tech.active && <span className="rounded bg-muted px-2 py-0.5 text-[10px] uppercase">inactive</span>}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="mr-1 h-3 w-3" /> Edit</Button>
          <div className="flex items-center gap-2 rounded-md border border-white/10 px-3 py-1.5 text-sm">
            <span>Active</span>
            <Switch checked={tech.active} onCheckedChange={toggleActive} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Completed" value={completed} />
          <Stat label="Cancelled" value={cancelled} />
          <Stat label="Avg ETA" value={avgEta != null ? `${avgEta}m` : "—"} />
          <Stat label="Rating" value={tech.rating?.toFixed(1) ?? "—"} icon={<Star className="h-3 w-3 text-amber-400" />} />
        </div>

        <div className="mt-4 grid gap-2 text-sm">
          <Row icon={<Phone className="h-3 w-3" />}>{tech.phone ?? "—"}{tech.whatsapp && tech.whatsapp !== tech.phone ? ` · WhatsApp ${tech.whatsapp}` : ""}</Row>
          {tech.email && <Row icon={<Mail className="h-3 w-3" />}>{tech.email}</Row>}
          {tech.vehicle && <Row icon={<Car className="h-3 w-3" />}>{tech.vehicle}</Row>}
          <Row icon={<MapPin className="h-3 w-3" />}>
            Postcodes: {tech.service_postcodes?.length ? tech.service_postcodes.join(", ") : "—"}
            {tech.travel_radius_miles ? ` · ${tech.travel_radius_miles}mi radius` : ""}
          </Row>
          <Row icon={<MapPin className="h-3 w-3" />}>
            Availability: {tech.availability_now ? "Available now" : "Off"}
            {tech.available_until ? ` (until ${new Date(tech.available_until).toLocaleString()})` : ""}
          </Row>
          {liveLocation ? (
            <Row icon={<MapPin className="h-3 w-3" />}>
              <a href={liveLocation.url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 underline">
                Live location {liveLocation.fresh ? "(live)" : ""} <ExternalLink className="h-3 w-3" />
              </a>
              {liveLocation.when && <span className="ml-2 text-xs text-muted-foreground">{fmtRelative(liveLocation.when)}</span>}
            </Row>
          ) : (
            <Row icon={<MapPin className="h-3 w-3" />}>No live location shared</Row>
          )}
        </div>

        {tech.notes && (
          <div className="mt-4 rounded-md border border-white/10 bg-white/[0.02] p-3 text-sm">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Internal notes</div>
            <p className="mt-1 whitespace-pre-wrap">{tech.notes}</p>
          </div>
        )}

        <Tabs defaultValue="jobs" className="mt-6">
          <TabsList>
            <TabsTrigger value="jobs">Job history ({tJobs.length})</TabsTrigger>
            <TabsTrigger value="quotes">Quotes ({tQuotes.length})</TabsTrigger>
            <TabsTrigger value="allocs">Allocations ({tAllocs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="mt-3 space-y-2">
            {tJobs.length === 0 && <p className="text-sm text-muted-foreground">No jobs yet.</p>}
            {tJobs.map((j) => (
              <div key={j.id} className="rounded-md border border-white/10 p-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">#{shortRef(j.id)} · {j.customer_name ?? "—"} · {j.postcode ?? "—"}</div>
                  <StatusBadge status={j.status} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {fmtRelative(j.created_at)} · {j.issue_type ?? "—"}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="quotes" className="mt-3 space-y-2">
            {tQuotes.length === 0 && <p className="text-sm text-muted-foreground">No quotes yet.</p>}
            {tQuotes.map((q) => (
              <div key={q.id} className="rounded-md border border-white/10 p-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>£{q.price_gbp ?? "—"} · ETA {q.eta_minutes ?? "—"}m</div>
                  <StatusBadge status={q.status} raw />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{fmtRelative(q.created_at)}</div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="allocs" className="mt-3 space-y-2">
            {tAllocs.length === 0 && <p className="text-sm text-muted-foreground">No allocations.</p>}
            {tAllocs.map((a) => (
              <div key={a.id} className="rounded-md border border-white/10 p-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>Job #{a.job_id ? shortRef(a.job_id) : "—"} · score {a.match_score ?? "—"}</div>
                  <StatusBadge status={a.status} raw />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{fmtRelative(a.created_at)}</div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.02] p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 inline-flex items-center gap-1 text-lg font-semibold tabular-nums">{icon}{value}</div>
    </div>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span>{children}</span>
    </div>
  );
}
