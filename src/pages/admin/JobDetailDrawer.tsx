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
import { Phone, MapPin, Car, ExternalLink, Send, CreditCard, ChevronLeft } from "lucide-react";
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

  const intakeIncomplete = job.status === "pending" || job.status === "intake_pending" || job.status === "unknown";
  const intakeTitle = intakeIncomplete ? "Waiting for customer to finish intake" : undefined;
  const initials = (job.customer_name ?? "?")
    .split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join("") || "?";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="dark w-full overflow-y-auto border-l border-border/60 bg-background p-0 text-foreground sm:max-w-2xl">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 border-b border-border/60 bg-card/80 px-6 py-4 backdrop-blur">
          <SheetHeader className="space-y-0">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-sm font-semibold text-primary">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-primary">#{shortRef(job.id)}</span>
                  <StatusBadge status={job.status} />
                </div>
                <SheetTitle className="mt-0.5 truncate text-base font-semibold">
                  {job.customer_name ?? "Unknown customer"}
                </SheetTitle>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {job.customer_phone && (
                    <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{job.customer_phone}</span>
                  )}
                  <span>Created {fmtRelative(job.created_at)}</span>
                </div>
              </div>
            </div>
          </SheetHeader>

          {/* Actions */}
          <div className="mt-3 flex flex-wrap gap-2">
            {job.status !== "completed" && job.status !== "paid" && (
              <Button size="sm" variant="outline" onClick={markCompleted} disabled={!!busy || intakeIncomplete} title={intakeTitle}>
                Mark completed
              </Button>
            )}
            {job.stripe_checkout_url && (
              <a href={job.stripe_checkout_url} target="_blank" rel="noreferrer">
                <Button size="sm" variant="ghost">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Checkout
                </Button>
              </a>
            )}
          </div>
          {intakeIncomplete && (
            <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-300">
              Waiting for the customer to finish the WhatsApp intake before actions are available.
            </div>
          )}
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          {/* Info cards */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <InfoTile icon={MapPin} label="Location"
              value={job.postcode ? `${job.postcode}${job.region ? ` · ${job.region}` : ""}` : "—"}
              action={job.lat != null && job.lng != null ? (
                <a href={`https://maps.google.com/?q=${job.lat},${job.lng}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" /> Map
                </a>
              ) : null}
            />
            <InfoTile icon={Car} label="Vehicle" value={job.vehicle_reg || "—"} />
            <InfoTile
              icon={Car}
              label="Tyre"
              value={[job.tyre_size, job.tyre_brand, job.tyre_type].filter(Boolean).join(" · ") || "—"}
              sub={job.affected_wheels?.length ? `Wheels: ${job.affected_wheels.join(", ")}` : undefined}
            />
            <InfoTile icon={CreditCard} label="Payment" value={job.platform_fee_status ?? "—"} />
          </div>

          {(job.damage_summary || job.issue_description || job.issue_type) && (
            <div className="rounded-lg border border-border/60 bg-card/40 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Issue</div>
              <div className="mt-1 text-sm text-foreground">
                {job.damage_summary || job.issue_description || job.issue_type}
              </div>
            </div>
          )}

          {job.photo_urls && job.photo_urls.length > 0 && (
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Photos ({job.photo_urls.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {job.photo_urls.slice(0, 6).map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer" className="group relative">
                    <img src={u} alt="Tyre photo uploaded by customer"
                      className="h-20 w-20 rounded-lg border border-border/60 object-cover transition-opacity group-hover:opacity-80" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <Tabs defaultValue="timeline" className="pt-1">
            <TabsList className="scrollbar-thin h-auto w-full justify-start gap-1 overflow-x-auto bg-muted/40 p-1">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="matching">Matching</TabsTrigger>
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
                <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3 text-sm">
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
              <QuotesComparisonPanel job={job} quotes={jobQuotes} techs={techs} allocations={jobAllocs} />
            </TabsContent>
            <TabsContent value="payment" className="mt-4">
              <PaymentPanel job={job} quotes={jobQuotes} />
            </TabsContent>
            <TabsContent value="approval" className="mt-4">
              <ApprovalPanel job={job} quotes={jobQuotes} techs={techs} />
            </TabsContent>
            <TabsContent value="messages" className="mt-4">
              <JobConversation jobId={job.id} customerPhone={job.customer_phone ?? ""} jobCreatedAt={job.created_at} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoTile({
  icon: Icon, label, value, sub, action,
}: { icon: any; label: string; value: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
          {action}
        </div>
        <div className="truncate text-sm font-medium text-foreground">{value}</div>
        {sub && <div className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}
