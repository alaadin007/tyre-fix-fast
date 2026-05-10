// Broadcast a job to a set of technicians via WhatsApp (with SMS fallback).
// POST { job_id: uuid, mode: "all" | "specific", technician_ids?: uuid[] }
// - mode "all": every active + approved technician
// - mode "specific": only the technician_ids provided
// Sends a job summary, records job_allocations rows, updates job status to 'broadcasting'.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  job_id: z.string().uuid(),
  mode: z.enum(["all", "specific"]),
  technician_ids: z.array(z.string().uuid()).optional(),
});

async function sendMsg(to: string, body: string, media_urls?: string[]) {
  try {
    // Prefer Meta direct so we can attach images; fall back to twilio-send for text-only.
    if (media_urls && media_urls.length > 0) {
      const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-meta-send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ to, body, media_urls }),
      });
      if (r.ok) return true;
      console.error("meta send w/ media failed, falling back to text", await r.text());
    }
    const r2 = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({ to, body, channel: "whatsapp" }),
    });
    return r2.ok;
  } catch (e) {
    console.error("sendMsg failed:", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { job_id, mode, technician_ids } = parsed.data;
    if (mode === "specific" && (!technician_ids || technician_ids.length === 0)) {
      return new Response(JSON.stringify({ error: "technician_ids required for mode=specific" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: job, error: jErr } = await supabase
      .from("jobs")
      .select("id, customer_name, postcode, issue_type, issue_description, vehicle_reg, tyre_size, affected_wheels, photo_urls, lat, lng")
      .eq("id", job_id)
      .single();
    if (jErr || !job) throw new Error("Job not found");

    let q = supabase
      .from("technicians")
      .select("id, name, phone, whatsapp, active, approval_status")
      .eq("active", true)
      .eq("approval_status", "approved");
    if (mode === "specific") q = q.in("id", technician_ids!);

    const { data: techs, error: tErr } = await q;
    if (tErr) throw tErr;
    if (!techs || techs.length === 0) {
      return new Response(JSON.stringify({ error: "No matching technicians" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const wheels = (job.affected_wheels ?? []).join(", ") || "—";
    const mapsLink = (job.lat != null && job.lng != null)
      ? `\n📍 https://maps.google.com/?q=${job.lat},${job.lng}`
      : "";
    const photoLine = (job.photo_urls && job.photo_urls.length > 0)
      ? `\n📸 ${job.photo_urls[0]}`
      : "";
    const msg =
      `🛞 New Tyre Fly job — ${job.postcode}\n` +
      `Issue: ${job.issue_type ?? "tyre"}${job.tyre_size ? ` · Size: ${job.tyre_size}` : ""}\n` +
      `Wheels: ${wheels}` +
      (job.vehicle_reg ? ` · Reg: ${job.vehicle_reg}` : "") +
      (job.issue_description ? `\nDetails: ${job.issue_description.slice(0, 280)}` : "") +
      mapsLink + photoLine + "\n\n" +
      `Reply ACCEPT ${job.id.slice(0, 6)} <price> <eta-mins> to claim it.`;

    let sent = 0;
    const allocations: any[] = [];
    for (const t of techs) {
      const to = t.whatsapp || t.phone;
      if (!to) continue;
      const ok = await sendMsg(to, msg);
      if (ok) sent++;
      allocations.push({
        job_id,
        technician_id: t.id,
        status: ok ? "broadcasted" : "send_failed",
        ai_reasoning: mode === "all" ? "manual broadcast (all)" : "manual broadcast (specific)",
      });
    }

    if (allocations.length > 0) {
      await supabase.from("job_allocations").insert(allocations);
    }

    await supabase.from("jobs").update({
      status: "broadcasting",
      broadcast_count: sent,
      updated_at: new Date().toISOString(),
    }).eq("id", job_id);

    await supabase.from("ops_alerts").insert({
      level: "info",
      title: `Broadcast sent (${mode})`,
      body: `Sent to ${sent}/${techs.length} technicians for job ${job_id.slice(0, 8)}.`,
      job_id,
    });

    return new Response(JSON.stringify({ ok: true, sent, total: techs.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("broadcast-job error:", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
