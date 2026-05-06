import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Radio } from "lucide-react";

type Tech = {
  id: string;
  name: string;
  phone: string;
  last_lat: number | null;
  last_lng: number | null;
  last_location_at: string | null;
  live_location_until: string | null;
  active: boolean;
  approval_status: string;
};

type Ping = {
  id: string;
  technician_id: string;
  lat: number;
  lng: number;
  created_at: string;
  expires_at: string;
};

// Fix default icon paths (Vite-friendly)
const techIcon = L.divIcon({
  className: "",
  html: `<div style="background:#FF6B1A;border:2px solid white;border-radius:9999px;width:18px;height:18px;box-shadow:0 0 0 4px rgba(255,107,26,0.25)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});
const staleIcon = L.divIcon({
  className: "",
  html: `<div style="background:#666;border:2px solid white;border-radius:9999px;width:14px;height:14px;opacity:0.7"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function isLive(t: Tech): boolean {
  return !!(t.live_location_until && new Date(t.live_location_until) > new Date());
}
function fmtAgo(iso: string | null): string {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m ago`;
}

export default function TechnicianLiveMap() {
  const [techs, setTechs] = useState<Tech[]>([]);
  const [pings, setPings] = useState<Ping[]>([]);
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  const load = async () => {
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase
        .from("technicians")
        .select("id,name,phone,last_lat,last_lng,last_location_at,live_location_until,active,approval_status"),
      supabase
        .from("technician_locations")
        .select("id,technician_id,lat,lng,created_at,expires_at")
        .gte("created_at", new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: true }),
    ]);
    setTechs((t ?? []) as Tech[]);
    setPings((p ?? []) as Ping[]);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("tech-live-map")
      .on("postgres_changes", { event: "*", schema: "public", table: "technician_locations" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "technicians" }, load)
      .subscribe();
    const t = setInterval(load, 60_000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(t);
    };
  }, []);

  // Init map once
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current, { zoomControl: true }).setView([54.5, -2.5], 6);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap © CARTO",
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
  }, []);

  // Render markers + trails
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const bounds: L.LatLngTuple[] = [];

    // Trails per technician (last 8h)
    const byTech = new Map<string, Ping[]>();
    for (const p of pings) {
      if (!byTech.has(p.technician_id)) byTech.set(p.technician_id, []);
      byTech.get(p.technician_id)!.push(p);
    }
    for (const [, arr] of byTech) {
      if (arr.length < 2) continue;
      L.polyline(
        arr.map((p) => [Number(p.lat), Number(p.lng)] as L.LatLngTuple),
        { color: "#FF6B1A", weight: 2, opacity: 0.5, dashArray: "4 4" },
      ).addTo(layer);
    }

    for (const t of techs) {
      if (t.last_lat == null || t.last_lng == null) continue;
      const live = isLive(t);
      const m = L.marker([Number(t.last_lat), Number(t.last_lng)], {
        icon: live ? techIcon : staleIcon,
      }).bindPopup(
        `<div style="font-family:system-ui;font-size:13px;color:#111;min-width:160px">
          <div style="font-weight:600">${t.name}</div>
          <div style="opacity:.7">${t.phone ?? ""}</div>
          <div style="margin-top:4px">${live ? "🟢 Live" : "⚪ Last seen"} ${fmtAgo(t.last_location_at)}</div>
          ${live ? `<div style="opacity:.7">Live until ${new Date(t.live_location_until!).toLocaleTimeString()}</div>` : ""}
        </div>`,
      );
      m.addTo(layer);
      bounds.push([Number(t.last_lat), Number(t.last_lng)]);
    }

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds).pad(0.3), { maxZoom: 13, animate: true });
    }
  }, [techs, pings]);

  const liveCount = useMemo(() => techs.filter(isLive).length, [techs]);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <MapPin className="h-4 w-4 text-[#FF6B1A]" />
          <h2 className="text-sm font-semibold">Technician live map</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/60">
          <Radio className="h-3.5 w-3.5 text-emerald-400" />
          <span>{liveCount} live · {techs.filter((t) => t.last_lat != null).length} total pinned</span>
        </div>
      </header>
      <div ref={mapEl} className="h-[420px] w-full overflow-hidden rounded-xl border border-white/10" />
      <p className="mt-2 text-xs text-white/40">
        Technicians share live location on WhatsApp (valid 8 hours). Trails show recent movement.
      </p>
    </section>
  );
}
