import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  const send = async (quoteId: string) => {
    setBusy(quoteId + ":send");
    try {
      const { data, error } = await supabase.functions.invoke("admin-send-quote", {
        body: { job_id: job.id, quote_id: quoteId },
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data.error || "Failed");
      toast.success("Quote forwarded to customer");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to send quote");
    } finally { setBusy(null); }
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
              return (
                <TableRow key={q.id} className={isBest ? "bg-primary/5" : ""}>
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
                    {dist != null ? (
                      <a
                        href={tech?.last_lat != null ? `https://maps.google.com/?q=${tech!.last_lat},${tech!.last_lng}` : undefined}
                        target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        {dist.toFixed(1)} mi <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtRelative(q.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <StatusBadge status={q.status} />
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
                          <Button size="sm" onClick={() => send(q.id)} disabled={!!busy}>
                            <Send className="mr-1 h-3 w-3" />
                            {busy === q.id + ":send" ? "Sending…" : "Forward"}
                          </Button>
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
    </div>
  );
}
