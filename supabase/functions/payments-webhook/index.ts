// Stripe webhook — handles platform-fee checkout completion + refunds.
// Registered automatically by enable_stripe_payments at:
//   https://<proj>.supabase.co/functions/v1/payments-webhook?env=sandbox
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

async function sendSms(to: string, body: string) {
  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({ to, body, channel: "sms" }),
    });
  } catch (e) {
    console.error("sendSms failed:", e);
  }
}

async function handleCheckoutCompleted(session: any) {
  const jobId = session?.metadata?.job_id;
  if (!jobId) {
    console.warn("checkout.session.completed without job_id metadata");
    return;
  }
  const supabase = getSupabase();

  // Look up job + assigned tech
  const { data: job } = await supabase
    .from("jobs")
    .select("id, customer_name, customer_phone, assigned_technician_id, platform_fee_status")
    .eq("id", jobId)
    .single();
  if (!job) {
    console.error("Job not found for session:", jobId);
    return;
  }
  if (job.platform_fee_status === "paid") {
    console.log("Job already marked paid, skipping:", jobId);
    return;
  }

  await supabase.from("jobs").update({
    platform_fee_status: "paid",
    platform_fee_paid_at: new Date().toISOString(),
    stripe_payment_intent_id: session.payment_intent ?? null,
    status: "confirmed",
  }).eq("id", jobId);

  // Look up tech
  let tech: { name?: string; phone?: string } | null = null;
  if (job.assigned_technician_id) {
    const { data } = await supabase
      .from("technicians")
      .select("name, phone")
      .eq("id", job.assigned_technician_id)
      .single();
    tech = data;
  }

  // SMS the customer with tech's number
  if (job.customer_phone && tech?.phone) {
    await sendSms(
      job.customer_phone,
      `FlatTyreNearMe: payment received. Your technician ${tech.name ?? ""} will call you shortly. Direct line: ${tech.phone}. They'll quote and accept cash or bank transfer on site.`,
    );
  }
  // SMS the technician with the customer's number
  if (tech?.phone && job.customer_phone) {
    await sendSms(
      tech.phone,
      `FlatTyreNearMe: customer ${job.customer_name ?? ""} has paid the platform fee. Please call ${job.customer_phone} now to confirm ETA. Collect the job total directly from them.`,
    );
  }

  await supabase.from("ops_alerts").insert({
    level: "info",
    title: "Platform fee paid",
    body: `£15 received for job ${jobId.slice(0, 8)} — contact details exchanged.`,
    job_id: jobId,
  });
}

async function handleChargeRefunded(charge: any) {
  const paymentIntentId = charge?.payment_intent;
  if (!paymentIntentId) return;
  const supabase = getSupabase();
  const { data: job } = await supabase
    .from("jobs")
    .select("id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (!job) return;
  await supabase.from("jobs").update({
    platform_fee_status: "refunded",
    platform_fee_refunded_at: new Date().toISOString(),
  }).eq("id", job.id);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  console.log("Stripe webhook:", event.type);
  switch (event.type) {
    case "checkout.session.completed":
    case "transaction.completed":
      await handleCheckoutCompleted(event.data.object);
      break;
    case "charge.refunded":
      await handleChargeRefunded(event.data.object);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }
  try {
    await handleWebhook(req, rawEnv as StripeEnv);
    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
