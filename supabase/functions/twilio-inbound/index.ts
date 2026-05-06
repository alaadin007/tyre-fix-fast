// Twilio inbound webhook — routes to the right Agent
// 1. From a known technician → Parsing Agent (extract price + ETA → quotes)
// 2. From a known customer with a numeric reply → Review Agent (rating)
// 3. From a known customer with "yes"/"accept" → quote acceptance
// 4. Anything else → log only (Co-Pilot can review)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TWIML_OK = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

function normPhone(p: string): string {
  return (p || "").replace(/^whatsapp:/, "").replace(/[^\d+]/g, "");
}

const COORD_RE = /\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)/;

async function reverseGeocodePostcode(lat: number, lng: number): Promise<string | null> {
  try {
    const nominatim = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { "User-Agent": "tyre-fix-fast/1.0" } },
    );
    if (nominatim.ok) {
      const j = await nominatim.json();
      const pc = j?.address?.postcode;
      if (typeof pc === "string" && pc.trim()) return pc.trim().toUpperCase();
    }
  } catch (e) {
    console.error("nominatim reverse geocode failed", e);
  }

  try {
    const r = await fetch(`https://api.postcodes.io/postcodes?lon=${lng}&lat=${lat}&limit=1`);
    if (r.ok) {
      const j = await r.json();
      const pc = j?.result?.[0]?.postcode;
      if (typeof pc === "string" && pc.trim()) return pc.trim().toUpperCase();
    }
  } catch (e) {
    console.error("postcodes.io reverse geocode failed", e);
  }

  return null;
}

async function aiExtractQuote(text: string): Promise<{
  price_gbp: number | null;
  callout_fee_gbp: number | null;
  eta_minutes: number | null;
  accepts: boolean;
  tyre_included: boolean | null;
  tyre_condition: "new" | "used" | null;
  notes: string;
  confidence: "high" | "medium" | "low";
}> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return { price_gbp: null, callout_fee_gbp: null, eta_minutes: null, accepts: false, tyre_included: null, tyre_condition: null, notes: "no api key", confidence: "low" };
  }
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "You parse mobile-tyre technician WhatsApp/SMS bids. Extract: are they accepting the job (free now?), ETA in minutes, callout/labour fee in GBP, whether they include a replacement tyre, and if so whether it's new or used and its price. Examples:\n" +
            "'Yes free now, 20 mins, £40 callout, no tyre' → accepts true, eta 20, callout 40, tyre_included false.\n" +
            "'Y, 25, 50 callout + 80 for new tyre' → accepts true, eta 25, callout 50, tyre_included true, tyre_condition new, price 130.\n" +
            "'on it, 15 min, £120 all in (used tyre included)' → accepts true, eta 15, callout 120, tyre_included true, tyre_condition used, price 120.\n" +
            "'sorry busy' → accepts false.",
        },
        { role: "user", content: text },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_quote",
            description: "Submit the parsed technician bid",
            parameters: {
              type: "object",
              properties: {
                price_gbp: { type: ["number", "null"], description: "Total price in GBP (callout + tyre if included)." },
                callout_fee_gbp: { type: ["number", "null"], description: "Just the callout/labour portion." },
                eta_minutes: { type: ["integer", "null"] },
                accepts: { type: "boolean", description: "Is the technician free and willing right now?" },
                tyre_included: { type: ["boolean", "null"], description: "Did they include a replacement tyre in the quote?" },
                tyre_condition: { type: ["string", "null"], enum: ["new", "used", null] },
                notes: { type: "string" },
                confidence: { type: "string", enum: ["high", "medium", "low"] },
              },
              required: ["accepts", "confidence", "notes"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "submit_quote" } },
    }),
  });
  if (!r.ok) {
    console.error("AI parse failed", r.status, await r.text());
    return { price_gbp: null, callout_fee_gbp: null, eta_minutes: null, accepts: false, tyre_included: null, tyre_condition: null, notes: "ai error", confidence: "low" };
  }
  const data = await r.json();
  try {
    const args = JSON.parse(data.choices[0].message.tool_calls[0].function.arguments);
    return {
      price_gbp: args.price_gbp ?? args.callout_fee_gbp ?? null,
      callout_fee_gbp: args.callout_fee_gbp ?? null,
      eta_minutes: args.eta_minutes ?? null,
      accepts: !!args.accepts,
      tyre_included: args.tyre_included ?? null,
      tyre_condition: args.tyre_condition ?? null,
      notes: args.notes ?? "",
      confidence: args.confidence ?? "low",
    };
  } catch (e) {
    console.error("AI parse JSON error", e);
    return { price_gbp: null, callout_fee_gbp: null, eta_minutes: null, accepts: false, tyre_included: null, tyre_condition: null, notes: "parse failed", confidence: "low" };
  }
}

// Decide whether an inbound message from a known customer relates to their
// existing open job, or is a brand new job request.
async function aiClassifyJobContinuity(args: {
  body: string;
  hasMedia: boolean;
  job: {
    id: string;
    status: string;
    issue_type: string | null;
    postcode: string | null;
    created_at: string;
    issue_description: string | null;
  };
}): Promise<"same_job" | "new_job"> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  // Heuristic: a fresh greeting with no media and no detail almost always = new job
  const greetingOnly = /^(hi|hey|hello|yo|hiya)\b[\s!.,]*(tyre\s*fly)?[\s!.,-]*(i\s+need\s+(tyre\s+)?help|help|need\s+help)?\s*$/i
    .test(args.body.trim());
  if (greetingOnly && !args.hasMedia) return "new_job";
  if (!LOVABLE_API_KEY) return "same_job"; // safe default
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You decide if a UK mobile-tyre customer's new WhatsApp/SMS message is about their EXISTING open job or a BRAND NEW job. " +
              "Return same_job if it adds info, asks status, sends a photo, or replies to a question. " +
              "Return new_job if it's a fresh greeting like 'hi', 'I need tyre help', or describes a different vehicle/incident, or if the existing job is clearly already finished from the customer's perspective. When in doubt about a generic greeting with no specifics, prefer new_job.",
          },
          {
            role: "user",
            content:
              `Existing job: status=${args.job.status}, issue=${args.job.issue_type ?? "?"}, postcode=${args.job.postcode ?? "?"}, opened=${args.job.created_at}.\n` +
              `Existing description (truncated): ${(args.job.issue_description ?? "").slice(0, 300)}\n\n` +
              `New inbound message: "${args.body}"\n` +
              `Has photo/voice attached: ${args.hasMedia}`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify",
            parameters: {
              type: "object",
              properties: {
                relation: { type: "string", enum: ["same_job", "new_job"] },
                reason: { type: "string" },
              },
              required: ["relation"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "classify" } },
      }),
    });
    if (!r.ok) {
      console.error("aiClassifyJobContinuity failed", r.status);
      return "same_job";
    }
    const j = await r.json();
    const args2 = JSON.parse(j.choices[0].message.tool_calls[0].function.arguments);
    console.log("job continuity classify", JSON.stringify(args2));
    return args2.relation === "new_job" ? "new_job" : "same_job";
  } catch (e) {
    console.error("aiClassifyJobContinuity error", e);
    return "same_job";
  }
}

// Detect intent to join as a technician
const TECH_JOIN_RE = /\b(become|join|sign[\s-]?up|apply|onboard)\b.*\b(tech|fitter|tyre|tire)\b|\b(i'?m|i am)\s+a\s+(mobile\s+)?(tyre|tire)\s+(fitter|technician|guy)\b|\bi\s+fit\s+(tyres|tires)\b|\bwant\s+to\s+(join|work)\b|^join$|^apply$|tyre\s*fly\s+technician/i;

async function aiExtractTechProfile(args: {
  history: string;
  latest: string;
  hasMedia: boolean;
  mediaCount: number;
  current: any;
}): Promise<{
  name: string | null;
  service_postcodes: string[] | null;
  vehicle: string | null;
  travel_radius_miles: number | null;
  weekly_schedule: Record<string, string> | null;
  availability_summary: string | null;
  media_classification: Array<"insurance" | "id" | "public_liability" | "equipment" | "other"> | null;
  reply: string;
  ready_for_review: boolean;
}> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return {
      name: null, service_postcodes: null, vehicle: null, travel_radius_miles: null,
      weekly_schedule: null, availability_summary: null, media_classification: null,
      reply: "Thanks — we'll be in touch.", ready_for_review: false,
    };
  }
  const sys =
    "You are Tyre Fly's onboarding agent. You're chatting with a mobile-tyre technician applying to join. " +
    "Be warm, brief, one short message at a time. Collect: full name, service area (UK postcodes like W5/SW1A, or US ZIPs like 90210, or Canadian postcodes, or city names — accept whatever they give, do NOT reformat), vehicle (make/model/year), travel radius (accept km — convert to miles, 1 km = 0.621 miles, round to nearest int), weekly availability (free text → JSON like {mon:'9-6', tue:'9-6', sat:'off'}), live location pin (📍), equipment photo, insurance doc photo, ID doc photo, public liability doc photo. " +
    "Look at conversation history to know what's already collected. Ask for the NEXT missing item only. When everything is collected, set ready_for_review=true and reply confirming review. " +
    "If the latest message has media, classify EACH attachment as one of insurance|id|public_liability|equipment|other based on context (what they were last asked for, or what they say). Return one entry per attachment in media_classification array, in order.";
  const user =
    `Conversation so far:\n${args.history}\n\n` +
    `Already collected: name=${args.current.name ?? "?"}, ` +
    `service_postcodes=${JSON.stringify(args.current.service_postcodes ?? [])}, ` +
    `vehicle=${args.current.vehicle ?? "?"}, ` +
    `travel_radius_miles=${args.current.travel_radius_miles ?? "?"}, ` +
    `weekly_schedule=${JSON.stringify(args.current.weekly_schedule ?? {})}, ` +
    `live_location=${args.current.last_lat ? "yes" : "no"}, ` +
    `equipment_photos=${(args.current.equipment_photo_urls ?? []).length}, ` +
    `insurance_doc=${args.current.insurance_doc_url ? "yes" : "no"}, ` +
    `id_doc=${args.current.id_doc_url ? "yes" : "no"}, ` +
    `public_liability_doc=${args.current.public_liability_doc_url ? "yes" : "no"}\n\n` +
    `Latest message: "${args.latest}"\nAttachments on this message: ${args.mediaCount}`;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
        tools: [{
          type: "function",
          function: {
            name: "update_profile",
            parameters: {
              type: "object",
              properties: {
                name: { type: ["string", "null"] },
                service_postcodes: { type: ["array", "null"], items: { type: "string" } },
                vehicle: { type: ["string", "null"] },
                travel_radius_miles: { type: ["integer", "null"] },
                weekly_schedule: { type: ["object", "null"], additionalProperties: { type: "string" } },
                availability_summary: { type: ["string", "null"] },
                media_classification: {
                  type: ["array", "null"],
                  items: { type: "string", enum: ["insurance", "id", "public_liability", "equipment", "other"] },
                },
                reply: { type: "string", description: "What to send back to the technician now (one short message)." },
                ready_for_review: { type: "boolean" },
              },
              required: ["reply", "ready_for_review"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "update_profile" } },
      }),
    });
    if (!r.ok) {
      console.error("aiExtractTechProfile failed", r.status, await r.text());
      return { name: null, service_postcodes: null, vehicle: null, travel_radius_miles: null, weekly_schedule: null, availability_summary: null, media_classification: null, reply: "Got it — what's next?", ready_for_review: false };
    }
    const j = await r.json();
    const a = JSON.parse(j.choices[0].message.tool_calls[0].function.arguments);
    return {
      name: a.name ?? null,
      service_postcodes: a.service_postcodes ?? null,
      vehicle: a.vehicle ?? null,
      travel_radius_miles: a.travel_radius_miles ?? null,
      weekly_schedule: a.weekly_schedule ?? null,
      availability_summary: a.availability_summary ?? null,
      media_classification: a.media_classification ?? null,
      reply: a.reply ?? "Thanks!",
      ready_for_review: !!a.ready_for_review,
    };
  } catch (e) {
    console.error("aiExtractTechProfile error", e);
    return { name: null, service_postcodes: null, vehicle: null, travel_radius_miles: null, weekly_schedule: null, availability_summary: null, media_classification: null, reply: "Got it — what's next?", ready_for_review: false };
  }
}

async function sendReply(to: string, body: string, channel: "sms" | "whatsapp") {
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
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [k, v] of formData.entries()) params[k] = String(v);

    const fromRaw = params.From ?? "";
    const toRaw = params.To ?? "";
    const isWhatsApp = fromRaw.startsWith("whatsapp:") || toRaw.startsWith("whatsapp:");
    const channel = isWhatsApp ? "whatsapp" : "sms";
    const from = fromRaw.replace(/^whatsapp:/, "");
    const to = toRaw.replace(/^whatsapp:/, "");
    const body = (params.Body ?? "").trim();
    const sid = params.MessageSid ?? null;
    const numMedia = parseInt(params.NumMedia ?? "0", 10) || 0;
    const mediaUrls: string[] = [];

    // Twilio media URLs require Basic Auth. Download with credentials and
    // re-upload to our public job-photos bucket so they render in the browser
    // and survive Twilio's retention window.
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");

    for (let i = 0; i < numMedia; i++) {
      const u = params[`MediaUrl${i}`];
      const ct = params[`MediaContentType${i}`] || "image/jpeg";
      if (!u) continue;
      try {
        const headers: Record<string, string> = {};
        if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
          headers["Authorization"] = "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
        }
        const mediaRes = await fetch(u, { headers, redirect: "follow" });
        if (!mediaRes.ok) {
          console.error("media fetch failed", u, mediaRes.status);
          mediaUrls.push(u);
          continue;
        }
        const buf = new Uint8Array(await mediaRes.arrayBuffer());
        const ext = (ct.split("/")[1] || "jpg").split(";")[0];
        const path = `inbound/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("job-photos")
          .upload(path, buf, { contentType: ct, upsert: false });
        if (upErr) {
          console.error("media upload failed", upErr);
          mediaUrls.push(u);
          continue;
        }
        const { data: pub } = supabase.storage.from("job-photos").getPublicUrl(path);
        mediaUrls.push(pub.publicUrl);
      } catch (e) {
        console.error("media handling error", e);
        mediaUrls.push(u);
      }
    }

    // 1. Always log
    await supabase.from("sms_messages").insert({
      direction: "inbound",
      channel,
      from_number: from,
      to_number: to,
      body,
      twilio_sid: sid,
      num_media: numMedia,
      media_urls: mediaUrls,
      status: "received",
    });

    const fromN = normPhone(from);

    // 1b. Master admin? → can add technicians via SMS
    const { data: masterSetting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "master_numbers")
      .maybeSingle();
    const masterNumbers: string[] = ((masterSetting?.value as any)?.numbers ?? []).map((n: string) => normPhone(n));
    const isMaster = masterNumbers.includes(fromN);

    if (isMaster) {
      const trimmed = body.trim();

      // HELP
      if (/^\s*help\s*$/i.test(trimmed)) {
        await sendReply(
          from,
          "Admin commands:\n" +
          "• ADD TECH: Name | +447... | W5,W12 | Vehicle | Notes | lat,lng or postcode\n" +
          "• PENDING — list applicants awaiting approval\n" +
          "• APPROVE <id-or-phone>\n" +
          "• REJECT <id-or-phone> [reason]\n" +
          "• JOBS — list 5 latest jobs",
          channel,
        );
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // PENDING list
      if (/^\s*pending\s*$/i.test(trimmed)) {
        const { data: pend } = await supabase
          .from("technicians")
          .select("id,name,phone,service_postcodes,created_at")
          .eq("approval_status", "pending")
          .order("created_at", { ascending: false })
          .limit(10);
        if (!pend || pend.length === 0) {
          await sendReply(from, "No pending technician applications.", channel);
        } else {
          const lines = pend.map((t: any) =>
            `• ${t.id.slice(0, 6)} — ${t.name} ${t.phone} (${(t.service_postcodes ?? []).join(",") || "no postcodes"})`,
          ).join("\n");
          await sendReply(from, `Pending applications:\n${lines}\n\nReply: APPROVE <id> or REJECT <id> reason`, channel);
        }
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // JOBS recent
      if (/^\s*jobs\s*$/i.test(trimmed)) {
        const { data: js } = await supabase
          .from("jobs")
          .select("id,customer_name,postcode,issue_type,status,created_at")
          .order("created_at", { ascending: false })
          .limit(5);
        if (!js || js.length === 0) {
          await sendReply(from, "No jobs yet.", channel);
        } else {
          const lines = js.map((j: any) =>
            `• ${j.id.slice(0, 6)} ${j.customer_name} ${j.postcode} ${j.issue_type} [${j.status}]`,
          ).join("\n");
          await sendReply(from, `Latest jobs:\n${lines}`, channel);
        }
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // APPROVE / REJECT
      const apMatch = trimmed.match(/^\s*(approve|reject)\s+(\S+)\s*(.*)$/i);
      if (apMatch) {
        const action = apMatch[1].toLowerCase();
        const idOrPhone = apMatch[2];
        const reason = apMatch[3]?.trim() || null;
        let q = supabase.from("technicians").select("id,name,phone,approval_status");
        if (idOrPhone.startsWith("+")) q = q.eq("phone", idOrPhone);
        else q = q.ilike("id", `${idOrPhone}%`);
        const { data: matches } = await q.limit(2);
        if (!matches || matches.length === 0) {
          await sendReply(from, `No technician found for "${idOrPhone}". Try PENDING.`, channel);
        } else if (matches.length > 1) {
          await sendReply(from, `Multiple matches — use a longer id prefix.`, channel);
        } else {
          const t: any = matches[0];
          if (action === "approve") {
            await supabase.from("technicians").update({
              approval_status: "approved",
              approved_at: new Date().toISOString(),
              active: true,
            }).eq("id", t.id);
            await sendReply(from, `✅ Approved ${t.name} (${t.phone}). They're live for dispatch.`, channel);
            // Tell the technician
            try {
              await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-send`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
                body: JSON.stringify({ to: t.phone, body: `🎉 You're approved on Tyre Fly. We'll text you jobs near you.`, channel: "whatsapp" }),
              });
            } catch (_) {}
          } else {
            await supabase.from("technicians").update({
              approval_status: "rejected",
              active: false,
              rejected_reason: reason,
            }).eq("id", t.id);
            await sendReply(from, `❌ Rejected ${t.name}${reason ? ` (${reason})` : ""}.`, channel);
          }
        }
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // ADD TECH
      if (/^\s*add\s+tech/i.test(trimmed)) {
        // Format: ADD TECH: Name | +447... | W5,W12 | Vehicle | Notes | lat,lng or postcode
        const payload = trimmed.replace(/^\s*add\s+tech\s*[:\-]?\s*/i, "");
        const parts = payload.split("|").map((s) => s.trim());
        const [name, phone, postcodes, vehicle, notes, location] = parts;
        if (!name || !phone || !postcodes) {
          await sendReply(
            from,
            "Format: ADD TECH: Name | +447... | W5,W12 | Vehicle | Notes | lat,lng",
            channel,
          );
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
        const pcs = postcodes.split(",").map((p) => p.trim().toUpperCase()).filter(Boolean);
        let lat: number | null = null;
        let lng: number | null = null;
        if (location) {
          const m = location.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
          if (m) { lat = Number(m[1]); lng = Number(m[2]); }
        }
        const insertData: any = {
          name,
          phone: phone.trim(),
          service_postcodes: pcs,
          vehicle: vehicle || null,
          notes: notes || null,
          active: true,
          approval_status: "approved",
          approved_at: new Date().toISOString(),
        };
        if (lat !== null && lng !== null) {
          insertData.last_lat = lat;
          insertData.last_lng = lng;
          insertData.last_location_at = new Date().toISOString();
        }
        const { error: insErr } = await supabase.from("technicians").insert(insertData);
        if (insErr) {
          await sendReply(from, `Couldn't add: ${insErr.message}`, channel);
        } else {
          await sendReply(
            from,
            `✅ Added ${name} (${pcs.join(", ")})${lat !== null ? ` 📍${lat.toFixed(3)},${lng!.toFixed(3)}` : ""} — live in dispatch.`,
            channel,
          );
        }
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }
    }

    // 2. Technician? → Parsing Agent
    const { data: techMatch } = await supabase
      .from("technicians")
      .select("*")
      .eq("active", true);
    const tech = (techMatch ?? []).find((t: any) => normPhone(t.phone) === fromN);

    if (tech) {
      // If they shared a location pin (the meta webhook converts pins to
      // text containing "(lat, lng)"), capture it as their current location.
      const techCoords = body.match(COORD_RE);
      if (techCoords) {
        const lat = Number(techCoords[1]);
        const lng = Number(techCoords[2]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          const now = new Date();
          const expires = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 8 hours
          await supabase.from("technicians").update({
            last_lat: lat,
            last_lng: lng,
            last_location_at: now.toISOString(),
            live_location_until: expires.toISOString(),
          }).eq("id", tech.id);
          await supabase.from("technician_locations").insert({
            technician_id: tech.id,
            lat,
            lng,
            source: channel === "whatsapp" ? "whatsapp" : "sms",
            expires_at: expires.toISOString(),
          });
          console.log("tech location updated", JSON.stringify({ tech: tech.id, lat, lng, expires: expires.toISOString() }));
        }
      }

      // Find their most recent open allocation
      const { data: allocs } = await supabase
        .from("job_allocations")
        .select("*, jobs(*)")
        .eq("technician_id", tech.id)
        .in("status", ["broadcast", "proposed"])
        .order("created_at", { ascending: false })
        .limit(1);
      const alloc: any = allocs?.[0];

      if (!alloc?.job_id) {
        // Pure location ping with no open job → just ack
        if (techCoords && !body.replace(COORD_RE, "").trim()) {
          await sendReply(from, "Got your live location 📍 — tracking for the next 8 hours. We'll match you to nearby jobs.", channel);
        } else {
          await sendReply(from, "Thanks — no open job for you right now. We'll text when one matches.", channel);
        }
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      const parsed = await aiExtractQuote(body);

      if (!parsed.accepts) {
        await supabase
          .from("job_allocations")
          .update({ status: "declined" })
          .eq("id", alloc.id);
        await sendReply(from, "Got it — passing on this one. Thanks for the quick reply.", channel);
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      if (parsed.price_gbp == null || parsed.eta_minutes == null || parsed.confidence === "low") {
        await sendReply(
          from,
          `Almost there — for job ${alloc.job_id.slice(0, 6)} please reply with: free now? (Y/N), ETA mins, callout £, and (if blowout) new/used tyre + price. Drop a 📍pin too.`,
          channel,
        );
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // Soft 60-second target — we still accept late quotes but flag them.
      const allocCreated = new Date(alloc.created_at).getTime();
      const elapsedSec = Math.round((Date.now() - allocCreated) / 1000);
      const onTime = elapsedSec <= 60;

      await supabase.from("quotes").insert({
        job_id: alloc.job_id,
        technician_id: tech.id,
        price_gbp: parsed.price_gbp,
        callout_fee_gbp: parsed.callout_fee_gbp,
        eta_minutes: parsed.eta_minutes,
        tyre_included: parsed.tyre_included,
        tyre_condition: parsed.tyre_condition,
        quote_deadline: new Date(allocCreated + 60_000).toISOString(),
        raw_message: body,
        status: "pending",
        confidence: parsed.confidence,
      });

      const tyreNote = parsed.tyre_included
        ? ` (incl. ${parsed.tyre_condition ?? ""} tyre)`.replace("  ", " ")
        : (parsed.tyre_included === false ? " (tyre NOT included)" : "");
      const timeNote = onTime ? "⚡ within 60s" : `(${elapsedSec}s)`;

      await sendReply(
        from,
        `Quote received ${timeNote}: £${parsed.price_gbp}, ETA ${parsed.eta_minutes} min${tyreNote}. We'll text when the customer chooses.`,
        channel,
      );
      return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
    }

    // 3. Customer? Look up their most recent job
    const { data: customerJobs } = await supabase
      .from("jobs")
      .select("*")
      .eq("customer_phone", from)
      .order("created_at", { ascending: false })
      .limit(1);
    let job: any = customerJobs?.[0];

    // If the customer has an existing job, decide whether this new message
    // continues that job or is a brand-new request. Skip the classifier for
    // obvious continuations (rating reply, quote acceptance, in-progress states).
    if (job) {
      const isRating = /^\s*[1-5]\b/.test(body);
      const isAccept = /^\s*(yes|y|accept|ok|book it)\b/i.test(body);
      const lockedStates = ["awaiting_payment", "accepted", "in_progress", "paid"];
      const isLocked = lockedStates.includes(job.status);
      if (!isRating && !isAccept && !isLocked) {
        const relation = await aiClassifyJobContinuity({
          body,
          hasMedia: mediaUrls.length > 0,
          job: {
            id: job.id,
            status: job.status,
            issue_type: job.issue_type,
            postcode: job.postcode,
            created_at: job.created_at,
            issue_description: job.issue_description,
          },
        });
        if (relation === "new_job") {
          await supabase.from("ops_alerts").insert({
            level: "info",
            title: "Customer started a new job",
            body: `From ${from} (${channel}). Previous job ${job.id.slice(0, 6)} status=${job.status}. Message: "${body.slice(0, 120)}"`,
            job_id: job.id,
          });
          // Mark stale open job as superseded so it doesn't keep absorbing replies
          if (["intake_pending", "broadcasting", "awaiting_approval", "intake_complete", "pending"].includes(job.status)) {
            await supabase.from("jobs").update({ status: "superseded" }).eq("id", job.id);
          }
          job = null; // fall through to section 4 (new intake)
        }
      }
    }

    const INTAKE_TEMPLATE =
      "Hey 👋 Tyre Fly here. Send these (text, photos, or a voice note — whatever's easiest):\n\n" +
      "• Your name\n" +
      "• Postcode or share a Maps pin 📍\n" +
      "• What happened (puncture, flat, blowout, locked wheel?)\n" +
      "• Photo of the damaged tyre (sidewall + tread)\n" +
      "• Photo of your number plate (or just type the reg, e.g. AB12 CDE)\n" +
      "• Which wheel? Front-left, front-right, rear-left, rear-right (multiple is fine)";

    // Helpers for parsing follow-up intake messages
    const POSTCODE_RE = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i;
    const extractPostcode = (t: string) => {
      const m = t.match(POSTCODE_RE);
      return m ? `${m[1].toUpperCase()} ${m[2].toUpperCase()}` : null;
    };
    const guessIssueType = (t: string) => {
      const s = t.toLowerCase();
      if (/blow.?out/.test(s)) return "blowout";
      if (/lock|locking/.test(s)) return "locked wheel";
      if (/flat|deflat/.test(s)) return "flat tyre";
      if (/punct|nail|screw/.test(s)) return "puncture";
      if (/sidewall|bulge/.test(s)) return "sidewall damage";
      return null;
    };
    // Number plate (international) — accept letter+digit combos 4–10 chars.
    // Avoid grabbing common words / postcodes by requiring at least 1 letter
    // AND 1 digit, and skip if it matches a UK postcode.
    const PLATE_HINT_RE = /\b(?:reg(?:istration)?|plate|number\s*plate|licen[cs]e\s*plate|tag)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\s\-]{2,12}[A-Z0-9])\b/i;
    const PLATE_LOOSE_RE = /\b([A-Z0-9]{2,4}[\s\-]?[A-Z0-9]{2,5})\b/g;
    const extractReg = (t: string): string | null => {
      const hinted = t.match(PLATE_HINT_RE);
      if (hinted) {
        return hinted[1].toUpperCase().trim().replace(/\s+/g, " ");
      }
      // Loose pass — only accept tokens that contain BOTH a letter and a digit
      // and aren't a UK postcode.
      const matches = t.toUpperCase().matchAll(PLATE_LOOSE_RE);
      for (const m of matches) {
        const raw = m[1].replace(/\s+/g, "");
        if (!/[A-Z]/.test(raw) || !/\d/.test(raw)) continue;
        if (POSTCODE_RE.test(raw)) continue;
        if (raw.length < 4 || raw.length > 10) continue;
        return m[1].toUpperCase().trim();
      }
      return null;
    };
    const extractWheels = (t: string): string[] => {
      const s = t.toLowerCase();
      const out = new Set<string>();
      const has = (re: RegExp) => re.test(s);
      // Direct corner mentions
      if (has(/front[-\s]?left|fl\b|nearside front|front near.?side/)) out.add("front-left");
      if (has(/front[-\s]?right|fr\b|offside front|front off.?side/)) out.add("front-right");
      if (has(/(rear|back)[-\s]?left|rl\b|nearside rear|nearside back|rear near.?side/)) out.add("rear-left");
      if (has(/(rear|back)[-\s]?right|rr\b|offside rear|offside back|rear off.?side/)) out.add("rear-right");
      // "all four", "all 4"
      if (has(/all\s*(four|4)\b/)) {
        ["front-left", "front-right", "rear-left", "rear-right"].forEach((w) => out.add(w));
      }
      return Array.from(out);
    };

    // 3a. If there's an in-flight intake (intake_pending), enrich it
    if (job && job.status === "intake_pending") {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      const newDesc = [job.issue_description, body].filter(Boolean).join("\n").slice(0, 2000);
      updates.issue_description = newDesc;
      if (mediaUrls.length > 0) {
        updates.photo_urls = [...(job.photo_urls ?? []), ...mediaUrls].slice(0, 12);
      }
      let pc = extractPostcode(body);
      if (!pc) {
        const coords = body.match(COORD_RE);
        if (coords) {
          const lat = Number(coords[1]);
          const lng = Number(coords[2]);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            pc = await reverseGeocodePostcode(lat, lng);
            if (pc) console.log("derived postcode from coords", JSON.stringify({ jobId: job.id, lat, lng, pc }));
          }
        }
      }
      if (pc && !job.postcode) updates.postcode = pc;
      const it = guessIssueType(body);
      if (it && (!job.issue_type || job.issue_type === "unknown")) updates.issue_type = it;
      // Name capture: explicit phrases first, then naive line scan
      if (!job.customer_name || job.customer_name === "Customer") {
        const explicit =
          body.match(/\b(?:my name is|i am|i'm|im|this is|name[:\-])\s+([A-Za-z][A-Za-z .'-]{1,38})/i);
        if (explicit) {
          updates.customer_name = explicit[1].trim().replace(/\s+/g, " ");
        } else {
          const firstLine = body.split(/\n|,|\./).map((s) => s.trim()).find((s) =>
            s && s.length < 40 && !POSTCODE_RE.test(s) && !/punct|flat|blow|lock|tyre|tire|nail|hi|hello|hey|thanks|location|pin/i.test(s),
          );
          if (firstLine && /^[A-Za-z][A-Za-z .'-]{1,38}$/.test(firstLine) && firstLine.split(/\s+/).length <= 4) {
            updates.customer_name = firstLine;
          }
        }
      }

      // Vehicle reg from text (photo extraction happens in analyze-damage)
      const reg = extractReg(body);
      if (reg && !job.vehicle_reg) updates.vehicle_reg = reg;

      // Affected wheels — merge with existing
      const wheelsFromText = extractWheels(body);
      if (wheelsFromText.length > 0) {
        const merged = Array.from(new Set([...(job.affected_wheels ?? []), ...wheelsFromText]));
        updates.affected_wheels = merged;
      }

      const haveName = (updates.customer_name ?? job.customer_name) && (updates.customer_name ?? job.customer_name) !== "Customer";
      const havePostcode = !!(updates.postcode ?? job.postcode);
      const finalDesc: string = updates.issue_description ?? job.issue_description ?? "";
      const finalPhotos: string[] = updates.photo_urls ?? job.photo_urls ?? [];
      const haveDetails = finalDesc.length > 5 || finalPhotos.length > 0;
      const finalReg: string | null = updates.vehicle_reg ?? job.vehicle_reg ?? null;
      const finalWheels: string[] = updates.affected_wheels ?? job.affected_wheels ?? [];

      // Diagnostic depth: do we actually understand the problem?
      const finalIssueType = updates.issue_type ?? job.issue_type;
      const lowerDesc = finalDesc.toLowerCase();
      const hasContext =
        /(nail|screw|slow|fast|sudden|drove|driving|park|kerb|pothole|bulge|split|crack|flat overnight|lost.*key|valve|leak)/i.test(lowerDesc) ||
        lowerDesc.length > 60;
      const diagnosisOk = finalPhotos.length > 0 || (finalIssueType && finalIssueType !== "unknown" && hasContext);

      // Reg + at least one wheel position are now required before dispatch
      if (haveName && havePostcode && haveDetails && diagnosisOk && finalReg && finalWheels.length > 0) {
        updates.status = "intake_complete"; // fires dispatch trigger
      }

      await supabase.from("jobs").update(updates).eq("id", job.id);

      // If new photos arrived, run vision analysis and bounce non-tyre photos back
      if (mediaUrls.length > 0) {
        try {
          const ar = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/analyze-damage`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              job_id: job.id,
              photo_urls: mediaUrls,
              issue_description: finalDesc,
              issue_type: finalIssueType,
            }),
          });
          const aj = await ar.json();
          if (aj?.damage_type === "not-a-tyre") {
            await sendReply(
              from,
              aj.damage_summary || "That doesn't look like a tyre photo 🤔 Could you send a clear photo of the damaged tyre/wheel (and the sidewall if you can)?",
              channel,
            );
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
          }
        } catch (e) {
          console.error("analyze-damage call failed", e);
        }
      }

      // Acknowledge with what's still missing
      const missing: string[] = [];
      if (!haveName) missing.push("your name (e.g. \"My name is John\")");
      if (!havePostcode) missing.push("postcode or a Maps location pin");
      if (!haveDetails) missing.push("what happened (and a photo if possible)");
      if (!finalReg) missing.push("car number plate (type it or send a photo of the plate)");
      if (finalWheels.length === 0) missing.push("which wheel(s) — front-left, front-right, rear-left, rear-right (you can voice-note it)");

      let reply: string;
      if (missing.length > 0) {
        reply = `Thanks! Still need: ${missing.join("; ")}.`;
      } else if (!diagnosisOk) {
        // We have the basics but not enough to brief the technician well.
        // Ask the customer's own theory + a photo.
        const probes: string[] = [];
        if (finalPhotos.length === 0) {
          probes.push("📸 A quick photo of the tyre helps a lot (damaged area + the tyre size on the sidewall, e.g. 225/45 R17).");
        }
        if (!finalIssueType || finalIssueType === "unknown") {
          probes.push("What do YOU think it is? Slow puncture, blowout, sidewall bulge, nail still in it, or locked wheel?");
        } else {
          probes.push(
            `You mentioned ${finalIssueType}. A bit more would help the technician arrive prepared:\n` +
            "• Did it happen suddenly or go down slowly?\n" +
            "• Can you see anything stuck in it (nail/screw)?\n" +
            "• Any bulge or split on the side wall?\n" +
            "• Is the car drivable or stuck?",
          );
        }
        reply = `Thanks ${(updates.customer_name ?? job.customer_name) || ""}! Before we dispatch, two quick things:\n\n${probes.join("\n\n")}`;
      } else {
        reply = "Got it — finding you a technician now. We'll text the moment one is matched.";
      }
      await sendReply(from, reply, channel);
      return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
    }

    // 3b. Existing customer with a known job — handle review or quote acceptance
    if (job && ["closed_pending_review", "broadcasting", "awaiting_approval", "intake_complete", "pending"].includes(job.status)) {
      // Review (numeric 1-5)
      const ratingMatch = body.match(/^\s*([1-5])\b/);
      if (ratingMatch && job.status === "closed_pending_review") {
        const score = parseInt(ratingMatch[1], 10);
        const { data: q } = await supabase
          .from("quotes")
          .select("technician_id")
          .eq("job_id", job.id)
          .eq("status", "paid")
          .maybeSingle();
        await supabase.from("reviews").insert({
          job_id: job.id,
          technician_id: q?.technician_id ?? null,
          score,
          comment: body,
        });
        await supabase.from("jobs").update({ status: "closed" }).eq("id", job.id);
        await sendReply(from, `Thanks for the ${score}★ rating!`, channel);
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // Quote acceptance ("yes" / "accept")
      if (/\b(yes|y|accept|ok|book it)\b/i.test(body)) {
        const { data: pending } = await supabase
          .from("quotes")
          .select("*")
          .eq("job_id", job.id)
          .eq("status", "pending")
          .order("price_gbp", { ascending: true })
          .limit(1);
        const cheapest: any = pending?.[0];
        if (cheapest) {
          await supabase.from("quotes").update({ status: "accepted" }).eq("id", cheapest.id);
          await supabase.from("quotes").update({ status: "lost" }).eq("job_id", job.id).eq("status", "pending").neq("id", cheapest.id);
          await supabase.from("jobs").update({
            status: "awaiting_payment",
            assigned_technician_id: cheapest.technician_id,
          }).eq("id", job.id);

          // Mint the Stripe checkout link for the £15 deposit and SMS it now
          let payUrl: string | null = null;
          try {
            const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/create-fee-checkout`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({ job_id: job.id }),
            });
            const j = await r.json();
            payUrl = j?.url ?? null;
          } catch (e) {
            console.error("create-fee-checkout failed", e);
          }

          const confirmMsg = payUrl
            ? `Booked! £${cheapest.price_gbp}, ETA ${cheapest.eta_minutes} min. Pay the £15 deposit to confirm: ${payUrl}`
            : `Booked! £${cheapest.price_gbp}, ETA ${cheapest.eta_minutes} min. We'll text the payment link in a moment.`;
          // Send the deposit link on BOTH channels so the customer never misses it
          await sendReply(from, confirmMsg, "whatsapp");
          await sendReply(from, confirmMsg, "sms");
        }
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // Otherwise treat extra texts/photos as enrichment to the open job
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (body) updates.issue_description = [job.issue_description, body].filter(Boolean).join("\n").slice(0, 2000);
      if (mediaUrls.length > 0) updates.photo_urls = [...(job.photo_urls ?? []), ...mediaUrls].slice(0, 12);
      if (Object.keys(updates).length > 1) {
        await supabase.from("jobs").update(updates).eq("id", job.id);
        await sendReply(from, "Thanks — added that to your job. We'll text as soon as a technician is matched.", channel);
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }
    }

    // 4. Unknown sender (or stale closed job) → start intake automatically
    let pc0 = extractPostcode(body);
    if (!pc0) {
      const coords = body.match(COORD_RE);
      if (coords) {
        const lat = Number(coords[1]);
        const lng = Number(coords[2]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          pc0 = await reverseGeocodePostcode(lat, lng);
          if (pc0) console.log("derived postcode from new intake coords", JSON.stringify({ from, lat, lng, pc0 }));
        }
      }
    }
    const it0 = guessIssueType(body);
    const reg0 = extractReg(body);
    const wheels0 = extractWheels(body);
    const { data: newJob } = await supabase
      .from("jobs")
      .insert({
        customer_name: "Customer",
        customer_phone: from,
        postcode: pc0 ?? "",
        issue_type: it0 ?? "unknown",
        issue_description: body || null,
        photo_urls: mediaUrls,
        vehicle_reg: reg0,
        affected_wheels: wheels0,
        status: "intake_pending",
      })
      .select()
      .single();

    await supabase.from("ops_alerts").insert({
      level: "info",
      title: "New inbound — intake started",
      body: `From ${from} (${channel}): "${body.slice(0, 120)}"`,
      job_id: newJob?.id ?? null,
    });

    await sendReply(from, INTAKE_TEMPLATE, channel);
    return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
  } catch (e) {
    console.error("twilio-inbound error", e);
    return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
  }
});
