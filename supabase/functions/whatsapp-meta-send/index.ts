// Send a WhatsApp message via Meta Cloud API and log to sms_messages.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  to: z.string().trim().min(7).max(20),
  body: z.string().trim().max(4096).optional().default(""),
  media_urls: z.array(z.string().url()).max(10).optional(),
  template: z.object({
    name: z.string().min(1),
    language: z.string().min(2).default("en_GB"),
    body_params: z.array(z.string()).max(20).optional(),
    header_image_url: z.string().url().optional(),
  }).optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    name: z.string().max(200).optional(),
    address: z.string().max(200).optional(),
  }).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const TOKEN = Deno.env.get("META_WHATSAPP_TOKEN");
    const PHONE_NUMBER_ID = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");
    if (!TOKEN || !PHONE_NUMBER_ID) throw new Error("Meta WhatsApp env vars not configured");

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { to, body, media_urls, template } = parsed.data;
    const toClean = to.replace(/^whatsapp:/, "").replace(/[^\d+]/g, "");
    const toNum = toClean.replace(/^\+/, "");

    const sendOne = async (payload: any) => {
      const r = await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: toNum, ...payload }),
      });
      const data = await r.json();
      return { ok: r.ok, status: r.status, data };
    };

    const results: any[] = [];
    const images = media_urls ?? [];

    if (template) {
      const components: any[] = [];
      if (template.header_image_url) {
        components.push({
          type: "header",
          parameters: [{ type: "image", image: { link: template.header_image_url } }],
        });
      }
      if (template.body_params && template.body_params.length > 0) {
        components.push({
          type: "body",
          parameters: template.body_params.map((t) => ({ type: "text", text: String(t) })),
        });
      }
      results.push(await sendOne({
        type: "template",
        template: {
          name: template.name,
          language: { code: template.language },
          ...(components.length ? { components } : {}),
        },
      }));
      // If extra images were passed alongside the template, send them as
      // follow-up session messages (these only deliver if the admin's 24h
      // window is open — otherwise Meta will reject them, which is fine).
      const extras = images.slice(template.header_image_url ? 1 : 0);
      for (const link of extras) {
        const r = await sendOne({ type: "image", image: { link } });
        results.push(r);
        if (!r.ok) break; // stop on first failure (likely window closed)
      }
    } else if (images.length > 0) {
      // First image carries the caption (body); remainder send as bare images.
      for (let i = 0; i < images.length; i++) {
        const caption = i === 0 && body ? body.slice(0, 1024) : undefined;
        const res = await sendOne({ type: "image", image: { link: images[i], ...(caption ? { caption } : {}) } });
        results.push(res);
        if (!res.ok) break;
      }
    } else if (body) {
      results.push(await sendOne({ type: "text", text: { body } }));
    }

    // For template sends, only fail if the template itself failed; extra
     // follow-up images are best-effort (may be rejected if 24h window is closed).
    const primary = results[0];
    if (primary && !primary.ok) {
      console.error("meta send failed", primary.status, primary.data);
      return new Response(JSON.stringify({ error: primary.data?.error?.message ?? "Meta send failed", status: primary.status }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!template) {
      const failed = results.find((r) => !r.ok);
      if (failed) {
        console.error("meta send failed", failed.status, failed.data);
        return new Response(JSON.stringify({ error: failed.data?.error?.message ?? "Meta send failed", status: failed.status }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await supabase.from("sms_messages").insert({
      direction: "outbound",
      channel: "whatsapp",
      from_number: Deno.env.get("TWILIO_WHATSAPP_NUMBER") ?? "",
      to_number: toClean,
      body: body ?? "",
      twilio_sid: results[0]?.data?.messages?.[0]?.id ?? null,
      num_media: images.length,
      media_urls: images,
      status: "sent",
    });

    return new Response(JSON.stringify({ ok: true, id: results[0]?.data?.messages?.[0]?.id, count: results.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("whatsapp-meta-send error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
