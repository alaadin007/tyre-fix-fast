import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ConsoleJob, ConsoleTech } from "@/hooks/useConsoleData";

const jobIcon = L.divIcon({
  className: "",
  html: `<div style="background:hsl(var(--primary));border:2px solid white;border-radius:9999px;width:18px;height:18px;box-shadow:0 0 0 4px hsl(var(--primary)/0.25)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});
const techIcon = L.divIcon({
  className: "",
  html: `<div class="tf-pulse" style="background:#3b82f6;border:2px solid white;border-radius:9999px;width:16px;height:16px"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

type Props = {
  jobs: ConsoleJob[];
  techs: ConsoleTech[];
  onJobClick?: (id: string) => void;
};

export default function ConsoleMap({ jobs, techs, onJobClick }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { zoomControl: true }).setView([51.5074, -0.1278], 11);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap © CARTO",
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const bounds: L.LatLngTuple[] = [];

    for (const j of jobs) {
      if (j.lat == null || j.lng == null) continue;
      const m = L.marker([Number(j.lat), Number(j.lng)], { icon: jobIcon }).bindPopup(
        `<div style="font-family:system-ui;font-size:13px;color:#111;min-width:160px">
          <div style="font-weight:600">${j.postcode}</div>
          <div style="opacity:.7">${j.issue_type}</div>
          <div style="margin-top:4px">${j.customer_name}</div>
          <a href="#" data-job="${j.id}" style="display:inline-block;margin-top:6px;color:hsl(var(--primary));font-weight:600">Open dispatch →</a>
        </div>`,
      );
      m.on("popupopen", (e) => {
        const popup = e.popup.getElement();
        popup?.querySelector("[data-job]")?.addEventListener("click", (ev) => {
          ev.preventDefault();
          onJobClick?.(j.id);
        });
      });
      m.addTo(layer);
      bounds.push([Number(j.lat), Number(j.lng)]);
    }

    for (const t of techs) {
      if (t.last_lat == null || t.last_lng == null) continue;
      L.marker([Number(t.last_lat), Number(t.last_lng)], { icon: techIcon })
        .bindPopup(
          `<div style="font-family:system-ui;font-size:13px;color:#111;min-width:160px">
            <div style="font-weight:600">${t.name}</div>
            <div style="opacity:.7">${t.vehicle ?? ""}</div>
            <div>⭐ ${(t.rating ?? 5).toFixed(1)}</div>
          </div>`,
        )
        .addTo(layer);
      bounds.push([Number(t.last_lat), Number(t.last_lng)]);
    }

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds).pad(0.3), { maxZoom: 13, animate: true });
    }
  }, [jobs, techs, onJobClick]);

  return <div ref={elRef} className="h-full w-full" />;
}
