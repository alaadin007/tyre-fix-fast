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
  // Keep this in sync with the 6-char short ref used everywhere else
  // (twilio-inbound admin routing regex matches 6 hex chars). Using 8 here
  // caused the admin's "YES <REF>" reply to fall through to customer intake.
  return jobId.slice(0, 6).toUpperCase();
}

async function handleCheckoutCompleted(session: any) {
  const jobId = session?.metadata?.job_id;
  const kind = session?.metadata?.kind ?? "platform_connection_fee";
  const sessionTechnicianId: string | null = session?.metadata?.technician_id ?? null;
  if (!jobId) {
    console.warn("checkout.session.completed without job_id metadata");
    return;
  }
  const supabase = getSupabase();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, customer_name, customer_phone, postcode, assigned_technician_id, platform_fee_status, payment_notified_at, issue_type, issue_description, damage_summary, vehicle_reg, affected_wheels, lat, lng")
    .eq("id", jobId)
    .single();
  if (!job) {
    console.error("Job not found for session:", jobId);
    return;
  }
  if ((job as any).payment_notified_at) {
    console.log("Payment already notified, skipping:", jobId);
    return;
  }

  // Atomic claim: only one webhook invocation proceeds past this point.
  const { data: claimed, error: claimErr } = await supabase
    .from("jobs")
    .update({ payment_notified_at: new Date().toISOString() })
    .eq("id", jobId)
    .is("payment_notified_at", null)
    .select("id")
    .maybeSingle();
  if (claimErr || !claimed) {
    console.log("Notification already claimed by another invocation:", jobId);
    return;
  }

  // Resolve which technician the customer actually selected.
  // CRITICAL: when multiple quotes are sent (one Stripe link per tech),
  // session.metadata.technician_id is the only reliable source of truth —
  // job.assigned_technician_id may be unset or point at a different tech.
  const selectedTechId: string | null = sessionTechnicianId || (job as any).assigned_technician_id || null;
  console.log("payment confirmed", { jobId, sessionTechnicianId, jobAssigned: (job as any).assigned_technician_id, selectedTechId });

  const jobUpdate: Record<string, any> = {
    platform_fee_status: "paid",
    platform_fee_paid_at: new Date().toISOString(),
    stripe_payment_intent_id: session.payment_intent ?? null,
    status: "paid",
    assignment_status: "pending",
  };
  if (selectedTechId) jobUpdate.assigned_technician_id = selectedTechId;
  await supabase.from("jobs").update(jobUpdate).eq("id", jobId);

  // Mark the winning quote accepted; sibling quotes -> lost so dashboard
  // + downstream handoff know which tech the customer chose.
  if (selectedTechId) {
    await supabase.from("quotes")
      .update({ status: "accepted" })
      .eq("job_id", jobId)
      .eq("technician_id", selectedTechId);
    await supabase.from("quotes")
      .update({ status: "lost" })
      .eq("job_id", jobId)
      .neq("technician_id", selectedTechId)
      .in("status", ["pending", "accepted"]);
  }


  const amount = formatGbp(session?.amount_total);
  const ref = jobRef(jobId);
  const vehicleReg = job.vehicle_reg || "—";
  const issue = (job as any).damage_summary || (job as any).issue_description || (job as any).issue_type || "Tyre service";
  const wheels = Array.isArray((job as any).affected_wheels) && (job as any).affected_wheels.length
    ? (job as any).affected_wheels.join(", ") : "—";

  // ===== Customer message (short ack only — no tech details yet) =====
  if (job.customer_phone) {
    const customerMsg = [
      `✅ Payment Received — £${amount}`,
      ``,
      `Your roadside tyre service is confirmed.`,
      ``,
      `📋 Job #${ref}`,
      ``,
      `We will be sharing the technician details with you shortly.`,
      ``,
      `Thank you.`,
      `— Tyre Fly`,
    ].join("\n");
    await sendMsg(job.customer_phone, customerMsg, "whatsapp");
  }

  // ===== Fetch assigned technician + accepted quote for admin notification =====
  let techName = "—";
  let techPhone = "—";
  let quotedAmount: string = amount;
  try {
    if (job.assigned_technician_id) {
      const { data: tech } = await supabase
        .from("technicians")
        .select("name, phone")
        .eq("id", job.assigned_technician_id)
        .maybeSingle();
      if (tech) {
        techName = (tech as any).name ?? "—";
        techPhone = (tech as any).phone ?? "—";
      }
      const { data: quote } = await supabase
        .from("quotes")
        .select("price_gbp")
        .eq("job_id", jobId)
        .eq("technician_id", job.assigned_technician_id)
        .eq("status", "accepted")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (quote && (quote as any).price_gbp != null) {
        quotedAmount = String((quote as any).price_gbp);
      }
    }
  } catch (e) {
    console.error("fetch technician/quote for admin notification failed", e);
  }

  // Customer live/map location link
  const customerMapLink = (job as any).postcode
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((job as any).postcode)}`
    : ((job as any).lat != null && (job as any).lng != null
        ? `https://www.google.com/maps?q=${(job as any).lat},${(job as any).lng}`
        : "—");

  const nowStr = new Date().toLocaleString("en-GB", { timeZone: "Europe/London" });

  // ===== Admin notification + approval prompt =====
  const { data: masterSetting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "master_numbers")
    .maybeSingle();
  const masterNumbers: string[] = (((masterSetting as any)?.value?.numbers) ?? []).filter(Boolean);

  const compactMsg = [
    `💳 Payment Confirmed — Job #${ref}`,
    ``,
    `👤 Customer: ${job.customer_name ?? "—"}`,
    `💷 Amount Paid: £${amount}`,
    `🔧 Technician: ${techName}${techPhone !== "—" ? ` (${techPhone})` : ""}`,
    ``,
    `Ready to connect both parties.`,
    `Reply YES #${ref} to send details to both parties now.`,
  ].join("\n");

  for (const to of masterNumbers) {
    await sendMsg(to, compactMsg, "whatsapp");

    try {
      const normalized = to.replace(/^whatsapp:/, "").replace(/[^\d+]/g, "");
      await supabase.from("admin_states").upsert(
        { phone: normalized, step: "await_share_details_confirm", job_id: jobId, updated_at: new Date().toISOString() },
        { onConflict: "phone" },
      );
    } catch (e) {
      console.error("admin_states upsert failed", e);
    }
  }


  await supabase.from("ops_alerts").insert({
    level: "info",
    title: isFullPayment ? "Customer paid in full" : "Platform fee paid",
    body: `Job ${ref} — £${amount} received. Awaiting admin approval to share contact details.`,
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
