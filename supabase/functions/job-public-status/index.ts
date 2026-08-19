// Returns a minimal, non-sensitive status view of a single job, looked up by its
// exact UUID. Runs with the service role so the jobs table stays non-readable by
// anonymous clients — no phone numbers, emails, vehicle regs or payment IDs are
// ever returned.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const id = typeof body?.job_id === "string" ? body.job_id.trim() : "";
    if (!UUID_RE.test(id)) return json({ job: null });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data } = await supabase
      .from("jobs")
      .select(
        "id, customer_name, postcode, issue_type, issue_description, photo_urls, damage_type, damage_summary, damage_confidence, status, platform_fee_status",
      )
      .eq("id", id)
      .maybeSingle();

    if (!data) return json({ job: null });

    return json({
      job: {
        id: data.id,
        // first name only — avoids exposing full customer identity on a guessable URL
        customer_name: (data.customer_name ?? "").split(" ")[0] || null,
        postcode: data.postcode,
        issue_type: data.issue_type,
        issue_description: data.issue_description,
        photo_urls: data.photo_urls ?? [],
        damage_type: data.damage_type,
        damage_summary: data.damage_summary,
        damage_confidence: data.damage_confidence,
        status: data.status,
        platform_fee_status: data.platform_fee_status,
      },
    });
  } catch (e) {
    console.error("job-public-status error", e);
    return json({ job: null });
  }
});
