// admin-mark-paid
// Manual override that mirrors the payment-webhook success path so the admin
// can mark a job as paid from the dashboard if Stripe never delivered the
// webhook (e.g. cash, off-platform payment, manual reconciliation).
// Sets platform_fee_status="paid", status="awaiting_payment" → "in_progress"
// is left to admin-share-details to advance after contacts are exchanged
// (matching the WhatsApp flow). Logs an ops_alert. WhatsApp flow untouched.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  try {
    const { job_id, note } = await req.json();
    if (!job_id) throw new Error("job_id required");

    const { data: job } = await supabase
      .from("jobs")
      .select("id, status, platform_fee_status")
      .eq("id", job_id)
      .maybeSingle();
    if (!job) throw new Error("Job not found");
    const ref = String(job_id).slice(0, 6).toUpperCase();

    if (job.platform_fee_status === "paid") {
      return new Response(JSON.stringify({ ok: true, already: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nextStatus = job.status === "broadcasting" || job.status === "quoted" || job.status === "sent" || job.status === "awaiting_payment"
      ? "awaiting_payment" // payment now received; admin will share details next
      : job.status;

    await supabase.from("jobs").update({
      platform_fee_status: "paid",
      platform_fee_paid_at: new Date().toISOString(),
      status: nextStatus,
      updated_at: new Date().toISOString(),
    }).eq("id", job_id);

    await supabase.from("ops_alerts").insert({
      level: "info",
      title: "Payment marked paid (dashboard)",
      body: `Job ${ref} marked as paid manually${note ? ` — ${note}` : ""}. Use Approval tab to share contact details next.`,
      job_id,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("admin-mark-paid error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
