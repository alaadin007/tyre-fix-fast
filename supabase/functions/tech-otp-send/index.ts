// Generate a WhatsApp OTP for technician sign-in and send via existing Twilio sender.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  phone: z.string().trim().regex(/^\+[1-9]\d{6,14}$/, "Invalid phone"),
});

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid phone" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { phone } = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Rate limit: max 1 active code per 60s, max 5 in last hour
    const { data: recent } = await supabase
      .from("tech_otp_codes")
      .select("id, created_at")
      .eq("phone", phone)
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false });
    if ((recent ?? []).length >= 5) {
      return new Response(JSON.stringify({ error: "Too many codes — try again in an hour" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (recent && recent[0] && (Date.now() - new Date(recent[0].created_at).getTime()) < 60_000) {
      return new Response(JSON.stringify({ error: "Wait a moment before requesting another code" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const code_hash = await sha256Hex(code);
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insErr } = await supabase
      .from("tech_otp_codes")
      .insert({ phone, code_hash, expires_at });
    if (insErr) throw insErr;

    // Send via existing Twilio sender on WhatsApp channel
    const sendRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        to: phone,
        channel: "whatsapp",
        body: `Your Tyre Fly sign-in code is ${code}. It expires in 10 minutes.`,
      }),
    });
    if (!sendRes.ok) {
      const t = await sendRes.text();
      console.error("twilio-send failed", sendRes.status, t);
      return new Response(JSON.stringify({ error: "Couldn't send WhatsApp code" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tech-otp-send error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
