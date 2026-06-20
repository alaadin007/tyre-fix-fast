// admin-cancel-job
// Dashboard parity for the WhatsApp "CONFIRM CANCEL #REF" admin action.
// Sets job.status = "cancelled" and notifies the customer with the same
// message used by the WhatsApp flow. Does NOT issue refunds — use
// refund-fee for that. WhatsApp flow is untouched.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendReply(to: string, body: string, channel = "whatsapp") {
  await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ to, body, channel }),
  }).catch((e) => console.error("admin-cancel-job sendReply failed", e));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  try {
    const { job_id, reason } = await req.json();
    if (!job_id) throw new Error("job_id required");

    const { data: job } = await supabase
      .from("jobs")
      .select("id, status, customer_phone, customer_name")
      .eq("id", job_id)
      .maybeSingle();
    if (!job) throw new Error("Job not found");
    const ref = String(job_id).slice(0, 6).toUpperCase();

    if (job.status === "cancelled") {
      return new Response(JSON.stringify({ ok: true, already: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("jobs")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", job_id);

    await supabase.from("ops_alerts").insert({
      level: "warning",
      title: "Job cancelled (dashboard)",
      body: `Job ${ref} cancelled via dashboard${reason ? ` — ${reason}` : ""}.`,
      job_id,
    });

    if (job.customer_phone) {
      await sendReply(
        job.customer_phone,
        `We're sorry — your tyre service request (Job #${ref}) has been cancelled by our team. If this is unexpected, please reply and we'll help right away.\n— Tyre Fly`,
        "whatsapp",
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("admin-cancel-job error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
