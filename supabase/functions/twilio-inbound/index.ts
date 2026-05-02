// Twilio inbound SMS webhook + AI technician allocation
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TWIML_OK = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Twilio posts application/x-www-form-urlencoded
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [k, v] of formData.entries()) params[k] = String(v);

    const fromRaw = params.From ?? "";
    const toRaw = params.To ?? "";
    // WhatsApp messages arrive as "whatsapp:+447..." — strip prefix and remember channel
    const isWhatsApp = fromRaw.startsWith("whatsapp:") || toRaw.startsWith("whatsapp:");
    const channel = isWhatsApp ? "whatsapp" : "sms";
    const from = fromRaw.replace(/^whatsapp:/, "");
    const to = toRaw.replace(/^whatsapp:/, "");
    const body = params.Body ?? "";
    const sid = params.MessageSid ?? null;
    const numMedia = parseInt(params.NumMedia ?? "0", 10) || 0;
    const mediaUrls: string[] = [];
    for (let i = 0; i < numMedia; i++) {
      const u = params[`MediaUrl${i}`];
      if (u) mediaUrls.push(u);
    }

    // 1. Save inbound message
    const { data: sms, error: smsErr } = await supabase
      .from("sms_messages")
      .insert({
        direction: "inbound",
        channel,
        from_number: from,
        to_number: to,
        body,
        twilio_sid: sid,
        num_media: numMedia,
        media_urls: mediaUrls,
        status: "received",
      })
      .select()
      .single();

    if (smsErr) console.error("sms insert error", smsErr);

    // 2. Try to extract a UK postcode for routing
    const postcodeMatch = body.match(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i);
    const postcode = postcodeMatch?.[1]?.toUpperCase().replace(/\s+/g, " ").trim() ?? null;

    // 3. Find matching technicians
    const { data: techs } = await supabase
      .from("technicians")
      .select("*")
      .eq("active", true);

    let allocation: { tech: any; reasoning: string; score: number } | null = null;

    if (techs && techs.length > 0) {
      // Score each tech
      const scored = techs.map((t: any) => {
        let score = 0;
        const reasons: string[] = [];
        if (postcode) {
          const outward = postcode.split(" ")[0];
          const matches = (t.service_postcodes ?? []).some((p: string) =>
            outward.startsWith(p.toUpperCase()) || p.toUpperCase().startsWith(outward),
          );
          if (matches) {
            score += 50;
            reasons.push(`covers ${outward}`);
          }
        }
        score += Number(t.rating ?? 0) * 5;
        reasons.push(`rating ${t.rating ?? "n/a"}`);
        score += Math.min(Number(t.jobs_completed ?? 0), 20);
        reasons.push(`${t.jobs_completed ?? 0} jobs done`);
        return { tech: t, score, reasoning: reasons.join(" · ") };
      });
      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];
      if (best) allocation = best;
    }

    // 4. Save allocation
    if (allocation) {
      await supabase.from("job_allocations").insert({
        technician_id: allocation.tech.id,
        ai_reasoning: postcode
          ? `Inbound SMS from ${from}. Detected postcode ${postcode}. Best match: ${allocation.tech.name} (${allocation.reasoning}).`
          : `Inbound SMS from ${from}. No postcode detected. Best fallback: ${allocation.tech.name} (${allocation.reasoning}).`,
        match_score: allocation.score,
        status: "proposed",
      });
    } else {
      await supabase.from("job_allocations").insert({
        technician_id: null,
        ai_reasoning: `Inbound SMS from ${from}. No active technicians available.`,
        match_score: 0,
        status: "unassigned",
      });
    }

    return new Response(TWIML_OK, {
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });
  } catch (e) {
    console.error("twilio-inbound error", e);
    return new Response(TWIML_OK, {
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });
  }
});
