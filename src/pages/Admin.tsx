import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus, Trash2, Star, Phone, MapPin, RefreshCw, Upload, Settings,
  MessageSquare, MessageCircle, CheckCircle2, Clock, Sparkles, Users, ArrowLeft, Navigation,
  ShieldCheck, Zap, Check, X, ChevronsUpDown, Send,
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
import { supabase } from "@/integrations/supabase/client";
import { AdminAIChat } from "@/components/admin/AdminAIChat";

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
  const [loading, setLoading] = useState(true);
  const [autoAssign, setAutoAssign] = useState<boolean>(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  const techMap = useMemo(() => {
    const m = new Map<string, Technician>();
    techs.forEach((t) => m.set(t.id, t));
    return m;
  }, [techs]);

  const refreshAll = async () => {
    setLoading(true);
    const [tRes, mRes, aRes, jRes, sRes] = await Promise.all([
      supabase.from("technicians").select("*").order("created_at", { ascending: false }),
      supabase.from("sms_messages").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("job_allocations").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("jobs").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("app_settings" as any).select("*").eq("key", "dispatch").maybeSingle(),
    ]);
    if (tRes.data) setTechs(tRes.data as Technician[]);
    if (mRes.data) setMessages(mRes.data as SmsMessage[]);
    if (aRes.data) setAllocations(aRes.data as Allocation[]);
    if (jRes.data) setJobs(jRes.data as Job[]);
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

  const incoming = jobs.filter((j) => j.status === "pending" || j.status === "new");
  const inProgress = jobs.filter((j) => j.status === "accepted" || j.status === "assigned" || j.status === "en_route" || j.status === "in_progress");
  const done = jobs.filter((j) => j.status === "completed" || j.status === "done");

  return (
    <div className="min-h-screen bg-aurora">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="mx-auto flex max-w-[1700px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white">
              <ArrowLeft className="h-3 w-3" /> FlatTyreNearMe.Com
            </Link>
            <div className="h-5 w-px bg-white/20" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Operations Console</h1>
              <p className="text-xs text-white/60">Live · {jobs.length} jobs · {techs.filter(t => t.active).length} techs on duty</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DispatchModeToggle autoAssign={autoAssign} onChange={toggleAutoAssign} />
            <Button variant="ghost" size="sm" onClick={refreshAll} disabled={loading} className="text-white hover:bg-white/10 hover:text-white">
              <RefreshCw className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
            <SettingsSheet techs={techs} jobs={jobs} autoAssign={autoAssign} onToggleAuto={toggleAutoAssign} />
          </div>
        </div>
      </header>

      {/* 3-column layout */}
      <main className="mx-auto max-w-[1700px] px-6 py-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:h-[calc(100vh-9rem)]">
          {/* LEFT — AI chat */}
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

          {/* MIDDLE — approvals + incoming + accepted/waiting */}
          <section className="flex flex-col gap-5">
            <PendingApprovalsPanel
              allocations={pendingAllocs}
              techs={techs}
              messages={messages}
              autoAssign={autoAssign}
            />
            <Panel
              icon={<MessageSquare className="h-4 w-4" />}
              title="Incoming Inquiries"
              count={incoming.length + messages.filter(m => m.direction === "inbound").length}
              emptyText="Nothing incoming. SMS & web inquiries land here."
              isEmpty={incoming.length === 0 && messages.filter(m => m.direction === "inbound").length === 0}
            >
              <div className="space-y-2">
                {incoming.map((j) => {
                  const eta = estimateEta(j, techs);
                  return (
                    <JobCard
                      key={j.id}
                      job={j}
                      eta={eta}
                      tone="incoming"
                      onAccept={async () => {
                        await supabase.from("jobs" as any).update({ status: "accepted" }).eq("id", j.id);
                        toast.success("Job moved to in-progress");
                      }}
                    />
                  );
                })}
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
      <div className="mt-2 flex gap-2">
        {tone === "incoming" && onAccept && (
          <Button size="sm" className="h-7 flex-1 bg-[hsl(var(--accent))] text-xs hover:bg-[hsl(var(--accent-glow))]" onClick={onAccept}>
            Accept
          </Button>
        )}
        {tone === "progress" && onComplete && (
          <Button size="sm" variant="outline" className="h-7 flex-1 text-xs" onClick={onComplete}>
            Mark complete
          </Button>
        )}
        <a href={`tel:${job.customer_phone}`} className="inline-flex h-7 items-center gap-1 rounded-md border bg-white px-2 text-xs hover:bg-muted">
          <Phone className="h-3 w-3" />Call
        </a>
      </div>
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
  allocations, techs, messages, autoAssign,
}: {
  allocations: Allocation[];
  techs: Technician[];
  messages: SmsMessage[];
  autoAssign: boolean;
}) {
  const techMap = useMemo(() => {
    const m = new Map<string, Technician>();
    techs.forEach((t) => m.set(t.id, t));
    return m;
  }, [techs]);
  const smsMap = useMemo(() => {
    const m = new Map<string, SmsMessage>();
    messages.forEach((s) => m.set(s.id, s));
    return m;
  }, [messages]);

  return (
    <div className="glass flex min-h-[12rem] flex-col rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--accent))] text-white">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Pending approvals</h3>
            <p className="text-[10px] text-muted-foreground">
              {autoAssign ? "Auto-assign is ON — new jobs dispatch instantly" : "Review each AI suggestion before dispatch"}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="border-[hsl(var(--accent))]/40 bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]">
          {allocations.length}
        </Badge>
      </div>
      <ScrollArea className="flex-1 -mr-2 pr-2">
        {allocations.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {autoAssign ? "Nothing to review — AI is dispatching automatically." : "No suggestions waiting. New inbound jobs will appear here for approval."}
          </p>
        ) : (
          <div className="space-y-2">
            {allocations.map((a) => (
              <ApprovalCard
                key={a.id}
                alloc={a}
                tech={a.technician_id ? techMap.get(a.technician_id) ?? null : null}
                sms={a.job_id ? smsMap.get(a.job_id) ?? null : null}
                techs={techs}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function ApprovalCard({
  alloc, tech, sms, techs,
}: {
  alloc: Allocation;
  tech: Technician | null;
  sms: SmsMessage | null;
  techs: Technician[];
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const update = async (patch: Record<string, any>) => {
    setBusy(true);
    const { error } = await supabase
      .from("job_allocations")
      .update(patch as any)
      .eq("id", alloc.id);
    setBusy(false);
    if (error) toast.error(error.message);
  };

  const approve = () =>
    update({ status: "approved", approved_at: new Date().toISOString(), approved_by: "manual" })
      .then(() => toast.success(`Dispatched to ${tech?.name ?? "technician"}`));

  const reject = () =>
    update({ status: "rejected" }).then(() => toast.success("Rejected"));

  const reassign = (newTechId: string) => {
    const t = techs.find((x) => x.id === newTechId);
    update({ technician_id: newTechId, ai_reasoning: `Manually reassigned to ${t?.name ?? "tech"}` })
      .then(() => {
        setPickerOpen(false);
        toast.success(`Reassigned to ${t?.name}`);
      });
  };

  return (
    <div className="rounded-xl border-2 border-[hsl(var(--accent))]/40 bg-white/80 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold">{tech?.name ?? "Unassigned"}</span>
            {alloc.match_score != null && (
              <Badge variant="outline" className="text-[10px]">score {alloc.match_score}</Badge>
            )}
            <span className="text-[10px] text-muted-foreground">{relTime(alloc.created_at)}</span>
          </div>
          {tech && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />{tech.service_postcodes.join(", ") || "no areas"}
            </p>
          )}
          {alloc.ai_reasoning && (
            <p className="mt-1 text-xs text-foreground/85"><Sparkles className="inline h-3 w-3 mr-1 text-[hsl(var(--accent))]" />{alloc.ai_reasoning}</p>
          )}
          {sms && (
            <p className="mt-1 line-clamp-2 rounded-md bg-muted/60 p-1.5 text-[11px] text-foreground/80">
              <Phone className="inline h-3 w-3 mr-1" />{sms.from_number}: {sms.body}
            </p>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <Button
          size="sm"
          className="h-7 flex-1 bg-[hsl(var(--success))] text-xs text-white hover:bg-[hsl(var(--success))]/90"
          disabled={busy || !tech}
          onClick={approve}
        >
          <Check className="h-3.5 w-3.5" /> Approve
        </Button>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy}>
              <ChevronsUpDown className="h-3.5 w-3.5" /> Reassign
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-1">
            <div className="max-h-60 overflow-y-auto">
              {techs.filter(t => t.active).length === 0 && (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">No active technicians</p>
              )}
              {techs.filter(t => t.active).map((t) => (
                <button
                  key={t.id}
                  onClick={() => reassign(t.id)}
                  className="w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                >
                  <div className="font-medium">{t.name}</div>
                  <div className="text-[10px] text-muted-foreground">{t.service_postcodes.join(", ") || "no areas"}</div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={busy}
          onClick={reject}
        >
          <X className="h-3.5 w-3.5" /> Reject
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
        <Button size="sm" className="bg-[hsl(var(--accent))] text-white hover:bg-[hsl(var(--accent-glow))]">
          <Settings /> Settings
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
