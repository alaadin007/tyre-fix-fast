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

async function sendMsg(to: string, body: string, channel: "sms" | "whatsapp" = "whatsapp") {
  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({ to, body, channel }),
    });
  } catch (e) {
    console.error("sendMsg failed:", e);
  }
}

function formatGbp(amountMinor: number | null | undefined): string {
  if (amountMinor == null) return "";
  return (amountMinor / 100).toFixed(2);
}

function jobRef(jobId: string): string {
  return jobId.slice(0, 8).toUpperCase();
}

async function handleCheckoutCompleted(session: any) {
  const jobId = session?.metadata?.job_id;
  const kind = session?.metadata?.kind ?? "platform_connection_fee";
  if (!jobId) {
    console.warn("checkout.session.completed without job_id metadata");
    return;
  }
  const supabase = getSupabase();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, customer_name, customer_phone, postcode, assigned_technician_id, platform_fee_status, issue_type, issue_description, vehicle_reg, affected_wheels")
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

  const isFullPayment = kind === "job_full_payment";
  await supabase.from("jobs").update({
    platform_fee_status: "paid",
    platform_fee_paid_at: new Date().toISOString(),
    stripe_payment_intent_id: session.payment_intent ?? null,
    status: isFullPayment ? "in_progress" : "confirmed",
  }).eq("id", jobId);

  // Look up tech (incl. live location)
  let tech: { name?: string; phone?: string; last_lat?: number | null; last_lng?: number | null } | null = null;
  const techId = session?.metadata?.technician_id ?? job.assigned_technician_id;
  if (techId) {
    const { data } = await supabase
      .from("technicians")
      .select("name, phone, last_lat, last_lng")
      .eq("id", techId)
      .single();
    tech = data;
  }

  const amount = formatGbp(session?.amount_total);
  const ref = jobRef(jobId);
  const techName = tech?.name ?? "Your technician";
  const techPhone = tech?.phone ?? "";
  const techLocLink = tech?.last_lat && tech?.last_lng
    ? `https://www.google.com/maps?q=${tech.last_lat},${tech.last_lng}`
    : "Will be shared once technician shares live location";

  const issue = job.issue_description || job.issue_type || "Tyre service";
  const wheels = Array.isArray(job.affected_wheels) && job.affected_wheels.length
    ? job.affected_wheels.join(", ")
    : "—";
  const vehicleReg = job.vehicle_reg || "—";
  const customerMapLink = job.postcode
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.postcode)}`
    : "";

  // ===== Customer message =====
  if (job.customer_phone) {
    const customerMsg = [
      `✅ Payment Confirmed — £${amount}`,
      ``,
      `Your roadside tyre service is confirmed — Job #${ref}`,
      ``,
      `Here is the Technician Detail:`,
      ``,
      `👨‍🔧  ${techName}`,
      `📞  ${techPhone}`,
      `📍  ${techLocLink}`,
      ``,
      `They will call you shortly to confirm ETA.`,
    ].join("\n");
    await sendMsg(job.customer_phone, customerMsg, "whatsapp");
  }

  // ===== Technician message =====
  if (techPhone && job.customer_phone) {
    const techMsg = [
      `🔔 Job Confirmed`,
      ``,
      `✅ Payment Received — £${amount}`,
      `📋 Job Ref: #${ref}`,
      ``,
      `👤 Customer Details`,
      `━━━━━━━━━━━━━━━`,
      `👨 Name:     ${job.customer_name ?? "—"}`,
      `📞 Phone:    ${job.customer_phone}`,
      `📍 PostCode: ${job.postcode ?? "—"}`,
      `🗺️ Map:      ${customerMapLink}`,
      ``,
      `🛞 Job Details`,
      `━━━━━━━━━━━━━━━`,
      `⚠️ Issue:    ${issue}`,
      `🚗 Reg:      ${vehicleReg}`,
      `🛞 Wheels:   ${wheels}`,
      ``,
      `💰 Your quoted price has been accepted & payment is now confirmed.`,
      `📲 Please contact the customer immediately to confirm your ETA.`,
      ``,
      `✅ Job Completion`,
      `━━━━━━━━━━━━━━━`,
      `Once job is done, reply with:`,
      `   Done ${ref}`,
      ``,
      `This will automatically close the job.`,
    ].join("\n");
    await sendMsg(techPhone, techMsg, "whatsapp");
  }

  await supabase.from("ops_alerts").insert({
    level: "info",
    title: isFullPayment ? "Customer paid in full" : "Platform fee paid",
    body: `Job ${ref} — £${amount} received, contact details exchanged.`,
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
