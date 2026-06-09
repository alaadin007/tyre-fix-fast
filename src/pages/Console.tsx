import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Star, Search, Sparkles, UserCheck, UserPlus, Users, Phone, MapPin, Camera, Trash2 } from "lucide-react";
import { PendingTechnicians } from "@/components/admin/PendingTechnicians";
import { JobConversation } from "@/components/console/JobConversation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useConsoleData,
  laneFor,
  nearestTechs,
  type ConsoleJob,
  type ConsoleMode,
  type Lane,
} from "@/hooks/useConsoleData";
import { useTick } from "@/hooks/useTick";

function fmtTimer(ms: number): { txt: string; cls: string } {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  const txt = `${m}:${s.toString().padStart(2, "0")}`;
  let cls = "text-emerald-400";
  if (m >= 15) cls = "text-red-400";
  else if (m >= 5) cls = "text-amber-400";
  return { txt, cls };
}

export default function Console() {
  const navigate = useNavigate();
  const mode: ConsoleMode = "live";
  const [tab, setTab] = useState<"all" | "new" | "in_progress" | "completed">("all");
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [showPending, setShowPending] = useState(false);
  const [showAddTech, setShowAddTech] = useState(false);
  const [showAllTechs, setShowAllTechs] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [authChecked, setAuthChecked] = useState(false);

  // Auth gate — always require sign-in, plus admin role for live data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) navigate("/admin/login", { replace: true });
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
      if (!isAdmin) {
        toast.error("Admin role required");
        if (!cancelled) navigate("/admin/login", { replace: true });
        return;
      }
      if (!cancelled) setAuthChecked(true);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) navigate("/admin/login", { replace: true });
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [mode, navigate]);

  const { jobs, techs, setJobs } = useConsoleData(mode);
  const now = useTick(1000);

  // Poll pending technician applications count (live mode only)
  useEffect(() => {
    if (mode !== "live") { setPendingCount(0); return; }
    let cancelled = false;
    const load = async () => {
      const { count } = await supabase
        .from("technicians")
        .select("id", { count: "exact", head: true })
        .eq("approval_status", "pending");
      if (!cancelled) setPendingCount(count ?? 0);
    };
    load();
    const id = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, [mode, showPending]);

  const grouped = useMemo(() => {
    const g: Record<Lane, ConsoleJob[]> = { incoming: [], dispatched: [], in_progress: [], completed: [] };
    for (const j of jobs) g[laneFor(j.status)].push(j);
    return g;
  }, [jobs]);

  const openJob = openJobId ? jobs.find((j) => j.id === openJobId) ?? null : null;

  // Stats
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const jobsToday = jobs.filter((j) => new Date(j.created_at) >= todayStart).length;
  const onDuty = techs.filter((t) => t.active && t.last_lat != null).length || techs.length;
  const stats = [
    { label: "Jobs today", value: String(jobsToday) },
    { label: "Avg response", value: "8 min" },
    { label: "On duty", value: String(onDuty) },
    { label: "Revenue today", value: "—" },
  ];

  const handleManualDispatch = async (
    job: ConsoleJob,
    techId: string,
    priceGbp: number,
    etaMin: number,
    notes?: string,
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke("manual-dispatch", {
        body: {
          job_id: job.id,
          technician_id: techId,
          price_gbp: priceGbp,
          eta_minutes: etaMin,
          notes,
          origin: window.location.origin,
        },
      });
      if (error) throw error;
      toast.success("Dispatched ✅ Customer sent quote + pay link.");
      console.log("manual-dispatch result", data);
      setOpenJobId(null);
    } catch (e: any) {
      console.error(e);
      toast.error(`Dispatch failed: ${e.message ?? e}`);
    }
  };

  if (!authChecked) {
    return <div className="grid h-screen place-items-center bg-background text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <style>{`
        .tf-pulse { box-shadow: 0 0 0 0 rgba(59,130,246,0.7); animation: tf-pulse 1.6s infinite; }
        @keyframes tf-pulse {
          0% { box-shadow: 0 0 0 0 rgba(59,130,246,0.55); }
          70% { box-shadow: 0 0 0 12px rgba(59,130,246,0); }
          100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
        }
        .tf-live::before { content: ''; display: inline-block; width:8px; height:8px; border-radius:9999px; background:#10b981; margin-right:8px; box-shadow:0 0 0 0 rgba(16,185,129,0.7); animation: tf-pulse 1.6s infinite; }
      `}</style>

      {/* Top bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-card/40 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold tracking-tight md:text-lg">Operations Console</h1>
          <span className="tf-live rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
            Live
          </span>
          <span className="text-xs text-muted-foreground">
            {jobs.length} jobs · {onDuty} techs
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
            title="Open the admin dashboard"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Dashboard
          </button>
          <button
            onClick={() => setShowAddTech(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-foreground hover:bg-white/10"
            title="Manually add a technician (skips onboarding)"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add tech
          </button>
          <button
            onClick={() => setShowAllTechs(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-foreground hover:bg-white/10"
            title="View all technicians"
          >
            <Users className="h-3.5 w-3.5" />
            All techs
            <span className="ml-1 rounded-full bg-white/10 px-1.5 text-[10px]">{techs.length}</span>
          </button>
          <button
            onClick={() => setShowPending(true)}
            className="relative inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-foreground hover:bg-white/10"
            title="Approve technician applications"
          >
            <UserCheck className="h-3.5 w-3.5" />
            Technicians
            {pendingCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-black">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Pending technicians slide-over */}
      {showPending && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/60" onClick={() => setShowPending(false)} />
          <div className="flex h-full w-full max-w-2xl flex-col bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-amber-400" />
                <h2 className="text-sm font-semibold">Pending technician applications</h2>
                {pendingCount > 0 && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">{pendingCount}</span>
                )}
              </div>
              <button onClick={() => setShowPending(false)} className="rounded-md p-1.5 hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <PendingTechnicians />
            </div>
          </div>
        </div>
      )}

      {/* Compact stat strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-white/10 bg-card/20 px-4 py-2 text-xs">
        {stats.map((s) => (
          <div key={s.label} className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground">{s.label}:</span>
            <span className="font-semibold text-foreground">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      {(() => {
        const filters: { key: typeof tab; label: string; count: number }[] = [
          { key: "all", label: "All", count: jobs.length },
          { key: "new", label: "New", count: grouped.incoming.length },
          { key: "in_progress", label: "In progress", count: grouped.dispatched.length + grouped.in_progress.length },
          { key: "completed", label: "Completed", count: grouped.completed.length },
        ];
        const visible =
          tab === "all" ? jobs
          : tab === "new" ? grouped.incoming
          : tab === "in_progress" ? [...grouped.dispatched, ...grouped.in_progress]
          : grouped.completed;
        return (
          <>
            <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 px-4 py-2">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setTab(f.key)}
                  className={`rounded-full px-3 py-1 text-xs transition ${
                    tab === f.key
                      ? "bg-primary text-primary-foreground"
                      : "border border-white/10 bg-white/[0.04] text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label} <span className="opacity-70">({f.count})</span>
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {visible.length === 0 && (
                <p className="px-1 py-6 text-center text-sm text-muted-foreground">No jobs.</p>
              )}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((job) => {
                  const elapsed = now - new Date(job.created_at).getTime();
                  const t = fmtTimer(elapsed);
                  const top = nearestTechs(job, techs, 1)[0];
                  const lane = laneFor(job.status);
                  const laneColor =
                    lane === "incoming" ? "bg-sky-400/15 text-sky-300 border-sky-400/30"
                    : lane === "dispatched" ? "bg-primary/15 text-primary border-primary/30"
                    : lane === "in_progress" ? "bg-emerald-400/15 text-emerald-300 border-emerald-400/30"
                    : "bg-white/5 text-muted-foreground border-white/10";
                  return (
                    <button
                      key={job.id}
                      onClick={() => setOpenJobId(job.id)}
                      className="group rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-primary/40 hover:bg-white/[0.06]"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-lg font-bold tracking-tight truncate">{job.postcode || "(no postcode)"}</div>
                        <div className={`font-mono text-sm tabular-nums ${t.cls}`}>{t.txt}</div>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/90">{job.customer_name}</span>
                        <span>·</span>
                        <Phone className="h-3 w-3" />
                        <span>{job.customer_phone}</span>
                      </div>
                      {job.vehicle_reg && (
                        <div className="mt-1 inline-block rounded bg-amber-400/10 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-amber-300">
                          {job.vehicle_reg}
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${laneColor}`}>
                          {job.status.replace(/_/g, " ")}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] capitalize text-muted-foreground">
                          {job.issue_type || "tyre job"}
                        </span>
                        {job.photo_urls && job.photo_urls.length > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground">
                            <Camera className="h-2.5 w-2.5" /> {job.photo_urls.length}
                          </span>
                        )}
                      </div>
                      {job.issue_description && (
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                          {job.issue_description}
                        </p>
                      )}
                      {top && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {(top.tech.rating ?? 5).toFixed(1)} · {top.tech.name} · ETA {top.etaMin}m
                        </div>
                      )}
                      {lane === "incoming" && (
                        <div className="mt-3">
                          <Button
                            size="sm"
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={(e) => { e.stopPropagation(); setOpenJobId(job.id); }}
                          >
                            Open & Dispatch
                          </Button>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        );
      })()}

      {/* Dispatch modal */}
      {openJob && (
        <DispatchModal
          job={openJob}
          allTechs={techs}
          onClose={() => setOpenJobId(null)}
          onDispatch={handleManualDispatch}
        />
      )}

      {showAddTech && (
        <AddTechnicianModal onClose={() => setShowAddTech(false)} />
      )}

      {showAllTechs && (
        <AllTechniciansPanel onClose={() => setShowAllTechs(false)} />
      )}
    </div>
  );
}

// ---------- Add technician modal (manual, skips onboarding) ----------
function AddTechnicianModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: "", phone: "", whatsapp: "", email: "", vehicle: "",
    service_postcodes: "", travel_radius_miles: "15", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name required");
    if (!form.phone.trim()) return toast.error("Phone required");
    setSaving(true);
    const postcodes = form.service_postcodes
      .split(",").map((p) => p.trim().toUpperCase()).filter(Boolean);
    const radius = parseInt(form.travel_radius_miles, 10);
    const { error } = await supabase.from("technicians").insert({
      name: form.name.trim(),
      phone: form.phone.trim(),
      whatsapp: form.whatsapp.trim() || form.phone.trim(),
      email: form.email.trim() || null,
      vehicle: form.vehicle.trim() || null,
      service_postcodes: postcodes,
      travel_radius_miles: Number.isFinite(radius) ? radius : 15,
      notes: form.notes.trim() || null,
      active: true,
      approval_status: "approved",
      approved_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Technician added & approved");
    onClose();
  };

  const fld = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value })),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-card p-6 shadow-2xl"
      >
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold">Add technician</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Manual entry — bypasses onboarding, documents, and approval flow. Marked active & approved immediately.
        </p>

        <div className="mt-4 grid gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Name *</label>
            <Input {...fld("name")} placeholder="Jane Doe" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Phone *</label>
              <Input {...fld("phone")} placeholder="+447700900000" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">WhatsApp</label>
              <Input {...fld("whatsapp")} placeholder="defaults to phone" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Email</label>
            <Input {...fld("email")} type="email" placeholder="jane@example.com" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Vehicle</label>
            <Input {...fld("vehicle")} placeholder="Ford Transit" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Service postcodes (comma-separated)</label>
            <Input {...fld("service_postcodes")} placeholder="W5, SW1, E14" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Travel radius (miles)</label>
            <Input {...fld("travel_radius_miles")} type="number" min={1} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Notes</label>
            <Input {...fld("notes")} placeholder="Internal notes" />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {saving ? "Adding…" : "Add technician"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ---------- Dispatch modal (manual quote + tech pick) ----------
type DispatchModalProps = {
  job: ConsoleJob;
  allTechs: ReturnType<typeof useConsoleData>["techs"];
  onClose: () => void;
  onDispatch: (job: ConsoleJob, techId: string, priceGbp: number, etaMin: number, notes?: string) => void;
};

function DispatchModal({ job, allTechs, onClose, onDispatch }: DispatchModalProps) {
  const suggested = nearestTechs(job, allTechs, 3);

  // Technician-submitted quotes for this job (price + ETA they replied with on WhatsApp).
  const [techQuotes, setTechQuotes] = useState<
    Record<string, { price: number | null; eta: number | null; status: string; created_at: string }>
  >({});
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("quotes")
        .select("technician_id,price_gbp,eta_minutes,status,created_at")
        .eq("job_id", job.id)
        .order("created_at", { ascending: true });
      if (cancelled || !data) return;
      const map: Record<string, { price: number | null; eta: number | null; status: string; created_at: string }> = {};
      for (const q of data) {
        if (!q.technician_id) continue;
        map[q.technician_id] = {
          price: q.price_gbp != null ? Number(q.price_gbp) : null,
          eta: q.eta_minutes != null ? Number(q.eta_minutes) : null,
          status: q.status,
          created_at: q.created_at,
        };
      }
      setTechQuotes(map);
    };
    load();
    const ch = supabase
      .channel(`dispatch-quotes-${job.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes", filter: `job_id=eq.${job.id}` }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [job.id]);

  const [techId, setTechId] = useState<string>(suggested[0]?.tech.id ?? "");
  const [search, setSearch] = useState("");
  const [price, setPrice] = useState<string>("85");
  const [eta, setEta] = useState<string>(String(suggested[0]?.etaMin ?? 30));
  const [notes, setNotes] = useState("");
  const [showSpecific, setShowSpecific] = useState(false);
  const [selectedTechIds, setSelectedTechIds] = useState<Set<string>>(new Set());
  const [broadcasting, setBroadcasting] = useState<null | "all" | "specific">(null);

  // When quotes arrive, prefer a technician who already submitted a quote and prefill their price/eta.
  // Only auto-switch when the user hasn't manually picked a different tech.
  const [autoPicked, setAutoPicked] = useState(false);
  useEffect(() => {
    if (autoPicked) return;
    const quotedId = Object.keys(techQuotes).find((id) => allTechs.some((t) => t.id === id));
    if (!quotedId) return;
    const q = techQuotes[quotedId];
    setTechId(quotedId);
    if (q.price != null) setPrice(String(q.price));
    if (q.eta != null) setEta(String(q.eta));
    setAutoPicked(true);
  }, [techQuotes, allTechs, autoPicked]);

  // Helper: select a technician and prefill price/eta from their submitted quote when available.
  const selectTech = (id: string, fallbackEta?: number) => {
    setTechId(id);
    setAutoPicked(true);
    const q = techQuotes[id];
    if (q?.price != null) setPrice(String(q.price));
    if (q?.eta != null) setEta(String(q.eta));
    else if (fallbackEta != null) setEta(String(fallbackEta));
  };

  // Job is "complete" — required fields gathered before broadcasting
  const wheels = ((job as any).affected_wheels ?? []) as string[];
  const hasRequiredDetails =
    !!job.customer_name && job.customer_name !== "Customer" &&
    !!job.customer_phone &&
    !!job.postcode &&
    !!job.issue_type && job.issue_type !== "unknown" &&
    !!job.vehicle_reg &&
    wheels.length > 0 &&
    (job.photo_urls?.length ?? 0) > 0;
  const isComplete = job.status === "intake_complete" || job.status === "broadcasting" || hasRequiredDetails;

  const missing: string[] = [];
  if (!job.customer_name || job.customer_name === "Customer") missing.push("name");
  if (!job.customer_phone) missing.push("phone");
  if (!job.postcode) missing.push("postcode");
  if (!job.issue_type || job.issue_type === "unknown") missing.push("issue type");
  if (!job.vehicle_reg) missing.push("reg");
  if (wheels.length === 0) missing.push("affected wheel");
  if ((job.photo_urls?.length ?? 0) === 0) missing.push("photo");

  const eligibleTechs = allTechs.filter((t: any) => t.active && (t.approval_status ?? "approved") === "approved");

  const broadcast = async (mode: "all" | "specific") => {
    if (mode === "specific" && selectedTechIds.size === 0) {
      toast.error("Pick at least one technician");
      return;
    }
    setBroadcasting(mode);
    try {
      const { data, error } = await supabase.functions.invoke("broadcast-job", {
        body: {
          job_id: job.id,
          mode,
          technician_ids: mode === "specific" ? Array.from(selectedTechIds) : undefined,
        },
      });
      if (error) throw error;
      const sent = data?.sent ?? 0;
      const total = data?.total ?? sent;
      const failures = Array.isArray(data?.failures) ? data.failures.filter(Boolean) : [];
      if (sent > 0) {
        toast.success(
          failures.length > 0
            ? `Sent to ${sent}/${total} technician(s). Some numbers failed — check alerts for details.`
            : `Sent to ${sent} technician(s) ✅`,
        );
      } else {
        throw new Error(data?.error ?? "No technician messages were delivered");
      }
      setShowSpecific(false);
      setSelectedTechIds(new Set());
    } catch (e: any) {
      const raw = e?.message ?? String(e);
      const cleaned = raw.replace(/^Edge Function returned a non-2xx status code:?\s*/i, "");
      toast.error(`Broadcast failed: ${cleaned}`);
    } finally {
      setBroadcasting(null);
    }
  };

  const filteredTechs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return allTechs
      .filter((t) =>
        t.name.toLowerCase().includes(q) ||
        (t.vehicle ?? "").toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [search, allTechs]);

  const selectedTech = allTechs.find((t) => t.id === techId);

  const submit = () => {
    const p = Number(price);
    const e = Number(eta);
    if (!techId) return toast.error("Pick a technician");
    if (!Number.isFinite(p) || p < 1) return toast.error("Enter a valid price");
    if (!Number.isFinite(e) || e < 1) return toast.error("Enter a valid ETA");
    onDispatch(job, techId, p, e, notes || undefined);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
          {job.status.replace(/_/g, " ")}
        </div>
        <h2 className="text-2xl font-bold">{job.postcode}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {job.customer_name} · {job.customer_phone}
        </p>
        <p className="mt-3 text-sm capitalize">{job.issue_type}</p>
        {job.issue_description && (
          <p className="mt-1 text-sm text-muted-foreground">{job.issue_description}</p>
        )}
        {job.vehicle_reg && (
          <p className="mt-1 text-xs font-mono uppercase tracking-wider text-foreground/80">
            Reg: {job.vehicle_reg}
          </p>
        )}

        {job.photo_urls && job.photo_urls.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {job.photo_urls.map((u, i) => (
              <a key={i} href={u} target="_blank" rel="noreferrer">
                <img src={u} alt="" className="h-20 w-20 rounded-md object-cover" />
              </a>
            ))}
          </div>
        )}

        {/* Intake details grid */}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs">
          {([
            ["Reg", job.vehicle_reg],
            ["Tyre size", (job as any).tyre_size],
            ["Tyre brand", (job as any).tyre_brand],
            ["Tyre type", (job as any).tyre_type],
            ["Wheel type", (job as any).wheel_type],
            ["Tread", (job as any).tread_condition],
            ["Damage", (job as any).damage_type],
            ["Severity", (job as any).severity],
            ["Affected", ((job as any).affected_wheels ?? []).join(", ")],
            ["Coords", job.lat != null && job.lng != null ? `${job.lat.toFixed(5)}, ${job.lng.toFixed(5)}` : null],
          ] as [string, any][]).filter(([, v]) => v).map(([k, v]) => (
            <div key={k}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
              <div className="font-medium text-foreground/90 break-words">{String(v)}</div>
            </div>
          ))}
          {(job as any).damage_summary && (
            <div className="col-span-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">AI summary</div>
              <div className="text-foreground/90">{(job as any).damage_summary}</div>
            </div>
          )}
          {job.lat != null && job.lng != null && (
            <a
              href={`https://maps.google.com/?q=${job.lat},${job.lng}`}
              target="_blank"
              rel="noreferrer"
              className="col-span-2 inline-flex items-center gap-1 text-primary hover:underline"
            >
              <MapPin className="h-3 w-3" /> Open in Maps
            </a>
          )}
        </div>

        {/* Broadcast panel — only when intake is complete */}
        <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Broadcast to technicians
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                isComplete
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30"
                  : "bg-amber-500/15 text-amber-300 border border-amber-400/30"
              }`}
            >
              {isComplete ? "Job complete" : "Job incomplete"}
            </span>
          </div>

          {!isComplete && (
            <p className="text-xs text-amber-300/80">
              Still missing: {missing.join(", ")}. Buttons unlock once all details are in.
            </p>
          )}

          {isComplete && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                  disabled={broadcasting !== null}
                  onClick={() => broadcast("all")}
                >
                  {broadcasting === "all"
                    ? "Sending…"
                    : `📣 Send to all technicians (${eligibleTechs.length})`}
                </Button>
                <Button
                  variant="outline"
                  className="border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/10"
                  disabled={broadcasting !== null}
                  onClick={() => setShowSpecific((v) => !v)}
                >
                  🎯 Send to specific technicians
                </Button>
              </div>

              {showSpecific && (
                <div className="rounded-md border border-white/10 bg-white/[0.04] p-2">
                  <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Pick from registered technicians ({eligibleTechs.length} eligible)
                  </div>
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {eligibleTechs.map((t: any) => {
                      const checked = selectedTechIds.has(t.id);
                      return (
                        <label
                          key={t.id}
                          className={`flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-white/[0.05] ${
                            checked ? "bg-primary/10" : ""
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setSelectedTechIds((s) => {
                                  const n = new Set(s);
                                  if (n.has(t.id)) n.delete(t.id);
                                  else n.add(t.id);
                                  return n;
                                });
                              }}
                            />
                            <span className="font-medium">{t.name}</span>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {t.vehicle ?? ""}{t.phone ? ` · ${t.phone}` : ""}
                          </span>
                        </label>
                      );
                    })}
                    {eligibleTechs.length === 0 && (
                      <p className="text-xs text-muted-foreground">No active approved technicians.</p>
                    )}
                  </div>
                  <Button
                    className="mt-2 w-full bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                    disabled={broadcasting !== null || selectedTechIds.size === 0}
                    onClick={() => broadcast("specific")}
                  >
                    {broadcasting === "specific"
                      ? "Sending…"
                      : `Send WhatsApp to ${selectedTechIds.size} selected`}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Conversation thread */}
        <div className="mt-4">
          <JobConversation jobId={job.id} customerPhone={job.customer_phone} />
        </div>

        {/* AI suggestions */}
        <div className="mt-5">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> AI suggestions
          </h3>
          <div className="space-y-2">
            {suggested.map(({ tech, distanceKm, etaMin }) => (
              <button
                key={tech.id}
                onClick={() => { setTechId(tech.id); setEta(String(etaMin)); }}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition ${
                  techId === tech.id
                    ? "border-primary bg-primary/10"
                    : "border-white/10 bg-white/[0.04] hover:border-primary/40"
                }`}
              >
                <div>
                  <div className="font-semibold">{tech.name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {(tech.rating ?? 5).toFixed(1)} · {distanceKm.toFixed(1)} km · ETA {etaMin}m
                    {tech.vehicle ? ` · ${tech.vehicle}` : ""}
                  </div>
                </div>
                {techId === tech.id && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">
                    Selected
                  </span>
                )}
              </button>
            ))}
            {suggested.length === 0 && (
              <p className="text-xs text-muted-foreground">No technicians with a recent location.</p>
            )}
          </div>
        </div>

        {/* Manual tech search */}
        <div className="mt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Or pick another technician
          </h3>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or vehicle…"
              className="pl-9"
            />
          </div>
          {filteredTechs.length > 0 && (
            <div className="mt-2 space-y-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
              {filteredTechs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTechId(t.id); setSearch(""); }}
                  className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-white/[0.06] ${
                    techId === t.id ? "bg-primary/10 text-primary" : ""
                  }`}
                >
                  <span>{t.name}</span>
                  <span className="text-xs text-muted-foreground">{t.vehicle ?? ""}</span>
                </button>
              ))}
            </div>
          )}
          {selectedTech && (
            <p className="mt-2 text-xs text-muted-foreground">
              Selected: <span className="font-semibold text-foreground">{selectedTech.name}</span>
              {selectedTech.vehicle ? ` · ${selectedTech.vehicle}` : ""}
            </p>
          )}
        </div>

        {/* Quote */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Price (£)
            </label>
            <Input
              type="number"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="85"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              ETA (mins)
            </label>
            <Input
              type="number"
              inputMode="numeric"
              value={eta}
              onChange={(e) => setEta(e.target.value)}
              placeholder="30"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Notes (optional)
          </label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. tech bringing 225/45 R17 mid-range"
          />
        </div>

        <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs">
          <div className="mb-1 font-semibold uppercase tracking-wider text-muted-foreground">
            Customer will receive on WhatsApp
          </div>
          <pre className="whitespace-pre-wrap font-sans text-foreground/90">
{`Hi ${job.customer_name ?? ""} 👋 Tyre Fly here.
We've got ${selectedTech?.name ?? "a technician"} ready for you in ${job.postcode}.
• Quote: £${Number(price || 0).toFixed(2)}
• ETA: ~${eta} mins from payment

Tap to pay (Apple Pay / Google Pay / card) → [secure link]`}
          </pre>
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={submit}
            disabled={!techId}
          >
            Send pay link
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------- All technicians slide-over ----------
type TechRow = {
  id: string;
  name: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  vehicle: string | null;
  rating: number | null;
  jobs_completed: number;
  active: boolean;
  approval_status: string;
  service_postcodes: string[] | null;
  travel_radius_miles: number | null;
  last_lat: number | null;
  last_lng: number | null;
  last_location_at: string | null;
  live_location_until: string | null;
  created_at: string;
};

function AllTechniciansPanel({ onClose }: { onClose: () => void }) {
  const [techs, setTechs] = useState<TechRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("technicians")
        .select("id,name,phone,whatsapp,email,vehicle,rating,jobs_completed,active,approval_status,service_postcodes,travel_radius_miles,last_lat,last_lng,last_location_at,live_location_until,created_at")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) toast.error(error.message);
      setTechs((data ?? []) as TechRow[]);
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel("all-techs-panel")
      .on("postgres_changes", { event: "*", schema: "public", table: "technicians" }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, []);

  const toggleActive = async (t: TechRow) => {
    const { error } = await supabase
      .from("technicians")
      .update({ active: !t.active })
      .eq("id", t.id);
    if (error) toast.error(error.message);
    else toast.success(`${t.name} ${!t.active ? "activated" : "deactivated"}`);
  };

  const deleteTech = async (t: TechRow) => {
    if (!confirm(`Delete ${t.name} (${t.phone})? This cannot be undone.`)) return;
    const { error } = await supabase.from("technicians").delete().eq("id", t.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`${t.name} deleted`);
      setTechs((prev) => prev.filter((x) => x.id !== t.id));
    }
  };

  const filtered = techs.filter((t) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      t.name.toLowerCase().includes(s) ||
      t.phone.toLowerCase().includes(s) ||
      (t.email ?? "").toLowerCase().includes(s) ||
      (t.vehicle ?? "").toLowerCase().includes(s) ||
      (t.service_postcodes ?? []).some((p) => p.toLowerCase().includes(s))
    );
  });

  const fmtAgo = (iso: string | null) => {
    if (!iso) return "never";
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const isLive = (t: TechRow) =>
    !!(t.live_location_until && new Date(t.live_location_until) > new Date());

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60" onClick={onClose} />
      <div className="flex h-full w-full max-w-2xl flex-col bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">All technicians</h2>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-muted-foreground">
              {techs.length}
            </span>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-white/10 px-4 py-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, phone, postcode, vehicle…"
              className="pl-8 text-xs"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading && <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>}
          {!loading && filtered.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">No technicians found.</p>
          )}
          <div className="grid gap-2">
            {filtered.map((t) => {
              const live = isLive(t);
              const statusBadge =
                t.approval_status === "approved"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                  : t.approval_status === "pending"
                  ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                  : "border-red-400/30 bg-red-400/10 text-red-300";
              return (
                <div key={t.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold">{t.name}</span>
                        {live && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 text-[10px] font-semibold text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> live
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        <a href={`tel:${t.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
                          <Phone className="h-3 w-3" /> {t.phone}
                        </a>
                        {t.email && <span className="truncate">{t.email}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${statusBadge}`}>
                        {t.approval_status}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-300">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {(t.rating ?? 5).toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    {t.vehicle && <div><span className="text-foreground/70">Vehicle:</span> {t.vehicle}</div>}
                    <div><span className="text-foreground/70">Jobs:</span> {t.jobs_completed}</div>
                    {t.travel_radius_miles != null && (
                      <div><span className="text-foreground/70">Radius:</span> {t.travel_radius_miles}mi</div>
                    )}
                    <div className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {fmtAgo(t.last_location_at)}
                    </div>
                  </div>

                  {t.service_postcodes && t.service_postcodes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {t.service_postcodes.slice(0, 8).map((p) => (
                        <span key={p} className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {p}
                        </span>
                      ))}
                      {t.service_postcodes.length > 8 && (
                        <span className="text-[10px] text-muted-foreground">+{t.service_postcodes.length - 8}</span>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className={`text-[11px] ${t.active ? "text-emerald-300" : "text-muted-foreground"}`}>
                      {t.active ? "● Active" : "○ Inactive"}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive(t)}
                        className="h-7 text-[11px]"
                      >
                        {t.active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteTech(t)}
                        className="h-7 border-red-400/30 text-[11px] text-red-300 hover:bg-red-500/10 hover:text-red-200"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
