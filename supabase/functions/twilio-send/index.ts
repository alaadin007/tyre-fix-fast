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
  media_urls: z.array(z.string().url()).max(10).optional(),
  provider_preference: z.enum(["auto", "twilio", "meta"]).optional().default("auto"),
});

function normalizePhone(raw: string): string {
  let cleaned = (raw || "").replace(/^whatsapp:/i, "").replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("00")) cleaned = `+${cleaned.slice(2)}`;
  if (!cleaned.startsWith("+")) {
    cleaned = cleaned.startsWith("0") ? `+44${cleaned.slice(1)}` : `+${cleaned}`;
  }
  return cleaned;
}

async function sendViaTwilio(args: {
  to: string;
  body: string;
  channel: "sms" | "whatsapp";
  mediaUrls?: string[];
  lovableApiKey: string;
  twilioApiKey: string;
}) {
  const fromBase = args.channel === "whatsapp" ? FROM_WHATSAPP : FROM_SMS;
  const toNormalized = normalizePhone(args.to);
  const fromNormalized = normalizePhone(fromBase);
  const To = args.channel === "whatsapp" ? `whatsapp:${toNormalized}` : toNormalized;
  const From = args.channel === "whatsapp" ? `whatsapp:${fromNormalized}` : fromNormalized;
  const form = new URLSearchParams({ To, From, Body: args.body });
  for (const mediaUrl of args.mediaUrls ?? []) form.append("MediaUrl", mediaUrl);

  const tw = await fetch(`${GATEWAY_URL}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.lovableApiKey}`,
      "X-Connection-Api-Key": args.twilioApiKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });

  const data = await tw.json();
  return { ok: tw.ok, status: tw.status, data, fromBase };
}

function formatProviderError(data: any, fallback: string) {
  return {
    code: data?.code ?? null,
    error: data?.message ?? data?.error ?? fallback,
  };
}

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
    const { to, body, channel, media_urls, provider_preference } = parsed.data;

    // For technician broadcast we can force direct Twilio WhatsApp delivery instead of
    // treating Meta's accepted-but-undelivered response as success.
    if (channel === "whatsapp" && provider_preference !== "twilio") {
      const metaRes = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-meta-send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ to, body, media_urls }),
        },
      );
      const metaData = await metaRes.json();

      if (metaRes.ok) {
        return new Response(JSON.stringify({ ...metaData, channel: "whatsapp", provider: "meta" }), {
          status: metaRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.error("meta whatsapp send failed, falling back to twilio", metaRes.status, metaData);

      const twilioWa = await sendViaTwilio({
        to,
        body,
        channel: "whatsapp",
        mediaUrls: media_urls,
        lovableApiKey: LOVABLE_API_KEY,
        twilioApiKey: TWILIO_API_KEY,
      });

      if (!twilioWa.ok) {
        const twilioErr = formatProviderError(twilioWa.data, "WhatsApp send failed");
        console.error("twilio whatsapp fallback failed", twilioWa.status, twilioWa.data);
        return new Response(
          JSON.stringify({
            error: metaData?.error ?? twilioErr.error,
            code: twilioErr.code,
            provider: "meta_and_twilio",
            status: twilioWa.status,
            from_number: twilioWa.fromBase,
            to_number: normalizePhone(to),
            channel,
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await supabase.from("sms_messages").insert({
        direction: "outbound",
        channel,
        from_number: twilioWa.fromBase,
        to_number: normalizePhone(to),
        body,
        twilio_sid: twilioWa.data?.sid ?? null,
        num_media: media_urls?.length ?? 0,
        media_urls: media_urls ?? [],
        status: twilioWa.data?.status ?? "queued",
      });

      return new Response(JSON.stringify({ ok: true, sid: twilioWa.data?.sid, channel: "whatsapp", provider: "twilio" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const twilioSms = await sendViaTwilio({
      to,
      body,
      channel,
      mediaUrls: media_urls,
      lovableApiKey: LOVABLE_API_KEY,
      twilioApiKey: TWILIO_API_KEY,
    });
    if (!twilioSms.ok) {
      const twilioErr = formatProviderError(twilioSms.data, "Twilio send failed");
      console.error("twilio send failed", twilioSms.status, twilioSms.data);
      return new Response(
        JSON.stringify({
          error: twilioErr.error,
          code: twilioErr.code,
          status: twilioSms.status,
          from_number: twilioSms.fromBase,
          to_number: normalizePhone(to),
          channel,
          provider: "twilio",
        }),
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
      from_number: twilioSms.fromBase,
      to_number: normalizePhone(to),
      body,
      twilio_sid: twilioSms.data?.sid ?? null,
      num_media: media_urls?.length ?? 0,
      media_urls: media_urls ?? [],
      status: twilioSms.data?.status ?? "queued",
    });

    return new Response(JSON.stringify({ ok: true, sid: twilioSms.data?.sid, channel: "sms", provider: "twilio" }), {
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
