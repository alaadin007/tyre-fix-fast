// Returns a minimal, non-sensitive status view of a single job, looked up by its
// exact UUID. Runs with the service role so the jobs table stays non-readable by
// anonymous clients — no phone numbers, emails, vehicle regs or payment IDs are
// ever returned. (Migrated from the job-public-status edge function.)
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PublicJob = {
  id: string;
  customer_name: string | null;
  postcode: string;
  issue_type: string;
  issue_description: string | null;
  photo_urls: string[];
  damage_type: string | null;
  damage_summary: string | null;
  damage_confidence: string | null;
  status: string;
  platform_fee_status: string;
};

export const getJobPublicStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const raw = input as { job_id?: unknown } | null | undefined;
    const id = typeof raw?.job_id === "string" ? raw.job_id.trim() : "";
    return { job_id: id };
  })
  .handler(async ({ data }): Promise<{ job: PublicJob | null }> => {
    try {
      if (!UUID_RE.test(data.job_id)) return { job: null };

      const supabase = createClient(
        process.env['SUPABASE_URL']!,
        process.env['SUPABASE_SERVICE_ROLE_KEY']!,
      );

      const { data: row } = await supabase
        .from("jobs")
        .select(
          "id, customer_name, postcode, issue_type, issue_description, photo_urls, damage_type, damage_summary, damage_confidence, status, platform_fee_status",
        )
        .eq("id", data.job_id)
        .maybeSingle();

      if (!row) return { job: null };

      return {
        job: {
          id: row.id,
          // first name only — avoids exposing full customer identity on a guessable URL
          customer_name: (row.customer_name ?? "").split(" ")[0] || null,
          postcode: row.postcode,
          issue_type: row.issue_type,
          issue_description: row.issue_description,
          photo_urls: row.photo_urls ?? [],
          damage_type: row.damage_type,
          damage_summary: row.damage_summary,
          damage_confidence: row.damage_confidence,
          status: row.status,
          platform_fee_status: row.platform_fee_status,
        },
      };
    } catch (e) {
      console.error("job-public-status error", e);
      return { job: null };
    }
  });
