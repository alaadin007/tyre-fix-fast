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
  const visible = showAll ? matches : matches;

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

  const jobAllocs = allocations.filter((a) => a.job_id === job.id);
  const problemAllocs = jobAllocs.filter(
    (a) => a.broadcast_status === "failed" || a.broadcast_status === "fallback_used",
  );
  const rebroadcastAll = async () => {
    if (intakeIncomplete) {
      toast.error("Customer hasn't finished the job intake yet");
      return;
    }
    const techIds = Array.from(new Set(problemAllocs.map((a) => a.technician_id).filter(Boolean) as string[]));
    if (techIds.length === 0) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("broadcast-job", {
        body: { job_id: job.id, mode: "specific", technician_ids: techIds },
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data.error || "Broadcast failed");
      toast.success(`Rebroadcast sent to ${data?.sent ?? techIds.length} technician(s)`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to rebroadcast");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {problemAllocs.length > 0 && (
        <div className="flex items-start justify-between gap-3 rounded border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-100">
          <div>
            <div className="font-semibold">Broadcast issue</div>
            <div className="mt-0.5 text-rose-200/90">
              {problemAllocs.length} of {jobAllocs.length} technicians may not have received this job.
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={rebroadcastAll} disabled={busy || job.status === "completed"}>
            Rebroadcast
          </Button>
        </div>
      )}
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
                disabled={job.status === "completed"}
                className="mt-1"
                aria-label={`Select ${t.name}`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {t.tech_code && (
                    <Badge variant="outline" className="font-mono text-[10px]">{t.tech_code}</Badge>
                  )}
                  <span className="font-medium">{t.name}</span>
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
                  <span>{t.jobs_completed ?? 0} done</span>
                  <span>{m.acceptedJobs} accepted · {m.cancelledJobs} lost</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        <div className="text-xs text-muted-foreground">{selected.size} selected</div>
        <Button size="sm" onClick={broadcast} disabled={busy || selected.size === 0 || intakeIncomplete || job.status === "completed"} title={intakeIncomplete ? "Waiting for customer to finish intake" : undefined}>
          <Send className="mr-1 h-3.5 w-3.5" />
          {busy ? "Broadcasting…" : "Broadcast to selected"}
        </Button>
      </div>
      {job.status === "completed" && (
        <div className="text-xs text-muted-foreground">
          This job has been completed. No further actions available.
        </div>
      )}
    </div>
  );
}
