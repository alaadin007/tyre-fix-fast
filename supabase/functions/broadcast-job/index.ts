// Broadcast a job to a set of technicians via WhatsApp (with SMS fallback).
// POST { job_id: uuid, mode: "all" | "specific", technician_ids?: uuid[] }
// - mode "all": every active + approved technician
// - mode "specific": only the technician_ids provided
// Sends a job summary, records job_allocations rows, updates job status to 'broadcasting'.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { shortenUrl } from "../_shared/short-link.ts";

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
      body: JSON.stringify({ to, body, channel: "whatsapp", media_urls, provider_preference: "auto" }),
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

async function sendWhatsAppTemplate(
  to: string,
  template: {
    name: string;
    language: string;
    body_params: string[];
    header_image_url?: string;
  },
): Promise<SendAttempt> {
  try {
    const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-meta-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ to, template }),
    });
    const payload = await r.json().catch(() => ({}));
    if (!r.ok) console.error("meta template send failed", payload);
    return {
      ok: r.ok,
      channel: "whatsapp",
      error: payload?.error,
      code: payload?.status ?? null,
      provider: "meta",
      from_number: null,
      to_number: to,
    };
  } catch (e) {
    console.error("sendWhatsAppTemplate failed:", e);
    return { ok: false, channel: "whatsapp", error: String(e), provider: "meta" };
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
      .select("id, customer_name, postcode, issue_type, issue_description, damage_summary, damage_type, tyre_size, tyre_brand, tyre_type, tread_condition, wheel_type, vehicle_reg, affected_wheels, photo_urls, lat, lng")
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

    const wheels = (job.affected_wheels ?? []).join(", ") || "Not specified";
    const photos = (job.photo_urls ?? []).filter((u: string) => !!u);
    const photo1Raw = photos[0] || "https://placehold.co/600x400/png?text=No+Photo";
    const photo2Raw = photos[1] || "";
    const mapsLinkRaw = (job.lat != null && job.lng != null)
      ? `https://maps.google.com/?q=${job.lat},${job.lng}`
      : "";

    // Shorten long URLs so the WhatsApp template body stays tidy.
    const [photo1, photo2, mapsLink] = await Promise.all([
      shortenUrl(photo1Raw, { kind: "tech_job_photo", job_id }),
      photo2Raw ? shortenUrl(photo2Raw, { kind: "tech_job_photo", job_id }) : Promise.resolve("No second photo"),
      mapsLinkRaw ? shortenUrl(mapsLinkRaw, { kind: "tech_job_map", job_id }) : Promise.resolve("Location pending"),
    ]);


    // Build a rich Details block combining what the customer told us with the
    // AI's photo-based assessment, so the technician has full context before
    // quoting a price.
    const customerSaid = (job.issue_description?.trim()) || job.issue_type || "";
    const aiSaid = (job.damage_summary?.trim()) || "";
    const tyreSpec = [job.tyre_size, job.tyre_brand, job.tyre_type, job.tread_condition, job.wheel_type]
      .filter((v) => !!v && String(v).trim().length > 0)
      .join(" · ");
    const detailParts: string[] = [];
    if (customerSaid) detailParts.push(`Customer: ${customerSaid}`);
    if (aiSaid) detailParts.push(`AI assessment: ${aiSaid}`);
    if (tyreSpec) detailParts.push(`Tyre: ${tyreSpec}`);
    const details = detailParts.length > 0
      ? detailParts.join(" — ")
      : "No additional details";

    const reg = job.vehicle_reg?.trim() || "Not provided";
    const postcode = job.postcode?.trim() || "Not provided";
    const jobRef = job.id.slice(0, 6);

    // Template body variables (mapped to new_job_alert_to_technician):
    // {{1}}=Job Ref, {{2}}=Vehicle Reg, {{3}}=Wheels, {{4}}=Details,
    // {{5}}=Postcode, {{6}}=Map Link, {{7}}=Photo 1, {{8}}=Photo 2
    const body_params = [jobRef, reg, wheels, details, postcode, mapsLink, photo1, photo2];

    // Plain-text fallback for SMS / Twilio path (best-effort, not used for Meta template).
    const msg =
      `🆕 New Tyre Job Available\n` +
      `🔖 Job Ref: ${jobRef}\n\n` +
      `🚘 Vehicle Reg: ${reg}\n` +
      `🛞 Wheels: ${wheels}\n\n` +
      `📝 Details: ${details}\n\n` +
      `📮 Postcode: ${postcode}\n` +
      `🗺️ Map: ${mapsLink}\n\n` +
      `📷 Photo 1: ${photo1}\n` +
      `📷 Photo 2: ${photo2}\n\n` +
      `Reply with: "Yes, £85, 25 mins" + share location pin.`;

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
      // Send via approved Meta WhatsApp template — works even outside the 24h window.
      const wa = await sendWhatsAppTemplate(to, {
        name: "new_job_alert_to_technician",
        language: "en_GB",
        body_params,
        header_image_url: photo1,
      });
      // If Meta template fails, fall back to plain Twilio session message (may not deliver outside 24h).
      const finalRes = wa.ok ? wa : await sendWhatsApp(to, msg, photos.slice(0, 6));
      const ok = finalRes.ok;
      if (ok) sent++;
      if (!ok) {
        failures.push(
          `${t.name ?? t.id}: WhatsApp ${finalRes.code ?? "fail"}${finalRes.error ? ` (${finalRes.error})` : ""}`,
        );
      }
      allocations.push({
        job_id,
        technician_id: t.id,
        status: ok ? "broadcast" : "send_failed",
        ai_reasoning:
          (mode === "all" ? "manual broadcast (all)" : "manual broadcast (specific)") +
          ` · template=new_job_alert_to_technician to=${to}` +
          ` meta=${wa.ok ? "ok" : `fail:${wa.code ?? "unknown"}`}` +
          (wa.ok ? "" : ` twilio=${finalRes.ok ? "ok" : `fail:${finalRes.code ?? "unknown"}`}`),
      });
    }

    if (allocations.length > 0) {
      await supabase.from("job_allocations").insert(allocations);
    }

    if (sent === 0) {
      await supabase.from("ops_alerts").insert({
        level: "error",
        title: `Broadcast failed (${mode})`,
        body: `No technician WhatsApp messages were delivered for job ${job_id.slice(0, 8)}. ${failures.slice(0, 3).join(" | ")}`,
        job_id,
      });

      const isRegion = failures.some((f) => /Region capability/i.test(f));
      return new Response(JSON.stringify({
        ok: false,
        fallback: true,
        error: isRegion
          ? "WhatsApp rejected: your Twilio sender isn't enabled to message UK numbers. Enable UK in Twilio → Messaging → Geo Permissions (and ensure the WhatsApp sender is approved for GB)."
          : "No technician WhatsApp messages were delivered.",
        sent,
        total: techs.length,
        failures,
      }), {
        status: 200,
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
