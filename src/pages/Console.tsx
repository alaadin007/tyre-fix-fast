import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Map as MapIcon, LayoutList, X, Star, Search, Sparkles } from "lucide-react";
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
import ConsoleMap from "@/components/console/ConsoleMap";

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
  const [mode, setMode] = useState<ConsoleMode>(() =>
    (localStorage.getItem("console.mode") as ConsoleMode) || "demo",
  );
  const [view, setView] = useState<"board" | "map">("board"); // mobile only
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    localStorage.setItem("console.mode", mode);
  }, [mode]);

  // Admin gate (only enforced when using live data)
  useEffect(() => {
    if (mode === "demo") {
      setAuthChecked(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) navigate("/technician/login");
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
      if (!isAdmin) {
        if (!cancelled) navigate("/");
        return;
      }
      if (!cancelled) setAuthChecked(true);
    })();
    return () => { cancelled = true; };
  }, [mode, navigate]);

  const { jobs, techs, setJobs } = useConsoleData(mode);
  const now = useTick(1000);

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
    { label: "Jobs today", value: mode === "demo" ? "6" : String(jobsToday) },
    { label: "Avg response", value: "8 min" },
    { label: "On duty", value: String(onDuty) },
    { label: "Revenue today", value: mode === "demo" ? "£340" : "—" },
  ];

  const handleDispatch = async (job: ConsoleJob, techId: string) => {
    if (mode === "demo") {
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: "broadcasting" } : j)),
      );
      setOpenJobId(null);
      return;
    }
    await supabase.from("job_allocations").insert({
      job_id: job.id,
      technician_id: techId,
      status: "proposed",
    });
    await supabase.from("jobs").update({ status: "broadcasting" }).eq("id", job.id);
    setOpenJobId(null);
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

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-2 border-b border-white/10 bg-card/20 px-4 py-2 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className="text-lg font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Main split */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Board */}
        <aside
          className={`flex h-full w-full flex-col overflow-y-auto border-white/10 md:w-2/5 md:border-r ${
            view === "map" ? "hidden md:flex" : "flex"
          }`}
        >
          {LANES.map((lane) => {
            const items = grouped[lane.key];
            return (
              <section key={lane.key} className="border-b border-white/5">
                <header className="sticky top-0 z-10 flex items-center justify-between bg-card/80 px-4 py-2 backdrop-blur">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${lane.dot}`} />
                    <h2 className="text-xs font-semibold uppercase tracking-wider">{lane.label}</h2>
                  </div>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </header>
                <div className="flex flex-col gap-2 p-3">
                  {items.length === 0 && (
                    <p className="px-1 text-xs text-muted-foreground">No jobs.</p>
                  )}
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
                        {top && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {(top.tech.rating ?? 5).toFixed(1)} · {top.tech.name} · ETA {top.etaMin}m
                          </div>
                        )}
                        {lane.key === "incoming" && (
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
              </section>
            );
          })}
        </aside>

        {/* Map */}
        <main className={`relative h-full flex-1 ${view === "board" ? "hidden md:block" : "block"}`}>
          <ConsoleMap jobs={jobs} techs={techs} onJobClick={setOpenJobId} />
        </main>
      </div>

      {/* Mobile tab bar */}
      <nav className="grid grid-cols-2 border-t border-white/10 bg-card md:hidden">
        <button
          onClick={() => setView("board")}
          className={`flex items-center justify-center gap-2 py-3 text-sm ${view === "board" ? "text-primary" : "text-muted-foreground"}`}
        >
          <LayoutList className="h-4 w-4" /> Board
        </button>
        <button
          onClick={() => setView("map")}
          className={`flex items-center justify-center gap-2 py-3 text-sm ${view === "map" ? "text-primary" : "text-muted-foreground"}`}
        >
          <MapIcon className="h-4 w-4" /> Map
        </button>
      </nav>

      {/* Dispatch modal */}
      {openJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpenJobId(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpenJobId(null)}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
              {openJob.status.replace(/_/g, " ")}
            </div>
            <h2 className="text-2xl font-bold">{openJob.postcode}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {openJob.customer_name} · {openJob.customer_phone}
            </p>
            <p className="mt-3 text-sm capitalize">{openJob.issue_type}</p>
            {openJob.issue_description && (
              <p className="mt-1 text-sm text-muted-foreground">{openJob.issue_description}</p>
            )}

            {openJob.photo_urls && openJob.photo_urls.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {openJob.photo_urls.map((u, i) => (
                  <img key={i} src={u} alt="" className="h-20 w-20 rounded-md object-cover" />
                ))}
              </div>
            )}

            <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs">
              <div className="mb-1 font-semibold uppercase tracking-wider text-muted-foreground">WhatsApp broadcast preview</div>
              <pre className="whitespace-pre-wrap font-sans text-foreground/90">
{`🚨 New job in ${openJob.postcode}
Issue: ${openJob.issue_type}
Reply with ETA + £ if available.`}
              </pre>
            </div>

            <div className="mt-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nearest available technicians
              </h3>
              <div className="space-y-2">
                {nearestTechs(openJob, techs, 3).map(({ tech, distanceKm, etaMin }) => (
                  <div
                    key={tech.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3"
                  >
                    <div>
                      <div className="font-semibold">{tech.name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {(tech.rating ?? 5).toFixed(1)} · {distanceKm.toFixed(1)} km · ETA {etaMin}m
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => handleDispatch(openJob, tech.id)}
                    >
                      Dispatch
                    </Button>
                  </div>
                ))}
                {nearestTechs(openJob, techs, 3).length === 0 && (
                  <p className="text-xs text-muted-foreground">No technicians with a recent location.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
