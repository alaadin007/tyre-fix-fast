// Admin-triggered refund of the £20 platform fee (e.g. tech no-show).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { createStripeClient, corsHeaders } from "../_shared/stripe.ts";

const BodySchema = z.object({
  job_id: z.string().uuid(),
  reason: z.string().max(200).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { job_id, reason } = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: job, error } = await supabase
      .from("jobs")
      .select("id, stripe_payment_intent_id, platform_fee_status, customer_phone, customer_name")
      .eq("id", job_id)
      .single();
    if (error || !job) throw new Error(`Job not found: ${error?.message}`);
    if (job.platform_fee_status !== "paid") {
      return new Response(JSON.stringify({ error: "Fee is not in 'paid' state" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!job.stripe_payment_intent_id) {
      throw new Error("No payment intent on job — cannot refund");
    }

    const stripe = createStripeClient("live");
    const refund = await stripe.refunds.create({
      payment_intent: job.stripe_payment_intent_id,
      reason: "requested_by_customer",
      metadata: { job_id, note: reason ?? "no-show" },
    });

    const jobRef = job_id.slice(0, 6).toUpperCase();
    const amountGbp = ((refund.amount ?? 0) / 100).toFixed(2);
    const amountStr = amountGbp.endsWith(".00") ? `£${amountGbp.slice(0, -3)}` : `£${amountGbp}`;

    await supabase.from("jobs").update({
      platform_fee_status: "refunded",
      platform_fee_refunded_at: new Date().toISOString(),
      status: "cancelled",
    }).eq("id", job_id);

    // Admin ops alert — include amount + job ref
    await supabase.from("ops_alerts").insert({
      level: "warning",
      title: "Customer refund processed",
      body: `${amountStr} refunded to ${job.customer_name ?? "customer"} for job #${jobRef} — reason: ${reason ?? "no-show"}. Customer notified by SMS.`,
      job_id,
    });

    // Notify customer
    if (job.customer_phone) {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify({
          to: job.customer_phone,
          body: `Tyre Fly: we've refunded your payment of ${amountStr} in full for job #${jobRef}. We're sorry for the inconvenience.`,
          channel: "sms",
          job_id,
        }),
      });
    }


    return new Response(JSON.stringify({ ok: true, refund_id: refund.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("refund-fee error:", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
