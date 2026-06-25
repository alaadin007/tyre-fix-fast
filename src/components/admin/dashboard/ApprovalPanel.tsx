import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/dashboard/StatusBadge";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DashJob, DashQuote, DashTech } from "@/hooks/useDashboardData";
import { fmtRelative } from "@/hooks/useDashboardData";

export function ApprovalPanel({
  job, quotes, techs,
}: {
  job: DashJob;
  quotes: DashQuote[];
  techs: DashTech[];
}) {
  const [busy, setBusy] = useState<string | null>(null);

  const paid = job.platform_fee_status === "paid";
  const acceptedQuote = quotes.find((q) => q.status === "accepted");
  const assignedTech = techs.find((t) => t.id === job.assigned_technician_id);
  const alreadyShared = (job as any).assignment_status === "details_sent";

  const sendDetails = async () => {
    setBusy("send");
    try {
      const { data, error } = await supabase.functions.invoke("admin-share-details", {
        body: { job_id: job.id },
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data.error || "Failed");
      toast.success("Customer and technician have been connected. Details shared via WhatsApp.");
    } catch (e: any) { toast.error(e.message ?? "Failed"); } finally { setBusy(null); }
  };

  if (!paid) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-400" />
        <div>
          Approval becomes available once the customer payment is confirmed.
          Current payment status: <StatusBadge status={job.platform_fee_status} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 text-sm font-semibold">Send technician details to customer?</div>
        <div className="mb-4 grid grid-cols-2 gap-y-2 text-sm">
          <div className="text-muted-foreground">Assigned technician</div>
          <div className="font-medium">{assignedTech?.name ?? "— none —"}</div>
          <div className="text-muted-foreground">Technician phone</div>
          <div>{assignedTech?.phone ?? assignedTech?.whatsapp ?? "—"}</div>
          <div className="text-muted-foreground">Customer</div>
          <div>{job.customer_name ?? "—"} · {job.customer_phone ?? "—"}</div>
          <div className="text-muted-foreground">Paid amount</div>
          <div>{acceptedQuote?.price_gbp != null ? `£${acceptedQuote.price_gbp}` : "—"}</div>
          <div className="text-muted-foreground">Paid at</div>
          <div>{job.platform_fee_paid_at ? fmtRelative(job.platform_fee_paid_at) : "—"}</div>
          <div className="text-muted-foreground">Current job status</div>
          <div><StatusBadge status={job.status} /></div>
        </div>

        {alreadyShared && (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-200">
            <CheckCircle2 className="h-4 w-4" /> Details already shared. You can resend if needed.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={sendDetails}
            disabled={!!busy || !assignedTech || job.status === "completed"}
          >
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
            {alreadyShared ? "Resend to Both Parties" : "Connect Both Parties"}
          </Button>
        </div>

        {job.status === "completed" && (
          <div className="mt-2 text-xs text-muted-foreground">
            This job has been completed. No further action needed.
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          “Connect Both Parties” sends the technician's name, phone & live location to the customer via WhatsApp, and sends the customer's name, phone & job location to the technician. Job status will update to In Progress.
        </p>
      </Card>
    </div>
  );
}
