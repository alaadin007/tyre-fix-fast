import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/admin/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { useDashboardData, shortRef, fmtRelative } from "@/hooks/useDashboardData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STATUSES = ["all", "pending", "accepted", "lost"];

export default function QuotesPage() {
  const { quotes, techs, jobs } = useDashboardData();
  const [status, setStatus] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const navigate = useNavigate();

  const filtered = useMemo(
    () => quotes.filter((q) => status === "all" || q.status === status),
    [quotes, status],
  );

  const send = async (jobId: string, quoteId: string) => {
    setBusy(quoteId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-send-quote", {
        body: { job_id: jobId, quote_id: quoteId },
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data.error || "Failed");
      toast.success("Quote sent to customer");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally { setBusy(null); }
  const reject = async (quoteId: string) => {
    setBusy(quoteId);
    try {
      const { error } = await supabase.from("quotes").update({ status: "lost" }).eq("id", quoteId);
      if (error) throw error;
      toast.success("Quote rejected");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Quotes</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} of {quotes.length} quotes</p>
      </div>

      <div className="flex flex-wrap gap-1">
        {STATUSES.map((s) => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>
            {s}
          </Button>
        ))}
      </div>

      <Card className="border-white/10 bg-white/[0.03]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job</TableHead>
              <TableHead>Technician</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>ETA</TableHead>
              <TableHead>Tyre</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Received</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((q) => {
              const job = jobs.find((j) => j.id === q.job_id);
              const tech = techs.find((t) => t.id === q.technician_id);
              return (
                <TableRow key={q.id}>
                  <TableCell>
                    <button
                      className="font-mono text-xs text-primary hover:underline"
                      onClick={() => navigate(`/admin/dashboard/jobs?open=${q.job_id}`)}
                    >
                      #{q.job_id ? shortRef(q.job_id) : "—"}
                    </button>
                    {job && <div className="text-xs text-muted-foreground">{job.postcode}</div>}
                  </TableCell>
                  <TableCell className="text-sm">{tech?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm font-semibold">£{q.price_gbp ?? "—"}</TableCell>
                  <TableCell className="text-sm">{q.eta_minutes ?? "—"} min</TableCell>
                  <TableCell className="text-xs">
                    {q.tyre_included == null ? "—" : q.tyre_included ? `incl${q.tyre_condition ? ` (${q.tyre_condition})` : ""}` : "excl"}
                  </TableCell>
                  <TableCell><StatusBadge status={q.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtRelative(q.created_at)}</TableCell>
                  <TableCell className="text-right">
                    {q.status === "pending" && q.job_id && (
                      <Button size="sm" onClick={() => send(q.job_id!, q.id)} disabled={busy === q.id}>
                        {busy === q.id ? "Sending…" : "Send to customer"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground">No quotes.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
