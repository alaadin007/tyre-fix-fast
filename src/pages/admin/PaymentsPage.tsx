import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/admin/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboardData, shortRef, fmtRelative } from "@/hooks/useDashboardData";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CalendarIcon, ExternalLink } from "lucide-react";

export default function PaymentsPage() {
  const { jobs, quotes, techs } = useDashboardData();
  const [status, setStatus] = useState("all");
  const [techFilter, setTechFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [busy, setBusy] = useState<string | null>(null);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const fromTs = fromDate ? new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate()).getTime() : null;
    const toTs = toDate ? new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate()).getTime() + 24 * 60 * 60 * 1000 - 1 : null;
    return jobs
      .filter((j) => j.stripe_session_id || j.platform_fee_status !== "pending")
      .filter((j) => status === "all" || j.platform_fee_status === status)
      .filter((j) => techFilter === "all" || j.assigned_technician_id === techFilter)
      .filter((j) => {
        if (!fromTs && !toTs) return true;
        const dateStr = j.platform_fee_paid_at ?? j.created_at;
        if (!dateStr) return false;
        const ts = new Date(dateStr).getTime();
        if (fromTs && ts < fromTs) return false;
        if (toTs && ts > toTs) return false;
        return true;
      });
  }, [jobs, status, techFilter, fromDate, toDate]);

  const totals = useMemo(() => {
    const paid = jobs.filter((j) => j.platform_fee_status === "paid").length;
    const refunded = jobs.filter((j) => j.platform_fee_refunded_at).length;
    const revenue = quotes.filter((q) => q.status === "accepted")
      .reduce((s, q) => s + Number(q.price_gbp ?? 0), 0);
    return { paid, refunded, revenue };
  }, [jobs, quotes]);

  const markPaid = async (jobId: string) => {
    setBusy(jobId);
    try {
      await supabase.from("jobs").update({
        platform_fee_status: "paid",
        platform_fee_paid_at: new Date().toISOString(),
        status: "in_progress",
      }).eq("id", jobId);
      toast.success("Marked paid");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };

  const refund = async (jobId: string) => {
    setBusy(jobId);
    try {
      const { error } = await supabase.functions.invoke("refund-fee", { body: { job_id: jobId } });
      if (error) throw error;
      toast.success("Refund triggered");
    } catch (e: any) { toast.error(e.message ?? "Failed"); } finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Payments</h1>
        <p className="text-sm text-muted-foreground">
          {totals.paid} paid · {totals.refunded} refunded · £{totals.revenue.toFixed(0)} accepted revenue
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {["all", "pending", "paid", "refunded", "failed"].map((s) => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>
            {s}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Technician</Label>
          <Select value={techFilter} onValueChange={setTechFilter}>
            <SelectTrigger className="h-9 w-[220px]">
              <SelectValue placeholder="All technicians" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All technicians</SelectItem>
              {techs.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name ?? t.tech_code ?? t.id.slice(0, 8)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-9 w-[180px] justify-start text-left font-normal",
                  !fromDate && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fromDate ? format(fromDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={setFromDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-9 w-[180px] justify-start text-left font-normal",
                  !toDate && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {toDate ? format(toDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={toDate}
                onSelect={setToDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
        {(techFilter !== "all" || fromDate || toDate) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setTechFilter("all"); setFromDate(undefined); setToDate(undefined); }}
          >
            Clear
          </Button>
        )}
      </div>

      <Card className="border-white/10 bg-white/[0.03]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Tech</TableHead>
              <TableHead>Tech ID</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((j) => {
              const acceptedQuote = quotes.find((q) => q.job_id === j.id && q.status === "accepted");
              const tech = techs.find((t) => t.id === j.assigned_technician_id);
              return (
                <TableRow key={j.id}>
                  <TableCell>
                    <button
                      className="font-mono text-xs text-primary hover:underline"
                      onClick={() => navigate(`/admin/dashboard/jobs?open=${j.id}`)}
                    >
                      #{shortRef(j.id)}
                    </button>
                  </TableCell>
                  <TableCell className="text-sm">{j.customer_name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{tech?.name ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{tech?.tech_code ?? "—"}</TableCell>
                  <TableCell className="text-sm font-semibold">£{acceptedQuote?.price_gbp ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={j.platform_fee_status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {j.platform_fee_paid_at ? fmtRelative(j.platform_fee_paid_at) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {j.stripe_checkout_url && (
                        <a href={j.stripe_checkout_url} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="ghost"><ExternalLink className="h-3.5 w-3.5" /></Button>
                        </a>
                      )}
                      {j.platform_fee_status !== "paid" && (
                        <Button size="sm" variant="outline" onClick={() => markPaid(j.id)} disabled={busy === j.id}>
                          Mark paid
                        </Button>
                      )}
                      {j.platform_fee_status === "paid" && !j.platform_fee_refunded_at && (
                        <Button size="sm" variant="outline" onClick={() => refund(j.id)} disabled={busy === j.id}>
                          Refund
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground">No payments.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
