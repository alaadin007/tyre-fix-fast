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

// ---- Demo seed ---------------------------------------------------------
const now = Date.now();
const m = (mins: number) => new Date(now - mins * 60_000).toISOString();

const DEMO_TECHS: ConsoleTech[] = [
  { id: "t1", name: "Sam Patel",   rating: 4.9, vehicle: "Ford Transit", last_lat: 51.5074, last_lng: -0.1278, active: true },
  { id: "t2", name: "Aisha Khan",  rating: 4.8, vehicle: "VW Caddy",     last_lat: 51.5155, last_lng: -0.0922, active: true },
  { id: "t3", name: "Marco Rossi", rating: 4.7, vehicle: "Mercedes Vito",last_lat: 51.4934, last_lng: -0.1500, active: true },
  { id: "t4", name: "Leo Wright",  rating: 5.0, vehicle: "Renault Trafic",last_lat: 51.5413, last_lng: -0.1430, active: true },
];

const DEMO_JOBS: ConsoleJob[] = [
  { id: "d1", postcode: "W5 3HN",   customer_name: "Hannah B.",  customer_phone: "+447700900111", issue_type: "puncture",     issue_description: "Slow flat front-left, nail visible.", status: "pending",      created_at: m(2),  lat: 51.5095, lng: -0.3000, photo_urls: [] },
  { id: "d2", postcode: "SW1A 1AA", customer_name: "James O.",   customer_phone: "+447700900222", issue_type: "blowout",      issue_description: "Hit pothole, sidewall blown.",       status: "pending",      created_at: m(7),  lat: 51.5010, lng: -0.1416, photo_urls: [] },
  { id: "d3", postcode: "E14 5AB",  customer_name: "Priya R.",   customer_phone: "+447700900333", issue_type: "tyre change",  issue_description: "Two new tyres, 225/45 R17.",         status: "broadcasting", created_at: m(11), lat: 51.5045, lng: -0.0199, photo_urls: [] },
  { id: "d4", postcode: "N1 9GU",   customer_name: "Tom W.",     customer_phone: "+447700900444", issue_type: "locked wheel", issue_description: "Lost locking nut.",                   status: "in_progress",  created_at: m(18), lat: 51.5320, lng: -0.1050, photo_urls: [] },
  { id: "d5", postcode: "SE1 7PB",  customer_name: "Ola M.",     customer_phone: "+447700900555", issue_type: "puncture",     issue_description: "Rear-right, fitter en route.",       status: "in_progress",  created_at: m(24), lat: 51.5018, lng: -0.1146, photo_urls: [] },
  { id: "d6", postcode: "NW1 6XE",  customer_name: "Dani K.",    customer_phone: "+447700900666", issue_type: "puncture",     issue_description: "Job complete £85.",                  status: "paid",         created_at: m(46), lat: 51.5239, lng: -0.1330, photo_urls: [] },
];

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
export function useConsoleData(mode: ConsoleMode) {
  const [jobs, setJobs] = useState<ConsoleJob[]>([]);
  const [techs, setTechs] = useState<ConsoleTech[]>([]);

  useEffect(() => {
    if (mode === "demo") {
      setJobs(DEMO_JOBS);
      setTechs(DEMO_TECHS);
      return;
    }

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
  }, [mode]);

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
