import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DashJob = {
  id: string;
  postcode: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  issue_type: string | null;
  issue_description: string | null;
  damage_summary: string | null;
  damage_type: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  lat: number | null;
  lng: number | null;
  vehicle_reg: string | null;
  region: string | null;
  severity: string | null;
  photo_urls: string[] | null;
  assigned_technician_id: string | null;
  broadcast_count: number;
  platform_fee_status: string;
  platform_fee_paid_at: string | null;
  platform_fee_refunded_at: string | null;
  stripe_checkout_url: string | null;
  stripe_session_id: string | null;
  affected_wheels: string[] | null;
  tyre_size: string | null;
  tyre_brand: string | null;
  tyre_type: string | null;
  tyre_details: string | null;
  tread_condition: string | null;
  wheel_type: string | null;
};

export type DashQuote = {
  id: string;
  job_id: string | null;
  technician_id: string | null;
  price_gbp: number | null;
  eta_minutes: number | null;
  tyre_included: boolean | null;
  tyre_condition: string | null;
  status: string;
  created_at: string;
  raw_message: string | null;
};

export type DashAllocation = {
  id: string;
  job_id: string | null;
  technician_id: string | null;
  status: string;
  match_score: number | null;
  ai_reasoning: string | null;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
  quote_window_expires_at: string | null;
};

export type DashTech = {
  id: string;
  tech_code: string | null;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  active: boolean;
  approval_status: string;
  rating: number | null;
  jobs_completed: number;
  last_lat: number | null;
  last_lng: number | null;
  last_location_at: string | null;
  live_location_until: string | null;
  availability_now: boolean;
  available_until: string | null;
  vehicle: string | null;
  service_postcodes: string[] | null;
  notes: string | null;
  travel_radius_miles: number | null;
};

export function useDashboardData() {
  const [jobs, setJobs] = useState<DashJob[]>([]);
  const [quotes, setQuotes] = useState<DashQuote[]>([]);
  const [allocations, setAllocations] = useState<DashAllocation[]>([]);
  const [techs, setTechs] = useState<DashTech[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [{ data: j }, { data: q }, { data: a }, { data: t }] = await Promise.all([
        supabase.from("jobs").select(
          "id,postcode,customer_name,customer_phone,customer_email,issue_type,issue_description,damage_summary,damage_type,status,created_at,updated_at,lat,lng,vehicle_reg,region,severity,photo_urls,assigned_technician_id,broadcast_count,platform_fee_status,platform_fee_paid_at,platform_fee_refunded_at,stripe_checkout_url,stripe_session_id,affected_wheels,tyre_size,tyre_brand,tyre_type,tyre_details,tread_condition,wheel_type"
        ).order("created_at", { ascending: false }).limit(500),
        supabase.from("quotes").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("job_allocations").select("*").order("created_at", { ascending: false }).limit(1000),
        supabase.from("technicians").select(
          "id,tech_code,name,phone,whatsapp,email,active,approval_status,rating,jobs_completed,last_lat,last_lng,last_location_at,live_location_until,availability_now,available_until,vehicle,service_postcodes,notes,travel_radius_miles"
        ).limit(500),
      ]);
      if (!mounted) return;
      setJobs((j ?? []) as DashJob[]);
      setQuotes((q ?? []) as DashQuote[]);
      setAllocations((a ?? []) as DashAllocation[]);
      setTechs((t ?? []) as DashTech[]);
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel("admin-dash")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "job_allocations" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "technicians" }, (payload) => {
        const row = payload.new as Partial<DashTech> | null;
        if (payload.eventType === "UPDATE" && row?.id) {
          setTechs((prev) => prev.map((t) => (t.id === row.id ? { ...t, ...row } as DashTech : t)));
        } else {
          load();
        }
      })
      .subscribe();
    const id = setInterval(load, 30_000);
    return () => {
      mounted = false;
      clearInterval(id);
      supabase.removeChannel(ch);
    };
  }, []);

  return { jobs, quotes, allocations, techs, loading };
}

export function shortRef(id: string): string {
  return id.slice(0, 6).toUpperCase();
}

export function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export const FUNNEL_STAGES = [
  { key: "created", label: "Created", match: () => true },
  { key: "broadcasting", label: "Broadcasting", match: (j: DashJob) => ["broadcasting", "awaiting_approval", "intake_complete"].includes(j.status) },
  { key: "quoted", label: "Quoted", match: (_j: DashJob, q: DashQuote[]) => q.length > 0 },
  { key: "accepted", label: "Accepted", match: (j: DashJob) => ["accepted", "awaiting_payment", "in_progress", "completed", "paid"].includes(j.status) },
  { key: "in_progress", label: "In progress", match: (j: DashJob) => ["in_progress"].includes(j.status) },
  { key: "completed", label: "Completed", match: (j: DashJob) => ["completed", "paid"].includes(j.status) },
  { key: "paid", label: "Paid", match: (j: DashJob) => j.platform_fee_status === "paid" || j.status === "paid" },
];
