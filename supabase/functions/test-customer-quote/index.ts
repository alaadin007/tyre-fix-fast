// One-off test: generates a real LIVE Stripe checkout link and sends the
// customer-quote-formatted WhatsApp message to all master admin numbers.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createStripeClient } from "../_shared/stripe.ts";
import { shortenUrl } from "../_shared/short-link.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const vehicleReg = "AB12 CDE";
    const issueLine = "Front-left tyre puncture (sidewall, non-repairable) — replacement required";
    const price = 96;
    const eta = 25;
    const jobShort = "TEST01";
    const postcode = "SW1A 1AA";
    const trackingUrl = `https://tyrefly.com/job/test-${jobShort.toLowerCase()}`;

    const stripe = createStripeClient("live");
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "gbp",
          product_data: {
            name: `Mobile tyre service — ${postcode}`,
            description: `${issueLine} · ETA ${eta} min`,
          },
          unit_amount: price * 100,
        },
        quantity: 1,
      }],
      success_url: `https://tyrefly.com/confirmed?job=test`,
      cancel_url: `https://tyrefly.com/?canceled=1`,
      metadata: { kind: "test_customer_quote_preview" },
      payment_intent_data: {
        metadata: { kind: "test_customer_quote_preview" },
        description: `Tyre Fly — TEST preview — ${postcode}`,
      },
    });

    const body =
      `🧪 TEST PREVIEW (this is what the customer will receive)\n\n` +
      `Hello John,\n\n` +
      `Your vehicle issue has been inspected by our technician.\n\n` +
      `🚗 Vehicle: ${vehicleReg}\n` +
      `🔧 Issue Found: ${issueLine}\n` +
      `💵 Repair Cost: £${price}\n` +
      `⏱ Estimated Arrival Time (ETA): ${eta} minutes\n\n` +
      `📍 Live Technician Location: ${trackingUrl}\n\n` +
      `To proceed with the service, please complete the payment using the secure Stripe link below:\n\n` +
      `💳 Payment Link: ${await shortenUrl(session.url!, { kind: "test_customer_quote_preview" })}\n\n` +
      `Once the payment is confirmed, the technician will proceed with the repair service at your location.\n\n` +
      `Thank you.\n— Tyre Fly`;

    const { data: setting } = await supabase
      .from("app_settings").select("value").eq("key", "master_numbers").maybeSingle();
    const numbers: string[] = ((setting?.value as any)?.numbers ?? []).filter(Boolean);

    const results = await Promise.allSettled(numbers.map((to) =>
      fetch(`${SUPABASE_URL}/functions/v1/twilio-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({ to, body, channel: "whatsapp" }),
      }).then(async (r) => ({ ok: r.ok, status: r.status, data: await r.json().catch(() => null) }))
    ));

    return new Response(JSON.stringify({
      ok: true, checkout_url: session.url, sent_to: numbers, results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("test-customer-quote error", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
