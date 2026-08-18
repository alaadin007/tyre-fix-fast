// Returns onboarding progress for a single technician, looked up by the exact
// WhatsApp number the requester types in. Runs server-side with the service
// role so the technicians table stays non-listable by anonymous clients, and
// only returns progress flags — never document URLs, email or location pins.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const raw = typeof body?.phone === "string" ? body.phone.replace(/[^\d]/g, "") : "";
    if (raw.length < 8 || raw.length > 15) {
      return new Response(JSON.stringify({ technician: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const candidates = Array.from(new Set([`+${raw}`, raw, `whatsapp:+${raw}`]));
    const { data } = await supabase
      .from("technicians")
      .select(
        "name, approval_status, service_postcodes, vehicle, travel_radius_miles, weekly_schedule, last_lat, last_lng, equipment_photo_urls, insurance_doc_url, id_doc_url, public_liability_doc_url",
      )
      .in("phone", candidates)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      return new Response(JSON.stringify({ technician: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const technician = {
      name: data.name,
      approval_status: data.approval_status,
      service_postcodes: data.service_postcodes ?? [],
      vehicle: data.vehicle,
      travel_radius_miles: data.travel_radius_miles,
      weekly_schedule: data.weekly_schedule ?? null,
      // progress flags only — no coordinates or document URLs are returned
      has_location_pin: data.last_lat !== null && data.last_lng !== null,
      has_equipment_photo: (data.equipment_photo_urls?.length ?? 0) > 0,
      has_insurance_doc: !!data.insurance_doc_url,
      has_id_doc: !!data.id_doc_url,
      has_public_liability_doc: !!data.public_liability_doc_url,
    };

    return new Response(JSON.stringify({ technician }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tech-progress error", e);
    return new Response(JSON.stringify({ technician: null }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
