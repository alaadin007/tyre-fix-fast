// Verify a WhatsApp OTP, then create or fetch a Supabase auth user for that phone
// and return a one-time magic-link redirect URL the client uses to log in.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  phone: z.string().trim().regex(/^\+[1-9]\d{6,14}$/),
  code: z.string().trim().regex(/^\d{6}$/),
  redirect_to: z.string().url(),
});

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function phoneToEmail(phone: string): string {
  // Stable synthetic email (auth requires email for magiclink). Phone digits only.
  return `tech+${phone.replace(/\D/g, "")}@tyrefly.local`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { phone, code, redirect_to } = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: row } = await supabase
      .from("tech_otp_codes")
      .select("*")
      .eq("phone", phone)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) {
      return new Response(JSON.stringify({ error: "No code found — request a new one" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Code expired — request a new one" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (row.attempts >= 5) {
      return new Response(JSON.stringify({ error: "Too many attempts — request a new code" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hash = await sha256Hex(code);
    if (hash !== row.code_hash) {
      await supabase.from("tech_otp_codes")
        .update({ attempts: row.attempts + 1 }).eq("id", row.id);
      return new Response(JSON.stringify({ error: "Wrong code" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("tech_otp_codes")
      .update({ consumed_at: new Date().toISOString() }).eq("id", row.id);

    const email = phoneToEmail(phone);

    // Ensure the user exists; create if not.
    // @ts-ignore - admin namespace exists on service-role client
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users?.find((u: any) => u.email === email);
    if (!existing) {
      // @ts-ignore
      const { error: createErr } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { phone, source: "whatsapp_otp" },
      });
      if (createErr) {
        console.error("createUser failed", createErr);
        throw createErr;
      }
    }

    // Generate a magic link the client can follow to establish a session.
    // @ts-ignore
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: redirect_to },
    });
    if (linkErr) throw linkErr;

    return new Response(JSON.stringify({
      ok: true,
      action_link: linkData.properties?.action_link,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tech-otp-verify error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
