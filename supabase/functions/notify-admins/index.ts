// Broadcast a notification to every master admin number in app_settings.
// Supports two modes:
//   1) Free-text body  → sent via twilio-send (legacy SMS / WhatsApp session messages).
//   2) event:"new_tech_application" → sent via whatsapp-meta-send using the
//      Meta-approved template "new_technician_application_alert" (en_GB).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { shortenUrl } from "../_shared/short-link.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TEMPLATE_NAME = "new_technician_application_alert";
const TEMPLATE_LANG = "en_GB";
const JOB_TEMPLATE_NAME = "new_job_alert_to_admin";
const JOB_TEMPLATE_LANG = "en_GB";

const BodySchema = z.union([
  z.object({
    event: z.literal("new_tech_application"),
    technician_id: z.string().uuid(),
  }),
  z.object({
    event: z.literal("new_job_posted"),
    job_id: z.string().uuid(),
  }),
  z.object({
    body: z.string().trim().min(1).max(1500),
    channel: z.enum(["sms", "whatsapp"]).default("whatsapp"),
    media_urls: z.array(z.string().url()).max(10).optional(),
  }),
]);

// WhatsApp body parameters cannot contain newlines, tabs, or 4+ consecutive spaces.
function clean(v: any, fallback = "—"): string {
  const s = (v ?? "").toString().trim();
  if (!s) return fallback;
  return s.replace(/[\r\n\t]+/g, " ").replace(/\s{4,}/g, "   ").slice(0, 200);
}

async function buildJobTemplateParams(j: any, photoUrls: string[]): Promise<string[]> {
  const shortId = String(j.id).slice(0, 6).toUpperCase();
  const customerName = clean(
    j.customer_name && String(j.customer_name).trim().toLowerCase() !== "customer"
      ? j.customer_name
      : j.customer_full_name ?? j.full_name ?? "Customer"
  );
  const wheels = Array.isArray(j.affected_wheels) && j.affected_wheels.length
    ? j.affected_wheels.join(", ") : "—";
  const photoCount = Array.isArray(j.photo_urls) ? j.photo_urls.length : 0;
  const created = j.created_at ? new Date(j.created_at) : new Date();
  const dd = String(created.getUTCDate()).padStart(2, "0");
  const mm = String(created.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = created.getUTCFullYear();
  const hh = String(created.getUTCHours()).padStart(2, "0");
  const mi = String(created.getUTCMinutes()).padStart(2, "0");
  const ss = String(created.getUTCSeconds()).padStart(2, "0");
  const when = `${dd}/${mm}/${yyyy}, ${hh}:${mi}:${ss}`;
  const longMaps = (j.lat != null && j.lng != null)
    ? `https://www.google.com/maps?q=${j.lat},${j.lng}`
    : "";
  const mapsLink = longMaps ? await shortenUrl(longMaps, { kind: "admin_map", job_id: j.id }) : "—";
  const photo1Short = photoUrls[1]
    ? await shortenUrl(photoUrls[1], { kind: "admin_photo", job_id: j.id })
    : "—";
  const photo2Short = photoUrls[2]
    ? await shortenUrl(photoUrls[2], { kind: "admin_photo", job_id: j.id })
    : "—";
  // Prefer postcode text; otherwise show the clickable pin link so admins
  // can open the customer's exact location directly from the template.
  const locationText = (j.postcode && String(j.postcode).trim())
    ? clean(j.postcode)
    : (mapsLink !== "—" ? mapsLink : "—");
  return [
    shortId,                                                          // {{1}}
    when,                                                             // {{2}}
    customerName,                                                     // {{3}}
    clean(j.customer_phone),                                          // {{4}}
    locationText,                                                     // {{5}}
    clean(j.issue_type),                                              // {{6}}
    clean(j.severity, "Not assessed"),                                // {{7}}
    clean(wheels),                                                    // {{8}}
    clean(j.damage_summary ?? j.issue_description, "No summary"),     // {{9}}
    clean(j.notes, "—"),                                              // {{10}}
    clean(j.vehicle_reg, "Not provided"),                             // {{11}}
    String(photoCount),                                               // {{12}}
    String(j.id),                                                     // {{13}}
    photo1Short,                                                      // {{14}}
    photo2Short,                                                      // {{15}}
    mapsLink,                                                         // {{16}}
  ];
}

function buildTemplateParams(t: any): string[] {
  const idPrefix = String(t.id).slice(0, 6);
  const docs: string[] = [];
  if (t.id_doc_url) docs.push("ID");
  if (t.insurance_doc_url) docs.push("Insurance");
  if (t.public_liability_doc_url) docs.push("Public Liability");
  if (Array.isArray(t.equipment_photo_urls) && t.equipment_photo_urls.length > 0) docs.push("Equipment photos");

  const missing: string[] = [];
  if (!t.email) missing.push("Email");
  if (!t.vehicle) missing.push("Vehicle");
  if (!t.id_doc_url) missing.push("ID");
  if (!t.insurance_doc_url) missing.push("Insurance");
  if (!t.public_liability_doc_url) missing.push("Public Liability");
  if (!Array.isArray(t.equipment_photo_urls) || t.equipment_photo_urls.length === 0) missing.push("Equipment photos");
  if (!t.weekly_schedule || Object.keys(t.weekly_schedule || {}).length === 0) missing.push("Weekly schedule");

  const postcodes = Array.isArray(t.service_postcodes) ? t.service_postcodes.join(", ") : "";

  return [
    t.name || "—",                                    // {{1}}
    t.phone || "—",                                   // {{2}}
    t.email || "Not provided",                        // {{3}}
    t.vehicle || "Not provided",                      // {{4}}
    postcodes || "Not provided",                      // {{5}}
    String(t.travel_radius_miles ?? "—"),             // {{6}}
    docs.length ? docs.join(", ") : "None",           // {{7}}
    missing.length ? missing.join(", ") : "None",     // {{8}}
    idPrefix,                                         // {{9}}
    idPrefix,                                         // {{10}}
  ];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "master_numbers")
      .maybeSingle();
    const numbers: string[] = ((setting?.value as any)?.numbers ?? []).filter(Boolean);
    if (numbers.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, note: "no master numbers configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Branch 1a: Meta-approved template for new technician applications.
    if ("event" in parsed.data && parsed.data.event === "new_tech_application") {
      const { data: tech, error: techErr } = await supabase
        .from("technicians")
        .select("*")
        .eq("id", parsed.data.technician_id)
        .maybeSingle();
      if (techErr || !tech) {
        return new Response(JSON.stringify({ error: "technician not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const body_params = buildTemplateParams(tech);

      const results = await Promise.allSettled(
        numbers.map((to) =>
          fetch(`${SUPABASE_URL}/functions/v1/whatsapp-meta-send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SERVICE_KEY}`,
            },
            body: JSON.stringify({
              to,
              template: { name: TEMPLATE_NAME, language: TEMPLATE_LANG, body_params },
            }),
          }).then(async (r) => ({ ok: r.ok, status: r.status, data: await r.json().catch(() => null) })),
        ),
      );
      const sent = results.filter((r) => r.status === "fulfilled" && (r.value as any).ok).length;
      const errors = results
        .map((r) => r.status === "fulfilled" ? (r.value as any) : { ok: false, error: (r as any).reason?.message })
        .filter((r) => !r.ok);
      if (errors.length) console.error("notify-admins template errors", JSON.stringify(errors));
      return new Response(JSON.stringify({ ok: true, sent, total: numbers.length, errors }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Branch 1b: Meta-approved template for new customer job posts.
    if ("event" in parsed.data && parsed.data.event === "new_job_posted") {
      const { data: job, error: jErr } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", parsed.data.job_id)
        .maybeSingle();
      if (jErr || !job) {
        return new Response(JSON.stringify({ error: "job not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const allMedia: string[] = Array.isArray(job.photo_urls) ? job.photo_urls : [];
      const isImage = (u: string) => /\.(png|jpe?g|webp)(\?|$)/i.test(u);
      const photos = allMedia.filter(isImage);
      // Meta template was approved with an IMAGE header, so it MUST be present
      // on every send. If the customer only uploaded videos (or nothing), fall
      // back to a generic placeholder so Meta still accepts the message.
      const FALLBACK_HEADER = "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&h=418&fit=crop&fm=jpg";
      const header_image_url = photos[0] ?? FALLBACK_HEADER;
      const body_params = buildJobTemplateParams(job, photos);

      const results = await Promise.allSettled(
        numbers.map((to) =>
          fetch(`${SUPABASE_URL}/functions/v1/whatsapp-meta-send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SERVICE_KEY}`,
            },
            body: JSON.stringify({
              to,
              template: {
                name: JOB_TEMPLATE_NAME,
                language: JOB_TEMPLATE_LANG,
                body_params,
                ...(header_image_url ? { header_image_url } : {}),
              },
            }),
          }).then(async (r) => ({ ok: r.ok, status: r.status, data: await r.json().catch(() => null) })),
        ),
      );
      const sent = results.filter((r) => r.status === "fulfilled" && (r.value as any).ok).length;
      const errors = results
        .map((r) => r.status === "fulfilled" ? (r.value as any) : { ok: false, error: (r as any).reason?.message })
        .filter((r) => !r.ok);
      if (errors.length) console.error("notify-admins job template errors", JSON.stringify(errors));
      return new Response(JSON.stringify({ ok: true, sent, total: numbers.length, errors }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Branch 2: legacy free-text body via twilio-send (with optional media).
    const { body, channel, media_urls } = parsed.data;
    const results = await Promise.allSettled(
      numbers.map((to) =>
        fetch(`${SUPABASE_URL}/functions/v1/twilio-send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({ to, body, channel, media_urls }),
        }),
      ),
    );
    const sent = results.filter((r) => r.status === "fulfilled").length;
    return new Response(JSON.stringify({ ok: true, sent, total: numbers.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-admins error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
