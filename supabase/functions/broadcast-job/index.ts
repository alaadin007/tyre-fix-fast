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

async function sendWhatsApp(to: string, body: string, jobId: string, media_urls?: string[]): Promise<SendAttempt> {
  try {
    const r2 = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({ to, body, channel: "whatsapp", media_urls, provider_preference: "auto", job_id: jobId }),
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
  jobId: string,
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
      body: JSON.stringify({ to, template, job_id: jobId }),
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

async function sendSMS(to: string, body: string, jobId: string): Promise<SendAttempt> {
  try {
    const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({ to, body: body.slice(0, 1500), channel: "sms", job_id: jobId }),
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
    // Issue Details block: include the customer's own described issue (captured
    // during intake) alongside the AI's photo-based assessment, so the technician
    // has full context before quoting a price.
    const customerDescribed = (job.issue_description?.trim()) || (job.issue_type?.trim()) || "";
    const aiSaid = (job.damage_summary?.trim()) || "";
    const detailParts: string[] = [];
    if (customerDescribed) detailParts.push(`Customer Described: ${customerDescribed}`);
    if (aiSaid) detailParts.push(`AI Assessment (based on Image Analysis): ${aiSaid}`);
    const details = detailParts.length > 0
      ? detailParts.join(" — ")
      : "No additional details";

    const reg = job.vehicle_reg?.trim() || "Not provided";
    const postcode = job.postcode?.trim() || "Not provided";
    const jobRef = job.id.slice(0, 6);

    // Template body variables (mapped to new_job_alert_to_technician):
    // {{1}}=Job Ref, {{2}}=Vehicle Reg, {{3}}=Wheels, {{4}}=Details,
    // {{5}}=Postcode, {{6}}=Map Link, {{7}}=Photo 1, {{8}}=Photo 2
    // Meta rejects template params that contain newlines, tabs, or 4+ consecutive
    // spaces with a 400 error. Sanitize every param so a single odd intake message
    // (e.g. a multi-line description) doesn't break the whole broadcast.
    const sanitizeParam = (v: string) =>
      String(v ?? "")
        .replace(/[\r\n\t]+/g, " ")
        .replace(/ {4,}/g, "   ")
        .trim();
    const body_params = [jobRef, reg, wheels, details, postcode, mapsLink, photo1, photo2]
      .map(sanitizeParam);

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
      `Reply with: price (£), ETA (mins) AND a fresh 📍live location pin for THIS job (tap 📎 → Location → Share live location). All 3 are required — quotes missing the live pin for this job won't be accepted.`;

    // 3-minute window for technician quote submissions.
    const QUOTE_WINDOW_SECONDS = 180;
    const QUOTE_WINDOW_MS = QUOTE_WINDOW_SECONDS * 1000;
    const windowExpiresIso = new Date(Date.now() + QUOTE_WINDOW_MS).toISOString();

    let sent = 0;
    let cleanSent = 0;
    let fallbackCount = 0;
    let failedCount = 0;
    const failures: string[] = [];
    const allocations: any[] = [];
    for (const t of techs) {
      // Use the phone the technician registered with (fallback to whatsapp field).
      const to = t.phone || t.whatsapp;
      if (!to) {
        failures.push(`${t.name ?? t.id}: no signup number saved`);
        failedCount++;
        allocations.push({
          job_id,
          technician_id: t.id,
          status: "send_failed",
          quote_window_expires_at: windowExpiresIso,
          broadcast_status: "failed",
          broadcast_error: "no signup number saved",
          ai_reasoning:
            (mode === "all" ? "manual broadcast (all)" : "manual broadcast (specific)") +
            " · no number on file",
        });
        continue;
      }
      // Send via approved Meta WhatsApp template — works even outside the 24h window.
      const wa = await sendWhatsAppTemplate(to, job_id, {
        name: "new_job_alert_to_technician",
        language: "en_GB",
        body_params,
        header_image_url: photo1Raw,
      });
      // If Meta template fails, fall back to plain Twilio session message (may not deliver outside 24h).
      const finalRes = wa.ok ? wa : await sendWhatsApp(to, msg, job_id, photos.slice(0, 6));
      const ok = finalRes.ok;
      if (ok) sent++;
      if (!ok) {
        failures.push(
          `${t.name ?? t.id}: WhatsApp ${finalRes.code ?? "fail"}${finalRes.error ? ` (${finalRes.error})` : ""}`,
        );
      }

      let broadcast_status: "sent" | "fallback_used" | "failed";
      let broadcast_error: string | null = null;
      if (wa.ok) {
        broadcast_status = "sent";
        cleanSent++;
      } else if (finalRes.ok) {
        broadcast_status = "fallback_used";
        broadcast_error = `meta ${wa.code ?? "fail"}${wa.error ? `: ${wa.error}` : ""}`;
        fallbackCount++;
      } else {
        broadcast_status = "failed";
        broadcast_error =
          `meta ${wa.code ?? "fail"}${wa.error ? `: ${wa.error}` : ""}` +
          ` | twilio ${finalRes.code ?? "fail"}${finalRes.error ? `: ${finalRes.error}` : ""}`;
        failedCount++;
      }

      allocations.push({
        job_id,
        technician_id: t.id,
        status: ok ? "broadcast" : "send_failed",
        quote_window_expires_at: windowExpiresIso,
        broadcast_status,
        broadcast_error,
        ai_reasoning:
          (mode === "all" ? "manual broadcast (all)" : "manual broadcast (specific)") +
          ` · template=new_job_alert_to_technician to=${to}` +
          ` meta=${wa.ok ? "ok" : `fail:${wa.code ?? "unknown"}`}` +
          (wa.ok ? "" : ` twilio=${finalRes.ok ? "ok" : `fail:${finalRes.code ?? "unknown"}`}`),
      });
    }

    // Per-recipient delivery health alert: if more than half of the targeted
    // technicians didn't get a clean Meta template send, surface it in ops_alerts.
    const problemCount = failedCount + fallbackCount;
    if (techs.length > 0 && problemCount * 2 > techs.length) {
      const allFailed = cleanSent === 0 && fallbackCount === 0;
      await supabase.from("ops_alerts").insert({
        level: allFailed ? "critical" : "warn",
        title: `Broadcast issue for job #${job_id.slice(0, 6)}`,
        body: `${cleanSent}/${techs.length} delivered cleanly. ${failedCount} failed, ${fallbackCount} used session fallback.`,
        job_id,
      });
    }

    if (allocations.length > 0) {
      await supabase.from("job_allocations").insert(allocations);
    }

    // A re-broadcast starts a brand-new quote round for this job.
    // Reset the prior summary marker so finalize-broadcast can send again,
    // and archive any still-live quotes from earlier rounds so they do not
    // get mixed into the new summary.
    await supabase
      .from("jobs")
      .update({
        quote_summary_sent_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job_id);

    await supabase
      .from("quotes")
      .update({ status: "lost" })
      .eq("job_id", job_id)
      .in("status", ["collecting", "pending"]);

    // Schedule a single consolidated quote summary 3 minutes after broadcast.
    // EdgeRuntime.waitUntil keeps the function alive past the HTTP response.
    if (sent > 0) {
      // Reliable fallback: enqueue a scheduled task so the runner (pg_cron,
      // every minute) will invoke finalize-broadcast even if the in-process
      // timer below gets dropped after the HTTP response.
      // Add a 5s buffer beyond the 180s window so any in-flight quote saves
      // have time to commit before the summary query runs.
      const FINALIZE_BUFFER_MS = 5_000;
      await supabase.from("scheduled_tasks").insert({
        kind: "finalize_broadcast",
        payload: { job_id },
        run_at: new Date(Date.now() + QUOTE_WINDOW_MS + FINALIZE_BUFFER_MS).toISOString(),
      });

      // Primary path: fire finalize-broadcast ~185s after broadcast.
      // finalize-broadcast is idempotent (quote_summary_sent_at marker), so
      // whichever runs first wins.
      const finalize = (async () => {
        try {
          await new Promise((r) => setTimeout(r, QUOTE_WINDOW_MS + FINALIZE_BUFFER_MS));
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/finalize-broadcast`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ job_id }),
          });
        } catch (e) {
          console.error("finalize-broadcast schedule failed", e);
        }
      })();
      // @ts-ignore — EdgeRuntime is provided by the Supabase runtime.
      if (typeof EdgeRuntime !== "undefined" && (EdgeRuntime as any).waitUntil) {
        // @ts-ignore
        (EdgeRuntime as any).waitUntil(finalize);
      }
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
