import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/admin/dashboard/StatusBadge";
import { JobTimeline } from "@/components/admin/dashboard/JobTimeline";
import { JobConversation } from "@/components/console/JobConversation";
import { shortRef, fmtRelative } from "@/hooks/useDashboardData";
import type { DashJob, DashQuote, DashAllocation, DashTech } from "@/hooks/useDashboardData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Phone, MapPin, Car, ExternalLink, Send, CreditCard } from "lucide-react";
import { MatchingTechniciansPanel } from "@/components/admin/dashboard/MatchingTechniciansPanel";
import { QuotesComparisonPanel } from "@/components/admin/dashboard/QuotesComparisonPanel";
import { PaymentPanel } from "@/components/admin/dashboard/PaymentPanel";
import { ApprovalPanel } from "@/components/admin/dashboard/ApprovalPanel";

export function JobDetailDrawer({
  job, open, onOpenChange, quotes, allocations, techs,
}: {
  job: DashJob | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  quotes: DashQuote[];
  allocations: DashAllocation[];
  techs: DashTech[];
}) {
  const [busy, setBusy] = useState<string | null>(null);
  if (!job) return null;

  const jobQuotes = quotes.filter((q) => q.job_id === job.id);
  const jobAllocs = allocations.filter((a) => a.job_id === job.id);
  const techName = (id: string | null) => techs.find((t) => t.id === id)?.name ?? (id ? id.slice(0, 6) : "—");

  const sendQuoteToCustomer = async (quoteId: string) => {
    setBusy(quoteId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-send-quote", {
        body: { job_id: job.id, quote_id: quoteId },
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data.error || "Failed");
      toast.success("Quote sent to customer");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to send quote");
    } finally {
      setBusy(null);
    }
  };

  const rebroadcast = async () => {
    setBusy("rebroadcast");
    try {
      const { error } = await supabase.functions.invoke("broadcast-job", { body: { job_id: job.id } });
      if (error) throw error;
      toast.success("Rebroadcasting…");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally { setBusy(null); }
  };

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

  const markCompleted = async () => {
    setBusy("complete");
    try {
      await supabase.from("jobs").update({ status: "completed" }).eq("id", job.id);
      toast.success("Job completed");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto bg-background sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <span className="font-mono text-sm text-muted-foreground">#{shortRef(job.id)}</span>
            <span>{job.customer_name ?? "Unknown customer"}</span>
            <StatusBadge status={job.status} />
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" /> {job.postcode ?? "—"} {job.region ? `· ${job.region}` : ""}
          </div>
          {job.lat != null && job.lng != null && (
            <a
              href={`https://maps.google.com/?q=${job.lat},${job.lng}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-2 text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" /> Live location on map
            </a>
          )}
          {job.customer_phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" /> {job.customer_phone}
            </div>
          )}
          {job.vehicle_reg && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Car className="h-4 w-4" /> {job.vehicle_reg}
            </div>
          )}
          {(job.affected_wheels?.length ?? 0) > 0 && (
            <div className="text-muted-foreground">
              <span className="text-foreground">Affected tyre(s): </span>{job.affected_wheels!.join(", ")}
            </div>
          )}
          {(job.tyre_size || job.tyre_brand || job.tyre_type) && (
            <div className="text-muted-foreground">
              <span className="text-foreground">Tyre: </span>
              {[job.tyre_size, job.tyre_brand, job.tyre_type].filter(Boolean).join(" · ")}
            </div>
          )}
          <div className="text-muted-foreground">
            <span className="text-foreground">Payment: </span>{job.platform_fee_status}
          </div>
          <div className="text-muted-foreground">
            <span className="text-foreground">Created: </span>{new Date(job.created_at).toLocaleString()}
          </div>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          {job.damage_summary || job.issue_description || job.issue_type || "—"}
        </div>
        {job.photo_urls && job.photo_urls.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {job.photo_urls.slice(0, 6).map((u, i) => (
              <a key={i} href={u} target="_blank" rel="noreferrer">
                <img src={u} alt="Tyre photo uploaded by customer" className="h-16 w-16 rounded object-cover" />
              </a>
            ))}
          </div>
        )}

        {(() => null)()}
        <div className="mt-4 flex flex-wrap gap-2">
          {(() => {
            const intakeIncomplete = job.status === "pending" || job.status === "intake_pending" || job.status === "unknown";
            const intakeTitle = intakeIncomplete ? "Waiting for customer to finish intake" : undefined;
            return (
              <>
                <Button size="sm" variant="outline" onClick={rebroadcast} disabled={!!busy || intakeIncomplete} title={intakeTitle}>
                  <Send className="mr-1 h-3.5 w-3.5" /> Rebroadcast
                </Button>
                {job.platform_fee_status !== "paid" && (
                  <Button size="sm" variant="outline" onClick={markPaid} disabled={!!busy || intakeIncomplete} title={intakeTitle}>
                    <CreditCard className="mr-1 h-3.5 w-3.5" /> Mark paid
                  </Button>
                )}
                {job.status !== "completed" && job.status !== "paid" && (
                  <Button size="sm" variant="outline" onClick={markCompleted} disabled={!!busy || intakeIncomplete} title={intakeTitle}>
                    Mark completed
                  </Button>
                )}
              </>
            );
          })()}
          {job.stripe_checkout_url && (
            <a href={job.stripe_checkout_url} target="_blank" rel="noreferrer">
              <Button size="sm" variant="ghost">
                <ExternalLink className="mr-1 h-3.5 w-3.5" /> Checkout
              </Button>
            </a>
          )}
        </div>

        <Tabs defaultValue="timeline" className="mt-6">
          <TabsList>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="matching">Matching technicians</TabsTrigger>
            <TabsTrigger value="broadcasts">Broadcasts ({jobAllocs.length})</TabsTrigger>
            <TabsTrigger value="quotes">Quotes ({jobQuotes.length})</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
            <TabsTrigger value="approval">Approval</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4">
            <JobTimeline job={job} quotes={jobQuotes} allocations={jobAllocs} techs={techs} />
          </TabsContent>

          <TabsContent value="matching" className="mt-4">
            <MatchingTechniciansPanel job={job} techs={techs} allocations={allocations} quotes={quotes} />
          </TabsContent>



          <TabsContent value="broadcasts" className="mt-4 space-y-2">
            {jobAllocs.length === 0 && <div className="text-sm text-muted-foreground">No broadcasts yet.</div>}
            {jobAllocs.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded border border-white/10 bg-white/[0.03] p-3 text-sm">
                <div className="flex-1">
                  <div className="font-medium">{techName(a.technician_id)}</div>
                  <div className="text-xs text-muted-foreground">{fmtRelative(a.created_at)}</div>
                </div>
                {a.match_score != null && (
                  <div className="text-xs text-muted-foreground">Score {Number(a.match_score).toFixed(2)}</div>
                )}
                <StatusBadge status={a.status} />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="quotes" className="mt-4">
            <QuotesComparisonPanel job={job} quotes={jobQuotes} techs={techs} />
          </TabsContent>

          <TabsContent value="payment" className="mt-4">
            <PaymentPanel job={job} quotes={jobQuotes} />
          </TabsContent>

          <TabsContent value="approval" className="mt-4">
            <ApprovalPanel job={job} quotes={jobQuotes} techs={techs} />
          </TabsContent>

          <TabsContent value="messages" className="mt-4">
            <JobConversation jobId={job.id} customerPhone={job.customer_phone ?? ""} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
