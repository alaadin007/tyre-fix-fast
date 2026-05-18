// Agent 2 — Dispatch Agent
// Triggered when a job becomes 'intake_complete' (or by cron sweep for phase 2/3 widening).
// Picks matching active technicians and broadcasts SMS via Twilio.
// Honors app_settings.auto_dispatch (false = create proposed allocations only, admin approves manually).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PHASE_DEADLINES_MIN = [15, 15]; // broadcast window
const QUOTE_TARGET_SECONDS = 60; // soft target — we ask techs to reply within 60s
// Launch mode: broadcast to ALL approved+active technicians regardless of postcode.
// We'll narrow this back to a tiered/proximity dispatch once we have enough coverage.
const BROADCAST_TO_ALL = true;
const PHASE1_TIER_SIZE = 999;
const PHASE2_TIER_SIZE = 999;
const HARD_CAP_PER_JOB = 500;

type Tech = {
  id: string;
  name: string;
  phone: string;
  service_postcodes: string[] | null;
  rating: number | null;
  jobs_completed: number | null;
  active: boolean;
};

type Job = {
  id: string;
  postcode: string;
  issue_type: string;
  customer_name: string;
  damage_summary: string | null;
  dispatch_phase: number;
  broadcast_count: number;
  status: string;
};

function neighbourOutwards(outward: string): string[] {
  // Cheap "widen radius" — try numerically adjacent outward codes (e.g. W12 -> W11/W13)
  const m = outward.match(/^([A-Z]+)(\d+)([A-Z]?)$/i);
  if (!m) return [outward];
  const [, area, num] = m;
  const n = parseInt(num, 10);
  const set = new Set<string>([outward.toUpperCase()]);
  for (const d of [-1, 1, -2, 2]) {
    const v = n + d;
    if (v > 0) set.add(`${area.toUpperCase()}${v}`);
  }
  return Array.from(set);
}

function scoreTech(t: Tech, outwards: string[]): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];
  const techCodes = (t.service_postcodes ?? []).map((p) => p.toUpperCase());
  const covers = outwards.some((o) =>
    techCodes.some((p) => o.startsWith(p) || p.startsWith(o)),
  );
  if (covers) {
    score += 50;
    reasons.push(`covers ${outwards[0]}`);
  }
  score += Number(t.rating ?? 0) * 5;
  reasons.push(`★${t.rating ?? "n/a"}`);
  score += Math.min(Number(t.jobs_completed ?? 0), 20);
  reasons.push(`${t.jobs_completed ?? 0} jobs`);
  return { score, reason: reasons.join(" · ") };
}

async function sendSMS(supabase: any, tech: Tech, job: any) {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-send`;
  const wheelsTxt = (job.affected_wheels && job.affected_wheels.length > 0)
    ? ` Wheel(s): ${job.affected_wheels.join(", ")}.`
    : "";
  const sizeTxt = job.tyre_size ? ` Size: ${job.tyre_size}.` : "";
  const isBlowout = (job.issue_type || "").toLowerCase().includes("blow") ||
    (job.damage_type || "").toLowerCase().includes("blow") ||
    (job.damage_type || "").toLowerCase().includes("sidewall");

  const blurb = job.damage_summary ? job.damage_summary.slice(0, 80) + ". " : "";
  const ask = isBlowout
    ? `Reply within 60s with: 1) free now? (Y/N), 2) ETA mins, 3) callout £, 4) replacement tyre? new/used + price (or none).`
    : `Reply within 60s with: 1) free now? (Y/N), 2) ETA mins, 3) callout £ (extras separate if needed).`;

  const msg = `Tyre Fly job: ${job.issue_type} in ${job.postcode}.${wheelsTxt}${sizeTxt} ${blurb}${ask} Also share your 📍live location (8 hours) so we can route you and other jobs nearby. Job#${job.id.slice(0, 6)}`;

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ to: tech.phone, body: msg, channel: "whatsapp" }),
  });
  const ok = r.ok;
  if (!ok) console.error("WA send failed for", tech.phone, await r.text());
  return ok;
}

async function dispatchOne(supabase: any, job: Job, phase: 1 | 2) {
  // NOTE: We always auto-SMS the shortlisted technicians to collect quotes in
  // parallel. The admin approval gate is on the CUSTOMER side — quotes land
  // as `pending` and the admin clicks Approve to forward the chosen quote
  // (and trigger the £20 payment link) to the customer.

  // Find matching techs: must be active, approved, and currently available
  // (either "available now" toggle, or within today's weekly schedule).
  const { data: techsRaw } = await supabase
    .from("technicians")
    .select("*")
    .eq("active", true)
    .eq("approval_status", "approved");
  const now = new Date();
  const dayKey = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][now.getUTCDay()];
  const hhmm = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;
  const techs = ((techsRaw ?? []) as Tech[]).filter((t: any) => {
    if (BROADCAST_TO_ALL) return true; // launch mode: ping every approved+active tech
    if (t.availability_now) {
      if (!t.available_until) return true;
      return new Date(t.available_until).getTime() > now.getTime();
    }
    const slot = (t.weekly_schedule || {})[dayKey];
    if (slot && slot.start && slot.end) {
      return hhmm >= slot.start && hhmm <= slot.end;
    }
    return false;
  });

  const outward = (job.postcode.split(" ")[0] || job.postcode).toUpperCase();
  const outwards = phase === 1 ? [outward] : neighbourOutwards(outward);
  const tierSize = phase === 1 ? PHASE1_TIER_SIZE : PHASE2_TIER_SIZE;

  // Exclude already-broadcast techs for this job
  const { data: existing } = await supabase
    .from("job_allocations")
    .select("technician_id")
    .eq("job_id", job.id);
  const already = new Set((existing ?? []).map((a: any) => a.technician_id));

  const scored = techs
    .filter((t) => !already.has(t.id))
    .map((t) => ({ tech: t, ...scoreTech(t, outwards) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, tierSize);

  // Hard cap
  const remainingCap = HARD_CAP_PER_JOB - (job.broadcast_count ?? 0);
  const toBroadcast = scored.slice(0, Math.max(0, remainingCap));

  let sent = 0;
  for (const { tech, score, reason } of toBroadcast) {
    await supabase.from("job_allocations").insert({
      job_id: job.id,
      technician_id: tech.id,
      ai_reasoning: `Phase ${phase} · ${reason}`,
      match_score: score,
      status: "broadcast",
    });
    const ok = await sendSMS(supabase, tech, job);
    if (ok) sent++;
  }

  // Update job phase + deadline. Job stays in `broadcasting` while we wait
  // for technician quotes. Once a quote arrives the admin reviews and
  // approves before anything is sent to the customer.
  const deadlineMin = PHASE_DEADLINES_MIN[phase - 1] ?? 8;
  const newDeadline = new Date(Date.now() + deadlineMin * 60_000).toISOString();
  await supabase
    .from("jobs")
    .update({
      status: "broadcasting",
      dispatch_phase: phase,
      dispatch_deadline: newDeadline,
      broadcast_count: (job.broadcast_count ?? 0) + sent,
    })
    .eq("id", job.id);

  return { phase, candidates: scored.length, sent };
}

async function escalate(supabase: any, job: Job) {
  await supabase.from("jobs").update({ status: "no_response" }).eq("id", job.id);
  await supabase.from("ops_alerts").insert({
    level: "warn",
    title: "No technician responded",
    body: `Job ${job.id.slice(0, 6)} in ${job.postcode} (${job.issue_type}) had no quotes after 16 min. Manual intervention needed.`,
    job_id: job.id,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const mode = body.mode ?? "single"; // 'single' | 'sweep'

    if (mode === "sweep") {
      // Cron-driven: find jobs whose dispatch_deadline has passed
      const { data: due } = await supabase
        .from("jobs")
        .select("*")
        .in("status", ["broadcasting", "awaiting_approval", "intake_complete"])
        .lt("dispatch_deadline", new Date().toISOString());

      const results: any[] = [];
      for (const job of (due ?? []) as Job[]) {
        // Has it received a quote already?
        const { count } = await supabase
          .from("quotes")
          .select("*", { count: "exact", head: true })
          .eq("job_id", job.id);
        if ((count ?? 0) > 0) continue; // someone responded — leave it

        const nextPhase = (job.dispatch_phase || 1) + 1;
        if (nextPhase >= 3) {
          await escalate(supabase, job);
          results.push({ job: job.id, action: "escalated" });
        } else {
          const r = await dispatchOne(supabase, job, 2);
          results.push({ job: job.id, ...r });
        }
      }
      return new Response(JSON.stringify({ swept: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Single job mode (DB trigger or manual call)
    const jobId = body.job_id;
    if (!jobId) {
      return new Response(JSON.stringify({ error: "job_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: jobRow, error: jErr } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();
    if (jErr || !jobRow) {
      return new Response(JSON.stringify({ error: "job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // IMPORTANT: At job-post stage we ONLY notify admins. Technicians are
    // NOT broadcast automatically — admin reviews the job first and then
    // triggers a manual broadcast (see broadcast-job / manual-dispatch).
    const result = { phase: 0, candidates: 0, sent: 0, admin_only: true };

    // Mark the job as awaiting admin review so it shows up in the admin queue.
    await supabase
      .from("jobs")
      .update({ status: "awaiting_approval", updated_at: new Date().toISOString() })
      .eq("id", jobId);

    // Notify master admins on WhatsApp about this fresh job using the
    // Meta-approved template `new_job_posted_alert` (so delivery is NOT
    // restricted by the 24h conversation window). The template carries the
    // first photo in its header; remaining photos are sent as best-effort
    // follow-up images (delivered only if the admin's 24h session is open).
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-admins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ event: "new_job_posted", job_id: jobId }),
      });
    } catch (e) {
      console.error("admin notify failed", e);
    }

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dispatch-agent error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
