import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/dashboard/StatusBadge";
import { ExternalLink, CreditCard, Copy, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DashJob, DashQuote } from "@/hooks/useDashboardData";
import { paymentStatusLabel } from "@/lib/jobStatus";
import { fmtRelative } from "@/hooks/useDashboardData";

export function PaymentPanel({ job, quotes }: { job: DashJob; quotes: DashQuote[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const acceptedQuote = quotes.find((q) => q.status === "accepted");
  const amount = acceptedQuote?.price_gbp ?? null;

  const awaitingRelease =
    job.platform_fee_status === "paid" &&
    !["in_progress", "completed", "paid", "closed", "cancelled", "both_parties_connected"].includes(job.status);

  const markPaid = async () => {
    setBusy("paid");
    try {
      await supabase.from("jobs").update({
        platform_fee_status: "paid",
        platform_fee_paid_at: new Date().toISOString(),
        status: "in_progress",
      }).eq("id", job.id);
      toast.success("Marked as paid");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };

  const markFailed = async () => {
    setBusy("failed");
    try {
      await supabase.from("jobs").update({ platform_fee_status: "failed" }).eq("id", job.id);
      toast.success("Marked as failed");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };

  const refund = async () => {
    setBusy("refund");
    try {
      const { error } = await supabase.functions.invoke("refund-fee", { body: { job_id: job.id } });
      if (error) throw error;
      toast.success("Refund triggered");
    } catch (e: any) { toast.error(e.message ?? "Failed"); } finally { setBusy(null); }
  };

  const resend = async () => {
    if (!acceptedQuote) {
      toast.error("No accepted quote to bill");
      return;
    }
    setBusy("resend");
    try {
      const { error } = await supabase.functions.invoke("admin-send-quote", {
        body: { job_id: job.id, quote_id: acceptedQuote.id },
      });
      if (error) throw error;
      toast.success("Payment link resent to customer");
    } catch (e: any) { toast.error(e.message ?? "Failed"); } finally { setBusy(null); }
  };

  const copyLink = () => {
    if (!job.stripe_checkout_url) return;
    navigator.clipboard.writeText(job.stripe_checkout_url);
    toast.success("Link copied");
  };

  return (
    <div className="space-y-4">
      {awaitingRelease && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-400" />
          <div>
            <div className="font-semibold text-amber-200">Paid — awaiting technician details release</div>
            <div className="text-xs text-amber-200/80">
              Reply <span className="font-mono">YES {job.id.slice(0, 6).toUpperCase()}</span> on WhatsApp to share contact details with both parties.
            </div>
          </div>
        </div>
      )}

      <Card className="border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CreditCard className="h-4 w-4 text-primary" /> Payment summary
          </div>
          <StatusBadge status={job.platform_fee_status} />
        </div>
        {["awaiting_payment", "paid", "completed", "in_progress", "both_parties_connected"].includes(job.status) ? (
          <>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Amount requested</dt>
              <dd className="font-semibold">{amount != null ? `£${amount}` : "—"}</dd>

              <dt className="text-muted-foreground">Status</dt>
              <dd>{paymentStatusLabel(job.platform_fee_status)}</dd>

              <dt className="text-muted-foreground">Paid at</dt>
              <dd>
                {job.platform_fee_paid_at
                  ? `${new Date(job.platform_fee_paid_at).toLocaleString()} (${fmtRelative(job.platform_fee_paid_at)})`
                  : "—"}
              </dd>

              <dt className="text-muted-foreground">Refunded at</dt>
              <dd>
                {job.platform_fee_refunded_at
                  ? `${new Date(job.platform_fee_refunded_at).toLocaleString()}`
                  : "—"}
              </dd>

              <dt className="text-muted-foreground">Stripe session</dt>
              <dd className="font-mono text-xs">{job.stripe_session_id ?? "—"}</dd>

              <dt className="text-muted-foreground">Payment link</dt>
              <dd>
                {job.stripe_checkout_url ? (
                  <div className="flex items-center gap-1">
                    <a
                      href={job.stripe_checkout_url}
                      target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                    <Button size="sm" variant="ghost" onClick={copyLink}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ) : "—"}
              </dd>
            </dl>

            {job.platform_fee_status === "paid" && (
              <div className="mt-3 flex items-center gap-1 text-xs text-emerald-300">
                <CheckCircle2 className="h-3 w-3" /> Customer payment confirmed
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-muted-foreground">
            No payment requested yet. Details will appear here once the customer selects a quote and pays.
          </div>
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        {job.platform_fee_status !== "paid" && (
          <Button size="sm" variant="outline" onClick={markPaid} disabled={!!busy}>
            Mark as paid
          </Button>
        )}
        {job.platform_fee_status !== "paid" && acceptedQuote && (
          <Button size="sm" variant="outline" onClick={resend} disabled={!!busy}>
            Resend payment link
          </Button>
        )}
        {job.platform_fee_status === "paid" && !job.platform_fee_refunded_at && (
          <Button size="sm" variant="outline" onClick={refund} disabled={!!busy || job.status === "completed"}>
            Refund
          </Button>
        )}
        {job.platform_fee_status !== "paid" && job.platform_fee_status !== "failed" && (
          <Button size="sm" variant="ghost" onClick={markFailed} disabled={!!busy}>
            Mark failed
          </Button>
        )}
      </div>
    </div>
  );
}
