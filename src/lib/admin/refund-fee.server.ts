// Ported from the refund-fee edge function.
// Admin-triggered refund of the platform fee (e.g. tech no-show).
import { createRefund } from "./stripe.server";
import { sendMessage, serviceClient } from "./ops.server";

export async function runRefundFee(input: {
  job_id: string;
  reason?: string | undefined;
}): Promise<{ ok: true; refund_id: string }> {
  const { job_id, reason } = input;
  const supabase = serviceClient();

  const { data: job, error } = await supabase
    .from("jobs")
    .select("id, stripe_payment_intent_id, platform_fee_status, customer_phone, customer_name")
    .eq("id", job_id)
    .maybeSingle();
  if (error || !job) throw new Error(`Job not found: ${error?.message ?? ""}`);
  if (job.platform_fee_status !== "paid") throw new Error("Fee is not in 'paid' state");
  if (!job.stripe_payment_intent_id) throw new Error("No payment intent on job — cannot refund");

  const refund = await createRefund("live", {
    payment_intent: job.stripe_payment_intent_id,
    reason: "requested_by_customer",
    metadata: { job_id, note: reason ?? "no-show" },
  });

  const jobRef = job_id.slice(0, 6).toUpperCase();
  const amountGbp = ((refund.amount ?? 0) / 100).toFixed(2);
  const amountStr = amountGbp.endsWith(".00") ? `£${amountGbp.slice(0, -3)}` : `£${amountGbp}`;

  await supabase
    .from("jobs")
    .update({
      platform_fee_status: "refunded",
      platform_fee_refunded_at: new Date().toISOString(),
      status: "cancelled",
    })
    .eq("id", job_id);

  await supabase.from("ops_alerts").insert({
    level: "warning",
    title: "Customer refund processed",
    body: `${amountStr} refunded to ${job.customer_name ?? "customer"} for job #${jobRef} — reason: ${reason ?? "no-show"}. Customer notified by SMS.`,
    job_id,
  });

  if (job.customer_phone) {
    try {
      await sendMessage(
        job.customer_phone,
        `Tyrefly: we've refunded your payment of ${amountStr} in full for job #${jobRef}. We're sorry for the inconvenience.`,
        "sms",
        job_id,
      );
    } catch (e) {
      console.error("refund customer notification failed", e);
    }
  }

  return { ok: true, refund_id: refund.id };
}
