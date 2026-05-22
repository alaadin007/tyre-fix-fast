// Admin-driven manual dispatch.
// 1. Assigns a chosen technician to a job
// 2. Creates a quote row (or marks an existing one as proposed)
// 3. Mints a Stripe Checkout Session for the full job amount (Apple Pay / Google Pay / card)
// 4. Sends the customer a WhatsApp/SMS with the quote summary + pay link
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  job_id: z.string().uuid(),
  technician_id: z.string().uuid(),
  price_gbp: z.number().min(1).max(5000),
  eta_minutes: z.number().int().min(1).max(480),
  notes: z.string().max(500).optional(),
  origin: z.string().url().optional(),
});

async function sendMsg(to: string, body: string, channel: "whatsapp" | "sms" = "whatsapp") {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { job_id, technician_id, price_gbp, eta_minutes, notes, origin } = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load job & tech in parallel
    const [{ data: job }, { data: tech }] = await Promise.all([
      supabase.from("jobs").select("id, customer_name, customer_email, customer_phone, postcode, issue_type, platform_fee_status").eq("id", job_id).single(),
      supabase.from("technicians").select("id, name, phone").eq("id", technician_id).single(),
    ]);
    if (!job) throw new Error("Job not found");
    if (!tech) throw new Error("Technician not found");

    // Stripe Checkout — dynamic amount, Apple Pay/Google Pay enabled by default
    const env = "live" as const;
    const stripe = createStripeClient(env);
    const baseOrigin = origin?.replace(/\/$/, "") ?? "https://tyrefly.com";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "gbp",
          product_data: {
            name: `Mobile tyre service — ${job.postcode}`,
            description: `${job.issue_type ?? "tyre job"} · ETA ${eta_minutes} min · Technician: ${tech.name}`,
          },
          unit_amount: Math.round(price_gbp * 100),
        },
        quantity: 1,
      }],
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
        description: `Tyre Fly — job ${job_id.slice(0, 8)} — ${job.postcode}`,
      },
    });

    // Persist quote + assignment
    await supabase.from("quotes").insert({
      job_id,
      technician_id,
      price_gbp,
      eta_minutes,
      status: "proposed",
      raw_message: notes ?? "Manual quote by dispatcher",
      confidence: "high",
    });

    await supabase.from("jobs").update({
      assigned_technician_id: technician_id,
      status: "awaiting_payment",
      stripe_session_id: session.id,
      stripe_checkout_url: session.url,
    }).eq("id", job_id);

    // WhatsApp customer with quote + pay link
    if (job.customer_phone) {
      const msg =
        `Hi ${job.customer_name ?? ""} 👋 Tyre Fly here.\n\n` +
        `We've got ${tech.name} ready for you in ${job.postcode}.\n` +
        `• Quote: £${price_gbp.toFixed(2)}\n` +
        `• ETA: ~${eta_minutes} mins from payment\n\n` +
        `Tap to pay securely (Apple Pay / Google Pay / card):\n${session.url}\n\n` +
        `Once paid, ${tech.name} will call you to confirm and head over.`;
      await sendMsg(job.customer_phone, msg, "whatsapp");
    }

    await supabase.from("ops_alerts").insert({
      level: "info",
      title: "Manual dispatch sent",
      body: `${tech.name} assigned to job ${job_id.slice(0, 8)} — £${price_gbp}, ETA ${eta_minutes}m. Pay link sent to customer.`,
      job_id,
    });

    return new Response(JSON.stringify({
      ok: true,
      checkout_url: session.url,
      session_id: session.id,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("manual-dispatch error:", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
