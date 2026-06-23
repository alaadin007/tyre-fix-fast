// admin-forward-quotes
// Sends ONE consolidated WhatsApp message to the customer listing all
// selected quote options. Mirrors sendConsolidatedQuotesForJob in
// twilio-inbound, but restricted to the quote_ids passed in by the admin.
// Does NOT assign a technician or mark losers — that happens via the
// Stripe payment webhook when the customer pays.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isCustomerQuoteAmountValid, normalizeSuspiciousQuotePrice } from "../_shared/quote-price.ts";
import { createStripeClient } from "../_shared/stripe.ts";
import { shortenUrl } from "../_shared/short-link.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendReply(to: string, body: string, channel = "whatsapp") {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-send`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ to, body, channel }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data?.error) {
    console.error("sendReply failed", { to, channel, status: r.status, data });
    throw new Error(data?.error ?? `Message delivery failed (${r.status})`);
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { job_id, quote_ids } = await req.json();
    if (!job_id) throw new Error("job_id required");
    if (!Array.isArray(quote_ids) || quote_ids.length === 0) {
      throw new Error("quote_ids must be a non-empty array");
    }

    const { data: jobRow } = await supabase
      .from("jobs")
      .select("id,vehicle_reg,customer_name,customer_phone,customer_email,postcode,issue_type,issue_description,damage_summary,damage_type")
      .eq("id", job_id)
      .maybeSingle();
    if (!jobRow) throw new Error("Job not found");
    if (!jobRow.customer_phone) throw new Error("Customer has no phone on file");

    const { data: quoteRows } = await supabase
      .from("quotes")
      .select("id,technician_id,price_gbp,eta_minutes,raw_message,created_at")
      .eq("job_id", job_id)
      .in("id", quote_ids)
      .order("price_gbp", { ascending: true, nullsFirst: false });
    const quotes = quoteRows ?? [];
    if (quotes.length === 0) throw new Error("No quotes found for given ids");

    const techIds = Array.from(new Set(quotes.map((q: any) => q.technician_id).filter(Boolean))) as string[];
    const { data: techRows } = techIds.length
      ? await supabase.from("technicians").select("id, name, tech_code").in("id", techIds)
      : { data: [] as any[] };
    const techById = new Map((techRows ?? []).map((t: any) => [t.id, t]));

    const shortRef = String(jobRow.id).slice(0, 6).toUpperCase();
    const issueLine =
      jobRow.damage_summary?.trim() ||
      jobRow.issue_description?.trim() ||
      jobRow.damage_type?.trim() ||
      jobRow.issue_type?.trim() ||
      "Tyre service required";
    const vehicleReg = jobRow.vehicle_reg?.toString().trim() || "Not provided";

    const stripe = createStripeClient("live");

    const options: { name: string; price: number; eta: any; link: string | null }[] = [];
    for (const q of quotes) {
      const mergedPrice = normalizeSuspiciousQuotePrice(q.price_gbp, q.raw_message ?? "");
      if (!isCustomerQuoteAmountValid(mergedPrice)) continue;
      if (Number(q.price_gbp) !== Number(mergedPrice)) {
        await supabase.from("quotes").update({ price_gbp: mergedPrice }).eq("id", q.id);
      }
      const tech: any = techById.get(q.technician_id) ?? {};
      let payUrl: string | null = null;
      try {
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          line_items: [{
            price_data: {
              currency: "gbp",
              product_data: {
                name: `Mobile tyre service — ${jobRow.postcode ?? ""}`.trim(),
                description: `${issueLine} · ETA ${q.eta_minutes} min`,
              },
              unit_amount: Math.round(Number(mergedPrice) * 100),
            },
            quantity: 1,
          }],
          success_url: `https://tyrefly.com/confirmed?job=${jobRow.id}`,
          cancel_url: `https://tyrefly.com/job/${jobRow.id}?canceled=1`,
          customer_email: jobRow.customer_email ?? undefined,
          metadata: {
            job_id: jobRow.id, technician_id: q.technician_id, kind: "job_full_payment",
            price_gbp: String(mergedPrice), eta_minutes: String(q.eta_minutes),
          },
          payment_intent_data: {
            metadata: { job_id: jobRow.id, technician_id: q.technician_id, kind: "job_full_payment" },
            description: `Tyre Fly — job ${shortRef} — ${jobRow.postcode ?? ""}`.trim(),
          },
        });
        if (session?.url) {
          const shortened = await shortenUrl(session.url, { kind: "job_full_payment", job_id: jobRow.id });
          payUrl = shortened || session.url;
        }
      } catch (e) {
        console.error("consolidated stripe checkout failed", e);
      }
      options.push({
        name: tech.name ?? "Technician",
        price: Number(mergedPrice),
        eta: q.eta_minutes,
        link: payUrl,
      });
    }

    if (options.length === 0) throw new Error("Could not prepare any quote options");

    const isSingle = options.length === 1;
    const optionLines = options.map((o, i) =>
      `${isSingle ? o.name : `Option ${i + 1} — ${o.name}`}\n` +
      `💷 Repair Cost: £${o.price}\n` +
      `⏱ Estimated Arrival: ${o.eta} minutes\n` +
      `🔗 Payment Link: ${o.link ?? "to be sent shortly"}`
    ).join("\n\n");

    const introLine = isSingle
      ? `We have received a quote from our technician for your vehicle ${vehicleReg}:`
      : `We have received quotes from our technicians for your vehicle ${vehicleReg}. Please review and choose your preferred option:`;
    const outroLine = isSingle
      ? `Please tap the payment link above to confirm your booking. Once payment is confirmed, your technician will proceed to your location.`
      : `Please tap your preferred payment link to confirm your booking. Once payment is confirmed, your technician will proceed to your location.`;

    const body =
      `Job Reference: #${shortRef}\n\n` +
      `Hello${jobRow.customer_name ? ` ${jobRow.customer_name}` : ""},\n\n` +
      `${introLine}\n\n` +
      `${optionLines}\n\n` +
      `${outroLine}\n\n` +
      `Thank you.\n— Tyre Fly`;

    await sendReply(jobRow.customer_phone, body, "whatsapp");

    return new Response(JSON.stringify({ ok: true, count: options.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("admin-forward-quotes error", e);
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
