import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadGoogleMaps } from "@/lib/googleMapsLoader";
import { useDashboardData, shortRef, fmtRelative, type DashJob, type DashTech } from "@/hooks/useDashboardData";
import { jobStatusLabel, paymentStatusLabel } from "@/lib/jobStatus";
import { Phone, MessageCircle, Briefcase, Users, AlertTriangle, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Seo } from "@/components/Seo";

/* -------------------------------------------------------------------------- */
/* Status helpers                                                              */
/* -------------------------------------------------------------------------- */

type JobBucket = "new" | "quoting" | "payment" | "assigned" | "in_progress" | "done";

function jobBucket(j: DashJob): JobBucket {
  const s = j.status;
  if (["completed", "closed", "cancelled"].includes(s)) return "done";
  if (s === "in_progress") return "in_progress";
  if (["accepted", "paid"].includes(s)) return "assigned";
  if (s === "awaiting_payment") return "payment";
  if (["broadcasting", "awaiting_approval", "quoted", "sent"].includes(s)) return "quoting";
  return "new";
}

const JOB_COLORS: Record<JobBucket, string> = {
  new: "#ef4444",        // Red
  quoting: "#f97316",    // Orange
  payment: "#eab308",    // Yellow
  assigned: "#3b82f6",   // Blue
  in_progress: "#22c55e",// Green
  done: "#6b7280",       // Gray
};

const JOB_BUCKET_LABEL: Record<JobBucket, string> = {
  new: "New",
  quoting: "Waiting on quotes",
  payment: "Payment pending",
  assigned: "Technician assigned",
  in_progress: "In progress",
  done: "Completed",
};

type TechStatus = "available" | "en_route" | "on_site" | "completed" | "offline";

function techStatus(t: DashTech, jobs: DashJob[]): TechStatus {
  if (!t.active || t.approval_status !== "approved") return "offline";
  const liveLoc = t.last_location_at
    ? Date.now() - new Date(t.last_location_at).getTime() < 30 * 60 * 1000
    : false;

  const myJob = jobs.find((j) => j.assigned_technician_id === t.id && !["closed", "cancelled"].includes(j.status));
  if (myJob) {
    if (myJob.status === "completed" || myJob.status === "paid") return "completed";
    if (myJob.status === "in_progress") return "on_site";
    return "en_route";
  }
  if (!liveLoc) return "offline";
  return t.availability_now ? "available" : "offline";
}

const TECH_COLORS: Record<TechStatus, string> = {
  available: "#10b981",  // Emerald
  en_route: "#3b82f6",   // Blue
  on_site: "#22c55e",    // Green
  completed: "#a855f7",  // Purple
  offline: "#6b7280",    // Gray
};

const TECH_LABEL: Record<TechStatus, string> = {
  available: "Available",
  en_route: "En route to customer",
  on_site: "Working on site",
  completed: "Completed job",
  offline: "Offline",
};

/* -------------------------------------------------------------------------- */
/* Marker SVG (Google Maps Marker icon)                                        */
/* -------------------------------------------------------------------------- */

function pinSymbol(color: string, ring = false) {
  // Returns a google.maps.Symbol for an SVG circle marker.
  // ring=true for technicians (so they look distinct from job pins).
  return {
    path:
      "M12 0C5.4 0 0 5.4 0 12c0 8 12 24 12 24s12-16 12-24C24 5.4 18.6 0 12 0z",
    fillColor: color,
    fillOpacity: ring ? 0.0 : 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
    scale: ring ? 0 : 1.1,
    anchor: { x: 12, y: 36 } as any,
  };
}

function circleSymbol(color: string, scale = 8) {
  return {
    path: 0, // google.maps.SymbolPath.CIRCLE — numeric value
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#0b1220",
    strokeWeight: 2,
    scale,
  };
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function CommandCenter() {
  const navigate = useNavigate();
  const { jobs, techs } = useDashboardData();
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [filterBucket, setFilterBucket] = useState<JobBucket | "all">("all");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Active jobs only on the map (exclude done unless filter says so)
  const visibleJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (j.lat == null || j.lng == null) return false;
      const b = jobBucket(j);
      if (filterBucket === "all") return b !== "done";
      return b === filterBucket;
    });
  }, [jobs, filterBucket]);

  const techsOnMap = useMemo(
    () => techs.filter((t) => t.last_lat != null && t.last_lng != null),
    [techs],
  );

  // Init map
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !mapEl.current) return;
        const map = new google.maps.Map(mapEl.current, {
          center: { lat: 54.5, lng: -2.5 },
          zoom: 6,
          disableDefaultUI: false,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          styles: DARK_STYLE,
        });
        mapRef.current = map;
        infoRef.current = new google.maps.InfoWindow();
        setMapReady(true);
      })
      .catch((e) => {
        if (!cancelled) setMapError(e.message ?? "Map failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Render markers when data or filter changes
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google) return;
    const google = window.google;
    const map = mapRef.current;

    // Clear old markers
    for (const m of markersRef.current) m.setMap(null);
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let anyPoint = false;

    // Job markers
    for (const j of visibleJobs) {
      const bucket = jobBucket(j);
      const color = JOB_COLORS[bucket];
      const marker = new google.maps.Marker({
        position: { lat: Number(j.lat), lng: Number(j.lng) },
        map,
        icon: pinSymbol(color),
        title: `${shortRef(j.id)} • ${j.customer_name ?? ""}`,
        zIndex: 10,
      });
      marker.addListener("click", () => {
        setSelectedJobId(j.id);
        infoRef.current?.setContent(renderJobInfo(j));
        infoRef.current?.open({ map, anchor: marker });
      });
      markersRef.current.push(marker);
      bounds.extend(marker.getPosition()!);
      anyPoint = true;
    }

    // Technician markers
    for (const t of techsOnMap) {
      const status = techStatus(t, jobs);
      const color = TECH_COLORS[status];
      const marker = new google.maps.Marker({
        position: { lat: Number(t.last_lat), lng: Number(t.last_lng) },
        map,
        icon: circleSymbol(color, 9),
        title: `${t.name} • ${TECH_LABEL[status]}`,
        zIndex: 20,
      });
      marker.addListener("click", () => {
        infoRef.current?.setContent(renderTechInfo(t, status, jobs));
        infoRef.current?.open({ map, anchor: marker });
      });
      markersRef.current.push(marker);
      bounds.extend(marker.getPosition()!);
      anyPoint = true;
    }

    if (anyPoint && !bounds.isEmpty()) {
      map.fitBounds(bounds, 80);
      // Don't over-zoom on a single marker
      const listener = google.maps.event.addListenerOnce(map, "idle", () => {
        if (map.getZoom() && map.getZoom() > 14) map.setZoom(14);
      });
      // store nothing; one-shot
      void listener;
    }
  }, [mapReady, visibleJobs, techsOnMap, jobs]);

  /* ------------------------------- Dispatch queue -------------------------- */

  const activeJobs = useMemo(
    () => jobs.filter((j) => !["closed", "cancelled"].includes(j.status)),
    [jobs],
  );

  const unassigned = activeJobs.filter(
    (j) => !j.assigned_technician_id && ["pending", "intake_pending", "intake_complete", "awaiting_approval", "broadcasting", "quoted", "sent"].includes(j.status),
  );
  const assigned = activeJobs.filter((j) => j.assigned_technician_id && j.status !== "completed");
  const delayed = activeJobs.filter((j) => {
    const ageMin = (Date.now() - new Date(j.created_at).getTime()) / 60000;
    if (ageMin > 60 && jobBucket(j) === "new") return true;
    if (ageMin > 45 && jobBucket(j) === "quoting") return true;
    if (j.status === "awaiting_payment" && ageMin > 30) return true;
    return false;
  });

  /* ----------------------------------- UI ---------------------------------- */

  const counts = useMemo(() => {
    const map = new Map<JobBucket, number>();
    for (const j of jobs) {
      if (["closed", "cancelled"].includes(j.status)) continue;
      const b = jobBucket(j);
      map.set(b, (map.get(b) ?? 0) + 1);
    }
    return map;
  }, [jobs]);

  return (
    <>
      <Seo title="Command Center · Tyre Fly" description="Real-time map of jobs and technicians." />
      <div className="grid h-[calc(100vh-6rem)] grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        {/* MAP */}
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          {/* Legend / filter bar */}
          <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex flex-wrap items-center gap-2">
            <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-black/60 px-2 py-1 backdrop-blur">
              <FilterChip
                active={filterBucket === "all"}
                color="#ffffff"
                label={`All active (${activeJobs.length})`}
                onClick={() => setFilterBucket("all")}
              />
              {(Object.keys(JOB_COLORS) as JobBucket[])
                .filter((b) => b !== "done")
                .map((b) => (
                  <FilterChip
                    key={b}
                    active={filterBucket === b}
                    color={JOB_COLORS[b]}
                    label={`${JOB_BUCKET_LABEL[b]} (${counts.get(b) ?? 0})`}
                    onClick={() => setFilterBucket(b)}
                  />
                ))}
            </div>
            <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/10 bg-black/60 px-3 py-1 text-xs text-white/70 backdrop-blur">
              <Users className="h-3.5 w-3.5" /> {techsOnMap.length} techs on map · auto-refresh 30s
            </div>
          </div>

          {mapError ? (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-white/70">
              <div>
                <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-amber-400" />
                {mapError}
              </div>
            </div>
          ) : (
            <div ref={mapEl} className="h-full w-full" />
          )}

          {!mapReady && !mapError && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/60">
              Loading map…
            </div>
          )}
        </section>

        {/* SIDE PANEL */}
        <aside className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Briefcase className="h-4 w-4 text-primary" /> Dispatch queue
            </div>
            <p className="mt-0.5 text-xs text-white/50">Live operations side panel</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <QueueGroup
              title="Unassigned"
              tone="amber"
              count={unassigned.length}
              empty="No unassigned jobs"
            >
              {unassigned.slice(0, 20).map((j) => (
                <QueueRow
                  key={j.id}
                  job={j}
                  techs={techs}
                  selected={selectedJobId === j.id}
                  onClick={() => focusJob(mapRef.current, j, setSelectedJobId)}
                  onOpen={() => navigate(`/admin/dashboard/jobs?jobId=${j.id}`)}
                />
              ))}
            </QueueGroup>

            <QueueGroup
              title="Assigned"
              tone="blue"
              count={assigned.length}
              empty="No active assignments"
            >
              {assigned.slice(0, 20).map((j) => (
                <QueueRow
                  key={j.id}
                  job={j}
                  techs={techs}
                  selected={selectedJobId === j.id}
                  onClick={() => focusJob(mapRef.current, j, setSelectedJobId)}
                  onOpen={() => navigate(`/admin/dashboard/jobs?jobId=${j.id}`)}
                />
              ))}
            </QueueGroup>

            <QueueGroup
              title="Delayed"
              tone="red"
              count={delayed.length}
              empty="No delays detected"
            >
              {delayed.slice(0, 20).map((j) => (
                <QueueRow
                  key={j.id}
                  job={j}
                  techs={techs}
                  selected={selectedJobId === j.id}
                  delayed
                  onClick={() => focusJob(mapRef.current, j, setSelectedJobId)}
                  onOpen={() => navigate(`/admin/dashboard/jobs?jobId=${j.id}`)}
                />
              ))}
            </QueueGroup>
          </div>
        </aside>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers / sub-components                                                    */
/* -------------------------------------------------------------------------- */

function focusJob(map: any, j: DashJob, setSel: (id: string) => void) {
  setSel(j.id);
  if (!map || j.lat == null || j.lng == null) return;
  map.panTo({ lat: Number(j.lat), lng: Number(j.lng) });
  map.setZoom(Math.max(map.getZoom() ?? 12, 13));
}

function FilterChip({
  active,
  color,
  label,
  onClick,
}: {
  active: boolean;
  color: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition ${
        active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10"
      }`}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </button>
  );
}

function QueueGroup({
  title,
  count,
  tone,
  empty,
  children,
}: {
  title: string;
  count: number;
  tone: "amber" | "blue" | "red";
  empty: string;
  children: React.ReactNode;
}) {
  const dot =
    tone === "amber" ? "bg-amber-400" : tone === "blue" ? "bg-blue-400" : "bg-red-400";
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-white/60">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {title}
        <span className="ml-auto text-white/40">{count}</span>
      </div>
      {count === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-xs text-white/40">
          {empty}
        </div>
      ) : (
        <div className="space-y-1.5">{children}</div>
      )}
    </div>
  );
}

function QueueRow({
  job,
  techs,
  selected,
  delayed,
  onClick,
  onOpen,
}: {
  job: DashJob;
  techs: DashTech[];
  selected: boolean;
  delayed?: boolean;
  onClick: () => void;
  onOpen: () => void;
}) {
  const tech = techs.find((t) => t.id === job.assigned_technician_id);
  const bucket = jobBucket(job);
  return (
    <div
      className={`group rounded-lg border px-2.5 py-2 text-xs transition ${
        selected
          ? "border-primary/60 bg-primary/10"
          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
      }`}
    >
      <button onClick={onClick} className="block w-full text-left">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: JOB_COLORS[bucket] }}
          />
          <span className="font-semibold text-white">{shortRef(job.id)}</span>
          <span className="ml-auto flex items-center gap-1 text-white/50">
            <Clock className="h-3 w-3" /> {fmtRelative(job.created_at)}
          </span>
        </div>
        <div className="mt-1 truncate text-white/80">
          {job.customer_name ?? "Customer"} · {job.postcode ?? "—"}
        </div>
        <div className="mt-0.5 truncate text-white/50">
          {job.issue_type ?? "Tyre issue"} · {jobStatusLabel(job.status)}
        </div>
        {tech && (
          <div className="mt-1 flex items-center gap-1 text-blue-300/90">
            <MapPin className="h-3 w-3" /> {tech.name}
          </div>
        )}
        {delayed && (
          <div className="mt-1 flex items-center gap-1 text-red-300">
            <AlertTriangle className="h-3 w-3" /> Delay detected
          </div>
        )}
      </button>
      <div className="mt-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100">
        <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={onOpen}>
          Open
        </Button>
      </div>
    </div>
  );
}

/* ----------------------- InfoWindow HTML renderers ------------------------ */

function escapeHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function renderJobInfo(j: DashJob): string {
  const bucket = jobBucket(j);
  const color = JOB_COLORS[bucket];
  const ageMin = Math.round((Date.now() - new Date(j.created_at).getTime()) / 60000);
  return `
    <div style="font-family:system-ui;color:#111;min-width:220px;max-width:280px;font-size:13px">
      <div style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:14px">
        <span style="display:inline-block;width:10px;height:10px;border-radius:9999px;background:${color}"></span>
        ${escapeHtml(shortRef(j.id))} — ${escapeHtml(JOB_BUCKET_LABEL[bucket])}
      </div>
      <div style="margin-top:6px;line-height:1.5">
        <div><b>Customer:</b> ${escapeHtml(j.customer_name) || "—"}</div>
        ${j.vehicle_reg ? `<div><b>Vehicle:</b> ${escapeHtml(j.vehicle_reg)}</div>` : ""}
        <div><b>Issue:</b> ${escapeHtml(j.issue_type) || "—"}</div>
        <div><b>Postcode:</b> ${escapeHtml(j.postcode) || "—"}</div>
        <div><b>Payment:</b> ${escapeHtml(paymentStatusLabel(j.platform_fee_status))}</div>
        <div><b>Created:</b> ${ageMin} min ago</div>
      </div>
    </div>
  `;
}

function renderTechInfo(t: DashTech, status: TechStatus, jobs: DashJob[]): string {
  const color = TECH_COLORS[status];
  const myJob = jobs.find(
    (j) => j.assigned_technician_id === t.id && !["closed", "cancelled", "completed"].includes(j.status),
  );
  const phone = t.whatsapp || t.phone || "";
  const phoneDigits = phone.replace(/[^0-9]/g, "");
  const lastSeen = t.last_location_at
    ? `${Math.round((Date.now() - new Date(t.last_location_at).getTime()) / 60000)} min ago`
    : "never";
  return `
    <div style="font-family:system-ui;color:#111;min-width:220px;max-width:280px;font-size:13px">
      <div style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:14px">
        <span style="display:inline-block;width:10px;height:10px;border-radius:9999px;background:${color}"></span>
        ${escapeHtml(t.name)}
      </div>
      <div style="margin-top:6px;line-height:1.5">
        <div><b>Status:</b> ${TECH_LABEL[status]}</div>
        ${myJob ? `<div><b>Current job:</b> ${escapeHtml(shortRef(myJob.id))} · ${escapeHtml(myJob.customer_name)}</div>` : ""}
        <div><b>Rating:</b> ⭐ ${(t.rating ?? 5).toFixed(1)} · ${t.jobs_completed} jobs</div>
        <div><b>Last seen:</b> ${lastSeen}</div>
        ${phone ? `<div><b>Phone:</b> ${escapeHtml(phone)}</div>` : ""}
      </div>
      ${
        phoneDigits
          ? `<div style="margin-top:8px;display:flex;gap:6px">
              <a href="tel:${phoneDigits}" style="flex:1;text-align:center;padding:6px 8px;border-radius:8px;background:#111;color:#fff;text-decoration:none;font-weight:600">Call</a>
              <a href="https://wa.me/${phoneDigits}" target="_blank" rel="noreferrer" style="flex:1;text-align:center;padding:6px 8px;border-radius:8px;background:#22c55e;color:#fff;text-decoration:none;font-weight:600">WhatsApp</a>
            </div>`
          : ""
      }
    </div>
  `;
}

/* ------------------------------ Dark map style ----------------------------- */

const DARK_STYLE: any[] = [
  { elementType: "geometry", stylers: [{ color: "#1d2330" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1d2330" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9aa3b2" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d0d4dc" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a3142" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a93a4" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a4358" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f1623" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4a5468" }] },
];

// Re-export icons referenced from sub-components to avoid unused-import warnings
void Phone;
void MessageCircle;
void Badge;
