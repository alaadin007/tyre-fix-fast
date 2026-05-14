// Twilio inbound webhook — routes to the right Agent
// 1. From a known technician → Parsing Agent (extract price + ETA → quotes)
// 2. From a known customer with a numeric reply → Review Agent (rating)
// 3. From a known customer with "yes"/"accept" → quote acceptance
// 4. Anything else → log only (Co-Pilot can review)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { feeForPhone } from "../_shared/region-fee.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TWIML_OK = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

function normPhone(p: string): string {
  return (p || "").replace(/^whatsapp:/, "").replace(/[^\d+]/g, "");
}

const COORD_RE = /\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)/;

// Logs a single technician-onboarding routing decision for later debugging.
// Best-effort: any failure is swallowed so we never break the webhook.
async function logOnboarding(
  supabase: any,
  entry: {
    technician_id?: string | null;
    phone: string;
    channel?: string | null;
    inbound_body?: string | null;
    has_media?: boolean;
    media_count?: number;
    detected_intent?: string | null;
    prior_status?: string | null;
    next_status?: string | null;
    route_taken: string;
    ai_extracted?: unknown;
    reply_sent?: string | null;
    notes?: string | null;
  },
) {
  try {
    await supabase.from("tech_onboarding_logs").insert({
      technician_id: entry.technician_id ?? null,
      phone: entry.phone,
      channel: entry.channel ?? null,
      direction: "inbound",
      inbound_body: (entry.inbound_body ?? "").slice(0, 2000),
      has_media: !!entry.has_media,
      media_count: entry.media_count ?? 0,
      detected_intent: entry.detected_intent ?? null,
      prior_status: entry.prior_status ?? null,
      next_status: entry.next_status ?? null,
      route_taken: entry.route_taken,
      ai_extracted: entry.ai_extracted ?? null,
      reply_sent: (entry.reply_sent ?? "").slice(0, 2000) || null,
      notes: entry.notes ?? null,
    });
  } catch (e) {
    console.error("logOnboarding failed", e);
  }
}

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

// Forward-geocode a free-text address (e.g. "w1 harley street", "10 downing st london")
// to a UK postcode using Nominatim. Returns null if nothing matches confidently.
async function geocodeAddressToPostcode(address: string): Promise<{ postcode: string | null; lat: number | null; lng: number | null }> {
  const empty = { postcode: null as string | null, lat: null as number | null, lng: null as number | null };
  const q = (address || "").trim();
  if (q.length < 4) return empty;
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=gb&q=${encodeURIComponent(q)}`,
      { headers: { "User-Agent": "tyre-fix-fast/1.0" } },
    );
    if (!r.ok) return empty;
    const arr = await r.json();
    const hit = Array.isArray(arr) ? arr[0] : null;
    if (!hit) return empty;
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    let pc: string | null = hit?.address?.postcode ?? null;
    if (pc) pc = pc.trim().toUpperCase();
    if (!pc && Number.isFinite(lat) && Number.isFinite(lng)) {
      pc = await reverseGeocodePostcode(lat, lng);
    }
    return { postcode: pc, lat: Number.isFinite(lat) ? lat : null, lng: Number.isFinite(lng) ? lng : null };
  } catch (e) {
    console.error("geocodeAddressToPostcode failed", e);
    return empty;
  }
}

// Heuristic — does the text look like a street address? (used to decide whether to forward-geocode)
const ADDRESS_HINT_RE = /\b(street|st\b|road|rd\b|avenue|ave\b|lane|ln\b|drive|dr\b|close|crescent|way|place|pl\b|square|sq\b|terrace|court|ct\b|mews|gardens|park|hill|row)\b/i;

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

// Detect intent to join as a technician.
// Keep this deliberately broad so phrases like
// "I'd like to sign up as a technician" or
// "please guide me through the registration" don't
// fall through into the customer tyre-help flow.
const TECH_JOIN_RE = /\b(become|join|sign(?:ing)?[\s-]?up|apply|onboard|register|registration)\b.*\b(tech(?:nician)?|fitter|tyre\s*fly|work(?:ing)?\s+with\s+tyre\s*fly)\b|\b(sign(?:ing)?[\s-]?up|apply(?:ing)?|register(?:ing)?|registration)\b.*\b(as\s+a\s+)?technician\b|\b(i'?d\s+like\s+to|i\s+want\s+to|want\s+to)\s+(sign(?:ing)?[\s-]?up|apply|register|join)\b.*\b(as\s+a\s+)?technician\b|\b(i'?m|i am)\s+a\s+(mobile\s+)?(tyre|tire)\s+(fitter|technician|guy)\b|\bi\s+fit\s+(tyres|tires)\b|\bwant\s+to\s+(join|work)\b|^join$|^apply$/i;

// Detect when a message is a CUSTOMER asking for tyre service (not a tech onboarding message).
// Used so that someone already in the technicians table (even mid-onboarding or approved)
// can still book a tyre repair as a customer when their message is clearly customer intent.
const CUSTOMER_HELP_RE = /\b(need|want|require|book|get|after|looking\s+for)\b.*\b(tyre|tire|wheel|puncture|blowout|fitting|replace(?:ment)?|change|repair|help)\b|\bpuncture\b|\bblowout\b|\bflat\s+(tyre|tire)\b|\bneed\s+(a\s+)?(new\s+)?(tyre|tire)\b|\bcar\s+(broke|won'?t\s+start|stuck)\b|\bmy\s+(car|van|tyre|tire|wheel)\b/i;

async function aiExtractTechProfile(args: {
  history: string;
  latest: string;
  hasMedia: boolean;
  mediaCount: number;
  current: any;
}): Promise<{
  name: string | null;
  email: string | null;
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
      name: null, email: null, service_postcodes: null, vehicle: null, travel_radius_miles: null,
      weekly_schedule: null, availability_summary: null, media_classification: null,
      reply: "Thanks — we'll be in touch.", ready_for_review: false,
    };
  }
  const sys =
    "You are Tyre Fly's onboarding agent. You're chatting with a mobile-tyre technician applying to join. " +
    "Be warm, brief, one short message at a time. " +
    "MANDATORY items (must collect before submitting for review): full name, email address, service area, vehicle (make/model/year), travel radius (accept km — convert to miles, 1 km = 0.621 miles, round to nearest int). " +
    "OPTIONAL items (collect as many as possible, but do NOT block review on them): weekly availability, live location pin (📍), equipment/vehicle photo, insurance doc photo, driving licence / ID doc photo, public liability doc photo. " +
    "COLLECTION ORDER: First, ask for any missing MANDATORY items one at a time. Once all mandatory items are in, KEEP GOING and ask for missing OPTIONAL items one at a time (in the order listed above) so we capture as much as possible up front. Any extra information the tech volunteers should also be stored. " +
    "SERVICE AREA RULES: Accept ANY answer the tech gives — UK postcodes (W5, SW1A), US ZIPs, Canadian postcodes, city/town/borough names ('West London', 'Manchester'), regions ('M25 area', 'North London'), or a mix. ALWAYS put their answer into service_postcodes as one or more string entries — never leave it null/empty if they have answered. Do NOT reformat or 'correct' what they wrote; pass it through as given. " +
    "CRITICAL — DO NOT REPEAT QUESTIONS: The conversation history is the source of truth. If the tech already answered an item — OR explicitly deferred an OPTIONAL item ('later', 'will send tomorrow', 'don't have it', 'no insurance yet', etc.) — in any previous message, DO NOT ask for it again. Re-extract any answered values into the correct field this turn, then move on to the next genuinely-missing & not-yet-deferred item. " +
    "DEFERRAL RULES: If the tech says they will provide an item 'later', 'soon', 'after some time', 'don't have it now', 'will send tomorrow', etc.: " +
    "  • If it's a MANDATORY item — politely explain you need it now to submit their application, and ask again. " +
    "  • If it's an OPTIONAL item — accept the deferral warmly, do NOT ask for that same item again, and move on to the next missing OPTIONAL item (or submit if none remain). " +
    "SUBMISSION RULES: As soon as ALL MANDATORY items are collected, set ready_for_review=true on the SAME turn so the application is forwarded to admin immediately — even while you continue to collect optional items in subsequent turns. After mandatory is complete: if optional items remain that the tech has NOT deferred, your reply should (a) confirm the application has been submitted for review, AND (b) ask for the next missing optional item so we can capture it up front. Once every optional item is either collected or deferred, send a final thank-you and stop asking. Admin will follow up for anything still missing. " +
    "If the latest message has media, classify EACH attachment as one of insurance|id|public_liability|equipment|other based on context (what they were last asked for, or what they say). Return one entry per attachment in media_classification array, in order.";
  const user =
    `Conversation so far:\n${args.history}\n\n` +
    `Already collected: name=${args.current.name ?? "?"}, ` +
    `email=${args.current.email ?? "?"}, ` +
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
                email: { type: ["string", "null"] },
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
      return { name: null, email: null, service_postcodes: null, vehicle: null, travel_radius_miles: null, weekly_schedule: null, availability_summary: null, media_classification: null, reply: "Got it — what's next?", ready_for_review: false };
    }
    const j = await r.json();
    const a = JSON.parse(j.choices[0].message.tool_calls[0].function.arguments);
    return {
      name: a.name ?? null,
      email: a.email ?? null,
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
    return { name: null, email: null, service_postcodes: null, vehicle: null, travel_radius_miles: null, weekly_schedule: null, availability_summary: null, media_classification: null, reply: "Got it — what's next?", ready_for_review: false };
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
      const apMatch = trimmed.match(/^\s*(approve|reject)d?\s+(\S+)\s*(.*)$/i);
      if (apMatch) {
        const action = apMatch[1].toLowerCase();
        const idOrPhone = apMatch[2];
        const reason = apMatch[3]?.trim() || null;
        let matches: any[] | null = null;
        if (idOrPhone.startsWith("+")) {
          const { data } = await supabase
            .from("technicians")
            .select("id,name,phone,approval_status")
            .eq("phone", idOrPhone)
            .limit(2);
          matches = data;
        } else {
          const prefix = idOrPhone.toLowerCase();
          const { data } = await supabase
            .from("technicians")
            .select("id,name,phone,approval_status,created_at")
            .order("created_at", { ascending: false })
            .limit(200);
          matches = (data ?? [])
            .filter((tech: any) => String(tech.id).toLowerCase().startsWith(prefix))
            .map(({ created_at: _createdAt, ...tech }: any) => tech)
            .slice(0, 2);
        }
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

    // 1c. Technician onboarding via WhatsApp/SMS
    // - existing row with approval_status='intake' → continue onboarding
    // - no row + message matches "I want to join" → start onboarding
    {
      const { data: existingByPhone } = await supabase
        .from("technicians")
        .select("*")
        .eq("phone", from)
        .maybeSingle();

      const joinPhrase = TECH_JOIN_RE.test(body);
      const customerHelp = CUSTOMER_HELP_RE.test(body);
      // Continue routing through the onboarding agent while the application is
      // still in `intake` (mandatory data being collected) OR `pending` (mandatory
      // submitted, optional items like insurance/ID/equipment photos still being
      // gathered). Without `pending` here, the next inbound message after the
      // mandatory-complete flip falls through to the CUSTOMER intake flow and
      // the tech sees "Step 1 of 4 — Your location" instead of an onboarding reply.
      const inIntake =
        existingByPhone?.approval_status === "intake" ||
        existingByPhone?.approval_status === "pending";
      const status = existingByPhone?.approval_status;

      // If they're mid-onboarding or already a tech but this message is clearly
      // a customer asking for tyre help (and not a join/registration phrase, not
      // a media or location upload), fall through to the customer intake flow.
      if (existingByPhone && customerHelp && !joinPhrase && mediaUrls.length === 0 && !COORD_RE.test(body)) {
        // skip the onboarding block entirely
      } else

      // If they explicitly say they want to join but already have a row,
      // route them based on current status instead of dropping into the
      // customer intake flow.
      if (joinPhrase && existingByPhone && status && status !== "intake") {
        let reply = "";
        let route = "";
        let nextStatus: string | null = status;
        if (status === "approved") {
          reply = "You're already approved as a Tyre Fly technician ✅ Send 📍your live location to start receiving jobs.";
          route = "join_phrase_already_approved";
        } else if (status === "pending") {
          reply = "Your application is in review — we'll message you here as soon as it's approved. Need to update something? Just tell me what to change.";
          route = "join_phrase_pending_review";
        } else if (status === "rejected") {
          reply = "Your previous application wasn't approved. If anything's changed (new docs, new area), reply with the update and we'll re-review.";
          route = "join_phrase_previously_rejected";
        } else {
          await supabase.from("technicians").update({ approval_status: "intake" }).eq("id", existingByPhone.id);
          reply = "Let's pick up your application — what's your full name?";
          route = "join_phrase_unknown_status_restart";
          nextStatus = "intake";
        }
        await sendReply(from, reply, channel);
        await logOnboarding(supabase, {
          technician_id: existingByPhone.id,
          phone: from,
          channel,
          inbound_body: body,
          has_media: mediaUrls.length > 0,
          media_count: mediaUrls.length,
          detected_intent: "join_request",
          prior_status: status,
          next_status: nextStatus,
          route_taken: route,
          reply_sent: reply,
        });
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      const wantsToJoin = !existingByPhone && joinPhrase;

      if (wantsToJoin || inIntake) {
        // Coords (live location pin)
        const coords = body.match(COORD_RE);
        let pinLat: number | null = null, pinLng: number | null = null;
        if (coords) {
          const la = Number(coords[1]), ln = Number(coords[2]);
          if (Number.isFinite(la) && Number.isFinite(ln)) { pinLat = la; pinLng = ln; }
        }

        // Get conversation history (last 20 messages with this number)
        const { data: hist } = await supabase
          .from("sms_messages")
          .select("direction, body, created_at")
          .or(`from_number.eq.${from},to_number.eq.${from}`)
          .order("created_at", { ascending: false })
          .limit(20);
        const history = (hist ?? []).reverse().map((m: any) =>
          `${m.direction === "inbound" ? "TECH" : "BOT"}: ${(m.body || "").slice(0, 200)}`
        ).join("\n");

        // Ensure a row exists
        let row = existingByPhone;
        if (!row) {
          const { data: created, error: createErr } = await supabase
            .from("technicians")
            .insert({
              name: "Pending applicant",
              phone: from,
              whatsapp: from,
              approval_status: "intake",
              active: false,
              travel_radius_miles: null,
              email: null,
            })
            .select("*")
            .single();
          if (createErr) {
            console.error("intake row create failed", createErr);
            await sendReply(from, "Sorry — couldn't start your application. Please try again in a minute.", channel);
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
          }
          row = created;
          // Welcome message on first contact
          await sendReply(
            from,
            "👋 Welcome to Tyre Fly! I'll get you set up here on WhatsApp — no website needed.\n\n" +
              "To submit your application I just need 5 quick things: your full name, email address, the areas you cover (postcodes/ZIPs/cities), your vehicle, and your max travel radius.\n\n" +
              "After that, you can also send (anytime — even after submitting): a 📍live location pin, equipment photo, and photos of your insurance, ID & public liability docs. Admin will follow up if anything else is needed.\n\n" +
              "Let's start — what's your full name?",
            channel,
          );
          // First contact: always stop after welcome message unless they already
          // sent media or a location pin. The opening text (e.g. "I'd like to sign up
          // as a technician") never carries profile data, so running the AI extractor
          // would just produce a duplicate "what's your full name?" reply.
          if (!mediaUrls.length && !coords) {
            await logOnboarding(supabase, {
              technician_id: row.id,
              phone: from,
              channel,
              inbound_body: body,
              has_media: false,
              media_count: 0,
              detected_intent: "join_request",
              prior_status: null,
              next_status: "intake",
              route_taken: "intake_started_welcome_only",
              reply_sent: "welcome",
            });
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
          }
        }

        // Move any uploaded media to technician buckets and let AI classify
        const ai = await aiExtractTechProfile({
          history,
          latest: body,
          hasMedia: mediaUrls.length > 0,
          mediaCount: mediaUrls.length,
          current: row,
        });

        const updates: Record<string, any> = { updated_at: new Date().toISOString() };
        if (ai.name && (!row.name || row.name === "Pending applicant")) updates.name = ai.name;
        if (ai.email && !row.email) updates.email = ai.email;
        if (ai.service_postcodes?.length) updates.service_postcodes = ai.service_postcodes;
        if (ai.vehicle && !row.vehicle) updates.vehicle = ai.vehicle;
        if (ai.travel_radius_miles && ai.travel_radius_miles > 0) updates.travel_radius_miles = ai.travel_radius_miles;
        if (ai.weekly_schedule && Object.keys(ai.weekly_schedule).length) updates.weekly_schedule = ai.weekly_schedule;
        if (pinLat !== null && pinLng !== null) {
          updates.last_lat = pinLat;
          updates.last_lng = pinLng;
          updates.last_location_at = new Date().toISOString();
        }
        if (ai.availability_summary) updates.notes = ai.availability_summary;

        // Apply media classifications by re-uploading to the right bucket if needed
        if (mediaUrls.length && ai.media_classification?.length) {
          const equipment: string[] = [...(row.equipment_photo_urls ?? [])];
          for (let i = 0; i < mediaUrls.length; i++) {
            const url = mediaUrls[i];
            const kind = ai.media_classification[i] ?? "other";
            if (kind === "equipment") {
              equipment.push(url);
            } else if (kind === "insurance" && !row.insurance_doc_url) {
              updates.insurance_doc_url = url;
            } else if (kind === "id" && !row.id_doc_url) {
              updates.id_doc_url = url;
            } else if (kind === "public_liability" && !row.public_liability_doc_url) {
              updates.public_liability_doc_url = url;
            } else {
              equipment.push(url);
            }
          }
          if (equipment.length) updates.equipment_photo_urls = equipment.slice(0, 8);
        }

        // Decide if we have everything MANDATORY (optional items don't block review)
        const merged = { ...row, ...updates };
        const complete =
          merged.name && merged.name !== "Pending applicant" &&
          merged.email &&
          (merged.service_postcodes?.length ?? 0) > 0 &&
          merged.vehicle &&
          (merged.travel_radius_miles ?? 0) > 0;

        if ((complete || ai.ready_for_review) && row.approval_status !== "pending" && row.approval_status !== "approved" && row.approval_status !== "rejected") {
          updates.approval_status = "pending"; // fires admin notification trigger
        }

        await supabase.from("technicians").update(updates).eq("id", row.id);

        await sendReply(from, ai.reply, channel);
        await logOnboarding(supabase, {
          technician_id: row.id,
          phone: from,
          channel,
          inbound_body: body,
          has_media: mediaUrls.length > 0,
          media_count: mediaUrls.length,
          detected_intent: existingByPhone ? "intake_continue" : "intake_start",
          prior_status: row.approval_status ?? null,
          next_status: updates.approval_status ?? row.approval_status ?? "intake",
          route_taken: updates.approval_status === "pending"
            ? "intake_complete_submitted_for_review"
            : "intake_in_progress",
          ai_extracted: {
            name: ai.name,
            service_postcodes: ai.service_postcodes,
            vehicle: ai.vehicle,
            travel_radius_miles: ai.travel_radius_miles,
            weekly_schedule: ai.weekly_schedule ? Object.keys(ai.weekly_schedule) : null,
            availability_summary: ai.availability_summary,
            media_classification: ai.media_classification,
            ready_for_review: ai.ready_for_review,
            pin: pinLat !== null ? { lat: pinLat, lng: pinLng } : null,
          },
          reply_sent: ai.reply,
        });
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }
    }

    // 2. Technician? → Parsing Agent
    // Skip if the message is clearly a customer asking for tyre help (e.g. "I need tyre help"),
    // so a technician using the same number can also book a job.
    const customerHelpForTech = CUSTOMER_HELP_RE.test(body);
    const { data: techMatch } = await supabase
      .from("technicians")
      .select("*")
      .eq("active", true);
    const tech = customerHelpForTech ? null : (techMatch ?? []).find((t: any) => normPhone(t.phone) === fromN);

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

      // Notify admin/operations console
      const locNote = (tech.last_lat != null && tech.last_lng != null)
        ? ` · 📍 https://maps.google.com/?q=${tech.last_lat},${tech.last_lng}`
        : "";
      await supabase.from("ops_alerts").insert({
        level: "info",
        title: `Tech quote — ${tech.name ?? "technician"}`,
        body: `${tech.name ?? "Tech"} quoted £${parsed.price_gbp}, ETA ${parsed.eta_minutes} min${tyreNote} for job ${alloc.job_id.slice(0, 8)}${locNote}`,
        job_id: alloc.job_id,
      });

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
      const activeIntakeStates = ["intake_pending", "pending"];
      const isActiveIntake = activeIntakeStates.includes(job.status);
      if (!isRating && !isAccept && !isLocked && !isActiveIntake) {
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
      "Tyre Fly here 👋 I'll get you sorted quickly.\n\n" +
      "*Step 1 of 4 — Your location* 📍\n" +
      "Please share your *location*: send a WhatsApp pin 📍, your *postcode*, or your *full address*.";

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
      if (/sidewall|bulge|buckl/.test(s)) return "sidewall damage";
      if (/kerb|curb|pothole|hit|impact|crash|bump/.test(s)) return "impact damage";
      if (/pressure|leak|valve|going down|deflating/.test(s)) return "slow leak";
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
      const addFrontPair = () => {
        out.add("front-left");
        out.add("front-right");
      };
      const addRearPair = () => {
        out.add("rear-left");
        out.add("rear-right");
      };
      // Direct corner mentions
      if (has(/front[-\s]?left|fl\b|nearside front|front near.?side/)) out.add("front-left");
      if (has(/front[-\s]?right|fr\b|offside front|front off.?side/)) out.add("front-right");
      if (has(/(rear|back)[-\s]?left|rl\b|nearside rear|nearside back|rear near.?side/)) out.add("rear-left");
      if (has(/(rear|back)[-\s]?right|rr\b|offside rear|offside back|rear off.?side/)) out.add("rear-right");
      // Pairs like "both front tyres", "2 rear tyres", "both front ones"
      if (has(/\b(?:both|two|2)\s+front(?:\s+(?:tyres?|tires?|wheels?|ones?))?\b|\bfront\s+(?:both|two|2)(?:\s+(?:tyres?|tires?|wheels?|ones?))?\b|\bboth\s+front\s+ones?\b/)) addFrontPair();
      if (has(/\b(?:both|two|2)\s+(?:rear|back)(?:\s+(?:tyres?|tires?|wheels?|ones?))?\b|\b(?:rear|back)\s+(?:both|two|2)(?:\s+(?:tyres?|tires?|wheels?|ones?))?\b|\bboth\s+(?:rear|back)\s+ones?\b/)) addRearPair();
      // "all four", "all 4"
      if (has(/all\s*(four|4)\b/)) {
        ["front-left", "front-right", "rear-left", "rear-right"].forEach((w) => out.add(w));
      }
      return Array.from(out);
    };
    const isLikelyLocationAttempt = (t: string): boolean => {
      const s = (t || "").trim();
      if (!s) return false;
      if (POSTCODE_RE.test(s) || COORD_RE.test(s) || ADDRESS_HINT_RE.test(s)) return true;
      return /\b(postcode|address|location|loc|pin|drop\s*pin|share\s*location|i'?m\s+at|im\s+at|my\s+address\s+is|near\s+[a-z]|outside\s+[a-z])\b/i.test(s);
    };

    // 3a. If there's an in-flight intake (intake_pending), enrich it
    if (job && job.status === "intake_pending") {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      // Only store the actual incident description (not the whole transcript of names/postcodes/plates).
      // Replace prior description if the new body actually describes what happened.
      const incidentRe = /(nail|screw|slow|fast|sudden|drove|driving|park|kerb|curb|pothole|bulge|split|crack|flat|puncture|blowout|burst|leak|valve|hit|damage|tear|tore|cut|deflat|pressure|no idea|not sure|don'?t know|dont know|dunno|unsure|no clue)/i;
      if (body && incidentRe.test(body)) {
        updates.issue_description = body.slice(0, 500);
      }
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
      // Fallback: if still no postcode but the text looks like a street address, forward-geocode it.
      if (!pc && ADDRESS_HINT_RE.test(body)) {
        const geo = await geocodeAddressToPostcode(body);
        if (geo.postcode) {
          pc = geo.postcode;
          console.log("derived postcode from address text", JSON.stringify({ jobId: job.id, address: body.slice(0, 80), pc }));
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

      // Affected wheels — REPLACE when user gives an explicit count/"just/only"
      // (so corrections like "just the one, front right" override prior guesses);
      // otherwise merge with existing.
      const wheelsFromText = extractWheels(body);
      const lowerBodyForWheels = body.toLowerCase();
      const explicitCorrection = /\b(just|only|actually|sorry|correction|i said|i asid|i meant|its only|it's only|its just|it's just)\b/.test(lowerBodyForWheels)
        || /\b([1-4]|one|two|three|four)\b[\s,.\-]*(tyres?|tires?|wheels?|the\s+(front|rear|back))/.test(lowerBodyForWheels)
        || /\ball\s*(four|4)\b/.test(lowerBodyForWheels);
      if (wheelsFromText.length > 0) {
        if (explicitCorrection) {
          updates.affected_wheels = wheelsFromText;
        } else {
          const merged = Array.from(new Set([...(job.affected_wheels ?? []), ...wheelsFromText]));
          updates.affected_wheels = merged;
        }
      }

      const haveName = (updates.customer_name ?? job.customer_name) && (updates.customer_name ?? job.customer_name) !== "Customer";
      const havePostcode = !!(updates.postcode ?? job.postcode);
      const finalDesc: string = updates.issue_description ?? job.issue_description ?? "";
      const finalPhotos: string[] = updates.photo_urls ?? job.photo_urls ?? [];
      const finalReg: string | null = updates.vehicle_reg ?? job.vehicle_reg ?? null;
      const finalWheels: string[] = updates.affected_wheels ?? job.affected_wheels ?? [];

      // Detect a stated tyre count from the customer ("1 tyre", "two tyres", "all four", etc.)
      const NUM_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 };
      const lowerBody = body.toLowerCase();
      let statedCount: number | null = null;
      const allFour = /\ball\s*(four|4)\b/.test(lowerBody);
      if (allFour) statedCount = 4;
      else {
        const mDigit = lowerBody.match(/\b([1-4])\s*(tyres?|tires?|wheels?)\b/);
        if (mDigit) statedCount = parseInt(mDigit[1], 10);
        else {
          const mWord = lowerBody.match(/\b(one|two|three|four)\s*(tyres?|tires?|wheels?)\b/);
          if (mWord) statedCount = NUM_WORDS[mWord[1]];
        }
      }

      // Diagnostic depth — Step 2
      const finalIssueType = updates.issue_type ?? job.issue_type;
      const lowerDesc = finalDesc.toLowerCase();
      const saidUnknown = /\b(no idea|not sure|don'?t know|dont know|dunno|unsure|no clue)\b/i.test(lowerDesc);
      const hasContext =
        /(nail|screw|slow|fast|sudden|drove|driving|park|kerb|curb|pothole|bulge|split|crack|flat|puncture|blowout|burst|leak|valve|hit|damage|tear|tore|cut|deflat|pressure)/i.test(lowerDesc) ||
        saidUnknown;
      // Only count step 2 as done if the customer actually described the incident
      // (keywords or "not sure"). A long message containing only name/location/plate
      // must NOT satisfy step 2.
      const haveWhatHappened = hasContext;

      // Step 3 readiness — need incident summary AND affected wheel positions.
      // Step 4 readiness — need at least one photo per affected tyre.
      const tyreCount = finalWheels.length;
      const photoCount = finalPhotos.length;
      const photosOkForCount = tyreCount > 0 && photoCount >= tyreCount;

      // Step gates (4 steps now)
      // Step 1: Location only
      // Step 2: Number plate + full name
      // Step 3: What happened + affected tyres
      // Step 4: Photos
      const step1Done = havePostcode;
      const step2Done = step1Done && haveName && !!finalReg;
      const step3Done = step2Done && haveWhatHappened && tyreCount > 0;
      const step4Done = step3Done && photosOkForCount;

      const justCompletedIntake = step4Done;
      if (justCompletedIntake) {
        updates.status = "intake_complete"; // fires dispatch trigger
      }

      await supabase.from("jobs").update(updates).eq("id", job.id);

      if (justCompletedIntake) {
        await supabase.from("ops_alerts").insert({
          level: "info",
          title: "Intake complete — all details found",
          body:
            `Job ${job.id.slice(0, 6)} is ready for technician matching. ` +
            `Reg: ${finalReg ?? "—"}, wheels: ${finalWheels.join(", ") || "—"}, photos: ${finalPhotos.length}.`,
          job_id: job.id,
        });
      }

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
              aj.damage_summary || "That doesn't look like a tyre photo 🤔 Could you send a clear photo of the tyre/wheel — full tyre + sidewall close-up?",
              channel,
            );
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
          }
        } catch (e) {
          console.error("analyze-damage call failed", e);
        }
      }

      // Build a checklist of what's confirmed so far and what's still needed.
      const finalName = (updates.customer_name ?? job.customer_name) ?? null;
      const finalPostcode = updates.postcode ?? job.postcode ?? null;
      const checklist =
        "*Progress so far:*\n" +
        `${finalPostcode ? "✅" : "⬜️"} Location${finalPostcode ? ` — ${finalPostcode}` : ""}\n` +
        `${finalReg ? "✅" : "⬜️"} Number plate${finalReg ? ` — ${finalReg}` : ""}\n` +
        `${haveName ? "✅" : "⬜️"} Full name${haveName ? ` — ${finalName}` : ""}\n` +
        `${haveWhatHappened ? "✅" : "⬜️"} What happened\n` +
        `${tyreCount > 0 ? "✅" : "⬜️"} Affected tyres${tyreCount > 0 ? ` — ${finalWheels.join(", ")}` : ""}\n` +
        `${photosOkForCount ? "✅" : "⬜️"} Photos${tyreCount > 0 ? ` (${photoCount}/${tyreCount})` : ""}`;

      // Did the user just send something we couldn't use for the current step?
      const userSentSomething = body.trim().length > 0 || mediaUrls.length > 0;

      let ask: string;
      // ----- STEP 1: location -----
      if (!step1Done) {
        const couldntParse = userSentSomething && !finalPostcode && isLikelyLocationAttempt(body);
        ask =
          (couldntParse
            ? "I couldn't read a valid UK *postcode* or location from that ❌\n\n"
            : "Tyre Fly here 👋\n\n") +
          "*Step 1 of 4 — Your location* 📍\n" +
          "*Still need:* your *postcode* (e.g. SW1A 1AA), a *WhatsApp pin* 📍, or a *full address*.\n\n" +
          checklist;
      }
      // ----- STEP 2: plate + name -----
      else if (!step2Done) {
        const need: string[] = [];
        if (!finalReg) need.push("the car's *number plate* (text it or send a clear photo)");
        if (!haveName) need.push("your *full name* (first + last, e.g. \"John Smith\")");
        ask =
          "Got your location ✅\n\n" +
          "*Step 2 of 4 — Number plate + your name*\n" +
          `*Still need:* ${need.join(" *and* ")}.\n\n` +
          checklist;
      }
      // ----- STEP 3: what happened + tyres -----
      else if (!step3Done) {
        const need: string[] = [];
        if (!haveWhatHappened) {
          need.push("a short description of *what happened* (text or voice note)");
        }
        if (statedCount && statedCount > tyreCount) {
          need.push(`the *other tyre position(s)* — I've only got ${tyreCount}/${statedCount} so far (${finalWheels.join(", ")})`);
        } else if (tyreCount === 0) {
          need.push("*which tyre(s)* are affected — front-left, front-right, rear-left, rear-right, \"both front\", \"both rear\", or \"all four\"");
        }
        ask =
          "Thanks ✅\n\n" +
          "*Step 3 of 4 — What happened + which tyre(s)?* 🛞\n" +
          `*Still need:* ${need.join(" *and* ")}.\n` +
          "Examples: \"hit a kerb last night, front-right\", \"slow puncture going down overnight on both front tyres\", \"nail in the rear-left\".\n" +
          "If you really don't know, reply *\"not sure\"* and we'll work it out from the photos.\n\n" +
          checklist;
      }
      // ----- STEP 4: photos -----
      else if (!photosOkForCount) {
        const remaining = Math.max(1, tyreCount - photoCount);
        ask =
          `*Step 4 of 4 — Photos* 📸 (${photoCount}/${tyreCount} so far)\n` +
          `*Still need:* ${remaining} more tyre photo${remaining === 1 ? "" : "s"}.\n` +
          "For every affected tyre, send:\n" +
          "  • A *FULL photo* of the tyre/wheel (use flash 🔦 if it's dark)\n" +
          "  • A *CLOSE-UP of the sidewall* showing the size markings (e.g. 225/45 R17)\n" +
          "  • A *close-up of the damage* if visible\n" +
          "Caption each one with the position (e.g. \"front-left\").\n\n" +
          checklist;
      }
      else {
        ask =
          "All done ✅ Finding you a technician now — we'll message the moment one is matched.\n\n" +
          checklist;
      }

      await sendReply(from, ask, channel);
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

          // Mint the Stripe checkout link for the £20 deposit and SMS it now
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

          const fee = feeForPhone(from);
          const feeAmt = fee?.amount ?? 20;
          const feeDisp = fee?.display ?? `£20`;
          const sym = fee?.symbol ?? "£";
          const confirmMsg = payUrl
            ? `Booked! ${sym}${cheapest.price_gbp} total, ETA ${cheapest.eta_minutes} min. Pay the ${feeDisp} booking fee to confirm (deducted from final bill): ${payUrl}. Remaining ${sym}${Math.max(0, Number(cheapest.price_gbp) - feeAmt)} paid to technician on-site by card, link, transfer or cash.`
            : `Booked! ${sym}${cheapest.price_gbp} total, ETA ${cheapest.eta_minutes} min. We'll text the ${feeDisp} booking fee link shortly (deducted from final bill).`;
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

    // 4. Unknown sender (or stale closed job) → start intake automatically.
    // Eagerly extract anything the customer already provided so multi-detail
    // first messages (e.g. "location is W1 Harley St, plate YC69 PGX, hit a kerb"
    // + photo) are credited immediately instead of starting from scratch.
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
    if (!pc0 && ADDRESS_HINT_RE.test(body)) {
      const geo = await geocodeAddressToPostcode(body);
      if (geo.postcode) {
        pc0 = geo.postcode;
        console.log("derived postcode from new intake address", JSON.stringify({ from, pc0 }));
      }
    }
    const it0 = guessIssueType(body);
    const reg0 = extractReg(body);
    const wheels0 = extractWheels(body);

    // Try to capture a name from the very first message (same logic as 3a)
    let name0: string | null = null;
    const explicitName = body.match(/\b(?:my name is|i am|i'm|im|this is|name[:\-])\s+([A-Za-z][A-Za-z .'-]{1,38})/i);
    if (explicitName) {
      name0 = explicitName[1].trim().replace(/\s+/g, " ");
    } else {
      // Naive line scan fallback (matches the 3a branch behaviour)
      const firstLine = (body || "").split(/\n|,|\./).map((s) => s.trim()).find((s) =>
        s && s.length < 40 && !POSTCODE_RE.test(s) && !/punct|flat|blow|lock|tyre|tire|nail|hi|hello|hey|thanks|location|pin/i.test(s),
      );
      if (firstLine && /^[A-Za-z][A-Za-z .'-]{1,38}$/.test(firstLine) && firstLine.split(/\s+/).length <= 4) {
        name0 = firstLine;
      }
    }

    const { data: newJob } = await supabase
      .from("jobs")
      .insert({
        customer_name: name0 ?? "Customer",
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

    // Compute step completion against what we already extracted from the very
    // first message and respond with the dynamic prompt for the next missing step.
    const haveName0 = !!(name0 && name0 !== "Customer");
    const havePostcode0 = !!pc0;
    const lowerBody0 = (body || "").toLowerCase();
    const saidUnknown0 = /\b(no idea|not sure|don'?t know|dont know|dunno|unsure|no clue)\b/i.test(lowerBody0);
    const hasContext0 =
      /(nail|screw|slow|fast|sudden|drove|driving|park|kerb|curb|pothole|bulge|split|crack|flat|puncture|blowout|burst|leak|valve|hit|damage|tear|tore|cut|deflat|pressure)/i.test(lowerBody0) ||
      saidUnknown0;
    const haveWhatHappened0 = hasContext0;
    const tyreCount0 = wheels0.length;
    const photoCount0 = mediaUrls.length;
    const photosOkForCount0 = tyreCount0 > 0 && photoCount0 >= tyreCount0;
    // 4-step gates
    const step1Done0 = havePostcode0;
    const step2Done0 = step1Done0 && haveName0 && !!reg0;
    const step3Done0 = step2Done0 && haveWhatHappened0 && tyreCount0 > 0;
    const step4Done0 = step3Done0 && photosOkForCount0;

    // If literally nothing useful was provided, send the warm intro once.
    if (!haveName0 && !havePostcode0 && !reg0 && !haveWhatHappened0 && photoCount0 === 0) {
      await sendReply(from, INTAKE_TEMPLATE, channel);
      return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
    }

    let ask0: string;
    if (!step1Done0) {
      ask0 =
        "Tyre Fly here 👋\n\n" +
        "*Step 1 of 4 — Your location* 📍\n" +
        "Please share your *location*: send a WhatsApp pin 📍, your *postcode*, or your *full address*.";
    } else if (!step2Done0) {
      const need: string[] = [];
      if (!reg0) need.push("the car's *number plate* (text it or send a photo)");
      if (!haveName0) need.push("your *full name* (first + last)");
      ask0 =
        "Got your location ✅\n\n" +
        "*Step 2 of 4 — Number plate + your name*\n" +
        `Please send: ${need.join(" and ")}.`;
    } else if (!step3Done0) {
      const need: string[] = [];
      if (!haveWhatHappened0) need.push("a short description of *what happened*");
      if (tyreCount0 === 0) need.push("*which tyre(s)* are affected");
      ask0 =
        "Thanks ✅\n\n" +
        "*Step 3 of 4 — What happened + which tyre(s)?* 🛞\n" +
        `Please send: ${need.join(" and ")}.\n` +
        "Examples: \"hit a kerb last night, front-right\", \"slow puncture on both front tyres\", \"nail in the rear-left\".\n" +
        "If you genuinely don't know, just reply *\"not sure\"*.";
    } else if (!photosOkForCount0) {
      const remaining = Math.max(1, tyreCount0 - photoCount0);
      ask0 =
        `*Step 4 of 4 — Photos* 📸 (${photoCount0}/${tyreCount0} so far)\n` +
        `Please send photos for *each affected tyre* — I still need ${remaining} more.\n` +
        "For every tyre: a *FULL photo* (use flash 🔦 if dark), a *sidewall close-up* showing the size (e.g. 225/45 R17), and a *close-up of the damage*. Caption with the position.";
    } else {
      ask0 = "All done ✅ Finding you a technician now — we'll message the moment one is matched.";
      if (newJob) await supabase.from("jobs").update({ status: "intake_complete" }).eq("id", newJob.id);
    }

    await sendReply(from, ask0, channel);
    return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
  } catch (e) {
    console.error("twilio-inbound error", e);
    return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
  }
});
