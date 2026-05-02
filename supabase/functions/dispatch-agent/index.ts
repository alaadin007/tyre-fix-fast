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

const PHASE_DEADLINES_MIN = [8, 8]; // phase1 -> 8 min, phase2 -> +8 min
const PHASE1_TIER_SIZE = 5;
const PHASE2_TIER_SIZE = 15;
const HARD_CAP_PER_JOB = 50;

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

async function sendSMS(supabase: any, tech: Tech, job: Job) {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-send`;
  const msg = `FlatTyreNearMe: New ${job.issue_type} job in ${job.postcode}. ${
    job.damage_summary ? job.damage_summary.slice(0, 80) + ". " : ""
  }Reply with PRICE & ETA (e.g. "70, 25 min") to bid. Job#${job.id.slice(0, 6)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ to: tech.phone, body: msg, channel: "sms" }),
  });
  const ok = r.ok;
  if (!ok) console.error("SMS send failed for", tech.phone, await r.text());
  return ok;
}

async function dispatchOne(supabase: any, job: Job, phase: 1 | 2) {
  // Get auto-dispatch setting
  const { data: setting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "auto_dispatch")
    .maybeSingle();
  const autoDispatch = setting?.value === true || setting?.value === "true";

  // Find matching techs
  const { data: techsRaw } = await supabase
    .from("technicians")
    .select("*")
    .eq("active", true);
  const techs = (techsRaw ?? []) as Tech[];

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
    const allocStatus = autoDispatch ? "broadcast" : "proposed";
    await supabase.from("job_allocations").insert({
      job_id: job.id,
      technician_id: tech.id,
      ai_reasoning: `Phase ${phase} · ${reason}`,
      match_score: score,
      status: allocStatus,
    });
    if (autoDispatch) {
      const ok = await sendSMS(supabase, tech, job);
      if (ok) sent++;
    }
  }

  // Update job phase + deadline
  const deadlineMin = PHASE_DEADLINES_MIN[phase - 1] ?? 8;
  const newDeadline = new Date(Date.now() + deadlineMin * 60_000).toISOString();
  await supabase
    .from("jobs")
    .update({
      status: autoDispatch ? "broadcasting" : "awaiting_approval",
      dispatch_phase: phase,
      dispatch_deadline: newDeadline,
      broadcast_count: (job.broadcast_count ?? 0) + sent,
    })
    .eq("id", job.id);

  return { phase, candidates: scored.length, sent, autoDispatch };
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
    const result = await dispatchOne(supabase, jobRow as Job, 1);
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
