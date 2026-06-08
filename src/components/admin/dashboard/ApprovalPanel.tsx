import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/dashboard/StatusBadge";
import { CheckCircle2, PauseCircle, RefreshCcw, UserCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DashJob, DashQuote, DashTech } from "@/hooks/useDashboardData";
import { fmtRelative } from "@/hooks/useDashboardData";

const SHARED_STATUSES = ["in_progress", "completed", "paid", "closed", "cancelled"];

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
  const alreadyShared = SHARED_STATUSES.includes(job.status);
  const onHold = job.status === "on_hold";

  const sendDetails = async () => {
    setBusy("send");
    try {
      const { data, error } = await supabase.functions.invoke("admin-share-details", {
        body: { job_id: job.id },
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data.error || "Failed");
      toast.success("Details shared with customer & technician");
    } catch (e: any) { toast.error(e.message ?? "Failed"); } finally { setBusy(null); }
  };

  const holdJob = async () => {
    setBusy("hold");
    try {
      const { error } = await supabase.from("jobs")
        .update({ status: "on_hold" }).eq("id", job.id);
      if (error) throw error;
      toast.success("Job placed on hold");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };

  const resume = async () => {
    setBusy("resume");
    try {
      const { error } = await supabase.from("jobs")
        .update({ status: "awaiting_payment" }).eq("id", job.id);
      if (error) throw error;
      toast.success("Hold released");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };

  const changeTechnician = async () => {
    setBusy("change");
    try {
      if (acceptedQuote) {
        await supabase.from("quotes").update({ status: "lost" }).eq("id", acceptedQuote.id);
      }
      await supabase.from("jobs").update({
        assigned_technician_id: null,
        status: "broadcasting",
        platform_fee_status: paid ? "refund_pending" : job.platform_fee_status,
      }).eq("id", job.id);
      toast.success("Technician cleared — pick another quote or rebroadcast");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
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
        {onHold && (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
            <PauseCircle className="h-4 w-4" /> This job is on hold.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={sendDetails}
            disabled={!!busy || !assignedTech}
          >
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
            {alreadyShared ? "Resend details" : "Yes, send details"}
          </Button>
          {!onHold ? (
            <Button size="sm" variant="outline" onClick={holdJob} disabled={!!busy}>
              <PauseCircle className="mr-1 h-3.5 w-3.5" /> Hold
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={resume} disabled={!!busy}>
              <RefreshCcw className="mr-1 h-3.5 w-3.5" /> Release hold
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={changeTechnician} disabled={!!busy}>
            <UserCheck className="mr-1 h-3.5 w-3.5" /> Change technician
          </Button>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          “Yes, send details” triggers the existing WhatsApp flow: customer receives
          technician name, phone & live location; technician receives the customer &
          job details. Job status moves to <span className="font-medium">In progress</span>.
          “Change technician” clears the assignment so you can pick another quote or
          rebroadcast from the Matching tab.
        </p>
      </Card>
    </div>
  );
}
