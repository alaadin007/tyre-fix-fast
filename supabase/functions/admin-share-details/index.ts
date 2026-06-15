// admin-share-details
// Triggered by the Admin Dashboard "Yes, send details" approval action.
// Mirrors shareContactsForJobId inside twilio-inbound — same WhatsApp
// messages to customer + technician, same DB updates. The WhatsApp flow
// itself is unchanged.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { resolveQuoteLocationForAllocation } from "../_shared/quote-location.ts";
import { shortenUrl } from "../_shared/short-link.ts";

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
    const { job_id } = await req.json();
    if (!job_id) throw new Error("job_id required");

    const { data: job } = await supabase
      .from("jobs")
      .select("id, customer_name, customer_phone, postcode, assigned_technician_id, vehicle_reg, affected_wheels, issue_type, issue_description, damage_summary, lat, lng")
      .eq("id", job_id)
      .maybeSingle();
    if (!job) throw new Error("Job not found");
    if (!job.assigned_technician_id) throw new Error("No technician assigned to this job");

    const { data: tech } = await supabase
      .from("technicians")
      .select("id, name, phone, last_lat, last_lng")
      .eq("id", job.assigned_technician_id)
      .maybeSingle();
    if (!tech?.phone) throw new Error("Technician has no phone on file");

    let quotedAmount: string | null = null;
    const { data: quoteRow } = await supabase
      .from("quotes")
      .select("price_gbp")
      .eq("job_id", job_id)
      .eq("technician_id", tech.id)
      .eq("status", "accepted")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (quoteRow?.price_gbp != null) quotedAmount = String(quoteRow.price_gbp);

    const ref = String(job_id).slice(0, 6).toUpperCase();
    const issue = job.damage_summary || job.issue_type || "Tyre service";
    const wheels = Array.isArray(job.affected_wheels) && job.affected_wheels.length
      ? job.affected_wheels.join(", ") : "—";
    const vehicleReg = job.vehicle_reg || "—";

    const customerMapLink = job.postcode
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.postcode)}`
      : (job.lat != null && job.lng != null
          ? `https://www.google.com/maps?q=${job.lat},${job.lng}`
          : "—");

    let techLocLink = "Will be shared once technician shares live location";
    try {
      const { data: alloc } = await supabase
        .from("job_allocations")
        .select("created_at")
        .eq("job_id", job_id)
        .eq("technician_id", tech.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { data: locRows } = await supabase
        .from("technician_locations")
        .select("lat,lng,created_at,expires_at")
        .eq("technician_id", tech.id)
        .order("created_at", { ascending: false })
        .limit(20);
      const resolved = resolveQuoteLocationForAllocation({
        techPin: null,
        allocationCreatedAt: alloc?.created_at ?? null,
        locationRows: locRows ?? [],
      });
      if (resolved.hasPin && resolved.lat != null && resolved.lng != null) {
        const longUrl = `https://maps.google.com/?q=${resolved.lat},${resolved.lng}`;
        techLocLink = await shortenUrl(longUrl, { kind: "tech_live_location", job_id });
      } else if (tech.last_lat != null && tech.last_lng != null) {
        techLocLink = `https://www.google.com/maps?q=${tech.last_lat},${tech.last_lng}`;
      }
    } catch (e) {
      console.error("resolve tech location for admin-share-details failed", e);
    }

    if (job.customer_phone) {
      const customerMsg = [
        `👨‍🔧 Your Technician Details — Job #${ref}`,
        ``,
        `Name:  ${tech.name ?? "—"}`,
        `Phone: ${tech.phone}`,
        `📍 Live Location: ${techLocLink}`,
        ``,
        `They will contact you shortly to confirm ETA.`,
        ``,
        `— Tyre Fly`,
      ].join("\n");
      await sendReply(job.customer_phone, customerMsg, "whatsapp");
    }

    const paidLine = `✅ Payment received.`;
    const techMsg = [
      `🔔 Job Confirmed — #${ref}`,
      ``,
      paidLine,
      ``,
      `👤 Customer Details`,
      `━━━━━━━━━━━━━━━`,
      `Name:  ${job.customer_name ?? "—"}`,
      `Phone: ${job.customer_phone ?? "—"}`,
      `Postcode: ${job.postcode ?? "—"}`,
      `🗺️ Map: ${customerMapLink}`,
      ``,
      `🛞 Job Details`,
      `━━━━━━━━━━━━━━━`,
      `Issue:  ${issue}`,
      ...(job.issue_description && job.issue_description.trim() ? [`📝 Customer description: ${job.issue_description.trim()}`] : []),
      `Reg:    ${vehicleReg}`,
      `Wheels: ${wheels}`,
      ``,
      `Please contact the customer directly now to confirm your ETA and proceed with the repair.`,
      ``,
      `When the job is complete, reply: Done ${ref}`,
    ].join("\n");
    await sendReply(tech.phone, techMsg, "whatsapp");

    await supabase.from("jobs").update({ status: "in_progress", assignment_status: "details_sent" }).eq("id", job_id);
    await supabase.from("ops_alerts").insert({
      level: "info",
      title: "Contacts shared (dashboard)",
      body: `Job ${ref} — admin approved share via dashboard; customer & technician details exchanged.`,
      job_id,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("admin-share-details error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
