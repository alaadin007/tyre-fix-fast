// Twilio inbound webhook — routes to the right Agent
// 1. From a known technician → Parsing Agent (extract price + ETA → quotes)
// 2. From a known customer with a numeric reply → Review Agent (rating)
// 3. From a known customer with "yes"/"accept" → quote acceptance
// 4. Anything else → log only (Co-Pilot can review)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { feeForPhone } from "../_shared/region-fee.ts";
import { processCustomerIntake } from "../_shared/intake-state.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TWIML_OK = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

function normPhone(p: string): string {
  return (p || "").replace(/^whatsapp:/, "").replace(/[^\d+]/g, "");
}

const COORD_RE = /\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)/;
// Plain "lat, lng" decimal pair, e.g. "51.51752, -0.14589"
const PLAIN_LATLNG_RE = /(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/;
// DMS, e.g. 51°31'03.1"N 0°08'45.8"W  (also accepts curly quotes)
const DMS_RE = /(\d{1,3})[°\s]+(\d{1,2})[\s'′]+([\d.]+)["″]?\s*([NSEW])[\s,]+(\d{1,3})[°\s]+(\d{1,2})[\s'′]+([\d.]+)["″]?\s*([NSEW])/i;
// Google Maps share URLs (after redirect, contains @lat,lng or !3d/!4d or q=)
const GMAPS_AT_RE = /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/;
const GMAPS_3D4D_RE = /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/;
const GMAPS_Q_RE = /[?&]q=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/;
const GMAPS_URL_RE = /https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\.[a-z.]+|www\.google\.[a-z.]+\/maps)\/\S+/i;

function dmsToDecimal(deg: string, min: string, sec: string, hem: string): number {
  const d = Number(deg) + Number(min) / 60 + Number(sec) / 3600;
  return /[SW]/i.test(hem) ? -d : d;
}

// Extract a (lat, lng) from free-form technician text. Handles:
//   - "(51.5, -0.1)"  (WhatsApp pin reshape)
//   - "51.5, -0.1"    plain decimal pair
//   - DMS like 51°31'03.1"N 0°08'45.8"W
//   - Google Maps share URLs (incl. shortened maps.app.goo.gl/...) by
//     following the redirect and extracting coords from the resolved URL.
async function extractCoords(text: string): Promise<{ lat: number; lng: number } | null> {
  if (!text) return null;
  const m1 = text.match(COORD_RE);
  if (m1) {
    const lat = Number(m1[1]), lng = Number(m1[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const dms = text.match(DMS_RE);
  if (dms) {
    const lat = dmsToDecimal(dms[1], dms[2], dms[3], dms[4]);
    const lng = dmsToDecimal(dms[5], dms[6], dms[7], dms[8]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const m2 = text.match(PLAIN_LATLNG_RE);
  if (m2) {
    const lat = Number(m2[1]), lng = Number(m2[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
  }
  const url = text.match(GMAPS_URL_RE);
  if (url) {
    try {
      const r = await fetch(url[0], { redirect: "follow" });
      const finalUrl = r.url || "";
      const html = await r.text().catch(() => "");
      for (const src of [finalUrl, html]) {
        const a = src.match(GMAPS_AT_RE) || src.match(GMAPS_3D4D_RE) || src.match(GMAPS_Q_RE);
        if (a) {
          const lat = Number(a[1]), lng = Number(a[2]);
          if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
        }
      }
    } catch (e) {
      console.error("gmaps url resolve failed", e);
    }
  }
  return null;
}

function extractCoordsFromWebhook(params: Record<string, string>): { lat: number; lng: number } | null {
  const directLat = Number(params.Latitude ?? params.latitude ?? params.Lat ?? "");
  const directLng = Number(params.Longitude ?? params.longitude ?? params.Lng ?? params.Long ?? "");
  if (Number.isFinite(directLat) && Number.isFinite(directLng) && Math.abs(directLat) <= 90 && Math.abs(directLng) <= 180) {
    return { lat: directLat, lng: directLng };
  }
  return null;
}

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
            "You parse mobile-tyre technician WhatsApp/SMS bids. The technician may answer in multiple short messages — extract ONLY what's present in THIS message; leave anything not mentioned as null. Set accepts=false ONLY for an EXPLICIT decline (e.g. 'no', 'pass', 'sorry busy', 'can't make it'). A partial reply with just a price, just an ETA, or just a location is NOT a decline — set accepts=true in that case. Examples:\n" +
            "'£85' → accepts true, price 85, eta null.\n" +
            "'25 mins' → accepts true, eta 25, price null.\n" +
            "'Yes free now, 20 mins, £40 callout, no tyre' → accepts true, eta 20, callout 40, tyre_included false.\n" +
            "'Y, 25, 50 callout + 80 for new tyre' → accepts true, eta 25, callout 50, tyre_included true, tyre_condition new, price 130.\n" +
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
    "SUBMISSION RULES — READ CAREFULLY: " +
    "  • While ANY mandatory item is still missing from 'Already collected' (name, email, service_postcodes, vehicle, travel_radius_miles), you MUST keep asking for the next missing mandatory item. DO NOT say 'submitted', 'in review', 'under review', 'thanks for applying', or anything that implies the application is in. DO NOT set ready_for_review=true. Just ask the next missing mandatory question, one at a time. " +
    "  • ONLY when EVERY mandatory item above is present in 'Already collected' with a real non-empty value (after merging this turn's extraction), set ready_for_review=true and your reply should (a) confirm the application has been submitted for review, AND (b) ask for the next missing OPTIONAL item (weekly availability, then live location pin, then equipment photo, then insurance doc, then ID doc, then public liability doc — in that order, skipping deferred ones). " +
    "  • Keep asking optional items one at a time after that until every optional item is either collected or deferred, then send a final thank-you and stop asking. Admin will follow up for anything still missing. " +
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
    let rejectedNonImageCount = 0;

    // Twilio media URLs require Basic Auth. Download with credentials and
    // re-upload to our public job-photos bucket so they render in the browser
    // and survive Twilio's retention window.
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");

    for (let i = 0; i < numMedia; i++) {
      const u = params[`MediaUrl${i}`];
      const ct = (params[`MediaContentType${i}`] || "image/jpeg").toLowerCase();
      if (!u) continue;
      // Reject anything that isn't a still image (no video, GIF/MP4, PDF, audio, docs).
      // WhatsApp GIFs arrive as video/mp4 — those must be rejected too so the
      // damage-analysis + template flow only ever sees real tyre photos.
      const isImage = ct.startsWith("image/") && !ct.includes("gif");
      if (!isImage) {
        console.log("rejected non-image media", { ct, u });
        rejectedNonImageCount++;
        continue;
      }
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

    // If the customer sent only invalid media (video/GIF/PDF/doc/audio) and no
    // valid images, stop here and ask them to resend as image files. Don't
    // advance intake — we don't want to mark photos step complete with junk.
    if (rejectedNonImageCount > 0 && mediaUrls.length === 0) {
      await sendReply(
        from,
        "Only valid image formats are accepted ❌\nPlease send a clear *photo* of the tyre (JPG/PNG) — not a video, GIF, PDF or document.",
        channel,
      );
      return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
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

    // 1a. Technician job-completion: "Done <REF>" from an approved technician.
    // Closes the job immediately. (Review request flow not wired yet.)
    {
      const doneMatch = body.trim().match(/^\s*done\s+#?([0-9a-f]{6,12})\s*$/i);
      if (doneMatch) {
        const ref = doneMatch[1].toLowerCase();
        const { data: tech } = await supabase
          .from("technicians")
          .select("id, name, phone, approval_status")
          .eq("phone", from)
          .maybeSingle();
        if (tech && tech.approval_status === "approved") {
          const { data: jobMatches } = await supabase
            .from("jobs")
            .select("id, status, customer_phone, customer_name, assigned_technician_id, created_at")
            .order("created_at", { ascending: false })
            .limit(500);
          const jm = (jobMatches ?? []).filter((j: any) =>
            String(j.id).toLowerCase().startsWith(ref)
          );
          if (jm.length === 0) {
            await sendReply(from, `No job found for ref "${ref.toUpperCase()}". Please double-check the reference.`, channel);
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
          }
          if (jm.length > 1) {
            await sendReply(from, `Multiple jobs match "${ref.toUpperCase()}" — please use the full reference shown in your job message.`, channel);
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
          }
          const job: any = jm[0];
          if (job.assigned_technician_id && job.assigned_technician_id !== tech.id) {
            await sendReply(from, `Job ${ref.toUpperCase()} isn't assigned to you. Please contact admin if this is wrong.`, channel);
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
          }
          if (job.status === "completed" || job.status === "closed" || job.status === "closed_pending_review") {
            await sendReply(from, `Job ${ref.toUpperCase()} is already closed ✅`, channel);
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
          }
          await supabase
            .from("jobs")
            .update({ status: "completed", updated_at: new Date().toISOString() })
            .eq("id", job.id);
          await supabase.from("ops_alerts").insert({
            level: "info",
            title: "Job completed by technician",
            body: `${tech.name} marked job ${ref.toUpperCase()} as done.`,
            job_id: job.id,
          });
          await sendReply(
            from,
            `✅ Job ${ref.toUpperCase()} closed. Thanks ${tech.name}! 👏`,
            channel,
          );
          if (job.customer_phone) {
            await sendReply(
              job.customer_phone,
              `✅ Your tyre service is complete — Job #${ref.toUpperCase()}.\n\nThanks for choosing Tyre Fly! 🛞`,
              "whatsapp",
            );
          }
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
      }
    }



    // 1b. Master admin? → can add technicians via SMS
    const { data: masterSetting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "master_numbers")
      .maybeSingle();
    const masterNumbers: string[] = ((masterSetting?.value as any)?.numbers ?? []).map((n: string) => normPhone(n));
    const isMaster = masterNumbers.includes(fromN);

    // If this phone has an active customer intake conversation in-flight, don't
    // hijack the message into the admin branch — let the intake flow handle it.
    // (A master admin number can also be a customer; intake context wins.)
    let hasActiveIntake = false;
    if (isMaster) {
      const { data: activeConv } = await supabase
        .from("conversations")
        .select("step, current_job_id, last_message_at")
        .eq("customer_phone", fromN)
        .maybeSingle();
      if (activeConv?.current_job_id && activeConv.step && activeConv.step !== "complete") {
        const ageMs = activeConv.last_message_at
          ? Date.now() - new Date(activeConv.last_message_at).getTime()
          : 0;
        // Treat intake as active for 2 hours since last message
        if (ageMs < 2 * 60 * 60 * 1000) hasActiveIntake = true;
      }
    }

    if (isMaster && !hasActiveIntake) {
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
          "• JOBS — list 5 latest jobs\n" +
          "• Broadcast <job ref> — send the job to nearby technicians (e.g. \"broadcast E1453B\" or \"yes send job E1453B to nearby techs\")",
          channel,
        );
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // --- Stateful admin "yes → list → yes → ref → broadcast" flow ---
      // Triggered by the new_job_alert_to_admin template's CTA. State is kept in
      // public.admin_states keyed by the admin phone number.
      const refOnlyMatch = trimmed.match(/^\s*#?\s*([0-9a-f]{6})\s*$/i);
      const yesOnly = /^\s*(y|yes|ok|okay|sure|confirm|yep|yeah)\s*[.!]?\s*$/i.test(trimmed);
      // "yes <ref>" / "yes #<ref>" / "<ref> yes" combined in one message →
      // treat as a list request (share technicians, then ask broadcast confirm).
      const yesPlusRefMatch = trimmed.match(
        /^\s*(?:y|yes|ok|okay|sure|confirm|yep|yeah)[\s,:.!#-]+([0-9a-f]{6})\s*$/i,
      ) ?? trimmed.match(
        /^\s*#?\s*([0-9a-f]{6})[\s,:.!-]+(?:y|yes|ok|okay|sure|confirm|yep|yeah)\s*$/i,
      );

      const { data: adminStateRow } = await supabase
        .from("admin_states")
        .select("step, job_id, updated_at")
        .eq("phone", fromN)
        .maybeSingle();
      // Expire stale state after 6h so a random "yes" months later doesn't fire.
      const adminState = (adminStateRow && adminStateRow.updated_at &&
        (Date.now() - new Date(adminStateRow.updated_at).getTime()) < 6 * 60 * 60 * 1000)
        ? adminStateRow : null;

      const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const R = 3958.8, toRad = (d: number) => (d * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(a));
      };
      const scoreNearbyTechs = async (job: any) => {
        const { data: techs } = await supabase
          .from("technicians")
          .select("id,name,phone,service_postcodes,last_lat,last_lng,travel_radius_miles")
          .eq("approval_status", "approved").eq("active", true).limit(500);
        const jobPc = String(job.postcode ?? "").toUpperCase().replace(/\s+/g, "");
        const jobOutward = jobPc.replace(/\d[A-Z]{2}$/, "");
        const validCoord = (la: any, ln: any) =>
          la != null && ln != null && !(Number(la) === 0 && Number(ln) === 0) &&
          Math.abs(Number(la)) > 0.01 && Math.abs(Number(ln)) > 0.01;
        return (techs ?? []).map((t: any) => {
          let miles: number | null = null;
          if (validCoord(job.lat, job.lng) && validCoord(t.last_lat, t.last_lng)) {
            miles = haversine(Number(job.lat), Number(job.lng), Number(t.last_lat), Number(t.last_lng));
          }
          const pcs: string[] = (t.service_postcodes ?? []).map((p: string) =>
            String(p).toUpperCase().replace(/\s+/g, ""));
          const pcMatch = !!jobOutward && pcs.some((p) =>
            p === jobOutward || p.startsWith(jobOutward) || jobOutward.startsWith(p));
          return { t, miles, pcMatch };
        }).filter((x: any) => {
          const inRange = x.miles != null && x.miles <= (x.t.travel_radius_miles ?? 15);
          return x.pcMatch || inRange;
        }).sort((a: any, b: any) => {
          // Postcode matches first, then by distance
          if (a.pcMatch && !b.pcMatch) return -1;
          if (b.pcMatch && !a.pcMatch) return 1;
          if (a.miles != null && b.miles != null) return a.miles - b.miles;
          if (a.miles != null) return -1;
          if (b.miles != null) return 1;
          return 0;
        });
      };
      const findJobByRef = async (ref: string) => {
        const { data: jobMatches } = await supabase
          .from("jobs")
          .select("id,customer_name,postcode,lat,lng,issue_type,status,created_at")
          .order("created_at", { ascending: false }).limit(500);
        return (jobMatches ?? []).filter((j: any) =>
          String(j.id).toLowerCase().startsWith(ref.toLowerCase()));
      };
      const clearAdminState = () =>
        supabase.from("admin_states").delete().eq("phone", fromN);
      const setAdminState = (step: string, job_id: string | null) =>
        supabase.from("admin_states").upsert({
          phone: fromN, step, job_id, updated_at: new Date().toISOString(),
        });

      // (A) Bare "yes" → depends on current state
      if (yesOnly) {
        if (adminState?.step === "await_broadcast_confirm" && adminState.job_id) {
          await setAdminState("await_ref_for_broadcast", adminState.job_id);
          await sendReply(from,
            "Please enter the job reference number (with or without #).", channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
        // Default behaviour: assume admin is responding to the "Should I share
        // the list of available technicians…" prompt at the end of the job alert.
        await setAdminState("await_ref_for_list", null);
        await sendReply(from,
          "Please provide the reference number (with or without #).", channel);
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // (B) Bare ref while waiting for list lookup → show available technicians
      if (refOnlyMatch && adminState?.step === "await_ref_for_list") {
        const ref = refOnlyMatch[1].toLowerCase();
        const matches = await findJobByRef(ref);
        if (matches.length === 0) {
          await sendReply(from,
            `No job found for ref #${ref.toUpperCase()}. Reply JOBS to see recent jobs.`, channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
        if (matches.length > 1) {
          await sendReply(from,
            `Multiple jobs match #${ref.toUpperCase()} — please send the full 6-character ref.`, channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
        const job: any = matches[0];
        const shortRef = String(job.id).slice(0, 6).toUpperCase();
        const scored = await scoreNearbyTechs(job);
        if (scored.length === 0) {
          await clearAdminState();
          await sendReply(from,
            `Job #${shortRef} (${job.postcode}) — no approved technicians found nearby.`, channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
        const lines = scored.slice(0, 10).map(({ t, miles }: any) => {
          const dist = miles != null ? ` · ${miles.toFixed(1)} mi` : "";
          return `• ${t.name} (${t.phone})${dist}`;
        }).join("\n");
        const more = scored.length > 10 ? `\n…and ${scored.length - 10} more` : "";
        await setAdminState("await_broadcast_confirm", job.id);
        await sendReply(from,
          `Job #${shortRef} (${job.postcode}) — ${scored.length} available technician(s) nearby:\n${lines}${more}\n\n` +
          `Do you want to send/broadcast this job to these technicians? Reply YES.`,
          channel,
        );
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // (C) Bare ref while waiting for broadcast confirmation → fire broadcast
      if (refOnlyMatch && adminState?.step === "await_ref_for_broadcast") {
        const ref = refOnlyMatch[1].toLowerCase();
        const matches = await findJobByRef(ref);
        if (matches.length === 0) {
          await sendReply(from,
            `No job found for ref #${ref.toUpperCase()}. Nothing broadcast.`, channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
        if (matches.length > 1) {
          await sendReply(from,
            `Multiple jobs match #${ref.toUpperCase()} — please send the full 6-character ref.`, channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
        const job: any = matches[0];
        const shortRef = String(job.id).slice(0, 6).toUpperCase();
        const scored = await scoreNearbyTechs(job);
        if (scored.length === 0) {
          await clearAdminState();
          await sendReply(from,
            `Job #${shortRef} — no approved technicians found nearby. Nothing broadcast.`, channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
        const technician_ids = scored.map((x: any) => x.t.id);
        const bRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/broadcast-job`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ job_id: job.id, mode: "specific", technician_ids }),
        });
        const bJson: any = await bRes.json().catch(() => ({}));
        const sent = bJson?.sent ?? 0;
        const total = bJson?.total ?? technician_ids.length;
        await clearAdminState();
        if (bRes.ok && sent > 0) {
          await sendReply(from,
            `✅ Broadcast sent for job #${shortRef} to ${sent}/${total} nearby technicians.`, channel);
        } else {
          const err = bJson?.error ? ` (${String(bJson.error).slice(0, 140)})` : "";
          await sendReply(from,
            `⚠️ Broadcast for job #${shortRef} failed — ${sent}/${total} delivered${err}.`, channel);
        }
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }


      // Natural-language broadcast confirmation.
      // Triggers: "yes", "broadcast", "send", "share", "dispatch", "go", "push", "blast"
      // + any 6-char job ref appearing in the message. Anything that looks like
      // an admin confirmation to push the job out to nearby technicians lands here.
      const refRegex = /\b([0-9a-f]{6})\b/i;
      const broadcastVerbRegex = /\b(broadcast|dispatch|send|share|push|blast|notify|alert|forward|go|fire|publish)\b/i;
      const yesRegex = /^\s*(y|yes|ok|okay|sure|confirm|approved?|do it|please)\b/i;
      const refInMsg = trimmed.match(refRegex);
      const looksLikeBroadcast = refInMsg && (broadcastVerbRegex.test(trimmed) || yesRegex.test(trimmed));

      if (looksLikeBroadcast) {
        const ref = refInMsg[1].toLowerCase();
        const { data: jobMatches } = await supabase
          .from("jobs")
          .select("id,customer_name,postcode,lat,lng,issue_type,status,created_at")
          .order("created_at", { ascending: false })
          .limit(500);
        const jm = (jobMatches ?? []).filter((j: any) => String(j.id).toLowerCase().startsWith(ref));
        if (jm.length === 0) {
          await sendReply(from, `No job found for ref "${ref.toUpperCase()}". Reply JOBS to see recent jobs.`, channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
        if (jm.length > 1) {
          await sendReply(from, `Multiple jobs match "${ref.toUpperCase()}" — please use the full 6-character ref.`, channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
        const job: any = jm[0];
        const shortRef = String(job.id).slice(0, 6).toUpperCase();

        // Score nearby technicians (same logic as before).
        const { data: techs } = await supabase
          .from("technicians")
          .select("id,name,phone,service_postcodes,last_lat,last_lng,travel_radius_miles")
          .eq("approval_status", "approved")
          .eq("active", true)
          .limit(500);
        const jobPc = String(job.postcode ?? "").toUpperCase().replace(/\s+/g, "");
        const jobOutward = jobPc.replace(/\d[A-Z]{2}$/, "");
        const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
          const R = 3958.8;
          const toRad = (d: number) => (d * Math.PI) / 180;
          const dLat = toRad(lat2 - lat1);
          const dLng = toRad(lng2 - lng1);
          const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
          return 2 * R * Math.asin(Math.sqrt(a));
        };
        const validCoord2 = (la: any, ln: any) =>
          la != null && ln != null && !(Number(la) === 0 && Number(ln) === 0) &&
          Math.abs(Number(la)) > 0.01 && Math.abs(Number(ln)) > 0.01;
        const scored = (techs ?? []).map((t: any) => {
          let miles: number | null = null;
          if (validCoord2(job.lat, job.lng) && validCoord2(t.last_lat, t.last_lng)) {
            miles = haversine(Number(job.lat), Number(job.lng), Number(t.last_lat), Number(t.last_lng));
          }
          const pcs: string[] = (t.service_postcodes ?? []).map((p: string) => String(p).toUpperCase().replace(/\s+/g, ""));
          const pcMatch = !!jobOutward && pcs.some((p) => p === jobOutward || p.startsWith(jobOutward) || jobOutward.startsWith(p));
          return { t, miles, pcMatch };
        }).filter((x: any) => {
          const inRange = x.miles != null && x.miles <= (x.t.travel_radius_miles ?? 15);
          return x.pcMatch || inRange;
        }).sort((a: any, b: any) => {
          if (a.pcMatch && !b.pcMatch) return -1;
          if (b.pcMatch && !a.pcMatch) return 1;
          if (a.miles != null && b.miles != null) return a.miles - b.miles;
          if (a.miles != null) return -1;
          if (b.miles != null) return 1;
          return 0;
        });

        if (scored.length === 0) {
          await sendReply(from, `Job ${shortRef} (${job.postcode}) — no approved technicians found nearby. Nothing broadcast.`, channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }

        const technician_ids = scored.map((x: any) => x.t.id);

        // Call broadcast-job which sends the approved `new_job_alert_to_technician`
        // Meta template (with header image + body params + photo links).
        const bRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/broadcast-job`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ job_id: job.id, mode: "specific", technician_ids }),
        });
        const bJson: any = await bRes.json().catch(() => ({}));
        const sent = bJson?.sent ?? 0;
        const total = bJson?.total ?? technician_ids.length;
        const previewLines = scored.slice(0, 5).map(({ t, miles }: any) => {
          const dist = miles != null ? ` · ${miles.toFixed(1)} mi` : "";
          return `• ${t.name}${dist}`;
        }).join("\n");
        const more = scored.length > 5 ? `\n…and ${scored.length - 5} more` : "";
        if (bRes.ok && sent > 0) {
          await sendReply(
            from,
            `✅ Broadcast sent for job ${shortRef} (${job.postcode}) to ${sent}/${total} nearby technicians:\n${previewLines}${more}`,
            channel,
          );
        } else {
          const err = bJson?.error ? ` (${String(bJson.error).slice(0, 140)})` : "";
          await sendReply(
            from,
            `⚠️ Broadcast for job ${shortRef} failed — ${sent}/${total} delivered${err}.`,
            channel,
          );
        }
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
            // Tell the technician
            try {
              await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-send`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
                body: JSON.stringify({
                  to: t.phone,
                  body: `Hi${t.name ? ` ${String(t.name).split(" ")[0]}` : ""} — thanks for applying to Tyre Fly. We're unable to approve your profile right now${reason ? `: ${reason}` : "."}`,
                  channel: "whatsapp",
                }),
              });
            } catch (_) {}
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
        // Coords (live location pin) can arrive either in the message body or
        // as dedicated webhook fields from WhatsApp location shares.
        const intakePin = extractCoordsFromWebhook(params) ?? await extractCoords(body);
        let pinLat: number | null = intakePin?.lat ?? null, pinLng: number | null = intakePin?.lng ?? null;

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
        } else if (
          joinPhrase &&
          row.approval_status === "intake" &&
          (!row.name || row.name === "Pending applicant") &&
          !mediaUrls.length &&
          !coords
        ) {
          // Existing intake row with no progress yet + clear join phrase
          // (e.g. they restarted the chat). Re-send the canonical welcome and
          // stop, so the AI extractor doesn't reply with a one-line greeting.
          await sendReply(
            from,
            "👋 Welcome to Tyre Fly! I'll get you set up here on WhatsApp — no website needed.\n\n" +
              "To submit your application I just need 5 quick things: your full name, email address, the areas you cover (postcodes/ZIPs/cities), your vehicle, and your max travel radius.\n\n" +
              "After that, you can also send (anytime — even after submitting): a 📍live location pin, equipment photo, and photos of your insurance, ID & public liability docs. Admin will follow up if anything else is needed.\n\n" +
              "Let's start — what's your full name?",
            channel,
          );
          await logOnboarding(supabase, {
            technician_id: row.id,
            phone: from,
            channel,
            inbound_body: body,
            has_media: false,
            media_count: 0,
            detected_intent: "join_request",
            prior_status: "intake",
            next_status: "intake",
            route_taken: "intake_resumed_welcome_only",
            reply_sent: "welcome",
          });
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
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

        // Submit for admin review as soon as MANDATORY items are complete.
        // The AI continues asking for optional items (docs, photos, pin, schedule) afterwards.
        const merged = { ...row, ...updates };
        const mandatoryComplete =
          merged.name && merged.name !== "Pending applicant" &&
          merged.email &&
          (merged.service_postcodes?.length ?? 0) > 0 &&
          merged.vehicle &&
          (merged.travel_radius_miles ?? 0) > 0;

        if (mandatoryComplete && row.approval_status !== "pending" && row.approval_status !== "approved" && row.approval_status !== "rejected") {
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
      // Capture any location the technician shared. We accept WhatsApp pins
      // (reshaped to "(lat, lng)"), plain "lat, lng", DMS like
      // 51°31'03.1"N 0°08'45.8"W, and Google Maps share links (incl. the
      // shortened maps.app.goo.gl/... URLs — we follow the redirect).
      const techPin = extractCoordsFromWebhook(params) ?? await extractCoords(body);
      if (techPin) {
        const { lat, lng } = techPin;
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
        // Reflect the new pin on the local tech object so the downstream
        // hasFreshPin check sees it within this same request.
        tech.last_lat = lat;
        tech.last_lng = lng;
        tech.live_location_until = expires.toISOString();
        console.log("tech location updated", JSON.stringify({ tech: tech.id, lat, lng, expires: expires.toISOString() }));
      }

      // Find their most recent open allocation
      // NOTE: no FK from job_allocations.job_id → jobs.id, so we cannot use
      // PostgREST embedded select (`jobs(*)`) here — it errors silently and
      // makes us reply "no open job" even when a broadcast exists.
      const { data: allocs, error: allocErr } = await supabase
        .from("job_allocations")
        .select("*")
        .eq("technician_id", tech.id)
        .in("status", ["broadcast", "proposed"])
        .order("created_at", { ascending: false })
        .limit(1);
      if (allocErr) console.error("tech alloc lookup failed", allocErr);
      const alloc: any = allocs?.[0];

      if (!alloc?.job_id) {
        // Pure location ping with no open job → just ack
        if (techPin && !body.replace(GMAPS_URL_RE, "").replace(COORD_RE, "").replace(DMS_RE, "").replace(PLAIN_LATLNG_RE, "").trim()) {
          await sendReply(from, "Got your live location 📍 — tracking for the next 8 hours. We'll match you to nearby jobs.", channel);
        } else {
          await sendReply(from, "Thanks — no open job for you right now. We'll text when one matches.", channel);
        }
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      const pinOnlyMessage = !!techPin && !body.replace(GMAPS_URL_RE, "").replace(COORD_RE, "").replace(DMS_RE, "").replace(PLAIN_LATLNG_RE, "").trim();
      const parsed = pinOnlyMessage
        ? { price_gbp: null, callout_fee_gbp: null, eta_minutes: null, accepts: true, tyre_included: null, tyre_condition: null, notes: "location only", confidence: "high" as const }
        : await aiExtractQuote(body);

      if (!parsed.accepts) {
        await supabase
          .from("job_allocations")
          .update({ status: "declined" })
          .eq("id", alloc.id);
        await sendReply(from, "Got it — passing on this one. Thanks for the quick reply.", channel);
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // Accumulate the three required pieces (price, ETA, pin location) across
      // however many messages the technician sends. We keep a draft quote
      // (status='collecting') and only flip it to 'pending' + notify admin
      // once all three are in.
      const shortRef = alloc.job_id.slice(0, 6);

      // Find existing draft quote for this allocation, or create one.
      const { data: existingDrafts } = await supabase
        .from("quotes")
        .select("*")
        .eq("job_id", alloc.job_id)
        .eq("technician_id", tech.id)
        .in("status", ["collecting", "pending"])
        .order("created_at", { ascending: false })
        .limit(1);
      let draft: any = existingDrafts?.[0] ?? null;

      if (!draft) {
        const { data: inserted } = await supabase.from("quotes").insert({
          job_id: alloc.job_id,
          technician_id: tech.id,
          status: "collecting",
          raw_message: body,
          confidence: parsed.confidence,
        }).select("*").single();
        draft = inserted;
      }

      // Merge new fields into the draft (don't overwrite previously-collected values with null).
      const mergedPrice = draft.price_gbp ?? parsed.price_gbp ?? null;
      const mergedCallout = draft.callout_fee_gbp ?? parsed.callout_fee_gbp ?? null;
      const mergedEta = draft.eta_minutes ?? parsed.eta_minutes ?? null;
      const mergedTyreIncl = draft.tyre_included ?? parsed.tyre_included ?? null;
      const mergedTyreCond = draft.tyre_condition ?? parsed.tyre_condition ?? null;

      // Pin location: did this message contain coords, or do we already have a
      // fresh (still-live) pin for this technician?
      const liveUntil = tech.live_location_until ? new Date(tech.live_location_until).getTime() : 0;
      const hasFreshPin = !!techPin || (tech.last_lat != null && tech.last_lng != null && liveUntil > Date.now());
      const pinLat = techPin ? techPin.lat : tech.last_lat;
      const pinLng = techPin ? techPin.lng : tech.last_lng;

      const hasPrice = mergedPrice != null;
      const hasEta = mergedEta != null;
      const hasPin = hasFreshPin;

      // Persist whatever we've collected so far.
      await supabase.from("quotes").update({
        price_gbp: mergedPrice,
        callout_fee_gbp: mergedCallout,
        eta_minutes: mergedEta,
        tyre_included: mergedTyreIncl,
        tyre_condition: mergedTyreCond,
        raw_message: ((draft.raw_message ? draft.raw_message + " | " : "") + body).slice(0, 2000),
        confidence: parsed.confidence,
      }).eq("id", draft.id);

      if (!(hasPrice && hasEta && hasPin)) {
        const missing: string[] = [];
        if (!hasPrice) missing.push("💷 your price in £");
        if (!hasEta) missing.push("⏱️ ETA in minutes");
        if (!hasPin) missing.push("📍 your live location pin");
        const gotParts: string[] = [];
        if (hasPrice) gotParts.push(`price £${mergedPrice}`);
        if (hasEta) gotParts.push(`ETA ${mergedEta} min`);
        if (hasPin) gotParts.push("location ✅");
        const gotLine = gotParts.length ? `Got: ${gotParts.join(", ")}.\n` : "";
        await sendReply(
          from,
          `Thanks! For job ${shortRef} I still need:\n• ${missing.join("\n• ")}\n\n${gotLine}Please send the missing detail(s) so we can put your quote to the customer.`,
          channel,
        );
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // All three present → finalise the quote.
      const allocCreated = new Date(alloc.created_at).getTime();
      const elapsedSec = Math.round((Date.now() - allocCreated) / 1000);
      const onTime = elapsedSec <= 60;

      await supabase.from("quotes").update({
        status: "pending",
        quote_deadline: new Date(allocCreated + 60_000).toISOString(),
      }).eq("id", draft.id);

      const tyreNote = mergedTyreIncl
        ? ` (incl. ${mergedTyreCond ?? ""} tyre)`.replace("  ", " ")
        : (mergedTyreIncl === false ? " (tyre NOT included)" : "");
      const timeNote = onTime ? "⚡ within 60s" : `(${elapsedSec}s)`;

      await sendReply(
        from,
        `Quote received ${timeNote}: £${mergedPrice}, ETA ${mergedEta} min${tyreNote}. We'll text when the customer chooses.`,
        channel,
      );

      // Notify admin/operations console with the full picture.
      const mapsPin = `https://maps.google.com/?q=${pinLat},${pinLng}`;
      const techPhone = tech.phone || tech.whatsapp || "n/a";

      // Fetch job for vehicle reg + customer + issue details.
      const { data: jobRow } = await supabase
        .from("jobs")
        .select("id, vehicle_reg, customer_name, customer_phone, customer_email, postcode, issue_type, issue_description, damage_summary, damage_type")
        .eq("id", alloc.job_id)
        .maybeSingle();
      const vehicleReg = jobRow?.vehicle_reg?.toString().trim() || "Not provided";
      const customerLine = jobRow?.customer_name
        ? `${jobRow.customer_name}${jobRow.customer_phone ? ` (${jobRow.customer_phone})` : ""}`
        : (jobRow?.customer_phone ?? "—");
      const issueLine =
        jobRow?.damage_summary?.trim() ||
        jobRow?.issue_description?.trim() ||
        jobRow?.damage_type?.trim() ||
        jobRow?.issue_type?.trim() ||
        "Tyre service required";

      const adminBody =
        `🆕 New Quote Received\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🔖 Job Ref: ${shortRef}\n` +
        `👤 Customer: ${customerLine}\n` +
        `🚗 Vehicle Reg: ${vehicleReg}\n` +
        `🔧 Issue: ${issueLine}\n` +
        `\n` +
        `👨‍🔧 Technician: ${tech.name ?? "Technician"}\n` +
        `📞 Phone: ${techPhone}\n` +
        `\n` +
        `💷 Price: £${mergedPrice}${tyreNote}\n` +
        `⏱️ ETA: ${mergedEta} min\n` +
        `📍 Live Location: ${mapsPin}`;

      await supabase.from("ops_alerts").insert({
        level: "info",
        title: `Tech quote — ${tech.name ?? "technician"} · job ${shortRef}`,
        body: adminBody,
        job_id: alloc.job_id,
      });

      // Also send a WhatsApp message to master admins so they see it in chat.
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-admins`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            channel: "whatsapp",
            body: adminBody,
          }),
        });
      } catch (e) {
        console.error("notify-admins (tech_quote_ready) failed", e);
      }

      // ───────────────────────────────────────────────────────────────
      // Send the full quote to the CUSTOMER with a Stripe payment link.
      // No personal details about the technician are shared.
      // ───────────────────────────────────────────────────────────────
      if (jobRow?.customer_phone) {
        try {
          // Accept this quote, mark others as lost, assign tech, move job to awaiting_payment.
          await supabase.from("quotes").update({ status: "accepted" }).eq("id", draft.id);
          await supabase.from("quotes")
            .update({ status: "lost" })
            .eq("job_id", alloc.job_id)
            .eq("status", "pending")
            .neq("id", draft.id);
          await supabase.from("jobs").update({
            status: "awaiting_payment",
            assigned_technician_id: tech.id,
          }).eq("id", alloc.job_id);

          // Create a Stripe Checkout session for the full job amount.
          let payUrl: string | null = null;
          try {
            const { createStripeClient } = await import("../_shared/stripe.ts");
            const stripe = createStripeClient("live");
            const session = await stripe.checkout.sessions.create({
              mode: "payment",
              line_items: [{
                price_data: {
                  currency: "gbp",
                  product_data: {
                    name: `Mobile tyre service — ${jobRow.postcode ?? ""}`.trim(),
                    description: `${issueLine} · ETA ${mergedEta} min`,
                  },
                  unit_amount: Math.round(Number(mergedPrice) * 100),
                },
                quantity: 1,
              }],
              success_url: `https://tyrefly.com/confirmed?job=${alloc.job_id}`,
              cancel_url: `https://tyrefly.com/job/${alloc.job_id}?canceled=1`,
              customer_email: jobRow.customer_email ?? undefined,
              metadata: {
                job_id: alloc.job_id,
                technician_id: tech.id,
                kind: "job_full_payment",
                price_gbp: String(mergedPrice),
                eta_minutes: String(mergedEta),
              },
              payment_intent_data: {
                metadata: { job_id: alloc.job_id, technician_id: tech.id, kind: "job_full_payment" },
                description: `Tyre Fly — job ${shortRef} — ${jobRow.postcode ?? ""}`.trim(),
              },
            });
            const { shortenUrl } = await import("../_shared/short-link.ts");
            payUrl = await shortenUrl(session.url!, { kind: "job_full_payment", job_id: alloc.job_id });
            await supabase.from("jobs").update({
              stripe_session_id: session.id,
              stripe_checkout_url: session.url,
            }).eq("id", alloc.job_id);
          } catch (e) {
            console.error("stripe checkout (customer quote) failed", e);
          }

          const trackingUrl = `https://tyrefly.com/job/${alloc.job_id}`;
          const customerBody =
            `Hello${jobRow.customer_name ? ` ${jobRow.customer_name}` : ""},\n\n` +
            `Your vehicle issue has been inspected by our technician.\n\n` +
            `🚗 Vehicle: ${vehicleReg}\n` +
            `🔧 Issue Found: ${issueLine}\n` +
            `💵 Repair Cost: £${mergedPrice}${tyreNote}\n` +
            `⏱ Estimated Arrival Time (ETA): ${mergedEta} minutes\n\n` +
            `📍 Live Technician Location: ${trackingUrl}\n\n` +
            (payUrl
              ? `To proceed with the service, please complete the payment using the secure Stripe link below:\n\n💳 Payment Link: ${payUrl}\n\n` +
                `Once the payment is confirmed, the technician will proceed with the repair service at your location.\n\n`
              : `We'll send your secure payment link shortly.\n\n`) +
            `Thank you.\n— Tyre Fly`;

          await sendReply(jobRow.customer_phone, customerBody, "whatsapp");
        } catch (e) {
          console.error("send customer quote failed", e);
        }
      }

      return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
    }

    // 3. Customer? Check for pending quote acceptance / review rating first.
    //    These are reply-shaped interactions on an existing job (NOT intake).
    const { data: recentJobs } = await supabase
      .from("jobs")
      .select("*")
      .eq("customer_phone", from)
      .order("created_at", { ascending: false })
      .limit(1);
    const recentJob: any = recentJobs?.[0];

    if (recentJob) {
      // 3a. Review rating (1-5) on a closed_pending_review job
      const ratingMatch = body.match(/^\s*([1-5])\b/);
      if (ratingMatch && recentJob.status === "closed_pending_review") {
        const score = parseInt(ratingMatch[1], 10);
        const { data: q } = await supabase
          .from("quotes")
          .select("technician_id")
          .eq("job_id", recentJob.id)
          .eq("status", "paid")
          .maybeSingle();
        await supabase.from("reviews").insert({
          job_id: recentJob.id,
          technician_id: q?.technician_id ?? null,
          score,
          comment: body,
        });
        await supabase.from("jobs").update({ status: "closed" }).eq("id", recentJob.id);
        await sendReply(from, `Thanks for the ${score}★ rating!`, channel);
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // 3b. Quote acceptance on a job awaiting customer choice
      const isAccept = /^\s*(yes|y|accept|ok|book it)\b/i.test(body);
      const acceptableStates = ["broadcasting", "awaiting_approval", "intake_complete", "pending"];
      if (isAccept && acceptableStates.includes(recentJob.status)) {
        const { data: pending } = await supabase
          .from("quotes")
          .select("*")
          .eq("job_id", recentJob.id)
          .eq("status", "pending")
          .order("price_gbp", { ascending: true })
          .limit(1);
        const cheapest: any = pending?.[0];
        if (cheapest) {
          await supabase.from("quotes").update({ status: "accepted" }).eq("id", cheapest.id);
          await supabase.from("quotes").update({ status: "lost" }).eq("job_id", recentJob.id).eq("status", "pending").neq("id", cheapest.id);
          await supabase.from("jobs").update({
            status: "awaiting_payment",
            assigned_technician_id: cheapest.technician_id,
          }).eq("id", recentJob.id);

          let payUrl: string | null = null;
          try {
            const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/create-fee-checkout`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({ job_id: recentJob.id }),
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
            ? `Booked! ${sym}${cheapest.price_gbp} total, ETA ${cheapest.eta_minutes} min. Pay the ${feeDisp} booking fee to confirm (deducted from final bill): ${payUrl}. Remaining ${sym}${Math.max(0, Number(cheapest.price_gbp) - feeAmt)} paid to technician on-site.`
            : `Booked! ${sym}${cheapest.price_gbp} total, ETA ${cheapest.eta_minutes} min. We'll text the ${feeDisp} booking fee link shortly (deducted from final bill).`;
          await sendReply(from, confirmMsg, "whatsapp");
          await sendReply(from, confirmMsg, "sms");
        }
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // 3c. Locked states: job already in payment/in-progress. Treat texts as enrichment.
      const lockedStates = ["awaiting_payment", "accepted", "in_progress", "paid"];
      if (lockedStates.includes(recentJob.status)) {
        const updates: Record<string, any> = { updated_at: new Date().toISOString() };
        if (body) updates.issue_description = [recentJob.issue_description, body].filter(Boolean).join("\n").slice(0, 2000);
        if (mediaUrls.length > 0) updates.photo_urls = [...(recentJob.photo_urls ?? []), ...mediaUrls].slice(0, 12);
        if (Object.keys(updates).length > 1) {
          await supabase.from("jobs").update(updates).eq("id", recentJob.id);
          await sendReply(from, "Thanks — added that to your job. The technician has been notified.", channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
      }
    }

    // 4. Otherwise → route through the customer intake state machine.
    //    This is the single source of truth for the 6-step information gathering.
    //    It handles brand-new customers, returning customers (with memory pre-fill),
    //    and continuing an in-flight intake — all without re-asking completed steps.
    const outcome = await processCustomerIntake(supabase, {
      from,
      body,
      mediaUrls,
      channel,
    });

    // Run vision analysis on any new photos (bounces back non-tyre photos).
    if (mediaUrls.length > 0 && outcome.job?.id) {
      try {
        const ar = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/analyze-damage`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            job_id: outcome.job.id,
            photo_urls: mediaUrls,
            issue_description: outcome.job.issue_description,
            issue_type: outcome.job.issue_type,
          }),
        });
        const aj = await ar.json();
        if (aj?.damage_type === "not-a-tyre") {
          await sendReply(
            from,
            aj.damage_summary || "That doesn't look like a tyre photo 🤔 Could you send a clear photo of the tyre/wheel?",
            channel,
          );
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
      } catch (e) {
        console.error("analyze-damage call failed", e);
      }
    }

    if (outcome.justCompleted) {
      // Re-run the vision analysis over ALL collected photos so the final
      // damage_summary reflects every image, not just the last one uploaded.
      const allPhotos: string[] = Array.isArray(outcome.job?.photo_urls) ? outcome.job.photo_urls : [];
      if (allPhotos.length > 0) {
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/analyze-damage`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              job_id: outcome.job.id,
              photo_urls: allPhotos,
              issue_type: outcome.job.issue_type,
              // Intentionally NOT passing issue_description — keeps the AI
              // summary focused on the visuals instead of parroting the user.
            }),
          });
        } catch (e) {
          console.error("final analyze-damage call failed", e);
        }
      }
      await supabase.from("ops_alerts").insert({
        level: "info",
        title: "Intake complete — all details collected",
        body: `Job ${outcome.job.id.slice(0, 6)} is ready for technician matching.`,
        job_id: outcome.job.id,
      });
    }

    await sendReply(from, outcome.reply, channel);
    return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
  } catch (e) {
    console.error("twilio-inbound error", e);
    return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
  }
});
