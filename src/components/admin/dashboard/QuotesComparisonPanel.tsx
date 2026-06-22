import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/admin/dashboard/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fmtRelative } from "@/hooks/useDashboardData";
import type { DashJob, DashQuote, DashTech, DashAllocation } from "@/hooks/useDashboardData";
import { distanceMiles } from "@/lib/techMatch";
import { Check, X, Send, ExternalLink, Trophy, Clock } from "lucide-react";

export function QuotesComparisonPanel({
  job, quotes, techs, allocations,
}: {
  job: DashJob;
  quotes: DashQuote[];
  techs: DashTech[];
  allocations?: DashAllocation[];
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [windowExpiresAt, setWindowExpiresAt] = useState<number | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [forwarding, setForwarding] = useState(false);
  const [forwardedIds, setForwardedIds] = useState<Record<string, boolean>>({});

  // Fetch quote_window_expires_at directly from supabase for this job
  useEffect(() => {
    let cancelled = false;
    const fetchWindow = async () => {
      const { data, error } = await supabase
        .from("job_allocations")
        .select("quote_window_expires_at")
        .eq("job_id", job.id);
      if (cancelled) return;
      if (error || !data) {
        setWindowExpiresAt(null);
        return;
      }
      const times = data
        .map((r: any) => r.quote_window_expires_at)
        .filter((s: any): s is string => !!s)
        .map((s: string) => new Date(s).getTime())
        .filter((n: number) => !Number.isNaN(n));
      setWindowExpiresAt(times.length ? Math.max(...times) : null);
    };
    fetchWindow();
    return () => { cancelled = true; };
  }, [job.id]);

  const windowOpen = windowExpiresAt != null && windowExpiresAt > now;
  const secondsLeft = windowOpen ? Math.max(0, Math.ceil((windowExpiresAt! - now) / 1000)) : 0;

  useEffect(() => {
    if (!windowOpen) return;
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, [windowOpen]);


  const rows = useMemo(() => {
    return quotes
      .map((q) => {
        const tech = techs.find((t) => t.id === q.technician_id) ?? null;
        const dist =
          job.lat != null && job.lng != null && tech?.last_lat != null && tech?.last_lng != null
            ? distanceMiles({ lat: job.lat, lng: job.lng }, { lat: tech.last_lat, lng: tech.last_lng })
            : null;
        return { q, tech, dist };
      })
      .sort((a, b) => new Date(b.q.created_at).getTime() - new Date(a.q.created_at).getTime());
  }, [quotes, techs, job.lat, job.lng]);

  const bestId = useMemo(() => {
    const live = rows.filter((r) => r.q.status === "pending" || r.q.status === "accepted");
    if (live.length === 0) return null;
    const score = (r: typeof rows[number]) => {
      const p = Number(r.q.price_gbp ?? 9999);
      const e = Number(r.q.eta_minutes ?? 300);
      const d = r.dist ?? 50;
      return p + e * 0.5 + d * 2;
    };
    return live.slice().sort((a, b) => score(a) - score(b))[0].q.id;
  }, [rows]);

  const selectedIds = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);

  const forwardSelected = async () => {
    if (selectedIds.length === 0) return;
    setForwarding(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-forward-quotes", {
        body: { job_id: job.id, quote_ids: selectedIds },
      });
      if (error || (data as any)?.ok === false) {
        throw new Error((data as any)?.error ?? error?.message ?? "Failed");
      }
      toast.success(`Forwarded ${selectedIds.length} quote${selectedIds.length === 1 ? "" : "s"} to customer`);
      setForwardedIds((prev) => {
        const next = { ...prev };
        selectedIds.forEach((id) => { next[id] = true; });
        return next;
      });
      setSelected({});
    } catch (e: any) {
      toast.error(e.message ?? "Failed to forward quotes");
    } finally {
      setForwarding(false);
    }
  };

  const setStatus = async (quoteId: string, status: "accepted" | "lost") => {
    setBusy(quoteId + ":" + status);
    try {
      const { error } = await supabase.from("quotes").update({ status }).eq("id", quoteId);
      if (error) throw error;
      toast.success(`Quote ${status === "accepted" ? "accepted" : "rejected"}`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally { setBusy(null); }
  };

  if (windowOpen) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
        <Clock className="h-5 w-5 text-primary animate-pulse" />
        <div className="text-sm">Collecting quotes — window closes in {secondsLeft}s</div>
      </div>
    );
  }

  if (rows.length === 0) {
    return <div className="text-sm text-muted-foreground">No quotes received yet for this job.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        {rows.length} quote{rows.length === 1 ? "" : "s"} · best value highlighted
      </div>
      <div className="overflow-x-auto rounded border border-white/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Technician</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>ETA</TableHead>
              <TableHead>Distance</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ q, tech, dist }) => {
              const isBest = q.id === bestId;
              const isForwarded = !!forwardedIds[q.id] || q.status === "sent" || q.status === "proposed";
              const displayStatus = isForwarded ? "sent" : q.status;
              return (
                <TableRow key={q.id} className={isBest ? "bg-primary/5" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={!!selected[q.id]}
                      disabled={isForwarded}
                      onCheckedChange={(v) =>
                        setSelected((prev) => ({ ...prev, [q.id]: !!v }))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {isBest && <Trophy className="h-3.5 w-3.5 text-primary" />}
                      <div>
                        <div className="text-sm font-medium">{tech?.name ?? "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{tech?.whatsapp ?? tech?.phone ?? "—"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-semibold">£{q.price_gbp ?? "—"}</TableCell>
                  <TableCell className="text-sm">{q.eta_minutes ?? "—"} min</TableCell>
                  <TableCell className="text-sm">
                    {tech?.last_lat != null && tech?.last_lng != null ? (
                      <div className="flex flex-col gap-0.5">
                        <a
                          href={`https://maps.google.com/?q=${tech.last_lat},${tech.last_lng}`}
                          target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          {dist != null ? `${dist.toFixed(1)} mi` : "View"} <ExternalLink className="h-3 w-3" />
                        </a>
                        {tech.live_location_until && new Date(tech.live_location_until).getTime() > now ? (
                          <span className="text-[10px] text-emerald-500">● Live location active</span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No location yet</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtRelative(q.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <StatusBadge status={displayStatus} raw={isForwarded} />{isForwarded && false}
                      {q.tyre_included != null && (
                        <Badge variant="outline" className="text-[10px]">
                          {q.tyre_included ? "tyre incl" : "tyre excl"}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {q.status === "pending" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setStatus(q.id, "accepted")} disabled={!!busy}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setStatus(q.id, "lost")} disabled={!!busy}>
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-muted-foreground">
          {selectedIds.length} selected
        </div>
        <Button
          onClick={forwardSelected}
          disabled={selectedIds.length === 0 || forwarding}
        >
          <Send className="mr-1 h-3 w-3" />
          {forwarding ? "Forwarding…" : "Forward Selected to Customer"}
        </Button>
      </div>
    </div>
  );
}
