import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Star, Search, Sparkles, UserCheck, UserPlus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PendingTechnicians } from "@/components/admin/PendingTechnicians";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useConsoleData,
  laneFor,
  LANES,
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
  const [tab, setTab] = useState<"new" | "in_progress" | "completed">("new");
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [showPending, setShowPending] = useState(false);
  const [showAddTech, setShowAddTech] = useState(false);
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
            onClick={() => setShowAddTech(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-foreground hover:bg-white/10"
            title="Manually add a technician (skips onboarding)"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add tech
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
          <div className="inline-flex overflow-hidden rounded-md border border-white/10 bg-white/5 text-xs">
            <button
              className={`px-3 py-1.5 ${mode === "demo" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setMode("demo")}
            >
              Demo
            </button>
            <button
              className={`px-3 py-1.5 ${mode === "live" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setMode("live")}
            >
              Live data
            </button>
          </div>
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

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-4 mt-3 grid w-auto grid-cols-3">
          <TabsTrigger value="new">New ({grouped.incoming.length})</TabsTrigger>
          <TabsTrigger value="in_progress">In progress ({grouped.dispatched.length + grouped.in_progress.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({grouped.completed.length})</TabsTrigger>
        </TabsList>

        {([
          { key: "new", items: grouped.incoming, showDispatch: true },
          { key: "in_progress", items: [...grouped.dispatched, ...grouped.in_progress], showDispatch: false },
          { key: "completed", items: grouped.completed, showDispatch: false },
        ] as const).map(({ key, items, showDispatch }) => (
          <TabsContent key={key} value={key} className="mt-0 flex-1 overflow-y-auto p-3">
            {items.length === 0 && (
              <p className="px-1 py-6 text-center text-sm text-muted-foreground">No jobs.</p>
            )}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((job) => {
                const elapsed = now - new Date(job.created_at).getTime();
                const t = fmtTimer(elapsed);
                const top = nearestTechs(job, techs, 1)[0];
                return (
                  <button
                    key={job.id}
                    onClick={() => setOpenJobId(job.id)}
                    className="group rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-primary/40 hover:bg-white/[0.06]"
                  >
                    <div className="flex items-baseline justify-between">
                      <div className="text-lg font-bold tracking-tight">{job.postcode || "—"}</div>
                      <div className={`font-mono text-sm tabular-nums ${t.cls}`}>{t.txt}</div>
                    </div>
                    <div className="mt-1 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
                      {job.issue_type || "tyre job"}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                      {job.status.replace(/_/g, " ")}
                    </div>
                    {top && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {(top.tech.rating ?? 5).toFixed(1)} · {top.tech.name} · ETA {top.etaMin}m
                      </div>
                    )}
                    {showDispatch && (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={(e) => { e.stopPropagation(); setOpenJobId(job.id); }}
                        >
                          Dispatch
                        </Button>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

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
  const [techId, setTechId] = useState<string>(suggested[0]?.tech.id ?? "");
  const [search, setSearch] = useState("");
  const [price, setPrice] = useState<string>("85");
  const [eta, setEta] = useState<string>(String(suggested[0]?.etaMin ?? 30));
  const [notes, setNotes] = useState("");

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
              <img key={i} src={u} alt="" className="h-20 w-20 rounded-md object-cover" />
            ))}
          </div>
        )}

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
