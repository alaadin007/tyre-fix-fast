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

type SendAttempt = {
  ok: boolean;
  channel: "whatsapp" | "sms";
  error?: string;
  code?: number | null;
  provider?: string | null;
  from_number?: string | null;
  to_number?: string | null;
};

async function sendWhatsApp(to: string, body: string, media_urls?: string[]): Promise<SendAttempt> {
  try {
    const r2 = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({ to, body, channel: "whatsapp", media_urls, provider_preference: "twilio" }),
    });
    const payload = await r2.json().catch(() => ({}));
    if (!r2.ok) console.error("twilio whatsapp send failed", payload);
    return {
      ok: r2.ok,
      channel: "whatsapp",
      error: payload?.error,
      code: payload?.code ?? payload?.status ?? null,
      provider: payload?.provider ?? "twilio",
      from_number: payload?.from_number ?? null,
      to_number: payload?.to_number ?? to,
    };
  } catch (e) {
    console.error("sendWhatsApp failed:", e);
    return { ok: false, channel: "whatsapp", error: String(e), provider: "twilio" };
  }
}

async function sendSMS(to: string, body: string): Promise<SendAttempt> {
  try {
    const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({ to, body: body.slice(0, 1500), channel: "sms" }),
    });
    const payload = await r.json().catch(() => ({}));
    if (!r.ok) console.error("twilio sms send failed", payload);
    return {
      ok: r.ok,
      channel: "sms",
      error: payload?.error,
      code: payload?.code ?? payload?.status ?? null,
      provider: payload?.provider ?? "twilio",
      from_number: payload?.from_number ?? null,
      to_number: payload?.to_number ?? to,
    };
  } catch (e) {
    console.error("sendSMS failed:", e);
    return { ok: false, channel: "sms", error: String(e), provider: "twilio" };
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
    const photos = (job.photo_urls ?? []).filter((u: string) => !!u).slice(0, 6);
    const msg =
      `🛞 New Tyre Fly job — ${job.postcode}\n` +
      `Issue: ${job.issue_type ?? "tyre"}${job.tyre_size ? ` · Size: ${job.tyre_size}` : ""}\n` +
      `Wheels: ${wheels}` +
      (job.vehicle_reg ? ` · Reg: ${job.vehicle_reg}` : "") +
      (job.issue_description ? `\nDetails: ${job.issue_description.slice(0, 280)}` : "") +
      mapsLink + "\n\n" +
      `Job ref: ${job.id.slice(0, 6)}\n` +
      `If you can take it, reply with:\n` +
      `1) Your 📍 live location (or postcode)\n` +
      `2) Your price £ and ETA in minutes\n` +
      `e.g. "Yes, £85, 25 mins" + share location pin.`;

    let sent = 0;
    const failures: string[] = [];
    const allocations: any[] = [];
    for (const t of techs) {
      // Use the phone the technician registered with (fallback to whatsapp field).
      const to = t.phone || t.whatsapp;
      if (!to) {
        failures.push(`${t.name ?? t.id}: no signup number saved`);
        continue;
      }
      const wa = await sendWhatsApp(to, msg, photos);
      const smsBody =
        `🛞 Tyre Fly job ${job.id.slice(0, 6)} · ${job.postcode}\n` +
        `${job.issue_type ?? "tyre"}${job.tyre_size ? ` · ${job.tyre_size}` : ""} · ${wheels}` +
        (job.vehicle_reg ? ` · ${job.vehicle_reg}` : "") +
        (job.lat != null && job.lng != null ? `\nMap: https://maps.google.com/?q=${job.lat},${job.lng}` : "") +
        `\nIf WhatsApp doesn’t load, reply to this SMS with your postcode + price £ + ETA mins.`;
      const sms = wa.ok ? { ok: false, channel: "sms" as const } : await sendSMS(to, smsBody);
      const ok = wa.ok || sms.ok;
      if (ok) sent++;
      if (!ok) {
        failures.push(
          `${t.name ?? t.id}: WA ${wa.code ?? "fail"}${wa.error ? ` (${wa.error})` : ""}; SMS ${sms.code ?? "fail"}${sms.error ? ` (${sms.error})` : ""}`,
        );
      }
      allocations.push({
        job_id,
        technician_id: t.id,
        status: ok ? "broadcast" : "send_failed",
        ai_reasoning:
          (mode === "all" ? "manual broadcast (all)" : "manual broadcast (specific)") +
          ` · to=${to}` +
          ` wa=${wa.ok ? "ok" : `fail:${wa.code ?? "unknown"}`}` +
          ` sms=${sms.ok ? "ok" : wa.ok ? "skip" : `fail:${sms.code ?? "unknown"}`}`,
      });
    }

    if (allocations.length > 0) {
      await supabase.from("job_allocations").insert(allocations);
    }

    if (sent === 0) {
      await supabase.from("ops_alerts").insert({
        level: "error",
        title: `Broadcast failed (${mode})`,
        body: `No technician messages were delivered for job ${job_id.slice(0, 8)}. ${failures.slice(0, 3).join(" | ")}`,
        job_id,
      });

      return new Response(JSON.stringify({
        error: "No technician messages were delivered. The technician numbers were used, but the current message sender configuration rejected both WhatsApp and SMS.",
        sent,
        total: techs.length,
        failures,
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    return new Response(JSON.stringify({ ok: true, sent, total: techs.length, failures }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("broadcast-job error:", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
