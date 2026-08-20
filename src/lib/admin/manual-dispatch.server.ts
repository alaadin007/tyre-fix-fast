// Ported from the manual-dispatch edge function.
// Assigns a technician, records the quote, mints a Stripe checkout and
// WhatsApps the customer the pay link.
import { createCheckoutSession } from "./stripe.server";
import { sendMessage, serviceClient, shortenUrl } from "./ops.server";

export async function runManualDispatch(input: {
  job_id: string;
  technician_id: string;
  price_gbp: number;
  eta_minutes: number;
  notes?: string | undefined;
  origin?: string | undefined;
}): Promise<{ ok: true; checkout_url: string | null; session_id: string }> {
  const { job_id, technician_id, price_gbp, eta_minutes, notes, origin } = input;
  const supabase = serviceClient();

  const [{ data: job }, { data: tech }] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id, customer_name, customer_email, customer_phone, postcode, issue_type, platform_fee_status",
      )
      .eq("id", job_id)
      .maybeSingle(),
    supabase.from("technicians").select("id, name, phone").eq("id", technician_id).maybeSingle(),
  ]);
  if (!job) throw new Error("Job not found");
  if (!tech) throw new Error("Technician not found");

  const baseOrigin = origin?.replace(/\/$/, "") ?? "https://tyrefly.com";

  const session = await createCheckoutSession("live", {
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "gbp",
          product_data: {
            name: `Mobile tyre service — ${job.postcode}`,
            description: `${job.issue_type ?? "tyre job"} · ETA ${eta_minutes} min · Technician: ${tech.name}`,
          },
          unit_amount: Math.round(price_gbp * 100),
        },
        quantity: 1,
      },
    ],
    success_url: `${baseOrigin}/confirmed?job=${job_id}`,
    cancel_url: `${baseOrigin}/?canceled=1`,
    customer_email: job.customer_email ?? undefined,
    metadata: {
      job_id,
      technician_id,
      kind: "job_full_payment",
      price_gbp: String(price_gbp),
      eta_minutes: String(eta_minutes),
    },
    payment_intent_data: {
      metadata: { job_id, technician_id, kind: "job_full_payment" },
      description: `Tyrefly — job ${job_id.slice(0, 8)} — ${job.postcode}`,
    },
  });

  await supabase.from("quotes").insert({
    job_id,
    technician_id,
    price_gbp,
    eta_minutes,
    status: "proposed",
    raw_message: notes ?? "Manual quote by dispatcher",
    confidence: "high",
  });

  await supabase
    .from("jobs")
    .update({
      assigned_technician_id: technician_id,
      status: "awaiting_payment",
      stripe_session_id: session.id,
      stripe_checkout_url: session.url,
    })
    .eq("id", job_id);

  if (job.customer_phone && session.url) {
    const payUrl = await shortenUrl(session.url, { kind: "job_full_payment", job_id });
    const msg =
      `Hi ${job.customer_name ?? ""} 👋 Tyrefly here.\n\n` +
      `We've got ${tech.name} ready for you in ${job.postcode}.\n` +
      `• Quote: £${price_gbp.toFixed(2)}\n` +
      `• ETA: ~${eta_minutes} mins from payment\n\n` +
      `Tap to pay securely (Apple Pay / Google Pay / card):\n${payUrl}\n\n` +
      `Once paid, ${tech.name} will call you to confirm and head over.`;
    try {
      await sendMessage(job.customer_phone, msg, "whatsapp", job_id);
    } catch (e) {
      console.error("manual dispatch customer message failed", e);
    }
  }

  await supabase.from("ops_alerts").insert({
    level: "info",
    title: "Manual dispatch sent",
    body: `${tech.name} assigned to job ${job_id.slice(0, 8)} — £${price_gbp}, ETA ${eta_minutes}m. Pay link sent to customer.`,
    job_id,
  });

  return { ok: true, checkout_url: session.url, session_id: session.id };
}
