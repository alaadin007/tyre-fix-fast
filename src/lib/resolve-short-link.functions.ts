// Resolves a /p/:code short link to its target URL.
// Public by design (links are shared over WhatsApp), but reads happen
// server-side with the service role so the short_links table itself is not
// listable/enumerable by anonymous clients.
// (Migrated from the resolve-short-link edge function.)
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

const CODE_RE = /^[A-Za-z0-9]{4,16}$/;

export type ResolveShortLinkResult =
  | { status: "ok"; target_url: string }
  | { status: "not_found" }
  | { status: "expired" };

export const resolveShortLink = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const raw = input as { code?: unknown } | null | undefined;
    return { code: typeof raw?.code === "string" ? raw.code : "" };
  })
  .handler(async ({ data }): Promise<ResolveShortLinkResult> => {
    try {
      if (!CODE_RE.test(data.code)) return { status: "not_found" };

      const supabase = createClient(
        process.env['SUPABASE_URL']!,
        process.env['SUPABASE_SERVICE_ROLE_KEY']!,
      );

      const { data: row } = await supabase
        .from("short_links")
        .select("target_url, expires_at")
        .eq("code", data.code)
        .maybeSingle();

      if (!row?.target_url) return { status: "not_found" };
      if (row.expires_at && new Date(row.expires_at) < new Date()) return { status: "expired" };

      return { status: "ok", target_url: row.target_url };
    } catch (e) {
      console.error("resolve-short-link error", e);
      return { status: "not_found" };
    }
  });
