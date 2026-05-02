// Send an outbound SMS or WhatsApp message via Twilio (through Lovable connector gateway)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

// Twilio numbers — read from secrets so we can swap to Meta-verified numbers without redeploying code.
// Falls back to the original sandbox/business numbers if secrets are not set.
const FROM_SMS = Deno.env.get("TWILIO_PHONE_NUMBER") ?? "+447447184489";
const FROM_WHATSAPP = Deno.env.get("TWILIO_WHATSAPP_NUMBER") ?? FROM_SMS;

const BodySchema = z.object({
  to: z.string().trim().min(7).max(20),
  body: z.string().trim().min(1).max(1600),
  channel: z.enum(["sms", "whatsapp"]).default("sms"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY is not configured");

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { to, body, channel } = parsed.data;

    const fromBase = channel === "whatsapp" ? FROM_WHATSAPP : FROM_SMS;
    const From = channel === "whatsapp" ? `whatsapp:${fromBase}` : fromBase;
    const To = channel === "whatsapp" ? `whatsapp:${to}` : to;

    const tw = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To, From, Body: body }),
    });

    const data = await tw.json();
    if (!tw.ok) {
      console.error("twilio send failed", tw.status, data);
      return new Response(
        JSON.stringify({ error: data?.message ?? "Twilio send failed", status: tw.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Log outbound to sms_messages
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await supabase.from("sms_messages").insert({
      direction: "outbound",
      channel,
      from_number: fromBase,
      to_number: to,
      body,
      twilio_sid: data?.sid ?? null,
      num_media: 0,
      media_urls: [],
      status: data?.status ?? "queued",
    });

    return new Response(JSON.stringify({ ok: true, sid: data?.sid }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("twilio-send error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
