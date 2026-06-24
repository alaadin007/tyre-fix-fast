import type { DashJob, DashTech, DashQuote, DashAllocation } from "@/hooks/useDashboardData";

export function outwardCode(postcode: string | null | undefined): string {
  if (!postcode) return "";
  return (postcode.split(" ")[0] || postcode).toUpperCase();
}

/** Mirror of dispatch-agent.scoreTech postcode-cover logic. */
export function coversPostcode(tech: DashTech, jobPostcode: string | null | undefined): boolean {
  const out = outwardCode(jobPostcode);
  if (!out) return false;
  const techCodes = (tech.service_postcodes ?? []).map((p) => p.toUpperCase());
  return techCodes.some((p) => out.startsWith(p) || p.startsWith(out));
}

/** availability_now (within available_until) OR weekly_schedule slot (UTC). */
export function isAvailableNow(tech: DashTech & { weekly_schedule?: any }): boolean {
  const now = new Date();
  if (tech.availability_now) {
    if (!tech.available_until) return true;
    return new Date(tech.available_until).getTime() > now.getTime();
  }
  const dayKey = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][now.getUTCDay()];
  const slot = (tech.weekly_schedule || {})[dayKey];
  if (slot?.start && slot?.end) {
    const hhmm = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;
    return hhmm >= slot.start && hhmm <= slot.end;
  }
  return false;
}

/** Haversine distance in miles. */
export function distanceMiles(
  a: { lat: number | null; lng: number | null },
  b: { lat: number | null; lng: number | null },
): number | null {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export type TechMatch = {
  tech: DashTech;
  covers: boolean;
  available: boolean;
  distance: number | null;
  alreadyBroadcast: boolean;
  acceptedJobs: number;
  cancelledJobs: number;
  score: number;
};

export function rankMatches(
  job: DashJob,
  techs: DashTech[],
  allocations: DashAllocation[],
  quotes: DashQuote[],
): TechMatch[] {
  const allocForJob = new Set(
    allocations.filter((a) => a.job_id === job.id).map((a) => a.technician_id ?? ""),
  );
  const byTech = (id: string) => quotes.filter((q) => q.technician_id === id);
  const out = techs
    .filter((t) => t.active && t.approval_status === "approved")
    .filter((t) => coversPostcode(t, job.postcode))
    .map((t) => {
      const covers = true;
      const available = isAvailableNow(t);
      const tQuotes = byTech(t.id);
      const acceptedJobs = tQuotes.filter((q) => q.status === "accepted").length;
      const cancelledJobs = tQuotes.filter((q) => q.status === "lost" || q.status === "cancelled").length;
      let score = 0;
      if (covers) score += 50;
      if (available) score += 20;
      score += Number(t.rating ?? 0) * 5;
      score += Math.min(Number(t.jobs_completed ?? 0), 20);
      return {
        tech: t,
        covers,
        available,
        distance: null,
        alreadyBroadcast: allocForJob.has(t.id),
        acceptedJobs,
        cancelledJobs,
        score,
      };
    });
  out.sort((a, b) => {
    if (a.covers !== b.covers) return a.covers ? -1 : 1;
    if (a.available !== b.available) return a.available ? -1 : 1;
    return b.score - a.score;
  });
  return out;
}
