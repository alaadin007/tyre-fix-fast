// admin-assign-technician
// Thin wrapper: dashboard parity for the WhatsApp admin "assign technician" action.
// Sets jobs.assigned_technician_id to the chosen technician, optionally marks the
// previous accepted quote as lost + the new tech's quote (if any) as accepted, and
// notifies the new technician on WhatsApp that they have been assigned. Does NOT
// share customer/technician contact details — that remains the job of
// admin-share-details (which only runs after payment).
//
// The existing WhatsApp admin flow is untouched.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
    console.error("admin-assign-technician sendReply failed", { to, status: r.status, data });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { job_id, technician_id } = await req.json();
    if (!job_id || typeof job_id !== "string") throw new Error("job_id required");
    if (!technician_id || typeof technician_id !== "string") throw new Error("technician_id required");

    const { data: job } = await supabase
      .from("jobs")
      .select("id, status, postcode, vehicle_reg, affected_wheels, issue_type, issue_description, damage_summary, assigned_technician_id")
      .eq("id", job_id)
      .maybeSingle();
    if (!job) throw new Error("Job not found");

    const { data: newTech } = await supabase
      .from("technicians")
      .select("id, name, phone, whatsapp")
      .eq("id", technician_id)
      .maybeSingle();
    if (!newTech) throw new Error("Technician not found");

    const previousTechId = job.assigned_technician_id;
    const isReassign = !!previousTechId && previousTechId !== technician_id;

    // Mark prior accepted quote as lost (if reassigning).
    if (isReassign) {
      await supabase
        .from("quotes")
        .update({ status: "lost" })
        .eq("job_id", job_id)
        .eq("technician_id", previousTechId)
        .eq("status", "accepted");
    }

    // If the new technician has a quote on this job, mark it accepted.
    await supabase
      .from("quotes")
      .update({ status: "accepted" })
      .eq("job_id", job_id)
      .eq("technician_id", technician_id)
      .in("status", ["proposed", "submitted", "sent"]);

    await supabase
      .from("jobs")
      .update({ assigned_technician_id: technician_id })
      .eq("id", job_id);

    const ref = String(job_id).slice(0, 6).toUpperCase();
    const issue = job.damage_summary || job.issue_type || "Tyre service";
    const wheels = Array.isArray(job.affected_wheels) && job.affected_wheels.length
      ? job.affected_wheels.join(", ") : "—";

    // Notify the newly assigned technician.
    const newPhone = newTech.phone || newTech.whatsapp;
    if (newPhone) {
      const msg = [
        `🔔 You've been assigned — Job #${ref}`,
        ``,
        `Issue:    ${issue}`,
        `Reg:      ${job.vehicle_reg || "—"}`,
        `Wheels:   ${wheels}`,
        `Postcode: ${job.postcode ?? "—"}`,
        ``,
        `Customer contact details will be shared once payment is confirmed.`,
        ``,
        `— Tyre Fly`,
      ].join("\n");
      await sendReply(newPhone, msg, "whatsapp");
    }

    // Notify the previously-assigned technician (if any) that they were unassigned.
    if (isReassign) {
      const { data: prev } = await supabase
        .from("technicians")
        .select("phone, whatsapp")
        .eq("id", previousTechId)
        .maybeSingle();
      const prevPhone = prev?.phone || prev?.whatsapp;
      if (prevPhone) {
        await sendReply(
          prevPhone,
          `ℹ️ Job #${ref} has been reassigned to another technician. No further action needed. — Tyre Fly`,
          "whatsapp",
        );
      }
    }

    await supabase.from("ops_alerts").insert({
      level: "info",
      title: isReassign ? "Technician reassigned (dashboard)" : "Technician assigned (dashboard)",
      body: `Job ${ref} → ${newTech.name ?? technician_id.slice(0, 6)}${isReassign ? ` (was ${previousTechId?.slice(0, 6)})` : ""}`,
      job_id,
    });

    return new Response(JSON.stringify({ ok: true, reassigned: isReassign }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("admin-assign-technician error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
