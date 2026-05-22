// Turn a long URL into a clean https://tyrefly.com/p/<code> short link.
// Stores the mapping in the public.short_links table; the /p/:code route
// in the React app resolves and redirects.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const HOST = "https://tyrefly.com";

function makeCode(len = 6): string {
  let out = "";
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) out += ALPHABET[buf[i] % ALPHABET.length];
  return out;
}

export async function shortenUrl(
  targetUrl: string,
  opts: { kind?: string; job_id?: string; expires_at?: string } = {},
): Promise<string> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
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
      // Retry on unique-violation, otherwise fall back to long URL.
      if (!String(error.message).toLowerCase().includes("duplicate")) break;
    }
  } catch (e) {
    console.error("shortenUrl failed", e);
  }
  return targetUrl;
}
