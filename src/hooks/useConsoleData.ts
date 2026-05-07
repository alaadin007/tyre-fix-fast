import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ConsoleJob = {
  id: string;
  postcode: string;
  customer_name: string;
  customer_phone: string;
  issue_type: string;
  issue_description: string | null;
  status: string; // pending|intake_pending|broadcasting|awaiting_approval|accepted|in_progress|completed|paid|cancelled
  created_at: string;
  lat: number | null;
  lng: number | null;
  photo_urls?: string[];
  vehicle_reg?: string | null;
};

export type ConsoleTech = {
  id: string;
  name: string;
  rating: number | null;
  vehicle: string | null;
  last_lat: number | null;
  last_lng: number | null;
  active: boolean;
};

export type ConsoleMode = "demo" | "live";

// ---- Status grouping ---------------------------------------------------
export type Lane = "incoming" | "dispatched" | "in_progress" | "completed";
export const LANES: { key: Lane; label: string; dot: string }[] = [
  { key: "incoming",    label: "Incoming",    dot: "bg-sky-400" },
  { key: "dispatched",  label: "Dispatched",  dot: "bg-primary" },
  { key: "in_progress", label: "In progress", dot: "bg-emerald-400" },
  { key: "completed",   label: "Completed",   dot: "bg-white/30" },
];

export function laneFor(status: string): Lane {
  if (["pending", "intake_pending", "intake_complete", "awaiting_approval"].includes(status)) return "incoming";
  if (["broadcasting", "accepted", "awaiting_payment"].includes(status)) return "dispatched";
  if (["in_progress"].includes(status)) return "in_progress";
  return "completed"; // paid, completed, cancelled, superseded, declined…
}

// ---- Hook --------------------------------------------------------------
export function useConsoleData(_mode?: ConsoleMode) {
  const [jobs, setJobs] = useState<ConsoleJob[]>([]);
  const [techs, setTechs] = useState<ConsoleTech[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [{ data: js }, { data: ts }] = await Promise.all([
        supabase
          .from("jobs")
          .select("id,postcode,customer_name,customer_phone,issue_type,issue_description,status,created_at,lat,lng,photo_urls,vehicle_reg")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("technicians")
          .select("id,name,rating,vehicle,last_lat,last_lng,active")
          .eq("active", true),
      ]);
      if (!mounted) return;
      setJobs((js ?? []) as ConsoleJob[]);
      setTechs((ts ?? []) as ConsoleTech[]);
    };
    load();
    const ch = supabase
      .channel("console-data")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "technicians" }, load)
      .subscribe();
    const t = setInterval(load, 30_000);
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
      clearInterval(t);
    };
  }, []);

  return { jobs, techs, setJobs };
}

// Haversine distance in km
export function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function nearestTechs(job: ConsoleJob, techs: ConsoleTech[], n = 3) {
  if (job.lat == null || job.lng == null) return [];
  const here = { lat: job.lat, lng: job.lng };
  return techs
    .filter((t) => t.last_lat != null && t.last_lng != null)
    .map((t) => {
      const d = distKm(here, { lat: t.last_lat!, lng: t.last_lng! });
      return { tech: t, distanceKm: d, etaMin: Math.max(3, Math.round(d * 2.5)) };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, n);
}
