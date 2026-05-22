// admin-send-quote
// Triggered from the Admin Dashboard "Send to customer" button.
// Mirrors the sendQuoteToCustomer helper used inside twilio-inbound when
// the admin replies "YES" on WhatsApp — same DB updates, same Stripe
// checkout, same customer WhatsApp message. The WhatsApp flow itself
// remains unchanged.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createStripeClient } from "../_shared/stripe.ts";
import { shortenUrl } from "../_shared/short-link.ts";
import { resolveQuoteLocationForAllocation } from "../_shared/quote-location.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendReply(to: string, body: string, channel = "whatsapp") {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-send`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ to, body, channel }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { job_id, quote_id } = await req.json();
    if (!job_id) throw new Error("job_id required");

    const { data: jobRow } = await supabase
      .from("jobs")
      .select("id,vehicle_reg,customer_name,customer_phone,customer_email,postcode,issue_type,issue_description,damage_summary,damage_type")
      .eq("id", job_id)
      .maybeSingle();
    if (!jobRow) throw new Error("Job not found");
    if (!jobRow.customer_phone) throw new Error("Customer has no phone on file");

    let quoteQuery = supabase
      .from("quotes")
      .select("id,technician_id,price_gbp,eta_minutes,tyre_included,tyre_condition")
      .eq("job_id", job_id);
    if (quote_id) quoteQuery = quoteQuery.eq("id", quote_id);
    else quoteQuery = quoteQuery.eq("status", "pending");

    const { data: quoteRow } = await quoteQuery
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!quoteRow) throw new Error("No quote found for this job");

    const mergedPrice = quoteRow.price_gbp;
    const mergedEta = quoteRow.eta_minutes;
    const tyreNote = quoteRow.tyre_included
      ? ` (incl. ${quoteRow.tyre_condition ?? ""} tyre)`.replace("  ", " ")
      : (quoteRow.tyre_included === false ? " (tyre NOT included)" : "");
    const issueLine =
      jobRow.damage_summary?.trim() ||
      jobRow.issue_description?.trim() ||
      jobRow.damage_type?.trim() ||
      jobRow.issue_type?.trim() ||
      "Tyre service required";
    const vehicleReg = jobRow.vehicle_reg?.toString().trim() || "Not provided";
    const shortRef = String(jobRow.id).slice(0, 6).toUpperCase();

    await supabase.from("quotes").update({ status: "accepted" }).eq("id", quoteRow.id);
    await supabase.from("quotes")
      .update({ status: "lost" })
      .eq("job_id", job_id)
      .eq("status", "pending")
      .neq("id", quoteRow.id);
    await supabase.from("jobs").update({
      status: "awaiting_payment",
      assigned_technician_id: quoteRow.technician_id,
    }).eq("id", job_id);

    let payUrl: string | null = null;
    try {
      const stripe = createStripeClient("live");
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "gbp",
            product_data: {
              name: `Mobile tyre service — ${jobRow.postcode ?? ""}`.trim(),
              description: `${issueLine} · ETA ${mergedEta} min`,
            },
            unit_amount: Math.round(Number(mergedPrice) * 100),
          },
          quantity: 1,
        }],
        success_url: `https://tyrefly.com/confirmed?job=${job_id}`,
        cancel_url: `https://tyrefly.com/job/${job_id}?canceled=1`,
        customer_email: jobRow.customer_email ?? undefined,
        metadata: {
          job_id, technician_id: quoteRow.technician_id, kind: "job_full_payment",
          price_gbp: String(mergedPrice), eta_minutes: String(mergedEta),
        },
        payment_intent_data: {
          metadata: { job_id, technician_id: quoteRow.technician_id, kind: "job_full_payment" },
          description: `Tyre Fly — job ${shortRef} — ${jobRow.postcode ?? ""}`.trim(),
        },
      });
      payUrl = await shortenUrl(session.url!, { kind: "job_full_payment", job_id });
      await supabase.from("jobs").update({
        stripe_session_id: session.id,
        stripe_checkout_url: session.url,
      }).eq("id", job_id);
    } catch (e) {
      console.error("stripe checkout (admin-send-quote) failed", e);
    }

    const trackingUrl = `https://tyrefly.com/job/${job_id}`;
    const customerBody =
      `Hello${jobRow.customer_name ? ` ${jobRow.customer_name}` : ""},\n\n` +
      `Your vehicle issue has been inspected by our technician.\n\n` +
      `🚗 Vehicle: ${vehicleReg}\n` +
      `🔧 Issue Found: ${issueLine}\n` +
      `💵 Repair Cost: £${mergedPrice}${tyreNote}\n` +
      `⏱ Estimated Arrival Time (ETA): ${mergedEta} minutes\n\n` +
      `📍 Live Technician Location: ${trackingUrl}\n\n` +
      (payUrl
        ? `To proceed with the service, please complete the payment using the secure Stripe link below:\n\n💳 Payment Link: ${payUrl}\n\n` +
          `Once the payment is confirmed, the technician will proceed with the repair service at your location.\n\n`
        : `We'll send your secure payment link shortly.\n\n`) +
      `Thank you.\n— Tyre Fly`;

    await sendReply(jobRow.customer_phone, customerBody, "whatsapp");

    return new Response(JSON.stringify({ ok: true, price: Number(mergedPrice) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("admin-send-quote error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
