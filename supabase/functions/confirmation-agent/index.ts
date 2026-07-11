// Agent 4 — Confirmation Agent
// Called when payment succeeds (or via mock "mark paid" until Stripe is wired).
// POST { job_id, quote_id }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  job_id: z.string().uuid(),
  quote_id: z.string().uuid(),
});

async function send(to: string, body: string) {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-send`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ to, body, channel: "sms" }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { job_id, quote_id } = parsed.data;

    const { data: quote } = await supabase
      .from("quotes")
      .select("*, technicians(name, phone)")
      .eq("id", quote_id)
      .maybeSingle();
    const { data: job } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", job_id)
      .maybeSingle();
    if (!quote || !job) {
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("quotes").update({ status: "paid" }).eq("id", quote_id);
    await supabase.from("jobs").update({ status: "confirmed" }).eq("id", job_id);

    const techName = (quote as any).technicians?.name ?? "Your technician";
    const techPhone = (quote as any).technicians?.phone;

    // Customer SMS
    await send(
      job.customer_phone,
      `Confirmed! ${techName} is on the way to ${job.postcode}. ETA ${quote.eta_minutes} min. Reply HELP if you need anything.`,
    );
    // Technician SMS
    if (techPhone) {
      await send(
        techPhone,
        `Job confirmed: ${job.customer_name} at ${job.postcode}. £${quote.price_gbp}, ETA ${quote.eta_minutes} min. Customer phone: ${job.customer_phone}`,
      );
    }

    // Schedule the Review Agent (eta + 30 min)
    const runAt = new Date(Date.now() + ((quote.eta_minutes ?? 30) + 30) * 60_000).toISOString();
    await supabase.from("scheduled_tasks").insert({
      kind: "review_request",
      payload: { job_id, quote_id },
      run_at: runAt,
    });

    // Schedule a silence check (eta + 10 min)
    const silenceAt = new Date(Date.now() + ((quote.eta_minutes ?? 30) + 10) * 60_000).toISOString();
    await supabase.from("scheduled_tasks").insert({
      kind: "silence_check",
      payload: { job_id, technician_id: quote.technician_id },
      run_at: silenceAt,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("confirmation-agent error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
