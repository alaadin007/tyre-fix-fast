// Shared server-side helpers for the migrated admin actions:
// service-role Supabase client, admin authorisation, WhatsApp/SMS delivery
// (still handled by the twilio-send edge function) and short links.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function serviceClient(): SupabaseClient {
  return createClient(
    process.env['SUPABASE_URL']!,
    process.env['SUPABASE_SERVICE_ROLE_KEY']!,
    { auth: { persistSession: false } },
  );
}

/** Throws unless the caller holds the `admin` role. */
export async function assertAdmin(context: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<void> {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error("Could not verify admin access");
  if (!data) throw new Error("Forbidden");
}

/** Sends a WhatsApp/SMS message through the twilio-send edge function. */
export async function sendMessage(
  to: string,
  body: string,
  channel: "whatsapp" | "sms" = "whatsapp",
  job_id?: string,
): Promise<unknown> {
  const url = `${process.env['SUPABASE_URL']}/functions/v1/twilio-send`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env['SUPABASE_SERVICE_ROLE_KEY']}`,
    },
    body: JSON.stringify({ to, body, channel, ...(job_id ? { job_id } : {}) }),
  });
  const data = (await r.json().catch(() => ({}))) as { error?: string };
  if (!r.ok || data?.error) {
    console.error("sendMessage failed", { to, channel, status: r.status, data });
    throw new Error(data?.error ?? `Message delivery failed (${r.status})`);
  }
  return data;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const HOST = "https://tyrefly.com";

function makeCode(len = 6): string {
  let out = "";
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) out += ALPHABET[buf[i]! % ALPHABET.length];
  return out;
}

/** Turns a long URL into https://tyrefly.com/p/<code>; falls back to the long URL. */
export async function shortenUrl(
  targetUrl: string,
  opts: { kind?: string; job_id?: string; expires_at?: string } = {},
): Promise<string> {
  try {
    const supabase = serviceClient();
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = makeCode(6);
      const { error } = await supabase.from("short_links").insert({
        code,
        target_url: targetUrl,
        kind: opts.kind ?? null,
        job_id: opts.job_id ?? null,
        expires_at: opts.expires_at ?? null,
      });
      if (!error) return `${HOST}/p/${code}`;
      if (!String(error.message).toLowerCase().includes("duplicate")) break;
    }
  } catch (e) {
    console.error("shortenUrl failed", e);
  }
  return targetUrl;
}
