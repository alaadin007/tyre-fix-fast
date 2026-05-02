// Agent 5 — Review & Close Agent (driven by scheduled_tasks)
// Runs every minute via pg_cron. Processes due tasks: review_request + silence_check.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function send(to: string, body: string) {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-send`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ to, body, channel: "sms" }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: due } = await supabase
      .from("scheduled_tasks")
      .select("*")
      .eq("done", false)
      .lte("run_at", new Date().toISOString())
      .limit(50);

    const results: any[] = [];

    for (const t of due ?? []) {
      try {
        if (t.kind === "review_request") {
          const { job_id } = t.payload as any;
          const { data: job } = await supabase
            .from("jobs")
            .select("*")
            .eq("id", job_id)
            .maybeSingle();
          if (job && job.status === "confirmed") {
            await supabase
              .from("jobs")
              .update({ status: "closed_pending_review" })
              .eq("id", job_id);
            await send(
              job.customer_phone,
              `Hi ${job.customer_name}, how was your tyre service today? Reply 1–5 (5 = great).`,
            );
          }
        } else if (t.kind === "silence_check") {
          const { job_id, technician_id } = t.payload as any;
          // If the job is still 'confirmed' (not progressed to closed/review), check tech messages
          const { data: job } = await supabase
            .from("jobs")
            .select("*")
            .eq("id", job_id)
            .maybeSingle();
          if (job && job.status === "confirmed") {
            const { data: tech } = await supabase
              .from("technicians")
              .select("phone, name")
              .eq("id", technician_id)
              .maybeSingle();
            if (tech) {
              const { data: recent } = await supabase
                .from("sms_messages")
                .select("id")
                .eq("from_number", tech.phone)
                .gte("created_at", new Date(Date.now() - 60 * 60_000).toISOString())
                .limit(1);
              if (!recent || recent.length === 0) {
                await supabase.from("ops_alerts").insert({
                  level: "warn",
                  title: "Technician silent past ETA",
                  body: `${tech.name} hasn't messaged on job ${job_id.slice(0, 6)} (${job.postcode}). Consider re-dispatch.`,
                  job_id,
                });
              }
            }
          }
        }

        await supabase.from("scheduled_tasks").update({ done: true }).eq("id", t.id);
        results.push({ id: t.id, kind: t.kind, ok: true });
      } catch (e) {
        console.error("task error", t.id, e);
        results.push({ id: t.id, ok: false, error: String(e) });
      }
    }

    // Aggregate technician ratings + suspend low performers (last 30 days)
    const { data: recentReviews } = await supabase
      .from("reviews")
      .select("technician_id, score")
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString());
    const byTech: Record<string, number[]> = {};
    for (const r of recentReviews ?? []) {
      if (!r.technician_id) continue;
      (byTech[r.technician_id] ||= []).push(r.score);
    }
    for (const [techId, scores] of Object.entries(byTech)) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      await supabase
        .from("technicians")
        .update({ rating: Math.round(avg * 10) / 10 })
        .eq("id", techId);
      const last5 = scores.slice(-5);
      const last5Avg = last5.reduce((a, b) => a + b, 0) / last5.length;
      if (last5.length >= 5 && last5Avg < 3.5) {
        await supabase.from("ops_alerts").insert({
          level: "warn",
          title: "Technician below quality threshold",
          body: `Technician ${techId.slice(0, 6)} averaging ${last5Avg.toFixed(1)}★ over last 5 jobs.`,
        });
      }
      const last3 = scores.slice(-3);
      if (last3.length >= 3 && last3.every((s) => s < 3)) {
        await supabase.from("technicians").update({ active: false }).eq("id", techId);
        await supabase.from("ops_alerts").insert({
          level: "critical",
          title: "Technician auto-suspended",
          body: `Tech ${techId.slice(0, 6)} suspended after 3 consecutive sub-3★ reviews.`,
        });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scheduled-tasks-runner error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
