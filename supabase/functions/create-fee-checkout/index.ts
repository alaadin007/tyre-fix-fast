// Creates a Stripe Checkout Session for the £20 platform connection fee.
// Returns the hosted Checkout URL — we SMS that URL to the customer.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { createStripeClient, corsHeaders } from "../_shared/stripe.ts";
import { feeForPhone, type FeeConfig } from "../_shared/region-fee.ts";

const BodySchema = z.object({
  job_id: z.string().uuid(),
  origin: z.string().url().optional(), // where to send the customer back after payment
});

async function resolvePriceId(stripe: ReturnType<typeof createStripeClient>, lookup: string) {
  // Look up by metadata.lovable_external_id (set automatically by batch_create_product)
  const list = await stripe.prices.list({
    lookup_keys: [lookup],
    active: true,
    limit: 1,
    expand: ["data.product"],
  });
  let price = list.data[0];
  if (!price) {
    const search = await stripe.prices.search({
      query: `metadata['lovable_external_id']:'${lookup}' AND active:'true'`,
      limit: 1,
    });
    price = search.data[0];
  }
  if (!price) throw new Error(`Price ${lookup} not found in Stripe`);

  // Managed Payments requires a tax_code on the product. Set one if missing.
  // txcd_20030000 = "Services - general" — appropriate for a platform/booking fee.
  const productId = typeof price.product === "string" ? price.product : price.product?.id;
  const productObj = typeof price.product === "object" ? price.product as any : null;
  if (productId && (!productObj || !productObj.tax_code)) {
    try {
      await stripe.products.update(productId, { tax_code: "txcd_20030000" });
    } catch (e) {
      console.error("failed to set tax_code on product", productId, e);
    }
  }
  return price.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { job_id, origin } = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("id, customer_name, customer_email, customer_phone, platform_fee_status, stripe_checkout_url")
      .eq("id", job_id)
      .single();
    if (jobErr || !job) throw new Error(`Job not found: ${jobErr?.message}`);

    if (job.platform_fee_status === "paid") {
      return new Response(JSON.stringify({ already_paid: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reuse an existing checkout link if we already minted one for this job.
    if (job.stripe_checkout_url) {
      return new Response(JSON.stringify({ url: job.stripe_checkout_url, reused: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fee: FeeConfig | null = feeForPhone(job.customer_phone);
    if (!fee) {
      return new Response(JSON.stringify({
        error: "unsupported_region",
        message: "Tyre Fly is currently available in the UK, US/Canada, and Europe. Coming soon to your region!",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Always sandbox in preview; webhook handler also keys off ?env=sandbox
    const env = "sandbox" as const;
    const stripe = createStripeClient(env);

    const priceId = await resolvePriceId(stripe, fee.priceLookup);
    const baseOrigin = origin?.replace(/\/$/, "") ?? "https://flat-tyre-near-me.lovable.app";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      // UK platform fee — full Stripe compliance handling on the £20
      managed_payments: { enabled: true },
      success_url: `${baseOrigin}/confirmed?job=${job_id}`,
      cancel_url: `${baseOrigin}/?canceled=1`,
      customer_email: job.customer_email ?? undefined,
      metadata: {
        job_id,
        kind: "platform_connection_fee",
        managed_payments: "true",
      },
      payment_intent_data: {
        metadata: { job_id, kind: "platform_connection_fee" },
        description: `FlatTyreNearMe platform fee — job ${job_id.slice(0, 8)}`,
      },
    });

    await supabase.from("jobs").update({
      stripe_session_id: session.id,
      stripe_checkout_url: session.url,
    }).eq("id", job_id);

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-fee-checkout error:", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
