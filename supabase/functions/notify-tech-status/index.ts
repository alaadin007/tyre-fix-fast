// Notifies a technician via WhatsApp when their approval_status changes
// to 'approved' or 'rejected'. Triggered by a DB trigger on the technicians table.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { technician_id, status, reason } = await req.json();
    if (!technician_id || !["approved", "rejected"].includes(status)) {
      return new Response(JSON.stringify({ error: "invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tech } = await supabase
      .from("technicians")
      .select("id, name, phone, whatsapp")
      .eq("id", technician_id)
      .maybeSingle();

    if (!tech?.phone) {
      return new Response(JSON.stringify({ error: "technician not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firstName = tech.name ? String(tech.name).split(" ")[0] : "";
    const body = status === "approved"
      ? `🎉 Hi${firstName ? ` ${firstName}` : ""} — you're approved on Tyre Fly! We'll text you jobs near you.`
      : `Hi${firstName ? ` ${firstName}` : ""} — thanks for applying to Tyre Fly. We're unable to approve your profile right now${reason ? `: ${reason}` : "."}`;

    const to = tech.whatsapp || tech.phone;
    const sendRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ to, body, channel: "whatsapp" }),
    });
    const sendData = await sendRes.json().catch(() => ({}));

    return new Response(JSON.stringify({ ok: sendRes.ok, sendData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
