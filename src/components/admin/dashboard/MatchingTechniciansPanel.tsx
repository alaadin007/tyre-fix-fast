import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Send, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DashJob, DashTech, DashAllocation, DashQuote } from "@/hooks/useDashboardData";
import { rankMatches, outwardCode } from "@/lib/techMatch";

export function MatchingTechniciansPanel({
  job, techs, allocations, quotes,
}: {
  job: DashJob;
  techs: DashTech[];
  allocations: DashAllocation[];
  quotes: DashQuote[];
}) {
  const matches = useMemo(() => rankMatches(job, techs, allocations, quotes), [job, techs, allocations, quotes]);
  const intakeIncomplete = job.status === "pending" || job.status === "intake_pending" || job.status === "unknown";
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);

  const covering = matches.filter((m) => m.covers);
  const visible = showAll ? matches : covering.length > 0 ? covering : matches.slice(0, 10);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const broadcast = async () => {
    if (intakeIncomplete) {
      toast.error("Customer hasn't finished the job intake yet");
      return;
    }
    if (selected.size === 0) {
      toast.error("Select at least one technician");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("broadcast-job", {
        body: { job_id: job.id, mode: "specific", technician_ids: Array.from(selected) },
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data.error || "Broadcast failed");
      toast.success(`Broadcast sent to ${data?.sent ?? selected.size} technician(s)`);
      setSelected(new Set());
    } catch (e: any) {
      toast.error(e.message ?? "Failed to broadcast");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          Matching uses the same logic as the WhatsApp dispatcher: outward postcode{" "}
          <span className="font-mono text-foreground">{outwardCode(job.postcode) || "—"}</span>, active &amp; approved technicians.
        </div>
        <Button size="sm" variant="ghost" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show matching only" : "Show all technicians"}
        </Button>
      </div>

      {intakeIncomplete && (
        <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          Broadcasting is disabled until the customer finishes the WhatsApp intake and the job posting is complete.
        </div>
      )}

      {visible.length === 0 && (
        <div className="rounded border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">
          No technicians match this postcode area yet.
        </div>
      )}

      <div className="space-y-2">
        {visible.map((m) => {
          const t = m.tech;
          const wa = t.whatsapp || t.phone;
          return (
            <div key={t.id} className="flex items-start gap-3 rounded border border-white/10 bg-white/[0.03] p-3 text-sm">
              <Checkbox
                checked={selected.has(t.id)}
                onCheckedChange={() => toggle(t.id)}
                className="mt-1"
                aria-label={`Select ${t.name}`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{t.name}</span>
                  {m.covers && <Badge variant="secondary" className="text-xs">Covers area</Badge>}
                  {m.available ? (
                    <Badge variant="default" className="text-xs">Available now</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Offline</Badge>
                  )}
                  {m.alreadyBroadcast && <Badge variant="outline" className="text-xs">Already broadcast</Badge>}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {wa && (
                    <a
                      href={`https://wa.me/${wa.replace(/[^\d]/g, "")}`}
                      target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      <Phone className="h-3 w-3" /> {wa}
                    </a>
                  )}
                  {(t.service_postcodes?.length ?? 0) > 0 && (
                    <span>Areas: {t.service_postcodes!.join(", ")}</span>
                  )}
                  {m.distance != null && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {m.distance.toFixed(1)} mi
                    </span>
                  )}
                  <span>★ {t.rating ?? "—"}</span>
                  <span>{t.jobs_completed ?? 0} done</span>
                  <span>{m.acceptedJobs} accepted · {m.cancelledJobs} lost</span>
                  {t.last_lat != null && t.last_lng != null && (
                    <a
                      href={`https://maps.google.com/?q=${t.last_lat},${t.last_lng}`}
                      target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" /> Location
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        <div className="text-xs text-muted-foreground">{selected.size} selected</div>
        <Button size="sm" onClick={broadcast} disabled={busy || selected.size === 0 || intakeIncomplete} title={intakeIncomplete ? "Waiting for customer to finish intake" : undefined}>
          <Send className="mr-1 h-3.5 w-3.5" />
          {busy ? "Broadcasting…" : "Broadcast to selected"}
        </Button>
      </div>
    </div>
  );
}
