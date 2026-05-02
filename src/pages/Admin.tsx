import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus, Trash2, Star, Phone, MapPin, RefreshCw, Upload, Settings,
  MessageSquare, MessageCircle, CheckCircle2, Clock, Sparkles, Users, ArrowLeft, Navigation,
  ShieldCheck, Zap, Check, X, ChevronsUpDown, Send, ChevronDown, ChevronUp, Image as ImageIcon, PoundSterling, User as UserIcon,
} from "lucide-react";
import { parseTechniciansFile, type ParsedTechnician } from "@/lib/parseTechnicians";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { AdminAIChat } from "@/components/admin/AdminAIChat";
import { PendingTechnicians } from "@/components/admin/PendingTechnicians";

type Technician = {
  id: string; name: string; phone: string; email: string | null;
  service_postcodes: string[]; vehicle: string | null; rating: number | null;
  jobs_completed: number; active: boolean; notes: string | null; created_at: string;
};
type SmsMessage = {
  id: string; direction: string; from_number: string; to_number: string;
  body: string; num_media: number; media_urls: string[]; status: string; created_at: string;
  channel?: string;
};
type Allocation = {
  id: string; job_id: string | null; technician_id: string | null;
  ai_reasoning: string | null; match_score: number | null; status: string; created_at: string;
  approved_at?: string | null; approved_by?: string | null;
};
type Job = {
  id: string; status: string; created_at: string;
  customer_name: string; customer_phone: string; postcode: string;
  issue_type: string; issue_description: string | null;
  damage_type: string | null; damage_summary: string | null; damage_confidence: string | null;
  photo_urls: string[];
  platform_fee_status?: string | null;
  stripe_checkout_url?: string | null;
  assigned_technician_id?: string | null;
};
type Quote = {
  id: string; job_id: string | null; technician_id: string | null;
  price_gbp: number | null; eta_minutes: number | null;
  status: string; raw_message: string | null; confidence: string | null; created_at: string;
};

const techSchema = z.object({
  name: z.string().trim().min(2, "Name required").max(100),
  phone: z.string().trim().min(7, "Phone required").max(20),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  service_postcodes: z.string().trim().min(1, "Add at least one postcode area"),
  vehicle: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

// Estimate ETA (min) by postcode match — naive heuristic for display
const estimateEta = (job: Job, techs: Technician[]) => {
  const area = (job.postcode || "").toUpperCase().replace(/\s+/g, "").slice(0, 4);
  const local = techs.find((t) => t.active && t.service_postcodes.some((p) => area.startsWith(p.toUpperCase())));
  if (local) return { minutes: 15 + Math.round(Math.random() * 15), tech: local };
  const any = techs.find((t) => t.active);
  return any ? { minutes: 35 + Math.round(Math.random() * 20), tech: any } : null;
};

// Try to extract a "live location" from inbound SMS body (Google Maps link or lat/long)
const extractLocation = (body: string) => {
  if (!body) return null;
  const urlMatch = body.match(/https?:\/\/(?:maps\.google\.[\w.]+|maps\.app\.goo\.gl|goo\.gl\/maps|wa\.me\/loc)\S+/i);
  if (urlMatch) return { url: urlMatch[0], coords: null as null | { lat: number; lng: number } };
  const coordMatch = body.match(/(-?\d{1,2}\.\d{3,})[ ,]+(-?\d{1,3}\.\d{3,})/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    return { url: `https://www.google.com/maps?q=${lat},${lng}`, coords: { lat, lng } };
  }
  return null;
};

export default function Admin() {
  const [techs, setTechs] = useState<Technician[]>([]);
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoAssign, setAutoAssign] = useState<boolean>(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  const techMap = useMemo(() => {
    const m = new Map<string, Technician>();
    techs.forEach((t) => m.set(t.id, t));
    return m;
  }, [techs]);

  const quotesByJob = useMemo(() => {
    const m = new Map<string, Quote[]>();
    quotes.forEach((q) => {
      if (!q.job_id) return;
      const arr = m.get(q.job_id) ?? [];
      arr.push(q);
      m.set(q.job_id, arr);
    });
    // sort each list cheapest-first, then fastest
    for (const arr of m.values()) {
      arr.sort((a, b) => (a.price_gbp ?? 1e9) - (b.price_gbp ?? 1e9) || (a.eta_minutes ?? 1e9) - (b.eta_minutes ?? 1e9));
    }
    return m;
  }, [quotes]);

  const refreshAll = async () => {
    setLoading(true);
    const [tRes, mRes, aRes, jRes, sRes, qRes] = await Promise.all([
      supabase.from("technicians").select("*").order("created_at", { ascending: false }),
      supabase.from("sms_messages").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("job_allocations").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("jobs").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("app_settings" as any).select("*").eq("key", "dispatch").maybeSingle(),
      supabase.from("quotes" as any).select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    if (tRes.data) setTechs(tRes.data as Technician[]);
    if (mRes.data) setMessages(mRes.data as SmsMessage[]);
    if (aRes.data) setAllocations(aRes.data as Allocation[]);
    if (jRes.data) setJobs(jRes.data as Job[]);
    if (qRes.data) setQuotes(qRes.data as unknown as Quote[]);
    if (sRes.data) {
      setSettingsId((sRes.data as any).id);
      setAutoAssign(Boolean((sRes.data as any).value?.auto_assign));
    }
    setLoading(false);
  };

  const toggleAutoAssign = async (next: boolean) => {
    setAutoAssign(next);
    if (settingsId) {
      await supabase.from("app_settings" as any)
        .update({ value: { auto_assign: next } })
        .eq("id", settingsId);
    } else {
      const { data } = await supabase.from("app_settings" as any)
        .insert({ key: "dispatch", value: { auto_assign: next } })
        .select()
        .maybeSingle();
      if (data) setSettingsId((data as any).id);
    }
    toast.success(next ? "Auto-assign ON — AI dispatches without approval" : "Manual approval ON — you confirm every job");
  };

  useEffect(() => {
    refreshAll();
    const ch = supabase
      .channel("admin-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "sms_messages" }, refreshAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "job_allocations" }, refreshAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "technicians" }, refreshAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, refreshAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, refreshAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, refreshAll)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ops_alerts" },
        (payload) => {
          const a: any = payload.new;
          const fn = a.level === "critical" ? toast.error : a.level === "warn" ? toast.warning : toast.message;
          fn(a.title, { description: a.body });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When auto-assign is ON, automatically approve any "proposed" allocations with a tech.
  useEffect(() => {
    if (!autoAssign) return;
    const toApprove = allocations.filter(a => a.status === "proposed" && a.technician_id);
    if (toApprove.length === 0) return;
    (async () => {
      await supabase.from("job_allocations")
        .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: "auto" })
        .in("id", toApprove.map(a => a.id));
    })();
  }, [autoAssign, allocations]);

  const pendingAllocs = allocations.filter(a => a.status === "proposed");

  const incoming = jobs.filter((j) => ["pending", "new", "intake_pending", "intake_complete", "awaiting_approval", "broadcasting"].includes(j.status));
  const inProgress = jobs.filter((j) => ["accepted", "assigned", "en_route", "in_progress", "awaiting_payment", "confirmed"].includes(j.status));
  const done = jobs.filter((j) => ["completed", "done", "closed_pending_review", "closed", "no_response"].includes(j.status));

  return (
    <div className="min-h-screen bg-aurora">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="mx-auto flex w-full max-w-[1700px] items-center justify-between gap-2 px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <Link to="/" className="flex shrink-0 items-center gap-1 text-xs text-white/70 hover:text-white" aria-label="Back to home">
              <ArrowLeft className="h-3 w-3" />
              <span className="hidden sm:inline">FlatTyreNearMe.Com</span>
            </Link>
            <div className="hidden sm:block h-5 w-px bg-white/20" />
            <div className="min-w-0">
              <h1 className="truncate text-base sm:text-xl font-bold tracking-tight text-white">Operations Console</h1>
              <p className="truncate text-[10px] sm:text-xs text-white/60">Live · {jobs.length} jobs · {techs.filter(t => t.active).length} on duty</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <DispatchModeToggle autoAssign={autoAssign} onChange={toggleAutoAssign} />
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshAll}
              disabled={loading}
              aria-label="Refresh"
              className="h-9 w-9 text-white hover:bg-white/10 hover:text-white sm:hidden"
            >
              <RefreshCw className={loading ? "animate-spin" : ""} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshAll}
              disabled={loading}
              className="hidden sm:inline-flex text-white hover:bg-white/10 hover:text-white"
            >
              <RefreshCw className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
            <SettingsSheet techs={techs} jobs={jobs} autoAssign={autoAssign} onToggleAuto={toggleAutoAssign} />
          </div>
        </div>
      </header>

      {/* 4-column layout */}
      <main className="mx-auto w-full max-w-[1900px] px-3 sm:px-6 py-4 sm:py-6 overflow-x-hidden">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-4 lg:h-[calc(100vh-9rem)]">
          {/* COL 1 — AI chat */}
          <section className="glass-dark flex flex-col rounded-2xl p-5">
            <ColumnHeader
              icon={<Sparkles className="h-4 w-4" />}
              title="AI Co-pilot"
              subtitle="Discuss anything with your ops AI"
              accent
            />
            <div className="mt-4 flex-1 overflow-hidden">
              <AdminAIChat />
            </div>
          </section>

          {/* COL 2 — Incoming inquiries (full column) */}
          <section className="flex flex-col">
            <Panel
              icon={<MessageSquare className="h-4 w-4" />}
              title="Incoming Inquiries"
              count={incoming.length + messages.filter(m => m.direction === "inbound").length}
              emptyText="Nothing incoming. SMS & web inquiries land here."
              isEmpty={incoming.length === 0 && messages.filter(m => m.direction === "inbound").length === 0}
            >
              <div className="space-y-2">
                {incoming.map((j) => (
                  <IncomingInquiryCard
                    key={j.id}
                    job={j}
                    techs={techs}
                    techMap={techMap}
                    quotes={quotesByJob.get(j.id) ?? []}
                    fallbackEta={estimateEta(j, techs)}
                  />
                ))}
                {messages.filter(m => m.direction === "inbound").slice(0, 8).map((m) => {
                  const loc = extractLocation(m.body);
                  const isWA = m.channel === "whatsapp";
                  return (
                    <div key={m.id} className="rounded-xl border border-white/40 bg-white/60 p-3 backdrop-blur">
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-medium">
                          {isWA ? (
                            <Badge className="bg-[hsl(142_71%_38%)]/15 text-[hsl(142_71%_30%)] hover:bg-[hsl(142_71%_38%)]/15">
                              <MessageCircle className="mr-1 h-3 w-3" />WhatsApp
                            </Badge>
                          ) : (
                            <Badge className="bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/15">SMS</Badge>
                          )}
                          <Phone className="h-3 w-3" />
                          <span>{m.from_number}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{relTime(m.created_at)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{m.body || <em className="text-muted-foreground">(no text)</em>}</p>
                      {loc && (
                        <a href={loc.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--accent))] hover:underline">
                          <Navigation className="h-3 w-3" /> Live location
                        </a>
                      )}
                      {m.media_urls?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {m.media_urls.map((u, i) => (
                            <a key={i} href={u} target="_blank" rel="noreferrer" className="text-xs text-[hsl(var(--accent))] underline">📎 photo {i + 1}</a>
                          ))}
                        </div>
                      )}
                      <div className="mt-2">
                        <ReplyButton to={m.from_number} channel={isWA ? "whatsapp" : "sms"} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </section>

          {/* COL 3 — Pending approvals + Accepted/Waiting */}
          <section className="flex flex-col gap-5">
            <PendingApprovalsPanel
              allocations={allocations}
              jobs={jobs}
              techs={techs}
              messages={messages}
              quotesByJob={quotesByJob}
              autoAssign={autoAssign}
            />
            <Panel
              icon={<Clock className="h-4 w-4" />}
              title="Accepted & Waiting"
              count={inProgress.length}
              emptyText="No jobs currently being worked."
              isEmpty={inProgress.length === 0}
            >
              <div className="space-y-2">
                {inProgress.map((j) => {
                  const eta = estimateEta(j, techs);
                  return (
                    <JobCard
                      key={j.id}
                      job={j}
                      eta={eta}
                      tone="progress"
                      onComplete={async () => {
                        await supabase.from("jobs" as any).update({ status: "completed" }).eq("id", j.id);
                        toast.success("Job marked complete");
                      }}
                    />
                  );
                })}
              </div>
            </Panel>
          </section>

          {/* RIGHT — done + reviews */}
          <section className="flex flex-col gap-5">
            <Panel
              icon={<CheckCircle2 className="h-4 w-4" />}
              title="Jobs Done"
              count={done.length}
              emptyText="Completed jobs will land here."
              isEmpty={done.length === 0}
            >
              <div className="space-y-2">
                {done.map((j) => (
                  <div key={j.id} className="rounded-xl border border-white/40 bg-white/60 p-3 backdrop-blur">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold">{j.customer_name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{j.postcode} · {j.issue_type}
                        </p>
                      </div>
                      <Badge className="bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/15">done</Badge>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">{relTime(j.created_at)}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel
              icon={<Star className="h-4 w-4" />}
              title="Client Reviews"
              count={0}
              emptyText="Reviews will appear here once customers respond."
              isEmpty
            >
              <></>
            </Panel>
          </section>
        </div>

        <div className="mt-6">
          <PendingTechnicians />
        </div>
      </main>
    </div>
  );
}

/* ---------- Reusable bits ---------- */

function ColumnHeader({
  icon, title, subtitle, accent,
}: { icon: React.ReactNode; title: string; subtitle?: string; accent?: boolean }) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-2.5">
        <div className={accent
          ? "flex h-9 w-9 items-center justify-center rounded-xl bg-accent-gradient text-white shadow-accent"
          : "flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white"}>
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">{title}</h2>
          {subtitle && <p className="text-xs text-white/60">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function Panel({
  icon, title, count, isEmpty, emptyText, children,
}: {
  icon: React.ReactNode; title: string; count: number;
  isEmpty: boolean; emptyText: string; children: React.ReactNode;
}) {
  return (
    <div className="glass flex min-h-[12rem] flex-1 flex-col rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--accent))]">
            {icon}
          </div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">{title}</h3>
        </div>
        <Badge variant="outline" className="border-foreground/15 bg-white/40 text-xs font-semibold">{count}</Badge>
      </div>
      <ScrollArea className="flex-1 -mr-2 pr-2">
        {isEmpty ? <p className="py-6 text-center text-xs text-muted-foreground">{emptyText}</p> : children}
      </ScrollArea>
    </div>
  );
}

function JobCard({
  job, eta, tone, onAccept, onComplete,
}: {
  job: Job;
  eta: { minutes: number; tech: Technician } | null;
  tone: "incoming" | "progress";
  onAccept?: () => void;
  onComplete?: () => void;
}) {
  const fee = job.platform_fee_status ?? "pending";
  const feeBadge =
    fee === "paid"
      ? { cls: "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]", label: "Fee £15 paid" }
      : fee === "refunded"
      ? { cls: "bg-destructive/15 text-destructive", label: "Refunded" }
      : { cls: "bg-amber-500/15 text-amber-700", label: "Awaiting £15" };

  const refund = async () => {
    if (!confirm("Refund the customer's £15 (no-show)?")) return;
    const { error } = await supabase.functions.invoke("refund-fee", {
      body: { job_id: job.id, reason: "no-show" },
    });
    if (error) toast.error(error.message);
    else toast.success("Refund issued");
  };

  const resendLink = async () => {
    if (!job.stripe_checkout_url) { toast.error("No payment link yet"); return; }
    await supabase.functions.invoke("twilio-send", {
      body: {
        to: job.customer_phone,
        body: `FlatTyreNearMe reminder: pay the £15 platform fee to confirm your tech: ${job.stripe_checkout_url}`,
        channel: "sms",
      },
    });
    toast.success("Payment link re-sent");
  };

  return (
    <div className={
      tone === "incoming"
        ? "rounded-xl border border-[hsl(var(--accent))]/30 bg-[hsl(var(--accent))]/5 p-3"
        : "rounded-xl border border-white/40 bg-white/60 p-3 backdrop-blur"
    }>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{job.customer_name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />{job.postcode} · {job.issue_type}
          </p>
          {job.damage_summary && (
            <p className="mt-1 line-clamp-2 text-xs text-foreground/80">{job.damage_summary}</p>
          )}
        </div>
        <div className="text-right">
          {eta && (
            <Badge className="bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]">
              <Clock className="mr-1 h-3 w-3" /> ~{eta.minutes}m
            </Badge>
          )}
          <p className="mt-1 text-[10px] text-muted-foreground">{relTime(job.created_at)}</p>
        </div>
      </div>
      {tone === "progress" && (
        <div className="mt-2">
          <Badge className={`${feeBadge.cls} hover:${feeBadge.cls}`}>
            <PoundSterling className="mr-0.5 h-3 w-3" />{feeBadge.label}
          </Badge>
        </div>
      )}
      {eta && (
        <p className="mt-2 text-[11px] text-muted-foreground">Suggested: <span className="font-medium text-foreground">{eta.tech.name}</span></p>
      )}
      {job.photo_urls?.length > 0 && (
        <div className="mt-2 flex gap-1.5">
          {job.photo_urls.slice(0, 3).map((u, i) => (
            <a key={i} href={u} target="_blank" rel="noreferrer" className="block h-12 w-12 overflow-hidden rounded-md border bg-muted">
              <img src={u} alt="" className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {tone === "incoming" && onAccept && (
          <Button size="sm" className="h-7 flex-1 bg-[hsl(var(--accent))] text-xs hover:bg-[hsl(var(--accent-glow))]" onClick={onAccept}>
            Accept
          </Button>
        )}
        {tone === "progress" && fee === "pending" && job.stripe_checkout_url && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={resendLink}>
            Resend link
          </Button>
        )}
        {tone === "progress" && fee === "paid" && onComplete && (
          <Button size="sm" variant="outline" className="h-7 flex-1 text-xs" onClick={onComplete}>
            Mark complete
          </Button>
        )}
        {tone === "progress" && fee === "paid" && (
          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={refund}>
            No-show · refund
          </Button>
        )}
        <a href={`tel:${job.customer_phone}`} className="inline-flex h-7 items-center gap-1 rounded-md border bg-white px-2 text-xs hover:bg-muted">
          <Phone className="h-3 w-3" />Call
        </a>
      </div>
    </div>
  );
}

/* ---------- Rich expandable Incoming Inquiry card (message-style) ---------- */
function IncomingInquiryCard({
  job, techs, techMap, quotes, fallbackEta,
}: {
  job: Job;
  techs: Technician[];
  techMap: Map<string, Technician>;
  quotes: Quote[];
  fallbackEta: { minutes: number; tech: Technician } | null;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const liveQuotes = quotes.filter((q) => q.status !== "rejected");
  const hasQuotes = liveQuotes.length > 0;
  const cheapest = liveQuotes[0] ?? null;
  const matchedTech = cheapest?.technician_id ? techMap.get(cheapest.technician_id) ?? null : null;
  const headlineEta = cheapest?.eta_minutes ?? fallbackEta?.minutes ?? null;
  const headlinePrice = cheapest?.price_gbp ?? null;
  const headlineTechName = matchedTech?.name ?? fallbackEta?.tech?.name ?? null;

  // Build a ranked dispatch shortlist (top 3) so the operator can see WHO the AI
  // will contact, in what order, and WHY. The AI texts #1 first; if no reply
  // within the dispatch window, it falls through to #2, then #3.
  const shortlist = useMemo(() => {
    const area = (job.postcode || "").toUpperCase().replace(/\s+/g, "").slice(0, 4);
    const scored = techs
      .filter((t) => t.active)
      .map((t) => {
        const localMatch = t.service_postcodes.some((p) => area.startsWith(p.toUpperCase()));
        const rating = t.rating ?? 0;
        const quote = liveQuotes.find((q) => q.technician_id === t.id) ?? null;
        // Stable distance estimate (15-25 min local; 35-55 out of area), seeded by id+job
        const seed = (t.id + job.id).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
        const estMins = quote?.eta_minutes ?? (localMatch ? 15 + (seed % 11) : 35 + (seed % 21));
        // Quote presence is the strongest signal; then local; then ETA (less is better); then rating
        const score =
          (quote ? 5000 : 0) +
          (localMatch ? 1000 : 0) +
          Math.max(0, 200 - estMins) +
          rating * 30 +
          Math.min(t.jobs_completed, 50);
        const reasonParts: string[] = [];
        reasonParts.push(`~${estMins} min away`);
        if (localMatch) reasonParts.push(`covers ${area}`);
        else reasonParts.push("out of area");
        if (quote?.price_gbp != null) reasonParts.push(`quoted £${quote.price_gbp}`);
        else reasonParts.push("not yet quoted");
        if (rating > 0) reasonParts.push(`${rating.toFixed(1)}★`);
        if (t.jobs_completed > 0) reasonParts.push(`${t.jobs_completed} jobs done`);
        const phoneLast4 = (t.phone || "").replace(/\D/g, "").slice(-4);
        return {
          tech: t,
          score,
          reasonParts,
          localMatch,
          hasReplied: !!quote,
          quote,
          estMins,
          phoneLast4,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    return scored;
  }, [job.postcode, job.id, techs, liveQuotes]);

  const triggerFeeCheckout = async (assignedTech: Technician | null) => {
    // 1. Create Stripe Checkout session for the £15 fee
    const { data, error } = await supabase.functions.invoke("create-fee-checkout", {
      body: { job_id: job.id, origin: window.location.origin },
    });
    if (error || !data?.url) {
      toast.error(`Couldn't create payment link: ${error?.message ?? "unknown error"}`);
      return;
    }
    // 2. SMS the customer the link
    const techName = assignedTech?.name ?? "your technician";
    const smsBody = `FlatTyreNearMe: ${techName} is matched for your tyre job. Pay the £15 platform fee to confirm and get their direct number: ${data.url}`;
    await supabase.functions.invoke("twilio-send", {
      body: { to: job.customer_phone, body: smsBody, channel: "sms" },
    });
    toast.success(`Payment link sent to ${job.customer_phone}`);
  };

  const approveQuote = async (q: Quote) => {
    setBusy(true);
    const assignedTech = q.technician_id ? techMap.get(q.technician_id) ?? null : null;
    await supabase.from("quotes" as any).update({ status: "rejected" }).eq("job_id", job.id);
    await supabase.from("quotes" as any).update({ status: "accepted" }).eq("id", q.id);
    await supabase.from("jobs" as any).update({
      status: "awaiting_payment",
      assigned_technician_id: assignedTech?.id ?? null,
    }).eq("id", job.id);
    await triggerFeeCheckout(assignedTech);
    setBusy(false);
  };

  const acceptWithoutQuote = async () => {
    setBusy(true);
    await supabase.from("jobs" as any).update({ status: "awaiting_payment" }).eq("id", job.id);
    await triggerFeeCheckout(null);
    setBusy(false);
  };

  return (
    <div className="rounded-xl border border-[hsl(var(--accent))]/30 bg-[hsl(var(--accent))]/5 backdrop-blur transition hover:border-[hsl(var(--accent))]/50">
      {/* Compact header — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-2 p-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{job.customer_name}</p>
            {job.photo_urls?.length > 0 && (
              <Badge variant="outline" className="h-4 gap-1 px-1 text-[10px]">
                <ImageIcon className="h-2.5 w-2.5" />{job.photo_urls.length}
              </Badge>
            )}
            {hasQuotes && (
              <Badge className="h-4 gap-1 bg-[hsl(var(--success))]/15 px-1 text-[10px] text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/15">
                {liveQuotes.length} quote{liveQuotes.length === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />{job.postcode} · {job.issue_type}
          </p>
          {!open && job.damage_summary && (
            <p className="mt-1 line-clamp-1 text-xs text-foreground/70">{job.damage_summary}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {headlineEta != null && (
            <Badge className="bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]">
              <Clock className="mr-1 h-3 w-3" />~{headlineEta}m
            </Badge>
          )}
          {headlinePrice != null && (
            <Badge variant="outline" className="text-[10px]">
              <PoundSterling className="mr-0.5 h-2.5 w-2.5" />{headlinePrice}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground">{relTime(job.created_at)}</span>
          {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-[hsl(var(--accent))]/20 px-3 pb-3 pt-2 space-y-3">
          {/* Customer + location */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <a
              href={`tel:${job.customer_phone}`}
              className="inline-flex items-center gap-1 rounded-md border bg-white px-2 py-1 hover:bg-muted"
            >
              <Phone className="h-3 w-3" />{job.customer_phone}
            </a>
            <a
              href={`sms:${job.customer_phone}`}
              className="inline-flex items-center gap-1 rounded-md border bg-white px-2 py-1 hover:bg-muted"
            >
              <MessageSquare className="h-3 w-3" />Text
            </a>
            <a
              href={`https://wa.me/${job.customer_phone.replace(/\D/g, "")}`}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border bg-white px-2 py-1 hover:bg-muted"
            >
              <MessageCircle className="h-3 w-3" />WhatsApp
            </a>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.postcode)}`}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border bg-white px-2 py-1 hover:bg-muted"
            >
              <Navigation className="h-3 w-3" />Map · {job.postcode}
            </a>
          </div>

          {/* Description / damage */}
          {(job.issue_description || job.damage_summary) && (
            <div className="rounded-md bg-white/70 p-2 text-xs">
              {job.issue_description && (
                <p className="whitespace-pre-wrap text-foreground/85">{job.issue_description}</p>
              )}
              {job.damage_summary && (
                <p className={`${job.issue_description ? "mt-1.5 border-t pt-1.5" : ""} flex items-start gap-1 text-foreground/75`}>
                  <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-[hsl(var(--accent))]" />
                  <span><span className="font-medium">AI:</span> {job.damage_summary}</span>
                </p>
              )}
            </div>
          )}

          {/* Photos */}
          {job.photo_urls?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {job.photo_urls.map((u, i) => (
                <button
                  key={i}
                  onClick={() => setLightbox(u)}
                  className="block h-20 w-20 overflow-hidden rounded-md border bg-muted hover:opacity-80"
                >
                  <img src={u} alt={`Damage ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Dispatch shortlist — who AI is contacting and why */}
          {shortlist.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  AI dispatch order
                </p>
                <span className="text-[10px] text-muted-foreground">
                  Texts #1 first → if no reply in ~3 min, tries #2, then #3
                </span>
              </div>

              {/* Plain-English summary the operator can read at a glance */}
              <p className="mb-1.5 rounded-md bg-white/70 p-2 text-[11px] leading-relaxed text-foreground/80">
                <Sparkles className="mr-1 inline h-3 w-3 text-[hsl(var(--accent))]" />
                AI will contact{" "}
                {shortlist.map((s, i) => (
                  <span key={s.tech.id}>
                    {i === 0 ? "" : i === shortlist.length - 1 ? ", then " : ", then "}
                    <span className="font-semibold text-foreground">{s.tech.name}</span>
                    {s.phoneLast4 && <span className="text-muted-foreground"> (····{s.phoneLast4})</span>}{" "}
                    <span className="text-muted-foreground">
                      — ~{s.estMins} min away
                      {s.quote?.price_gbp != null
                        ? `, quoting £${s.quote.price_gbp}`
                        : ", awaiting quote"}
                    </span>
                  </span>
                ))}
                .
              </p>

              <div className="space-y-1">
                {shortlist.map((s, idx) => (
                  <div
                    key={s.tech.id}
                    className={`flex items-start gap-2 rounded-md border p-2 ${
                      idx === 0
                        ? "border-[hsl(var(--accent))]/40 bg-[hsl(var(--accent))]/5"
                        : "border-white/60 bg-white/60"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        idx === 0
                          ? "bg-[hsl(var(--accent))] text-white"
                          : "bg-muted text-foreground/70"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-xs font-medium">{s.tech.name}</span>
                        {s.phoneLast4 && (
                          <span className="text-[10px] text-muted-foreground">····{s.phoneLast4}</span>
                        )}
                        {s.localMatch && (
                          <Badge variant="outline" className="h-3.5 px-1 text-[9px]">local</Badge>
                        )}
                        {s.hasReplied ? (
                          <Badge className="h-3.5 bg-[hsl(var(--success))]/15 px-1 text-[9px] text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/15">
                            replied
                          </Badge>
                        ) : idx === 0 ? (
                          <Badge variant="outline" className="h-3.5 px-1 text-[9px]">contacting…</Badge>
                        ) : (
                          <Badge variant="outline" className="h-3.5 px-1 text-[9px] text-muted-foreground">queued</Badge>
                        )}
                        {s.quote?.price_gbp != null && (
                          <span className="text-[10px] font-semibold text-foreground">£{s.quote.price_gbp}</span>
                        )}
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />~{s.estMins}m
                        </span>
                      </div>
                      <p className="mt-0.5 flex items-start gap-1 text-[10px] text-muted-foreground">
                        <Sparkles className="mt-0.5 h-2.5 w-2.5 shrink-0 text-[hsl(var(--accent))]" />
                        <span>{s.reasonParts.join(" · ")}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technician quotes — the matchmaking section */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Technician quotes
              </p>
              {!hasQuotes && fallbackEta && (
                <span className="text-[10px] text-muted-foreground">
                  AI suggests <span className="font-medium text-foreground">{fallbackEta.tech.name}</span>
                </span>
              )}
            </div>

            {hasQuotes ? (
              <div className="space-y-1.5">
                {liveQuotes.map((q, idx) => {
                  const t = q.technician_id ? techMap.get(q.technician_id) : null;
                  const isCheapest = idx === 0;
                  return (
                    <div
                      key={q.id}
                      className={`flex items-center justify-between gap-2 rounded-md border p-2 ${
                        isCheapest ? "border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/5" : "border-white/60 bg-white/70"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <UserIcon className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate text-xs font-medium">{t?.name ?? "Unknown tech"}</span>
                          {isCheapest && (
                            <Badge className="h-4 bg-[hsl(var(--success))] px-1 text-[9px] text-white hover:bg-[hsl(var(--success))]">
                              best
                            </Badge>
                          )}
                          {t?.rating != null && (
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />{t.rating}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                          {q.price_gbp != null && (
                            <span className="font-semibold text-foreground">£{q.price_gbp}</span>
                          )}
                          {q.eta_minutes != null && (
                            <span className="inline-flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />{q.eta_minutes}m
                            </span>
                          )}
                          {q.confidence && q.confidence !== "high" && (
                            <Badge variant="outline" className="h-3.5 px-1 text-[9px]">{q.confidence}</Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="h-7 bg-[hsl(var(--accent))] px-2 text-xs hover:bg-[hsl(var(--accent-glow))]"
                        disabled={busy}
                        onClick={() => approveQuote(q)}
                      >
                        <Check className="h-3 w-3" />Approve
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-muted-foreground/30 p-2 text-center">
                <p className="text-[11px] text-muted-foreground">
                  Waiting for technician replies… you can also accept now and assign manually.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1.5 h-6 text-[11px]"
                  disabled={busy}
                  onClick={acceptWithoutQuote}
                >
                  Accept without quote
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={(v) => !v && setLightbox(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-sm">Damage photo</DialogTitle>
          </DialogHeader>
          {lightbox && <img src={lightbox} alt="Damage" className="w-full rounded-md" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ---------- Reply (SMS / WhatsApp) ---------- */

function ReplyButton({
  to, channel: initialChannel,
}: { to: string; channel: "sms" | "whatsapp" }) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<"sms" | "whatsapp">(initialChannel);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("twilio-send", {
      body: { to, channel, body: body.trim() },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Send failed");
      return;
    }
    toast.success(`${channel === "whatsapp" ? "WhatsApp" : "SMS"} sent to ${to}`);
    setBody("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-xs">
          <Send className="h-3 w-3" /> Reply
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reply to {to}</DialogTitle>
          <DialogDescription>Send a message via Twilio.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={channel === "sms" ? "default" : "outline"}
              onClick={() => setChannel("sms")}
              className="flex-1"
            >
              <MessageSquare className="h-3.5 w-3.5" /> SMS
            </Button>
            <Button
              size="sm"
              variant={channel === "whatsapp" ? "default" : "outline"}
              onClick={() => setChannel("whatsapp")}
              className={`flex-1 ${channel === "whatsapp" ? "bg-[hsl(142_71%_38%)] hover:bg-[hsl(142_71%_34%)]" : ""}`}
            >
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </Button>
          </div>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Type your message…"
            maxLength={1500}
          />
          <p className="text-[10px] text-muted-foreground">
            {channel === "whatsapp"
              ? "WhatsApp uses Twilio's sandbox until your number is approved. Recipient must have joined the sandbox."
              : `Sent from your business number.`}
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={send} disabled={sending || !body.trim()}>
            {sending ? "Sending…" : `Send ${channel === "whatsapp" ? "WhatsApp" : "SMS"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Dispatch mode toggle (header pill) ---------- */

function DispatchModeToggle({
  autoAssign, onChange,
}: { autoAssign: boolean; onChange: (next: boolean) => void }) {
  return (
    <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur">
      {autoAssign ? (
        <Zap className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
      ) : (
        <ShieldCheck className="h-3.5 w-3.5 text-white/80" />
      )}
      <span className="text-xs font-medium text-white">
        {autoAssign ? "Auto-assign" : "Manual approval"}
      </span>
      <Switch checked={autoAssign} onCheckedChange={onChange} className="data-[state=checked]:bg-[hsl(var(--accent))]" />
    </div>
  );
}

/* ---------- Pending approvals panel ---------- */

function PendingApprovalsPanel({
  allocations, jobs, techs, messages: _messages, quotesByJob, autoAssign,
}: {
  allocations: Allocation[];
  jobs: Job[];
  techs: Technician[];
  messages: SmsMessage[];
  quotesByJob: Map<string, Quote[]>;
  autoAssign: boolean;
}) {
  const techMap = useMemo(() => {
    const m = new Map<string, Technician>();
    techs.forEach((t) => m.set(t.id, t));
    return m;
  }, [techs]);

  // Group allocations by job; only show jobs that still need a decision
  // (have proposed/broadcast allocations and no approved one yet).
  const decisionJobs = useMemo(() => {
    const byJob = new Map<string, Allocation[]>();
    for (const a of allocations) {
      if (!a.job_id) continue;
      const arr = byJob.get(a.job_id) ?? [];
      arr.push(a);
      byJob.set(a.job_id, arr);
    }
    const out: { job: Job; allocs: Allocation[] }[] = [];
    for (const [jobId, allocs] of byJob.entries()) {
      const hasApproved = allocs.some((a) => a.status === "approved");
      const needsDecision = allocs.some((a) => ["proposed", "broadcast"].includes(a.status));
      if (hasApproved || !needsDecision) continue;
      const job = jobs.find((j) => j.id === jobId);
      if (!job) continue;
      out.push({ job, allocs });
    }
    out.sort((a, b) => +new Date(b.job.created_at) - +new Date(a.job.created_at));
    return out;
  }, [allocations, jobs]);

  return (
    <div className="glass flex min-h-[12rem] flex-col rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--accent))] text-white">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Decide & dispatch</h3>
            <p className="text-[10px] text-muted-foreground">
              {autoAssign ? "Auto-assign is ON — jobs dispatch instantly" : "Pick the best technician for each enquiry"}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="border-[hsl(var(--accent))]/40 bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]">
          {decisionJobs.length}
        </Badge>
      </div>
      <ScrollArea className="flex-1 -mr-2 pr-2">
        {decisionJobs.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {autoAssign ? "Nothing to review — AI is dispatching automatically." : "No enquiries waiting. Jobs appear here once technicians are messaged."}
          </p>
        ) : (
          <div className="space-y-3">
            {decisionJobs.map(({ job, allocs }) => (
              <JobDecisionCard
                key={job.id}
                job={job}
                allocs={allocs}
                quotes={quotesByJob.get(job.id) ?? []}
                techs={techs}
                techMap={techMap}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

/* ---------- Rich job decision card ---------- */
function JobDecisionCard({
  job, allocs, quotes, techs, techMap,
}: {
  job: Job;
  allocs: Allocation[];
  quotes: Quote[];
  techs: Technician[];
  techMap: Map<string, Technician>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAllTechs, setShowAllTechs] = useState(false);

  // Roster of every tech we broadcast to + their reply (if any).
  const roster = useMemo(() => {
    const quoteByTech = new Map<string, Quote>();
    for (const q of quotes) if (q.technician_id) quoteByTech.set(q.technician_id, q);
    const rows = allocs
      .filter((a) => a.technician_id)
      .map((a) => ({
        alloc: a,
        tech: techMap.get(a.technician_id!) ?? null,
        quote: quoteByTech.get(a.technician_id!) ?? null,
      }));
    rows.sort((a, b) => {
      const ar = a.quote ? 1 : 0;
      const br = b.quote ? 1 : 0;
      if (ar !== br) return br - ar;
      return (b.alloc.match_score ?? 0) - (a.alloc.match_score ?? 0);
    });
    return rows;
  }, [allocs, quotes, techMap]);

  // AI's recommended pick: cheapest of the replies, then fastest ETA.
  // Falls back to top-scored allocation when nobody has replied yet.
  const recommended = useMemo(() => {
    const replied = roster.filter((r) => r.quote);
    if (replied.length > 0) {
      const sorted = [...replied].sort(
        (a, b) =>
          (a.quote!.price_gbp ?? 1e9) - (b.quote!.price_gbp ?? 1e9) ||
          (a.quote!.eta_minutes ?? 1e9) - (b.quote!.eta_minutes ?? 1e9),
      );
      return { tech: sorted[0].tech, alloc: sorted[0].alloc, quote: sorted[0].quote, reason: "cheapest price · fastest ETA" };
    }
    const sorted = [...roster].sort((a, b) => (b.alloc.match_score ?? 0) - (a.alloc.match_score ?? 0));
    if (sorted[0]) return { tech: sorted[0].tech, alloc: sorted[0].alloc, quote: null, reason: sorted[0].alloc.ai_reasoning ?? "highest match score" };
    return null;
  }, [roster]);

  const repliedCount = roster.filter((r) => r.quote).length;

  const dispatch = async (techId: string, allocId: string | null, hasQuote: boolean) => {
    if (!hasQuote) {
      const ok = confirm(
        "This technician hasn't replied with a price + ETA yet.\n\nDispatch anyway? You'll need to agree pricing manually with the customer.",
      );
      if (!ok) return;
    }
    setBusyId(techId);
    try {
      let targetId = allocId;
      if (!targetId) {
        const { data, error } = await supabase
          .from("job_allocations")
          .insert({
            job_id: job.id,
            technician_id: techId,
            ai_reasoning: "Manually selected from full technician list",
            status: "approved",
            approved_at: new Date().toISOString(),
            approved_by: "manual",
          })
          .select()
          .single();
        if (error) throw error;
        targetId = (data as any).id;
      } else {
        const { error } = await supabase
          .from("job_allocations")
          .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: "manual" })
          .eq("id", targetId);
        if (error) throw error;
      }
      const others = allocs.filter((a) => a.id !== targetId && ["proposed", "broadcast"].includes(a.status));
      if (others.length > 0) {
        await supabase
          .from("job_allocations")
          .update({ status: "rejected" })
          .in("id", others.map((a) => a.id));
      }
      await supabase
        .from("jobs" as any)
        .update({ status: "accepted", assigned_technician_id: techId })
        .eq("id", job.id);
      const t = techMap.get(techId);
      toast.success(`Dispatched to ${t?.name ?? "technician"}`);
    } catch (e: any) {
      toast.error(e.message ?? "Could not dispatch");
    } finally {
      setBusyId(null);
    }
  };

  const skipJob = async () => {
    if (!confirm("Reject all suggestions for this job?")) return;
    await supabase
      .from("job_allocations")
      .update({ status: "rejected" })
      .in("id", allocs.filter((a) => ["proposed", "broadcast"].includes(a.status)).map((a) => a.id));
    toast.success("All suggestions rejected");
  };

  const otherTechs = techs.filter(
    (t) => t.active && !roster.some((r) => r.tech?.id === t.id),
  );

  return (
    <div className="overflow-hidden rounded-xl border-2 border-[hsl(var(--accent))]/40 bg-white/85 p-3 shadow-sm">
      {/* Enquiry header */}
      <div className="min-w-0 break-words">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-sm font-bold truncate max-w-[55%]">{job.customer_name}</span>
          <Badge className="bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/15 capitalize shrink-0">
            {job.issue_type.replace(/_/g, " ")}
          </Badge>
          {job.damage_confidence && (
            <Badge variant="outline" className="text-[10px] capitalize">{job.damage_confidence} confidence</Badge>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">{relTime(job.created_at)}</span>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 flex-wrap min-w-0">
          <MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{job.postcode}</span>
          <span className="mx-1">·</span>
          <Phone className="h-3 w-3 shrink-0" /><span className="truncate">{job.customer_phone}</span>
        </p>
        {job.damage_summary && (
          <p className="mt-1.5 rounded-md bg-muted/60 p-2 text-xs text-foreground/85 break-words">
            <Sparkles className="inline h-3 w-3 mr-1 text-[hsl(var(--accent))]" />
            {job.damage_summary}
          </p>
        )}
        {job.photo_urls?.length > 0 && (
          <div className="mt-1.5 flex gap-1">
            {job.photo_urls.slice(0, 4).map((u, i) => (
              <a key={i} href={u} target="_blank" rel="noreferrer" className="block h-10 w-10 overflow-hidden rounded-md border bg-muted">
                <img src={u} alt="" className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* AI recommendation banner */}
      {recommended?.tech && (
        <div className="mt-2.5 rounded-lg border border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/5 p-2">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--success))]">
            <Sparkles className="h-3 w-3" /> AI recommends
          </div>
          <p className="text-xs mt-0.5">
            <span className="font-bold">{recommended.tech.name}</span>{" "}
            <span className="text-muted-foreground">— {recommended.reason}</span>
          </p>
        </div>
      )}

      {/* Broadcast roster */}
      <div className="mt-3">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Messaged {roster.length} · {repliedCount} replied · click anyone to dispatch
        </p>
        <div className="space-y-1.5">
          {roster.map(({ alloc, tech, quote }) => {
            const isPick = recommended?.tech?.id === tech?.id;
            const replied = !!quote;
            return (
              <button
                key={alloc.id}
                type="button"
                onClick={() => tech && dispatch(tech.id, alloc.id, replied)}
                disabled={!tech || busyId !== null}
                className={[
                  "group block w-full max-w-full overflow-hidden rounded-lg border p-2 text-left transition",
                  isPick
                    ? "border-[hsl(var(--success))]/60 bg-[hsl(var(--success))]/8 hover:bg-[hsl(var(--success))]/15"
                    : replied
                    ? "border-foreground/15 bg-white hover:bg-muted/60"
                    : "border-dashed border-foreground/15 bg-white/40 hover:bg-white",
                  busyId === tech?.id ? "opacity-60" : "",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold">{tech?.name ?? "Unknown"}</span>
                      {isPick && (
                        <Badge className="bg-[hsl(var(--success))] text-white hover:bg-[hsl(var(--success))] text-[9px] h-4 px-1.5">
                          BEST MATCH
                        </Badge>
                      )}
                      {tech?.rating != null && (
                        <span className="text-[10px] text-muted-foreground">★{Number(tech.rating).toFixed(1)}</span>
                      )}
                      {tech?.jobs_completed != null && (
                        <span className="text-[10px] text-muted-foreground">· {tech.jobs_completed} jobs</span>
                      )}
                    </div>
                    {tech?.service_postcodes && tech.service_postcodes.length > 0 && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {tech.service_postcodes.slice(0, 4).join(", ")}
                      </p>
                    )}
                    {alloc.ai_reasoning && (
                      <p className="text-[10px] text-muted-foreground italic line-clamp-1">{alloc.ai_reasoning}</p>
                    )}
                    {quote?.raw_message && (
                      <p className="mt-1 line-clamp-2 rounded bg-muted/70 px-1.5 py-1 text-[11px] text-foreground/85">
                        “{quote.raw_message}”
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {quote ? (
                      <div className="flex flex-col items-end gap-0.5">
                        {quote.price_gbp != null && (
                          <Badge className="bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))] text-[10px] h-5">
                            <PoundSterling className="h-3 w-3" />{quote.price_gbp}
                          </Badge>
                        )}
                        {quote.eta_minutes != null && (
                          <Badge variant="outline" className="text-[10px] h-5">
                            <Clock className="mr-0.5 h-3 w-3" />{quote.eta_minutes}m
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">
                        <Clock className="mr-0.5 h-3 w-3" />waiting
                      </Badge>
                    )}
                    <p className="mt-1 text-[9px] text-[hsl(var(--accent))] opacity-0 group-hover:opacity-100 font-semibold">
                      Dispatch →
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Override: pick any other active technician */}
        {otherTechs.length > 0 && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowAllTechs((v) => !v)}
              className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              {showAllTechs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              Override · pick any other technician ({otherTechs.length})
            </button>
            {showAllTechs && (
              <div className="mt-1.5 space-y-1 max-h-48 overflow-y-auto">
                {otherTechs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => dispatch(t.id, null, false)}
                    disabled={busyId !== null}
                    className="w-full rounded-md border border-dashed border-foreground/15 bg-white/50 px-2 py-1.5 text-left text-xs hover:bg-white"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{t.name}</span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {t.service_postcodes.slice(0, 3).join(", ") || "no areas"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-end">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={busyId !== null}
          onClick={skipJob}
        >
          <X className="h-3.5 w-3.5" /> Skip this job
        </Button>
      </div>
    </div>
  );
}


/* ---------- Settings (technicians + live ETAs) ---------- */

function SettingsSheet({
  techs, jobs, autoAssign, onToggleAuto,
}: {
  techs: Technician[];
  jobs: Job[];
  autoAssign: boolean;
  onToggleAuto: (next: boolean) => void;
}) {
  const [form, setForm] = useState({
    name: "", phone: "", email: "", service_postcodes: "", vehicle: "", notes: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ParsedTechnician[] | null>(null);

  const addTech = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = techSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    const postcodes = form.service_postcodes.split(",").map((p) => p.trim().toUpperCase()).filter(Boolean);
    const { error } = await supabase.from("technicians").insert({
      name: form.name.trim(), phone: form.phone.trim(),
      email: form.email.trim() || null, service_postcodes: postcodes,
      vehicle: form.vehicle.trim() || null, notes: form.notes.trim() || null, active: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Technician added");
    setForm({ name: "", phone: "", email: "", service_postcodes: "", vehicle: "", notes: "" });
  };

  const toggleActive = async (t: Technician) => {
    await supabase.from("technicians").update({ active: !t.active }).eq("id", t.id);
  };
  const deleteTech = async (id: string) => {
    if (!confirm("Remove this technician?")) return;
    await supabase.from("technicians").delete().eq("id", id);
  };

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed = await parseTechniciansFile(file);
      if (parsed.length === 0) {
        toast.error("No technicians found. Need columns/fields: name, phone, postcodes.");
        return;
      }
      setPreview(parsed);
      toast.success(`Found ${parsed.length} technician(s) — review & confirm`);
    } catch (err) {
      console.error(err); toast.error("Could not read that file");
    }
  };

  const confirmImport = async () => {
    if (!preview || preview.length === 0) return;
    setImporting(true);
    const rows = preview.map((p) => ({
      name: p.name, phone: p.phone, email: p.email || null,
      service_postcodes: p.service_postcodes, vehicle: p.vehicle || null,
      notes: p.notes || null, active: true,
    }));
    const { error } = await supabase.from("technicians").insert(rows);
    setImporting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Imported ${rows.length} technician(s)`);
    setPreview(null);
  };

  // For live tech location: parse from inbound SMS attached to allocations
  // (lightweight — admin can ask techs to text their location link)

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" aria-label="Settings" className="h-9 gap-1.5 bg-[hsl(var(--accent))] px-2.5 sm:px-3 text-white hover:bg-[hsl(var(--accent-glow))]">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>Technicians, fleet status & live ETAs</SheetDescription>
        </SheetHeader>

        {/* Dispatch mode */}
        <section className="mt-6 rounded-xl border-2 border-[hsl(var(--accent))]/20 bg-[hsl(var(--accent))]/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                {autoAssign ? <Zap className="h-4 w-4 text-[hsl(var(--accent))]" /> : <ShieldCheck className="h-4 w-4" />}
                Dispatch mode
              </h3>
              <p className="mt-1 text-sm font-medium">
                {autoAssign ? "Auto-assign — AI dispatches without approval" : "Manual approval — you review every job"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Keep manual on while you build trust with the AI's matching. Flip to auto when you're happy.
              </p>
            </div>
            <Switch
              checked={autoAssign}
              onCheckedChange={onToggleAuto}
              className="data-[state=checked]:bg-[hsl(var(--accent))]"
            />
          </div>
        </section>

        {/* Active technicians */}
        <section className="mt-6">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Users className="h-4 w-4" /> Active technicians ({techs.filter(t => t.active).length})
          </h3>
          {techs.length === 0 ? (
            <p className="text-sm text-muted-foreground">None yet.</p>
          ) : (
            <div className="space-y-2">
              {techs.map((t) => {
                const activeJobs = jobs.filter(j =>
                  (j.status === "accepted" || j.status === "in_progress" || j.status === "en_route") &&
                  t.service_postcodes.some(pc => (j.postcode || "").toUpperCase().startsWith(pc.toUpperCase()))
                );
                return (
                  <div key={t.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{t.name}</p>
                          <Badge variant={t.active ? "default" : "secondary"}>{t.active ? "active" : "off"}</Badge>
                          <span className="flex items-center gap-1 text-xs">
                            <Star className="h-3 w-3 fill-current text-yellow-500" />{t.rating ?? "—"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />{t.phone}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{t.service_postcodes.join(", ") || "—"}
                        </p>
                        {activeJobs.length > 0 && (
                          <p className="mt-1 text-xs"><Clock className="inline h-3 w-3 mr-1" />ETA next job: ~{15 + activeJobs.length * 10}m</p>
                        )}
                        <a
                          href={`sms:${t.phone}?body=${encodeURIComponent("Please share your live location link so we can show ETA.")}`}
                          className="mt-1 inline-flex items-center gap-1 text-xs text-[hsl(var(--accent))] hover:underline"
                        >
                          <Navigation className="h-3 w-3" /> Request live location via SMS
                        </a>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Switch checked={t.active} onCheckedChange={() => toggleActive(t)} />
                        <Button variant="ghost" size="icon" onClick={() => deleteTech(t.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Add technician */}
        <section className="mt-8">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Plus className="h-4 w-4" /> Add technician
          </h3>
          <form className="space-y-3" onSubmit={addTech}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="t-name">Name</Label>
                <Input id="t-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sam Walker" />
              </div>
              <div>
                <Label htmlFor="t-phone">Phone</Label>
                <Input id="t-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+447700900111" />
              </div>
            </div>
            <div>
              <Label htmlFor="t-email">Email (optional)</Label>
              <Input id="t-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="t-pc">Service postcodes</Label>
              <Input id="t-pc" value={form.service_postcodes} onChange={(e) => setForm({ ...form, service_postcodes: e.target.value })} placeholder="W5, W12, NW10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="t-veh">Vehicle</Label>
                <Input id="t-veh" value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} placeholder="Ford Transit" />
              </div>
              <div>
                <Label htmlFor="t-notes">Notes</Label>
                <Input id="t-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <Button type="submit" className="w-full">Add technician</Button>
          </form>

          <div className="mt-5 border-t pt-4">
            <p className="text-sm font-semibold mb-2">Bulk import</p>
            <p className="text-xs text-muted-foreground mb-3">CSV, Excel, Word or text — columns: name, phone, postcodes, email, vehicle, notes.</p>
            <input
              ref={fileInputRef} type="file" className="hidden"
              accept=".csv,.xlsx,.xls,.xlsm,.ods,.docx,.txt,.tsv,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChosen}
            />
            <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
              <Upload /> Choose file…
            </Button>
            {preview && (
              <div className="mt-4 rounded-md border bg-muted/30 p-3">
                <p className="text-xs font-semibold mb-2">Preview — {preview.length} technician(s)</p>
                <div className="max-h-48 overflow-y-auto text-xs space-y-1">
                  {preview.slice(0, 20).map((p, i) => (
                    <div key={i} className="truncate">
                      <span className="font-medium">{p.name}</span> · {p.phone}
                      {p.service_postcodes.length > 0 && <span className="text-muted-foreground"> · {p.service_postcodes.join(", ")}</span>}
                    </div>
                  ))}
                  {preview.length > 20 && <div className="text-muted-foreground">…and {preview.length - 20} more</div>}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={confirmImport} disabled={importing} className="flex-1">
                    {importing ? "Importing…" : `Import ${preview.length}`}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </SheetContent>
    </Sheet>
  );
}
