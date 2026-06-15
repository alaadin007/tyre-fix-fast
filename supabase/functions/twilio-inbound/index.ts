// Twilio inbound webhook — routes to the right Agent
// 1. From a known technician → Parsing Agent (extract price + ETA → quotes)
// 2. From a known customer with a numeric reply → Review Agent (rating)
// 3. From a known customer with "yes"/"accept" → quote acceptance
// 4. Anything else → log only (Co-Pilot can review)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { feeForPhone } from "../_shared/region-fee.ts";
import { processCustomerIntake } from "../_shared/intake-state.ts";
import { isCustomerQuoteAmountValid, normalizeSuspiciousQuotePrice } from "../_shared/quote-price.ts";
import { resolveQuoteLocationForAllocation } from "../_shared/quote-location.ts";
import { resolveAdminJobRefAction, shouldPrioritizeAdminBranch } from "../_shared/admin-job-ref-routing.ts";
import { extractCoordsFromWebhook } from "../_shared/webhook-location.ts";
import { adminMenuText, classifyAdminMessage, type AdminLanguage } from "../_shared/admin-intent.ts";

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
const GMAPS_Q_RE = /[?&]q=(-?\d{1,3}\.\d+),\+?(-?\d{1,3}\.\d+)/;
// Matches the Location header / final URL form returned by maps.app.goo.gl
// shortlinks, e.g. /maps/search/51.517598,+-0.146089 or /maps/place/.../51.5,-0.1
const GMAPS_SEARCH_RE = /\/maps\/(?:search|place|dir)\/[^/]*?(-?\d{1,3}\.\d+),\+?(-?\d{1,3}\.\d+)/;
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
      // First, try a no-follow request so we can read the Location header from
      // maps.app.goo.gl / goo.gl shortlinks directly — Google's redirect target
      // usually contains the coords (e.g. /maps/search/51.5,-0.1?...).
      const candidates: string[] = [];
      try {
        const head = await fetch(url[0], { redirect: "manual" });
        const loc = head.headers.get("location");
        if (loc) candidates.push(loc);
      } catch (_) { /* ignore */ }
      // Fallback: follow redirects and inspect the final URL + HTML body.
      try {
        const r = await fetch(url[0], { redirect: "follow" });
        if (r.url) candidates.push(r.url);
        const html = await r.text().catch(() => "");
        if (html) candidates.push(html);
      } catch (_) { /* ignore */ }
      for (const src of candidates) {
        const a = src.match(GMAPS_AT_RE)
          || src.match(GMAPS_3D4D_RE)
          || src.match(GMAPS_Q_RE)
          || src.match(GMAPS_SEARCH_RE);
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
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ to, body, channel }),
    });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      console.error("sendReply: delivery failed", {
        to,
        channel,
        status: r.status,
        bodyPreview: body.slice(0, 120),
        responsePreview: text.slice(0, 400),
      });
    } else {
      console.log("sendReply: delivered", { to, channel, len: body.length });
    }
  } catch (e) {
    console.error("sendReply: network error", {
      to,
      channel,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

const PHOTO_DEBOUNCE_MS = 5000;
const PHOTO_DEBOUNCE_POLL_MS = 500;
const PHOTO_DEBOUNCE_MAX_BATCH_MS = 15000;

async function debounceCustomerPhotoBatch(
  supabase: any,
  args: {
    from: string;
    channel: "sms" | "whatsapp";
    mediaUrls: string[];
    inboundMessageId: string | null;
    inboundCreatedAt: string | null;
  },
): Promise<{ shouldProcess: boolean; mediaUrls: string[] }> {
  const { from, channel, mediaUrls, inboundMessageId, inboundCreatedAt } = args;
  const currentAt = inboundCreatedAt ? Date.parse(inboundCreatedAt) : NaN;
  if (!inboundMessageId || !Number.isFinite(currentAt)) return { shouldProcess: true, mediaUrls };

  let waited = 0;
  while (waited < PHOTO_DEBOUNCE_MS + PHOTO_DEBOUNCE_POLL_MS) {
    await new Promise((resolve) => setTimeout(resolve, PHOTO_DEBOUNCE_POLL_MS));
    waited += PHOTO_DEBOUNCE_POLL_MS;
    const cutoff = new Date(currentAt + PHOTO_DEBOUNCE_MS).toISOString();
    const { data: newer } = await supabase
      .from("sms_messages")
      .select("id")
      .eq("direction", "inbound")
      .eq("channel", channel)
      .eq("from_number", from)
      .eq("body", "")
      .gt("num_media", 0)
      .gt("created_at", inboundCreatedAt)
      .lte("created_at", cutoff)
      .limit(1);
    if ((newer ?? []).length > 0) {
      console.log("photo debounce: newer image arrived, suppressing this webhook", { inboundMessageId, newerId: newer![0].id });
      return { shouldProcess: false, mediaUrls: [] };
    }
  }

  const batchStart = new Date(Math.max(0, currentAt - PHOTO_DEBOUNCE_MAX_BATCH_MS)).toISOString();
  const { data: rows, error } = await supabase
    .from("sms_messages")
    .select("id, media_urls, created_at")
    .eq("direction", "inbound")
    .eq("channel", channel)
    .eq("from_number", from)
    .eq("body", "")
    .gt("num_media", 0)
    .gte("created_at", batchStart)
    .lte("created_at", new Date(currentAt + PHOTO_DEBOUNCE_MS).toISOString())
    .order("created_at", { ascending: true })
    .limit(25);
  if (error) console.error("photo debounce: failed to load batched media", error);

  const batchRows: any[] = [];
  for (let i = (rows ?? []).length - 1; i >= 0; i--) {
    const row = rows![i];
    const rowAt = Date.parse(row.created_at);
    if (!Number.isFinite(rowAt) || rowAt > currentAt + PHOTO_DEBOUNCE_MS) continue;
    if (batchRows.length === 0) {
      if (row.id !== inboundMessageId) continue;
      batchRows.unshift(row);
      continue;
    }
    const nextAt = Date.parse(batchRows[0].created_at);
    if (Number.isFinite(nextAt) && nextAt - rowAt <= PHOTO_DEBOUNCE_MS) {
      batchRows.unshift(row);
    } else {
      break;
    }
  }

  const batched: string[] = [];
  for (const row of batchRows) {
    for (const url of (row.media_urls ?? []) as string[]) {
      if (url && !batched.includes(url)) batched.push(url);
    }
  }
  for (const url of mediaUrls) {
    if (url && !batched.includes(url)) batched.push(url);
  }

  console.log("photo debounce: processing batched images", { from, count: batched.length, inboundMessageId });
  return { shouldProcess: true, mediaUrls: batched.length > 0 ? batched : mediaUrls };
}

// ───────────── Intent classifier (pre-intake gate) ─────────────
// Classifies an inbound customer message BEFORE we route to the intake state
// machine. We only ever start the intake flow when the customer has clearly
// described a tyre/vehicle problem — never on greetings, thank-yous, or
// generic acknowledgements. Mid-intake replies bypass this gate (handled by
// the active-conversation check at the call site).
type CustomerIntent =
  | "INTENT_GREETING"
  | "INTENT_GRATITUDE"
  | "INTENT_ACKNOWLEDGEMENT"
  | "INTENT_JOB_REQUEST"
  | "INTENT_JOB_STATUS_ENQUIRY"
  | "INTENT_PAYMENT_ENQUIRY"
  | "INTENT_CANCELLATION"
  | "INTENT_COMPLAINT_OR_QUESTION"
  | "INTENT_UNKNOWN";

type IntentResult = {
  intent: CustomerIntent;
  has_vehicle_issue: boolean;
  confidence: "high" | "medium" | "low";
};

// Cheap regex fallback for the most common short messages, so we don't burn
// an AI call on "hi" / "thanks" / "ok" and we stay robust if the AI is down.
function quickIntent(text: string): IntentResult | null {
  const t = (text || "").trim().toLowerCase().replace(/[!.?]+$/, "");
  if (!t) return null;
  if (t.length <= 40) {
    if (/^(hi|hii+|hey+|hello+|hiya|yo|salam|assalam(u|o)?\s*(o\s*)?alaikum|aoa|namaste|good\s+(morning|afternoon|evening))\b/.test(t)) {
      return { intent: "INTENT_GREETING", has_vehicle_issue: false, confidence: "high" };
    }
    if (/^(thanks?|thank\s*you|thx|ty|cheers|shukriya|jazak[ai]llah|brilliant|great|awesome|perfect|amazing|appreciate(d)?|much\s+appreciated)\b/.test(t)) {
      return { intent: "INTENT_GRATITUDE", has_vehicle_issue: false, confidence: "high" };
    }
    if (/^(ok+|okay|kk|sure|alright|al?right|fine|cool|got\s*it|understood|noted|no\s*problem|np|sounds\s*good)\b/.test(t)) {
      return { intent: "INTENT_ACKNOWLEDGEMENT", has_vehicle_issue: false, confidence: "high" };
    }
    if (/^(cancel|never\s*mind|nevermind|nvm|forget\s*it)\b/.test(t)) {
      return { intent: "INTENT_CANCELLATION", has_vehicle_issue: false, confidence: "high" };
    }
    if (/(status|update|where('?s| is)?\s+(the\s+)?(tech|technician|guy|driver)|how\s+long|eta|when.*(come|arrive|here))/.test(t)) {
      return { intent: "INTENT_JOB_STATUS_ENQUIRY", has_vehicle_issue: false, confidence: "medium" };
    }
    if (/(i\s*paid|payment\s*(done|sent|made)|sent\s+(the\s+)?(money|payment)|did\s+you\s+(get|receive).*payment)/.test(t)) {
      return { intent: "INTENT_PAYMENT_ENQUIRY", has_vehicle_issue: false, confidence: "high" };
    }
  }
  return null;
}

async function classifyCustomerIntent(text: string): Promise<IntentResult> {
  const quick = quickIntent(text);
  if (quick) return quick;
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    // Fail safe: when we genuinely can't classify, assume unknown (NOT intake).
    return { intent: "INTENT_UNKNOWN", has_vehicle_issue: false, confidence: "low" };
  }
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are an intent classifier for TyreFly, a 24/7 roadside tyre repair service. " +
              "Given the customer's WhatsApp message, classify it into EXACTLY one intent. " +
              "Intents: INTENT_GREETING, INTENT_GRATITUDE, INTENT_ACKNOWLEDGEMENT, INTENT_JOB_REQUEST, " +
              "INTENT_JOB_STATUS_ENQUIRY, INTENT_PAYMENT_ENQUIRY, INTENT_CANCELLATION, " +
              "INTENT_COMPLAINT_OR_QUESTION, INTENT_UNKNOWN. " +
              "Set has_vehicle_issue=true ONLY when the customer clearly describes a tyre/vehicle problem " +
              "(flat, puncture, blowout, low pressure, broken down, need help with tyre, etc.) or explicitly " +
              "asks to book/report one. Greetings, thanks, and acknowledgements are NEVER vehicle issues.",
          },
          { role: "user", content: text || "" },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify",
            parameters: {
              type: "object",
              properties: {
                intent: {
                  type: "string",
                  enum: [
                    "INTENT_GREETING", "INTENT_GRATITUDE", "INTENT_ACKNOWLEDGEMENT",
                    "INTENT_JOB_REQUEST", "INTENT_JOB_STATUS_ENQUIRY", "INTENT_PAYMENT_ENQUIRY",
                    "INTENT_CANCELLATION", "INTENT_COMPLAINT_OR_QUESTION", "INTENT_UNKNOWN",
                  ],
                },
                has_vehicle_issue: { type: "boolean" },
                confidence: { type: "string", enum: ["high", "medium", "low"] },
              },
              required: ["intent", "has_vehicle_issue", "confidence"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "classify" } },
      }),
    });
    if (!r.ok) {
      console.error("intent classify failed", r.status, await r.text().catch(() => ""));
      return { intent: "INTENT_UNKNOWN", has_vehicle_issue: false, confidence: "low" };
    }
    const j = await r.json();
    const args = j?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = typeof args === "string" ? JSON.parse(args) : args;
    if (!parsed?.intent) return { intent: "INTENT_UNKNOWN", has_vehicle_issue: false, confidence: "low" };
    return {
      intent: parsed.intent,
      has_vehicle_issue: !!parsed.has_vehicle_issue,
      confidence: parsed.confidence ?? "medium",
    };
  } catch (e) {
    console.error("intent classify error", e);
    return { intent: "INTENT_UNKNOWN", has_vehicle_issue: false, confidence: "low" };
  }
}

// ───────────── FAQ matcher (runs BEFORE intent detection) ─────────────
// Customer questions like "do you offer tyre replacement", "how much does
// it cost", "do you work 24/7" must be answered as FAQs and must NOT
// trigger the intake flow — even when the message mentions "tyre".
// Returns an answer string if matched, otherwise null.
function matchFaq(text: string): string | null {
  const t = (text || "").trim().toLowerCase();
  if (!t || t.length > 200) return null;

  // Must look like a question / enquiry, not a problem statement.
  // Heuristics: starts with question word, contains "?", or uses
  // "do you / can you / are you / is this / how much / how long".
  const isQuestionShape =
    /\?/.test(t) ||
    /^(do|does|can|could|are|is|will|would|how|what|where|when|why|who|tell\s+me|please\s+tell)/.test(t) ||
    /\b(do you|does this|can you|are you|is this|how much|how long|how do|what (is|are|do)|tell me)\b/.test(t);
  if (!isQuestionShape) return null;

  // Problem-statement guard: if the message clearly reports a personal
  // tyre problem ("my tyre is flat", "i have a puncture", "need help with
  // my tyre right now"), it's NOT an FAQ — let intake handle it.
  const isProblemStatement =
    /\b(my|our)\s+(tyre|tire|car|van|wheel)\b/.test(t) ||
    /\b(i\s*(have|got|need)|i'm|im|im\s+stuck|stuck|stranded|broke(n)?\s*down)\b/.test(t) ||
    /\b(help me|need help|need a (tech|technician|fix|repair))\b/.test(t);
  if (isProblemStatement) return null;

  // ── Service & pricing FAQs ──
  if (/\b(replace(ment)?|new\s+tyres?|fit\s+(new\s+)?tyres?|change\s+tyres?)\b/.test(t) &&
      /\b(do|does|can|offer|provide|available|service)\b/.test(t)) {
    return "Both — puncture repairs and full tyre replacements. The right option depends on the damage, which is why we ask for photos. Want to book a job?";
  }
  if (/\b(how\s+much|cost|price|charge|fee|quote|expensive|cheap)\b/.test(t) &&
      !/\b(call[-\s]?out)\b/.test(t)) {
    return "Prices vary by job, tyre size and technician. Once we have your details we'll send a fixed quote before any work starts — no hidden fees.";
  }
  if (/\bcall[-\s]?out\s+(fee|charge)\b/.test(t)) {
    return "No fixed call-out fee. The price you receive in your quote covers everything.";
  }
  if (/\b(24[\s/]?7|24\s*hours?|all\s+night|weekend|sunday|bank\s+holiday|open\s+now|always\s+open)\b/.test(t)) {
    return "Yes — we operate 24 hours a day, 7 days a week, including bank holidays.";
  }
  if (/\b(how\s+long|eta|how\s+fast|how\s+quick|when.*(come|arrive|get here))\b/.test(t)) {
    return "Once booked, your technician sends an ETA. Most jobs are completed within 30–60 minutes of booking.";
  }
  if (/\b(repair|fix)\b/.test(t) && /\b(or|vs|versus)\b/.test(t) && /\b(replace|new)\b/.test(t)) {
    return "Both — puncture repairs and full tyre replacements. The right option depends on the damage, which is why we ask for photos.";
  }
  if (/\b(motorway|highway|m\d{1,2}|hard\s+shoulder)\b/.test(t)) {
    return "Yes, we cover motorway breakdowns. Please make sure you're in a safe position, ideally behind the barrier, before the technician arrives.";
  }
  if (/\b(my\s+area|cover|available|service)\b/.test(t) && /\b(area|postcode|town|city|location|uk|here)\b/.test(t)) {
    return "We cover most of the UK. Share your live location and we'll confirm availability instantly.";
  }
  if (/\b(hgv|lorry|truck|van|commercial|vehicle\s+type|all\s+vehicles)\b/.test(t)) {
    return "We cover cars, vans, and most light commercial vehicles. For HGVs or specialist vehicles, please contact our team directly.";
  }

  // ── Off-topic ──
  if (/\bbrake/.test(t)) {
    return "TyreFly specialises in mobile tyre repairs and replacements. For brake issues, a local garage would be your best bet. Anything tyre-related I can help with?";
  }
  if (/\boil\s+change\b/.test(t)) {
    return "We're tyre specialists, so oil changes aren't something we offer. Got a tyre problem I can help with?";
  }
  if (/\bengine\b/.test(t) || /\bwarning\s+light\b/.test(t)) {
    return "Worth getting checked soon! We only handle tyres here — the RAC/AA or a local garage can help with engine issues. Anything tyre-related?";
  }
  if (/\bweather\b/.test(t)) {
    return "Not quite our area! We're your 24/7 tyre rescue service — if you ever have a tyre emergency, we're here.";
  }
  if (/\bjoke\b/.test(t)) {
    return "I'd love to, but I'm on tyre duty 24/7! Got a puncture? I'm your guy.";
  }
  if (/\b(real\s+person|human|are\s+you\s+(a\s+)?(bot|ai|robot))\b/.test(t)) {
    return "I'm Fly, TyreFly's virtual assistant — not human, but here to get you back on the road fast! For anything I can't handle, I'll connect you with our team.";
  }
  if (/\bfull\s+(car\s+)?service\b/.test(t)) {
    return "TyreFly focuses on mobile tyre repairs and replacements — we're not a full service garage. Need help with a tyre?";
  }
  if (/\b(is\s+this\s+whatsapp|wrong\s+number)\b/.test(t)) {
    return "You've reached TyreFly's WhatsApp service — the UK's 24/7 roadside tyre rescue! If you have a tyre problem, I can help.";
  }

  return null;
}

function firstNameOf(s: string | null | undefined): string {
  if (!s) return "";
  const n = String(s).trim().split(/\s+/)[0];
  return n && n.toLowerCase() !== "customer" ? n : "";
}

function jobRefOf(j: any): string {
  return j?.id ? `#${String(j.id).slice(0, 6).toUpperCase()}` : "";
}

function normalizeJobReference(raw: string | null | undefined): string | null {
  const cleaned = String(raw ?? "").trim().replace(/^#/, "").toUpperCase();
  const match = cleaned.match(/^([0-9A-F]{6})[0-9A-F]{0,2}$/);
  return match ? match[1] : null;
}

function jobRefUuidBounds(shortRef: string): { lower: string; upper: string } {
  const ref = shortRef.toLowerCase();
  return {
    lower: `${ref}00-0000-0000-0000-000000000000`,
    upper: `${ref}ff-ffff-ffff-ffff-ffffffffffff`,
  };
}

const ACTIVE_JOB_STATUSES = new Set([
  "intake_pending", "intake_complete", "broadcasting", "awaiting_approval",
  "pending", "awaiting_payment", "assigned", "en_route", "on_site", "in_progress",
]);


// ───────────── Open-job clarification helpers (customer side) ─────────────
// When a customer with one or more open jobs sends a free-form message that
// isn't a quote acceptance, review rating, or photo enrichment, we (a) list
// their open jobs and ask whether they want a new job or are asking about an
// existing one, and (b) on the next message either start a fresh intake (YES)
// or answer their question with the job context via Lovable AI.

function formatOpenJobsPrompt(openJobs: any[]): string {
  const lines = openJobs.slice(0, 5).map((j: any) => {
    const ref = String(j.id).slice(0, 6).toUpperCase();
    const status = String(j.status || "").replace(/_/g, " ");
    const issue = j.issue_type ? ` — ${j.issue_type}` : "";
    return `• #${ref} (${status})${issue}`;
  }).join("\n");
  return [
    "Hi 👋 You currently have the following pending job(s) open:",
    "",
    lines,
    "",
    "Reply *YES* to open a new job, or just ask any question about an existing one and we'll help.",
    "— Tyre Fly",
  ].join("\n");
}

async function answerCustomerJobQuestion(openJobs: any[], question: string): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const summary = openJobs.slice(0, 5).map((j: any) => {
    const ref = String(j.id).slice(0, 6).toUpperCase();
    return `- Job #${ref}: status=${j.status}, issue=${j.issue_type ?? "n/a"}, postcode=${j.postcode ?? "n/a"}, reg=${j.vehicle_reg ?? "n/a"}${j.damage_summary ? `, damage: ${j.damage_summary}` : ""}`;
  }).join("\n");
  const fallback = `Here are your current open jobs:\n${summary}\n\nOur team will follow up shortly. Reply YES if you'd like to open a new job.\n— Tyre Fly`;
  if (!apiKey) return fallback;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are Tyre Fly's WhatsApp customer support assistant. The customer already has one or more open jobs (provided in context). Answer their question concisely (max 4 short lines) using ONLY the job context. If the answer isn't in the context or the question is unrelated, politely say a team member will follow up and remind them to reply YES to open a new job. Always end with '— Tyre Fly'.",
          },
          { role: "user", content: `Customer's open jobs:\n${summary}\n\nCustomer message:\n${question}` },
        ],
      }),
    });
    if (!r.ok) return fallback;
    const j = await r.json();
    const text = j?.choices?.[0]?.message?.content?.trim();
    return text || fallback;
  } catch (_e) {
    return fallback;
  }
}

// Send the technician's quote to the customer (after admin approval).
// Marks the chosen quote as accepted, others as lost, creates a Stripe
// payment link, and WhatsApps the customer-facing message.
async function sendQuoteToCustomer(
  supabase: any,
  jobId: string,
  opts?: { quoteId?: string; technicianId?: string; multiPending?: boolean },
): Promise<{ ok: boolean; error?: string; price?: number; customerPhone?: string; paymentLinkMissing?: boolean; stripeError?: string }> {

  try {
    const { data: jobRow } = await supabase
      .from("jobs")
      .select("id, vehicle_reg, customer_name, customer_phone, customer_email, postcode, issue_type, issue_description, damage_summary, damage_type")
      .eq("id", jobId)
      .maybeSingle();
    if (!jobRow) return { ok: false, error: "Job not found" };
    if (!jobRow.customer_phone) return { ok: false, error: "Customer has no phone on file" };

    let quoteQuery = supabase
      .from("quotes")
      .select("id, technician_id, price_gbp, eta_minutes, tyre_included, tyre_condition, raw_message")
      .eq("job_id", jobId);
    if (opts?.quoteId) quoteQuery = quoteQuery.eq("id", opts.quoteId);
    else if (opts?.technicianId) quoteQuery = quoteQuery.eq("technician_id", opts.technicianId);
    else quoteQuery = quoteQuery.in("status", ["pending", "accepted"]);
    const { data: quoteRow } = await quoteQuery
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!quoteRow) return { ok: false, error: "No quote available for this job" };

    const shortRef = String(jobRow.id).slice(0, 6).toUpperCase();
    const mergedPrice = normalizeSuspiciousQuotePrice(quoteRow.price_gbp, quoteRow.raw_message ?? "");
    const mergedEta = quoteRow.eta_minutes;
    if (!isCustomerQuoteAmountValid(mergedPrice)) {
      return {
        ok: false,
        error: `Quote for job #${shortRef} has an invalid amount (£${quoteRow.price_gbp ?? "—"}). Ask the technician to resend the price in pounds before sending it to the customer.`,
      };
    }
    if (Number(quoteRow.price_gbp) !== Number(mergedPrice)) {
      await supabase.from("quotes").update({ price_gbp: mergedPrice }).eq("id", quoteRow.id);
    }
    const tyreNote = quoteRow.tyre_included
      ? ` (incl. ${quoteRow.tyre_condition ?? ""} tyre)`.replace("  ", " ")
      : (quoteRow.tyre_included === false ? " (tyre NOT included)" : "");
    const issueLine =
      jobRow.damage_summary?.trim() ||
      jobRow.issue_description?.trim() ||
      jobRow.damage_type?.trim() ||
      jobRow.issue_type?.trim() ||
      "Tyre service required";
    const vehicleReg = jobRow.vehicle_reg?.toString().trim() || "Not provided";

    let payUrl: string | null = null;
    let stripeErrorMsg: string | null = null;
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
        success_url: `https://tyrefly.com/confirmed?job=${jobId}`,
        cancel_url: `https://tyrefly.com/job/${jobId}?canceled=1`,
        customer_email: jobRow.customer_email ?? undefined,
        metadata: {
          job_id: jobId,
          technician_id: quoteRow.technician_id,
          kind: "job_full_payment",
          price_gbp: String(mergedPrice),
          eta_minutes: String(mergedEta),
        },
        payment_intent_data: {
          metadata: { job_id: jobId, technician_id: quoteRow.technician_id, kind: "job_full_payment" },
          description: `Tyre Fly — job ${shortRef} — ${jobRow.postcode ?? ""}`.trim(),
        },
      });
      console.log("stripe checkout (customer quote) session created", {
        jobId,
        sessionId: session?.id,
        hasUrl: !!session?.url,
        priceGbp: mergedPrice,
        rawSession: JSON.stringify(session)?.slice(0, 2000),
      });
      if (!session?.url) {
        throw new Error(`Stripe session ${session?.id ?? "?"} returned no checkout url (raw=${JSON.stringify(session)?.slice(0, 500)})`);
      }
      const { shortenUrl } = await import("../_shared/short-link.ts");
      const shortened = await shortenUrl(session.url, { kind: "job_full_payment", job_id: jobId });
      payUrl = shortened || session.url;
      await supabase.from("jobs").update({
        stripe_session_id: session.id,
        stripe_checkout_url: session.url,
      }).eq("id", jobId);
    } catch (e: any) {
      stripeErrorMsg = String(e?.raw?.message ?? e?.message ?? e);
      console.error("stripe checkout (customer quote) failed", {
        jobId,
        priceGbp: mergedPrice,
        errorMessage: stripeErrorMsg,
        errorType: e?.type,
        errorCode: e?.code,
        errorRaw: e?.raw,
        stack: e?.stack,
      });
      payUrl = null;
    }

    if (opts?.multiPending) {
      // Sending multiple quotes for the same job: keep all quotes pending
      // and do NOT assign a technician or change job status. The chosen
      // technician will be assigned automatically when the customer pays.
    } else {
      await supabase.from("quotes").update({ status: "accepted" }).eq("id", quoteRow.id);
      await supabase.from("quotes")
        .update({ status: "lost" })
        .eq("job_id", jobId)
        .eq("status", "pending")
        .neq("id", quoteRow.id);
      await supabase.from("jobs").update({
        status: "awaiting_payment",
        assigned_technician_id: quoteRow.technician_id,
      }).eq("id", jobId);
    }

    const paymentSection = payUrl
      ? `To proceed with the service, please complete the payment using the secure Stripe link below:\n\n💳 Payment Link: ${payUrl}\n\n` +
        `Once the payment is confirmed, the technician will proceed with the repair service at your location.\n\n`
      : `Our team will contact you shortly with a secure payment link to complete the booking.\n\n`;

    const customerBody =
      `Job Reference: #${shortRef}\n\n` +
      `Hello${jobRow.customer_name ? ` ${jobRow.customer_name}` : ""},\n\n` +
      `Your vehicle issue has been inspected by our technician.\n\n` +
      `🚗 Vehicle: ${vehicleReg}\n\n` +
      `⚠️ Issue Found: ${issueLine}\n\n` +
      `💰 Repair Cost: £${mergedPrice}${tyreNote}\n\n` +
      `⏱️ Estimated Arrival Time (ETA): ${mergedEta} minutes\n\n` +
      paymentSection +
      `Thank you.\n— Tyre Fly`;

    await sendReply(jobRow.customer_phone, customerBody, "whatsapp");
    return {
      ok: true,
      price: Number(mergedPrice),
      customerPhone: jobRow.customer_phone,
      paymentLinkMissing: !payUrl,
      stripeError: stripeErrorMsg ?? undefined,
    };


  } catch (e: any) {
    console.error("sendQuoteToCustomer failed", e);
    return { ok: false, error: String(e?.message ?? e) };
  }
}

// After payment succeeds, the payments-webhook only sends a brief
// acknowledgement to the customer + a summary + approval prompt to admin.
// When the admin replies YES <REF> (or YES while in await_share_details_confirm),
// THIS helper fires and exchanges the technician/customer contact details.
async function shareContactsForJobId(
  supabase: any,
  jobId: string,
): Promise<{ ok: boolean; error?: string; customerPhone?: string; techPhone?: string }> {
  try {
    const { data: job } = await supabase
      .from("jobs")
      .select("id, customer_name, customer_phone, postcode, assigned_technician_id, vehicle_reg, affected_wheels, issue_type, issue_description, damage_summary, lat, lng")
      .eq("id", jobId)
      .maybeSingle();
    if (!job) return { ok: false, error: "Job not found" };
    if (!job.assigned_technician_id) return { ok: false, error: "No technician assigned" };

    const { data: tech } = await supabase
      .from("technicians")
      .select("id, name, phone, last_lat, last_lng")
      .eq("id", job.assigned_technician_id)
      .maybeSingle();
    if (!tech?.phone) return { ok: false, error: "Technician has no phone on file" };

    // Pull the accepted quote so we can tell the technician the exact amount
    // that was paid (matches what the customer was charged via Stripe).
    let quotedAmount: string | null = null;
    try {
      const { data: quoteRow } = await supabase
        .from("quotes")
        .select("price_gbp")
        .eq("job_id", jobId)
        .eq("technician_id", tech.id)
        .eq("status", "accepted")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (quoteRow?.price_gbp != null) quotedAmount = String(quoteRow.price_gbp);
    } catch (e) {
      console.error("fetch accepted quote for shareContacts failed", e);
    }

    const ref = String(jobId).slice(0, 6).toUpperCase();
    const issue = job.damage_summary || job.issue_description || job.issue_type || "Tyre service";
    const wheels = Array.isArray(job.affected_wheels) && job.affected_wheels.length
      ? job.affected_wheels.join(", ") : "—";
    const vehicleReg = job.vehicle_reg || "—";

    // Customer's location link (postcode fallback to coords if available).
    const customerMapLink = job.postcode
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.postcode)}`
      : (job.lat != null && job.lng != null
          ? `https://www.google.com/maps?q=${job.lat},${job.lng}`
          : "—");

    // Technician live-location link (shortened).
    let techLocLink = "Will be shared once technician shares live location";
    try {
      const { data: alloc } = await supabase
        .from("job_allocations")
        .select("created_at")
        .eq("job_id", jobId)
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
        const { shortenUrl } = await import("../_shared/short-link.ts");
        const longUrl = `https://maps.google.com/?q=${resolved.lat},${resolved.lng}`;
        techLocLink = await shortenUrl(longUrl, { kind: "tech_live_location", job_id: jobId });
      } else if (tech.last_lat != null && tech.last_lng != null) {
        techLocLink = `https://www.google.com/maps?q=${tech.last_lat},${tech.last_lng}`;
      }
    } catch (e) {
      console.error("resolve tech location for shareContacts failed", e);
    }

    // ===== Customer message: technician details =====
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

    // ===== Technician message: customer details =====
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
      `Reg:    ${vehicleReg}`,
      `Wheels: ${wheels}`,
      ``,
      `Please contact the customer directly now to confirm your ETA and proceed with the repair.`,
      ``,
      `When the job is complete, reply: Done ${ref}`,
    ].join("\n");
    await sendReply(tech.phone, techMsg, "whatsapp");

    await supabase.from("jobs").update({
      status: "in_progress",
      assignment_status: "details_sent",
    }).eq("id", jobId);
    await supabase.from("ops_alerts").insert({
      level: "info",
      title: "Contacts shared",
      body: `Job ${ref} — admin approved share; customer & technician details exchanged.`,
      job_id: jobId,
    });

    return { ok: true, customerPhone: job.customer_phone, techPhone: tech.phone };
  } catch (e: any) {
    console.error("shareContactsForJobId failed", e);
    return { ok: false, error: String(e?.message ?? e) };
  }
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

    // ─── Idempotency: drop duplicate webhook deliveries for the same MessageSid.
    // Meta/Twilio retry webhooks on transient errors; without this guard, a
    // single inbound photo can be appended to photo_urls multiple times and
    // wrongly satisfy the "2 photos" intake requirement.
    if (sid) {
      const { data: prior } = await supabase
        .from("sms_messages")
        .select("id")
        .eq("twilio_sid", sid)
        .eq("direction", "inbound")
        .limit(1)
        .maybeSingle();
      if (prior) {
        console.log("twilio-inbound: duplicate webhook ignored", { sid });
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }
    }

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
    const { data: inboundLog } = await supabase.from("sms_messages").insert({
      direction: "inbound",
      channel,
      from_number: from,
      to_number: to,
      body,
      twilio_sid: sid,
      num_media: numMedia,
      media_urls: mediaUrls,
      status: "received",
    }).select("id, created_at").single();

    const fromN = normPhone(from);

    // 1a. Technician job-completion. Matches any "Done"-style signal, with or
    // without a job reference. Includes English + Roman-Urdu synonyms.
    // If a ref is provided we close that job. If no ref, we look at the
    // technician's active jobs: 1 → auto-close it; 2+ → ask which.
    {
      const doneRe = /^\s*(done|finished|complete|completed|kar\s*diya|kardia|mukammal|ho\s*gaya|hogaya|khatam)\b[\s!.,:-]*#?([0-9a-fA-F]{6,12})?\s*$/i;
      const doneMatch = body.trim().match(doneRe);
      if (doneMatch) {
        const ref = doneMatch[2] ? normalizeJobReference(doneMatch[2]) : null;
        const { data: tech } = await supabase
          .from("technicians")
          .select("id, name, phone, approval_status")
          .eq("phone", from)
          .maybeSingle();
        if (tech && tech.approval_status === "approved") {
          const closeJob = async (job: any, shortRef: string) => {
            if (job.status === "completed" || job.status === "closed" || job.status === "closed_pending_review") {
              await sendReply(from, `Job ${shortRef} is already closed ✅`, channel);
              return;
            }
            await supabase
              .from("jobs")
              .update({ status: "completed", updated_at: new Date().toISOString() })
              .eq("id", job.id);
            await supabase.from("ops_alerts").insert({
              level: "info",
              title: "Job completed by technician",
              body: `${tech.name} marked job ${shortRef} as done.`,
              job_id: job.id,
            });
            await sendReply(from, `✅ Job ${shortRef} marked as complete. Thanks ${tech.name}! 👏`, channel);
            if (job.customer_phone) {
              await sendReply(
                job.customer_phone,
                `✅ Your tyre service is complete — Job #${shortRef}.\n\nThanks for choosing Tyre Fly! 🛞`,
                "whatsapp",
              );
            }
          };

          if (ref) {
            const bounds = jobRefUuidBounds(ref);
            const { data: jobMatches } = await supabase
              .from("jobs")
              .select("id, status, customer_phone, customer_name, assigned_technician_id, created_at")
              .gte("id", bounds.lower)
              .lte("id", bounds.upper)
              .order("created_at", { ascending: false })
              .limit(5);
            const jm = (jobMatches ?? []).filter((j: any) =>
              String(j.id).slice(0, 6).toUpperCase() === ref
            );
            if (jm.length === 0) {
              await sendReply(from, `No job found for ref "${ref}". Please double-check the reference.`, channel);
              return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
            }
            if (jm.length > 1) {
              await sendReply(from, `Multiple jobs match "${ref}" — please use the full 6-character reference shown in your job message.`, channel);
              return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
            }
            const job: any = jm[0];
            if (job.assigned_technician_id && job.assigned_technician_id !== tech.id) {
              await sendReply(from, `Job ${ref} isn't assigned to you. Please contact admin if this is wrong.`, channel);
              return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
            }
            await closeJob(job, ref);
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
          }

          // No reference provided → look at this tech's active assigned jobs.
          const { data: activeJobs } = await supabase
            .from("jobs")
            .select("id, status, customer_phone, customer_name, assigned_technician_id, created_at")
            .eq("assigned_technician_id", tech.id)
            .not("status", "in", "(completed,closed,closed_pending_review,cancelled)")
            .order("created_at", { ascending: false });
          const active = activeJobs ?? [];
          if (active.length === 0) {
            await sendReply(from, `You don't have any active jobs right now. If you've just finished one, please reply: Done <ref>  e.g. Done E2C9FE`, channel);
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
          }
          if (active.length === 1) {
            const job: any = active[0];
            const shortRef = String(job.id).slice(0, 6).toUpperCase();
            await closeJob(job, shortRef);
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
          }
          const refsList = active.slice(0, 5).map((j: any) => String(j.id).slice(0, 6).toUpperCase()).join(", ");
          await sendReply(
            from,
            `Which job did you complete? You have ${active.length} active jobs (${refsList}).\n\nPlease reply:\nDone <ref>  e.g. Done ${String(active[0].id).slice(0, 6).toUpperCase()}`,
            channel,
          );
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
    // EXCEPTION: messages that clearly look like admin replies to a job alert
    // (e.g. "Yes #799121", "broadcast E1453B", a bare job ref, or a pending
    // admin_state) must go to the admin branch even if the same phone also has
    // an open intake — otherwise admin replies get swallowed by intake prompts.
    let hasActiveIntake = false;
    if (isMaster) {
      const { data: as } = await supabase
        .from("admin_states")
        .select("step, updated_at")
        .eq("phone", fromN)
        .maybeSingle();
      const pendingAdminStep = !!(
        as?.step &&
        as.updated_at &&
        (Date.now() - new Date(as.updated_at).getTime()) < 6 * 60 * 60 * 1000
      );
      const prioritizeAdminBranch = shouldPrioritizeAdminBranch({
        body,
        hasPendingAdminStep: pendingAdminStep,
      });
      // If an admin workflow is already in progress, or the message clearly
      // looks like an admin command/reply, always prefer the admin branch.
      if (!prioritizeAdminBranch) {
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
    }

    if (isMaster && !hasActiveIntake) {
      const trimmed = body.trim();

      const refOnlyMatch = trimmed.match(/^\s*#?\s*([0-9a-f]{6,8})\s*$/i);
      const yesOnly = /^\s*(y|yes|ok|okay|sure|confirm|yep|yeah)\s*[.!]?\s*$/i.test(trimmed);
      // "yes <ref>" / "yes #<ref>" / "<ref> yes" combined in one message →
      // treat as a list request (share technicians, then ask broadcast confirm).
      // "YES #<REF> CONFIRM" — final confirmation for irreversible actions (assignment).
      const yesRefConfirmMatch = trimmed.match(
        /^\s*(?:y|yes|ok|okay|sure|yep|yeah)[\s,:.!#-]+([0-9a-f]{6,8})[\s,:.!#-]+confirm\s*[*.!]?\s*$/i,
      );
      const yesPlusRefMatch = !yesRefConfirmMatch && (trimmed.match(
        /^\s*(?:y|yes|ok|okay|sure|confirm|yep|yeah)[\s,:.!#-]+([0-9a-f]{6,8})\s*[*.!]?\s*$/i,
      ) ?? trimmed.match(
        /^\s*#?\s*([0-9a-f]{6,8})[\s,:.!-]+(?:y|yes|ok|okay|sure|confirm|yep|yeah)\s*$/i,
      ));
      const nowIso = new Date().toISOString();
      const { data: pendingAdminActionEarly } = await supabase
        .from("pending_admin_actions")
        .select("intent, awaiting, job_reference, technician_id, extra_data, expires_at")
        .eq("admin_phone", fromN)
        .gt("expires_at", nowIso)
        .maybeSingle();
      const pendingBareJobRef = refOnlyMatch && pendingAdminActionEarly?.awaiting === "job_reference"
        ? {
            ref: refOnlyMatch[1],
            intent: pendingAdminActionEarly.intent,
            technicianId: pendingAdminActionEarly.technician_id ?? null,
          }
        : null;

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
          .select("id,tech_code,name,phone,service_postcodes,last_lat,last_lng,travel_radius_miles")
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
        const shortRef = normalizeJobReference(ref);
        if (!shortRef) return [];
        const bounds = jobRefUuidBounds(shortRef);
        const { data: jobMatches } = await supabase
          .from("jobs")
          .select("id,customer_name,vehicle_reg,postcode,lat,lng,issue_type,status,created_at")
          .gte("id", bounds.lower)
          .lte("id", bounds.upper)
          .order("created_at", { ascending: false })
          .limit(5);
        return (jobMatches ?? []).filter((j: any) =>
          String(j.id).slice(0, 6).toUpperCase() === shortRef);
      };
      const clearAdminState = () =>
        supabase.from("admin_states").delete().eq("phone", fromN);
      const setAdminState = (step: string, job_id: string | null) =>
        supabase.from("admin_states").upsert({
          phone: fromN, step, job_id, updated_at: new Date().toISOString(),
        });
      const clearPendingAdminAction = () =>
        supabase.from("pending_admin_actions").delete().eq("admin_phone", fromN);
      const setPendingAdminAction = (
        intent: string,
        awaiting: string,
        opts?: { jobReference?: string | null; technicianId?: string | null; extraData?: Record<string, unknown> | null; expiresInMinutes?: number },
      ) => {
        const expiresInMinutes = opts?.expiresInMinutes ?? 10;
        return supabase.from("pending_admin_actions").upsert({
          admin_phone: fromN,
          intent,
          awaiting,
          job_reference: opts?.jobReference ?? null,
          technician_id: opts?.technicianId ?? null,
          extra_data: opts?.extraData ?? null,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString(),
        });
      };

      // Helper: run the actual broadcast for a given job ref.
      const runBroadcastForRef = async (ref: string) => {
        const matches = await findJobByRef(ref);
        if (matches.length === 0) {
          await sendReply(from,
            `No job found for ref #${ref.toUpperCase()}. Nothing broadcast.`, channel);
          return;
        }
        if (matches.length > 1) {
          await sendReply(from,
            `Multiple jobs match #${ref.toUpperCase()} — please send the full 6-character ref.`, channel);
          return;
        }
        const job: any = matches[0];
        const shortRef = String(job.id).slice(0, 6).toUpperCase();
        const scored = await scoreNearbyTechs(job);
        if (scored.length === 0) {
          await clearAdminState();
          await sendReply(from,
            `Job #${shortRef} — no approved technicians found nearby. Nothing broadcast.`, channel);
          return;
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
        await supabase.from("jobs").update({ status: "broadcasting" }).eq("id", job.id);
        if (bRes.ok && sent > 0) {
          const notifiedLines = scored.slice(0, sent).map(({ t }: any, i: number) =>
            `${i + 1}. ${t.tech_code ? `${t.tech_code} · ` : ""}${t.name}`
          ).join("\n");
          const msg = [
            `Broadcast Sent — Job #${shortRef}`,
            `──────────────────────`,
            `👤 Customer: ${job.customer_name ?? "—"}`,
            `🚗 Vehicle: ${job.vehicle_reg ?? "—"}`,
            `📍 Service Area: ${job.postcode ?? "—"}`,
            `──────────────────────`,
            ``,
            `Technicians Notified: ${sent}`,
            ``,
            notifiedLines,
            ``,
            `──────────────────────`,
            `Waiting for quotes...`,
          ].join("\n");
          await sendReply(from, msg, channel);
        } else {
          const err = bJson?.error ? ` (${String(bJson.error).slice(0, 140)})` : "";
          await sendReply(from,
            `⚠️ Broadcast for job #${shortRef} failed — ${sent}/${total} delivered${err}.`, channel);
        }
      };

      // Helper: actually push the technician's quote to the customer.
      // Returns true if a recent customer quote send should BLOCK this attempt.
      // Replies to the admin with a "already sent" message + RESEND hint.
      const customerQuoteRecentlyBlocked = async (
        jobIdFull: string,
        shortRef: string,
        force: boolean,
        resendInfo?: { stepSuffix: string; label: string } | null,
      ): Promise<boolean> => {
        if (force) return false;
        const { data: jobRow } = await supabase
          .from("jobs")
          .select("customer_quote_sent_at")
          .eq("id", jobIdFull)
          .maybeSingle();
        const ts = jobRow?.customer_quote_sent_at;
        if (!ts) return false;
        const ageMs = Date.now() - new Date(ts).getTime();
        if (ageMs >= 5 * 60 * 1000) return false;
        const sentTime = new Date(ts).toLocaleTimeString("en-GB", {
          hour: "2-digit", minute: "2-digit", timeZone: "Europe/London",
        });
        // Persist the ORIGINAL intent so RESEND #REF replays the correct scope
        // (single tech, updated-only, or all) instead of defaulting to all.
        if (resendInfo?.stepSuffix) {
          await setAdminState(`pending_resend:${resendInfo.stepSuffix}`, jobIdFull);
        }
        const scopeLine = resendInfo?.label
          ? `\n\nThis will resend: ${resendInfo.label}.`
          : "";
        await sendReply(from,
          `⚠️ Quote was already sent to this customer for job #${shortRef} at ${sentTime}.${scopeLine}\n\nReply *RESEND #${shortRef}* to send again.`,
          channel);
        return true;
      };

      // Build a human-readable display "TECH-XXXX · Name" for the resend label.
      const buildTechDisplay = async (technicianId: string): Promise<string> => {
        const { data: t } = await supabase
          .from("technicians").select("name, tech_code").eq("id", technicianId).maybeSingle();
        return `${t?.tech_code ?? "TECH-????"} · ${t?.name ?? "Technician"}`;
      };

      const markCustomerQuoteSent = async (jobIdFull: string) => {
        await supabase.from("jobs")
          .update({ customer_quote_sent_at: new Date().toISOString() })
          .eq("id", jobIdFull);
      };

      const runSendQuoteForJobId = async (
        jobIdFull: string,
        opts?: { quoteId?: string; technicianId?: string; force?: boolean; resendInfo?: { stepSuffix: string; label: string } | null },
      ) => {
        const shortRef = String(jobIdFull).slice(0, 6).toUpperCase();
        if (await customerQuoteRecentlyBlocked(jobIdFull, shortRef, !!opts?.force, opts?.resendInfo ?? null)) return;
        const res = await sendQuoteToCustomer(supabase, jobIdFull, opts);
        await clearAdminState();
        if (res.ok) {
          await markCustomerQuoteSent(jobIdFull);
          if (res.paymentLinkMissing) {
            await sendReply(from,
              `⚠️ Quote sent to customer for job #${shortRef} but payment link could not be generated. Please generate and send the payment link manually.${res.stripeError ? `\n\nStripe error: ${res.stripeError}` : ""}`,
              channel);
          } else {
            await sendReply(from,
              `✅ Quote for job #${shortRef} sent to the customer (${res.customerPhone}).`,
              channel);
          }
        } else {
          await sendReply(from,
            `⚠️ Could not send quote for job #${shortRef}: ${res.error ?? "unknown error"}.`,
            channel);
        }
      };

      // Build & send a single consolidated quote message containing every
      // pending/accepted quote for a job, each with its own Stripe payment link.
      const sendConsolidatedQuotesForJob = async (jobIdFull: string, shortRef: string) => {
        const { data: jobRow } = await supabase
          .from("jobs")
          .select("id, vehicle_reg, customer_name, customer_phone, customer_email, postcode, issue_type, issue_description, damage_summary, damage_type")
          .eq("id", jobIdFull)
          .maybeSingle();
        if (!jobRow) return { ok: false, error: "Job not found" };
        if (!jobRow.customer_phone) return { ok: false, error: "Customer has no phone on file" };

        const { data: quoteRows } = await supabase
          .from("quotes")
          .select("id, technician_id, price_gbp, eta_minutes, raw_message, created_at")
          .eq("job_id", jobIdFull)
          .in("status", ["pending", "accepted"])
          .order("price_gbp", { ascending: true, nullsFirst: false });
        const quotes = quoteRows ?? [];
        if (quotes.length === 0) return { ok: false, error: "No quotes available" };

        const techIds = Array.from(new Set(quotes.map((q: any) => q.technician_id).filter(Boolean))) as string[];
        const { data: techRows } = techIds.length
          ? await supabase.from("technicians").select("id, name, tech_code").in("id", techIds)
          : { data: [] as any[] };
        const techById = new Map((techRows ?? []).map((t: any) => [t.id, t]));

        const issueLine =
          jobRow.damage_summary?.trim() ||
          jobRow.issue_description?.trim() ||
          jobRow.damage_type?.trim() ||
          jobRow.issue_type?.trim() ||
          "Tyre service required";
        const vehicleReg = jobRow.vehicle_reg?.toString().trim() || "Not provided";

        const { createStripeClient } = await import("../_shared/stripe.ts");
        const { shortenUrl } = await import("../_shared/short-link.ts");
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
              success_url: `https://tyrefly.com/confirmed?job=${jobIdFull}`,
              cancel_url: `https://tyrefly.com/job/${jobIdFull}?canceled=1`,
              customer_email: jobRow.customer_email ?? undefined,
              metadata: {
                job_id: jobIdFull, technician_id: q.technician_id, kind: "job_full_payment",
                price_gbp: String(mergedPrice), eta_minutes: String(q.eta_minutes),
              },
              payment_intent_data: {
                metadata: { job_id: jobIdFull, technician_id: q.technician_id, kind: "job_full_payment" },
                description: `Tyre Fly — job ${shortRef} — ${jobRow.postcode ?? ""}`.trim(),
              },
            });
            if (session?.url) {
              const shortened = await shortenUrl(session.url, { kind: "job_full_payment", job_id: jobIdFull });
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

        if (options.length === 0) return { ok: false, error: "Could not prepare any quote options" };

        const optionLines = options.map((o, i) =>
          `Option ${i + 1} — ${o.name}\n` +
          `💷 Repair Cost: £${o.price}\n` +
          `⏱ Estimated Arrival: ${o.eta} minutes\n` +
          `🔗 Payment Link: ${o.link ?? "to be sent shortly"}`
        ).join("\n\n");

        const body =
          `Job Reference: #${shortRef}\n\n` +
          `Hello${jobRow.customer_name ? ` ${jobRow.customer_name}` : ""},\n\n` +
          `We have received quotes from our technicians for your vehicle ${vehicleReg}. Please review and choose your preferred option:\n\n` +
          `${optionLines}\n\n` +
          `Please tap your preferred payment link to confirm your booking. Once payment is confirmed, your technician will proceed to your location.\n\n` +
          `Thank you.\n— Tyre Fly`;

        await sendReply(jobRow.customer_phone, body, "whatsapp");
        return { ok: true, count: options.length, customerPhone: jobRow.customer_phone };
      };

      const runSendQuoteForRef = async (
        ref: string,
        identifier?: string | null,
        runOpts?: { force?: boolean },
      ) => {
        const force = !!runOpts?.force;
        const matches = await findJobByRef(ref);
        if (matches.length === 0) {
          await sendReply(from,
            `No job found for ref #${ref.toUpperCase()}. Quote not sent.`, channel);
          return;
        }
        if (matches.length > 1) {
          await sendReply(from,
            `Multiple jobs match #${ref.toUpperCase()} — please send the full 6-character ref.`, channel);
          return;
        }
        const jobIdFull = String(matches[0].id);
        const shortRef = String(jobIdFull).slice(0, 6).toUpperCase();

        // Specific technician named → send only that technician's quote.
        if (identifier && identifier.trim()) {
          const techs = await resolveTechnician(identifier);
          if (techs.length === 0) {
            await sendReply(from, `No approved technician found matching "${identifier}".`, channel);
            return;
          }
          if (techs.length > 1) {
            const lines = techs.slice(0, 5).map((t: any) => `— ${t.tech_code ?? "TECH-????"} ${t.name}`).join("\n");
            await sendReply(from, `Multiple technicians match "${identifier}":\n${lines}\n\nPlease retry with the TECH-ID.`, channel);
            return;
          }
          const techDisplay = await buildTechDisplay(techs[0].id);
          const { data: tq } = await supabase
            .from("quotes")
            .select("price_gbp")
            .eq("job_id", jobIdFull)
            .eq("technician_id", techs[0].id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const priceTag = tq?.price_gbp != null ? ` (£${tq.price_gbp})` : "";
          await runSendQuoteForJobId(jobIdFull, {
            technicianId: techs[0].id,
            force,
            resendInfo: { stepSuffix: `single:${identifier}`, label: `${techDisplay} quote only${priceTag}` },
          });
          return;
        }

        // No technician named → if the job has multiple pending/accepted
        // quotes, send a single consolidated message containing every option.
        // Otherwise fall through to the single-quote behaviour.
        const { data: pendingQuotes } = await supabase
          .from("quotes")
          .select("id, technician_id, price_gbp")
          .eq("job_id", jobIdFull)
          .in("status", ["pending", "accepted"])
          .order("created_at", { ascending: true });
        const quotes = pendingQuotes ?? [];
        if (quotes.length <= 1) {
          await runSendQuoteForJobId(jobIdFull, {
            force,
            resendInfo: { stepSuffix: `all:`, label: `the quote for #${shortRef}` },
          });
          return;
        }

        if (await customerQuoteRecentlyBlocked(jobIdFull, shortRef, force, {
          stepSuffix: `all:`,
          label: `all ${quotes.length} quotes for #${shortRef}`,
        })) return;

        const res = await sendConsolidatedQuotesForJob(jobIdFull, shortRef);
        await clearAdminState();
        if (res.ok) {
          await markCustomerQuoteSent(jobIdFull);
          await sendReply(from,
            `✅ ${res.count} quote${res.count === 1 ? "" : "s"} for job #${shortRef} sent to the customer (${res.customerPhone}).`,
            channel);
        } else {
          await sendReply(from,
            `⚠️ Could not send quotes for job #${shortRef}: ${res.error ?? "unknown error"}.`,
            channel);
        }
      };

      // Helper: send the MOST RECENTLY UPDATED quote (by price_updated_at).
      // If admin named a technician, send that tech's quote. Otherwise pick
      // the quote with the latest price_updated_at. If multiple updates
      // happened within 5 minutes of each other, ask admin to pick.
      const runSendUpdatedQuoteForRef = async (
        ref: string,
        identifier?: string | null,
        runOpts?: { force?: boolean },
      ) => {
        const force = !!runOpts?.force;
        const matches = await findJobByRef(ref);
        if (matches.length === 0) {
          await sendReply(from, `No job found for ref #${ref.toUpperCase()}. Quote not sent.`, channel);
          return;
        }
        if (matches.length > 1) {
          await sendReply(from, `Multiple jobs match #${ref.toUpperCase()} — please send the full 6-character ref.`, channel);
          return;
        }
        const jobIdFull = String(matches[0].id);
        const shortRef = String(jobIdFull).slice(0, 6).toUpperCase();

        // Tech-specific request → resolve and send that quote
        if (identifier && identifier.trim()) {
          const techs = await resolveTechnician(identifier);
          if (techs.length === 0) {
            await sendReply(from, `No approved technician found matching "${identifier}".`, channel);
            return;
          }
          if (techs.length > 1) {
            const lines = techs.slice(0, 5).map((t: any) => `— ${t.tech_code ?? "TECH-????"} ${t.name}`).join("\n");
            await sendReply(from, `Multiple technicians match "${identifier}":\n${lines}\n\nPlease retry with the TECH-ID.`, channel);
            return;
          }
          const techDisplay = await buildTechDisplay(techs[0].id);
          const { data: tq } = await supabase
            .from("quotes")
            .select("price_gbp")
            .eq("job_id", jobIdFull)
            .eq("technician_id", techs[0].id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const priceTag = tq?.price_gbp != null ? ` (£${tq.price_gbp})` : "";
          await runSendQuoteForJobId(jobIdFull, {
            technicianId: techs[0].id,
            force,
            resendInfo: { stepSuffix: `updated:${identifier}`, label: `${techDisplay} updated quote only${priceTag}` },
          });
          return;
        }

        // No technician named → use the most recently updated quote
        const { data: updatedQuotes } = await supabase
          .from("quotes")
          .select("id, technician_id, price_gbp, price_updated_at")
          .eq("job_id", jobIdFull)
          .not("price_updated_at", "is", null)
          .order("price_updated_at", { ascending: false });

        const list = updatedQuotes ?? [];
        if (list.length === 0) {
          // Fall back to default behaviour (latest pending/accepted quote)
          await runSendQuoteForJobId(jobIdFull, {
            force,
            resendInfo: { stepSuffix: `updated:`, label: `the latest updated quote for #${shortRef}` },
          });
          return;
        }

        // If multiple updates happened within 5 minutes of the latest, prompt.
        const latest = list[0];
        const latestTs = new Date(latest.price_updated_at).getTime();
        const closeUpdates = list.filter((q: any) =>
          Math.abs(new Date(q.price_updated_at).getTime() - latestTs) <= 5 * 60 * 1000
        );

        if (closeUpdates.length > 1) {
          const techIds = closeUpdates.map((q: any) => q.technician_id).filter(Boolean);
          const { data: techRows } = await supabase
            .from("technicians").select("id, name, tech_code").in("id", techIds);
          const byId = new Map((techRows ?? []).map((t: any) => [t.id, t]));
          const lines = closeUpdates.map((q: any) => {
            const t: any = byId.get(q.technician_id) ?? {};
            return `— ${t.tech_code ?? "TECH-????"} ${t.name ?? "Technician"}: £${q.price_gbp} (updated)`;
          }).join("\n");
          const examples = closeUpdates.slice(0, 2).map((q: any) => {
            const t: any = byId.get(q.technician_id) ?? {};
            const first = (t.name ?? "").split(/\s+/)[0] || (t.tech_code ?? "TECH");
            return `• 'send updated ${first} quote for #${shortRef} to customer'`;
          }).join("\n");
          await sendReply(from,
            `Multiple prices were updated for job #${shortRef}:\n${lines}\n\nWhich updated quote should be sent to the customer?\n${examples}\n• 'send all updated quotes for #${shortRef} to customer'`,
            channel,
          );
          return;
        }

        const latestTechDisplay = latest.technician_id ? await buildTechDisplay(latest.technician_id) : "the latest updated quote";
        const latestIdent = latest.technician_id ? latestTechDisplay.split(" · ")[0] : "";
        const latestPriceTag = latest.price_gbp != null ? ` (£${latest.price_gbp})` : "";
        await runSendQuoteForJobId(jobIdFull, {
          quoteId: latest.id,
          force,
          resendInfo: { stepSuffix: `updated:${latestIdent}`, label: `${latestTechDisplay} updated quote only${latestPriceTag}` },
        });
      };


      // Helper: update the technician's quoted price for a job (before sending).
      // Normalise any technician-ID style input to canonical "TECH-XXXX".
      // Accepts: TECH-0001, TECH-001, TECH001, Tech001, tech-001, T0001, T001, etc.
      const normaliseTechCode = (raw: string): string | null => {
        const compact = raw.trim().replace(/[\s-]+/g, "").toUpperCase();
        const m = compact.match(/^T(?:ECH)?(\d{1,6})$/);
        if (!m) return null;
        return `TECH-${m[1].padStart(4, "0")}`;
      };

      const resolveTechnician = async (identifier: string) => {
        const idTrim = identifier.trim();
        const isPhone = /^\+?\d{6,}$/.test(idTrim.replace(/\s+/g, ""));
        const normalisedCode = normaliseTechCode(idTrim);
        if (isPhone && !normalisedCode) {
          const norm = idTrim.startsWith("+") ? idTrim : `+${idTrim.replace(/\D/g, "")}`;
          const { data } = await supabase.from("technicians")
            .select("id, name, phone, tech_code")
            .eq("phone", norm).eq("approval_status", "approved").eq("active", true);
          return data ?? [];
        }
        if (normalisedCode) {
          const { data } = await supabase.from("technicians")
            .select("id, name, phone, tech_code")
            .ilike("tech_code", normalisedCode).eq("approval_status", "approved").eq("active", true);
          return data ?? [];
        }
        const { data } = await supabase.from("technicians")
          .select("id, name, phone, tech_code")
          .ilike("name", `%${idTrim}%`).eq("approval_status", "approved").eq("active", true);
        return data ?? [];
      };


      const runUpdateTechnicianPrice = async (ref: string, identifier: string, newPrice: number) => {
        const matches = await findJobByRef(ref);
        if (matches.length === 0) {
          await sendReply(from, `No job found for ref #${ref.toUpperCase()}. Price not updated.`, channel);
          return;
        }
        if (matches.length > 1) {
          await sendReply(from, `Multiple jobs match #${ref.toUpperCase()} — please send the full 6-character ref.`, channel);
          return;
        }
        const job: any = matches[0];
        const shortRef = String(job.id).slice(0, 6).toUpperCase();
        const candidates = await resolveTechnician(identifier);
        if (candidates.length === 0) {
          await sendReply(from, `No approved technician found matching "${identifier}".`, channel);
          return;
        }
        if (candidates.length > 1) {
          const lines = candidates.slice(0, 5).map((t: any) =>
            `— ${t.tech_code ?? "TECH-????"} ${t.name}`).join("\n");
          await sendReply(from,
            `Multiple technicians match "${identifier}":\n${lines}\n\nPlease retry with the TECH-ID.`, channel);
          return;
        }
        const tech = candidates[0];
        const { data: quoteRow } = await supabase.from("quotes")
          .select("id, price_gbp")
          .eq("job_id", job.id)
          .eq("technician_id", tech.id)
          .order("created_at", { ascending: false })
          .limit(1).maybeSingle();
        if (!quoteRow) {
          await sendReply(from,
            `No quote from ${tech.tech_code ?? tech.name} found on job #${shortRef}. Price not updated.`, channel);
          return;
        }
        const oldPrice = quoteRow.price_gbp;
        await supabase.from("quotes")
          .update({ price_gbp: newPrice, price_updated_at: new Date().toISOString() })
          .eq("id", quoteRow.id);
        await clearAdminState();

        // Fetch job details (customer + vehicle) and all current quotes for the job.
        const { data: jobFull } = await supabase
          .from("jobs")
          .select("customer_name, vehicle_reg")
          .eq("id", job.id)
          .maybeSingle();

        const { data: allQuoteRows } = await supabase.from("quotes")
          .select("technician_id, price_gbp, eta_minutes, created_at")
          .eq("job_id", job.id);

        // Dedupe by technician (latest by created_at).
        const latestByTech = new Map<string, any>();
        for (const q of allQuoteRows ?? []) {
          if (!q.technician_id) continue;
          const existing = latestByTech.get(q.technician_id);
          if (!existing || new Date(q.created_at).getTime() >= new Date(existing.created_at).getTime()) {
            latestByTech.set(q.technician_id, q);
          }
        }
        // Ensure the updated tech reflects the new price.
        const updatedQuoteRecord = latestByTech.get(tech.id);
        if (updatedQuoteRecord) updatedQuoteRecord.price_gbp = newPrice;

        const techIds = Array.from(latestByTech.keys());
        const { data: techRows } = techIds.length
          ? await supabase.from("technicians").select("id, name, tech_code, last_lat, last_lng").in("id", techIds)
          : { data: [] as any[] };
        const techById = new Map<string, any>((techRows ?? []).map((t: any) => [t.id, t]));

        const orderedTechIds = [
          ...techIds.filter((id) => id !== tech.id),
        ];
        // Updated tech first.
        const finalOrder = [tech.id, ...orderedTechIds.filter((id) => id !== tech.id)];

        const customerName = (jobFull?.customer_name ?? "—").toString().trim() || "—";
        const vehicleReg = (jobFull?.vehicle_reg ?? "—").toString().trim() || "—";

        const quoteLines: string[] = [];
        finalOrder.forEach((id, idx) => {
          const t = techById.get(id);
          const q = latestByTech.get(id);
          if (!t || !q) return;
          const code = t.tech_code ?? "TECH-????";
          const price = q.price_gbp != null ? `£${q.price_gbp}` : "—";
          const eta = q.eta_minutes != null ? `${q.eta_minutes} min` : "—";
          const loc = (t.last_lat != null && t.last_lng != null)
            ? `https://maps.google.com/?q=${t.last_lat},${t.last_lng}`
            : "no live pin";
          const updatedTag = id === tech.id ? " *(updated)*" : "";
          quoteLines.push(`${idx + 1}. ${code} · ${t.name ?? "Technician"}`);
          quoteLines.push(`   💷 Price: ${price}${updatedTag}`);
          quoteLines.push(`   ⏱ ETA: ${eta}`);
          quoteLines.push(`   📍 Location: ${loc}`);
          quoteLines.push("");
        });
        if (quoteLines[quoteLines.length - 1] === "") quoteLines.pop();

        const techShort = (tech.name ?? "Technician").split(/\s+/)[0];
        const techCode = tech.tech_code ?? "TECH-????";
        const others = finalOrder
          .filter((id) => id !== tech.id)
          .map((id) => techById.get(id))
          .filter(Boolean);
        const multiple = others.length > 0;

        const sections: string[] = [];
        sections.push(`✅ Price Updated — Job #${shortRef}`);
        sections.push("──────────────────────");
        sections.push(`👤 Customer: ${customerName}`);
        sections.push(`🚗 Vehicle: ${vehicleReg}`);
        sections.push("──────────────────────");
        sections.push("");
        sections.push("Current Quotes:");
        sections.push("");
        sections.push(...quoteLines);
        sections.push("");
        sections.push("──────────────────────");
        sections.push("");
        sections.push("What would you like to do next?");
        sections.push("");

        sections.push("1️⃣ *Send all quotes to customer*");
        sections.push(`✓ send all quotes for #${shortRef} to customer`);
        sections.push("");

        sections.push("2️⃣ *Send updated quote only*");
        sections.push(`✓ send updated ${techShort} quote for #${shortRef} to customer`);
        sections.push(`✓ send updated ${techCode} quote for #${shortRef} to customer`);

        if (multiple) {
          const firstOther = others[0];
          const otherShort = (firstOther.name ?? "Technician").split(/\s+/)[0];
          const otherCode = firstOther.tech_code ?? "TECH-????";
          sections.push("");
          sections.push("3️⃣ *Send selected quotes*");
          sections.push(`✓ send ${techShort} and ${otherShort} quotes for #${shortRef} to customer`);
          sections.push(`✓ send ${techCode} and ${otherCode} quotes for #${shortRef} to customer`);
          sections.push("");
          sections.push("4️⃣ *Update another price*");
          sections.push(`✓ By name:    update ${otherShort} price for #${shortRef} to £45`);
          sections.push(`✓ By tech ID: update ${otherCode} price for #${shortRef} to £45`);
        } else {
          sections.push("");
          sections.push("3️⃣ *Update another price*");
          sections.push(`✓ By name:    update [name] price for #${shortRef} to £45`);
          sections.push(`✓ By tech ID: update TECH-XXXX price for #${shortRef} to £45`);
        }

        await sendReply(from, sections.join("\n"), channel);
      };

      // Helper: share customer ↔ technician contact details after admin approval.
      const runShareContactsForJobId = async (jobIdFull: string) => {
        const shortRef = String(jobIdFull).slice(0, 6).toUpperCase();
        const res = await shareContactsForJobId(supabase, jobIdFull);
        await clearAdminState();
        if (res.ok) {
          const { data: j } = await supabase
            .from("jobs")
            .select("customer_name, assigned_technician_id")
            .eq("id", jobIdFull)
            .maybeSingle();
          let techName = "Technician";
          if (j?.assigned_technician_id) {
            const { data: t } = await supabase
              .from("technicians").select("name").eq("id", j.assigned_technician_id).maybeSingle();
            if (t?.name) techName = t.name;
          }
          await sendReply(from,
            `✅ Details shared successfully — Job #${shortRef}\n\n` +
            `👤 Customer: ${j?.customer_name ?? "—"} — notified ✅\n` +
            `🔧 Technician: ${techName} — notified ✅\n\n` +
            `Job status updated to: ASSIGNED`,
            channel);
        } else {
          await sendReply(from,
            `⚠️ Could not share details for job #${shortRef}: ${res.error ?? "unknown error"}.`,
            channel);
        }
      };
      const runShareContactsForRef = async (ref: string) => {
        const matches = await findJobByRef(ref);
        if (matches.length === 0) {
          await sendReply(from,
            `No job found for ref #${ref.toUpperCase()}. Details not shared.`, channel);
          return;
        }
        if (matches.length > 1) {
          await sendReply(from,
            `Multiple jobs match #${ref.toUpperCase()} — please send the full 6-character ref.`, channel);
          return;
        }
        await runShareContactsForJobId(String(matches[0].id));
      };


      // (A) Bare "yes" → NEVER auto-execute a job-specific action. Always
      // require the admin to confirm the job reference number first, to prevent
      // accidental broadcasts / quote sends / detail shares on the wrong job.
      if (yesOnly) {
        if (adminState?.step === "await_share_details_confirm" && adminState.job_id) {
          await setAdminState("await_ref_for_share_details", String(adminState.job_id));
          await sendReply(from,
            "Please provide the job reference number you would like to share with the technician (e.g. #ABC123).",
            channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
        if (adminState?.step === "await_send_quote_confirm" && adminState.job_id) {
          await setAdminState("await_ref_for_send_quote", String(adminState.job_id));
          await sendReply(from,
            "Please provide the job reference number you would like to send the quote for (e.g. #ABC123).",
            channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
        if (adminState?.step === "await_broadcast_confirm" && adminState.job_id) {
          await setAdminState("await_ref_for_broadcast", String(adminState.job_id));
          await sendReply(from,
            "Please provide the job reference number you would like to broadcast (e.g. #ABC123).",
            channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
        if (adminState?.step === "await_ref_for_broadcast" && adminState.job_id) {
          await sendReply(from,
            "Please provide the job reference number you would like to broadcast (e.g. #ABC123).",
            channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
        if (adminState?.step === "await_ref_for_send_quote" && adminState.job_id) {
          await sendReply(from,
            "Please provide the job reference number you would like to send the quote for (e.g. #ABC123).",
            channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
        if (adminState?.step === "await_ref_for_share_details" && adminState.job_id) {
          await sendReply(from,
            "Please provide the job reference number you would like to share with the technician (e.g. #ABC123).",
            channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
        // Default behaviour: assume admin is responding to the "Should I share
        // the list of available technicians…" prompt at the end of the job alert.
        await setAdminState("await_ref_for_list", null);
        await sendReply(from,
          "Please provide the job reference number (with or without #).", channel);
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // ============================================================
      // YES + JOBREF — status-based router (single source of truth).
      // The job's current status determines which action YES confirms.
      // This prevents ambiguity when multiple actions are pending across
      // different jobs at the same time.
      // ============================================================
      const yesRefForRouter =
        (yesRefConfirmMatch ? yesRefConfirmMatch[1] : null) ??
        (yesPlusRefMatch ? yesPlusRefMatch[1] : null);

      if (yesRefForRouter) {
        const ref = yesRefForRouter.toLowerCase();
        const shortRef = ref.toUpperCase();
        const jobMatches = await findJobByRef(ref);
        if (jobMatches.length === 0) {
          await sendReply(from,
            `I could not find a job with reference #${shortRef}. Please check the reference number and try again.`,
            channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
        if (jobMatches.length > 1) {
          await sendReply(from,
            `Multiple jobs match #${shortRef} — please send the full 6-character reference.`, channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }

        // Re-fetch the full job row (findJobByRef returns a trimmed projection).
        const { data: fullJob } = await supabase
          .from("jobs")
          .select("id,status,assignment_status,assigned_technician_id,platform_fee_status,customer_name")
          .eq("id", jobMatches[0].id)
          .maybeSingle();
        const job: any = fullJob ?? jobMatches[0];
        const status = String(job.status ?? "").toLowerCase();
        const assignmentStatus = String(job.assignment_status ?? "").toLowerCase();
        const feePaid = String(job.platform_fee_status ?? "").toLowerCase() === "paid";

        // Terminal states
        if (status === "completed" || status === "closed") {
          await sendReply(from,
            `Job #${shortRef} is already completed. No action taken.`, channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
        if (status === "cancelled") {
          await sendReply(from,
            `Job #${shortRef} is already cancelled. No action taken.`, channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }

        // Details ALREADY exchanged → genuinely done.
        if (assignmentStatus === "details_sent") {
          await sendReply(from,
            `Details have already been shared for job #${shortRef}. No further action needed.`,
            channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }

        // Paid (fee received), details not yet shared → assignment flow.
        // Driven by payment + assignment_status, NOT by job.status, so the
        // status field cannot block this branch.
        if (feePaid && assignmentStatus !== "details_sent") {
          // Single-step: YES #REF immediately executes the assignment.
          // No preview / CONFIRM step — admin gets a brief prelude, then
          // both parties are connected, then a Done summary.
          const { data: acceptedQuote } = await supabase
            .from("quotes")
            .select("technician_id")
            .eq("job_id", job.id)
            .eq("status", "accepted")
            .maybeSingle();
          const techId = job.assigned_technician_id ?? acceptedQuote?.technician_id ?? null;
          let techName = "Technician";
          if (techId) {
            const { data: t } = await supabase
              .from("technicians").select("name").eq("id", techId).maybeSingle();
            if (t?.name) techName = t.name;
          }
          const customerName = job.customer_name ?? "Customer";

          await sendReply(from,
            `✅ Sending details now — Job #${shortRef}\n\n` +
            `🔧 ${techName} → receiving customer details\n` +
            `👤 ${customerName} → receiving technician details\n\n` +
            `Please wait...`,
            channel);

          const res = await shareContactsForJobId(supabase, String(job.id));
          await clearAdminState();
          if (res.ok) {
            await sendReply(from,
              `✅ Done — Job #${shortRef}\n\n` +
              `Both parties have been connected:\n` +
              `👤 ${customerName} — technician details sent ✓\n` +
              `🔧 ${techName} — customer details sent ✓\n\n` +
              `Job status: ASSIGNED`,
              channel);
          } else {
            await sendReply(from,
              `⚠️ Could not share details for job #${shortRef}: ${res.error ?? "unknown error"}.`,
              channel);
          }
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }

        // Not paid yet, but tech already assigned (e.g. accepted) → block.
        if (!feePaid && (status === "accepted" || status === "in_progress")) {
          await sendReply(from,
            `Payment has not been received yet for job #${shortRef}.`,
            channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }

        // Quote already sent to customer → waiting on payment.
        if (status === "sent" || status === "awaiting_payment") {
          await sendReply(from,
            `Quote has already been sent to the customer for job #${shortRef}. Waiting for payment.`,
            channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }

        // Quotes received but not yet forwarded → forward to customer.
        if (status === "quoted") {
          await runSendQuoteForJobId(String(job.id), {
            resendInfo: { stepSuffix: `all:`, label: `the quote for #${shortRef}` },
          });
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }

        // Currently broadcasting → already out, waiting on quotes.
        if (status === "broadcasting") {
          await sendReply(from,
            `Job #${shortRef} has already been broadcasted. Waiting for technician quotes.`,
            channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }

        // Fall through (intake_pending / intake_complete / awaiting_approval / pending /
        // unknown statuses) → use the existing list/broadcast confirmation flow.
      }

      // RESEND #REF — admin override that REPLAYS the original scoped intent
      // (single tech / updated-only / all). Falls back to a clarifying prompt
      // if no pending resend context exists for this admin+job.
      const resendMatch = trimmed.match(/^\s*resend\s+#?([0-9a-f]{6})\s*$/i);
      if (resendMatch) {
        const ref = resendMatch[1];
        const matches = await findJobByRef(ref);
        if (matches.length !== 1) {
          await sendReply(from,
            matches.length === 0
              ? `No job found for ref #${ref.toUpperCase()}. Nothing resent.`
              : `Multiple jobs match #${ref.toUpperCase()} — please send the full 6-character ref.`,
            channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
        const jobIdFull = String(matches[0].id);
        const shortRef = jobIdFull.slice(0, 6).toUpperCase();
        const pendingStep =
          adminState?.step?.startsWith("pending_resend:") && String(adminState.job_id) === jobIdFull
            ? adminState.step.slice("pending_resend:".length)
            : null;

        if (!pendingStep) {
          await sendReply(from,
            `What would you like to resend for job #${shortRef}?\n\n· All quotes — reply: *send all quotes for #${shortRef} to customer*\n· Specific technician quote — reply: *send <tech name> quote for #${shortRef} to customer*\n· Updated quote only — reply: *send updated quote for #${shortRef} to customer*\n\nPlease specify so I send the correct one.`,
            channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }

        const colonIdx = pendingStep.indexOf(":");
        const mode = colonIdx >= 0 ? pendingStep.slice(0, colonIdx) : pendingStep;
        const identifier = colonIdx >= 0 ? pendingStep.slice(colonIdx + 1) : "";
        await clearAdminState();
        if (mode === "single") {
          await runSendQuoteForRef(ref, identifier || null, { force: true });
        } else if (mode === "updated") {
          await runSendUpdatedQuoteForRef(ref, identifier || null, { force: true });
        } else {
          await runSendQuoteForRef(ref, null, { force: true });
        }
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // Pending-context carry-forward: a bare job ref (#E2C9FE) sent right
      // after the bot asked "please include the job reference" must complete
      // the ORIGINAL intent (broadcast to TECH-0001, send quote to X, update
      // price for Y) instead of being treated as a fresh list/broadcast-all.
      if (!pendingBareJobRef && refOnlyMatch && adminState?.step) {
        const step = adminState.step;
        const bareRef = refOnlyMatch[1];
        if (step.startsWith("await_ref_for_broadcast_to:")) {
          const ident = step.slice("await_ref_for_broadcast_to:".length);
          await clearAdminState();
          await runBroadcastToOne(bareRef, ident);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
        if (step.startsWith("await_ref_for_send_quote_to:")) {
          const ident = step.slice("await_ref_for_send_quote_to:".length);
          await clearAdminState();
          await runSendQuoteForRef(bareRef, ident);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
        if (step.startsWith("await_ref_for_send_updated_quote_to:")) {
          const ident = step.slice("await_ref_for_send_updated_quote_to:".length);
          await clearAdminState();
          await runSendUpdatedQuoteForRef(bareRef, ident);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
        // Generic pending-intent carry-forward (set when we asked the admin
        // "There are currently N active jobs. Please include the job reference…").
        // A bare ref reply MUST complete that original intent, never default
        // to STATUS.
        if (step.startsWith("await_ref_for_intent:")) {
          const payload = step.slice("await_ref_for_intent:".length);
          const [intent, techIdRaw] = payload.split("|");
          const techId = techIdRaw || null;
          await clearAdminState();
          await clearPendingAdminAction();
          await runPendingAdminIntent(intent, bareRef, { technicianId: techId });
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
      }


      const refFromMsg =
        (yesPlusRefMatch ? yesPlusRefMatch[1] : null) ??
        (refOnlyMatch ? refOnlyMatch[1] : null);
      const refRouting = resolveAdminJobRefAction({
        step: adminState?.step,
        stateJobId: adminState?.job_id,
        yesPlusRef: yesPlusRefMatch ? yesPlusRefMatch[1] : null,
        refOnly: refOnlyMatch ? refOnlyMatch[1] : null,
      });

      if (!pendingBareJobRef && refRouting?.action === "send_quote") {
        await runSendQuoteForRef(refRouting.ref);
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      if (!pendingBareJobRef && refRouting?.action === "share_details") {
        await runShareContactsForRef(refRouting.ref);
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      if (!pendingBareJobRef && refRouting?.action === "broadcast") {
        await runBroadcastForRef(refRouting.ref);
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // Bare ref while waiting for list lookup, OR combined "yes <ref>" →
      // show available technicians and immediately ask broadcast confirmation.
      if (!pendingBareJobRef && refRouting?.action === "list") {
        const ref = refRouting.ref;
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
        const lines = scored.slice(0, 10).map(({ t, miles }: any, idx: number) => {
          const dist = miles != null ? `${miles.toFixed(1)} mi` : "Unknown";
          const code = t.tech_code ?? "TECH-????";
          return `${idx + 1}. 👤 ${code} · ${t.name}\n   Phone: ${t.phone}\n   Distance: ${dist}`;
        }).join("\n\n");
        const more = scored.length > 10 ? `\n\n…and ${scored.length - 10} more` : "";
        const divider = "──────────────────────";
        await setAdminState("await_broadcast_confirm", job.id);
        await sendReply(from,
          `Job #${shortRef} — Available Technicians (${job.postcode ?? "—"})\n\n${divider}\n\n${lines}${more}\n\n${divider}\n\nTotal: ${scored.length} technician(s) available\n\nBroadcast all:\nbroadcast #${shortRef}\n\nSend to one:\n#${shortRef} send to Hassan\n#${shortRef} send to TECH-0001\n\nSend to few:\n#${shortRef} send to Hassan, Pashma\n#${shortRef} send to TECH-0001, TECH-0003\n#${shortRef} send to TECH-0001, Hassan`,
          channel,
        );
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // NOTE: Natural-language admin commands (show list / broadcast all /
      // broadcast to one / status / cancel / list active / forward quote /
      // assign / etc.) are NOT handled by hardcoded regex here. They are
      // routed by the LLM intent classifier further down (which reads the
      // editable prompt at app_settings.admin_intent_system_prompt). This
      // keeps the Admin AI Instructions page as the single source of truth.


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

      // =================================================================
      // Intent handlers (Intents 3, 6, 7, 8) and LLM classifier fallback.
      // Reached only when none of the fast-path regexes above matched.
      // =================================================================

      // ---- Shared helpers ----
      const refRegexBoundary = /\b([0-9a-f]{6,8})\b/i;
      const formatRelative = (iso: string) => {
        const d = Date.now() - new Date(iso).getTime();
        const mins = Math.round(d / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins} min ago`;
        const hrs = Math.round(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.round(hrs / 24)}d ago`;
      };
      const statusBadge = (s: string) => {
        const map: Record<string, string> = {
          new: "🔴 NEW", intake_complete: "🔴 NEW",
          awaiting_approval: "🟡 AWAITING APPROVAL",
          pending: "🟠 PENDING REVIEW",
          matching: "🟡 MATCHING", broadcasting: "🟡 BROADCASTED", quoting: "🟡 QUOTING",
          quoted: "🟠 QUOTED",
          fee_pending: "🟣 AWAITING PAYMENT", awaiting_payment: "🟣 AWAITING PAYMENT",
          confirmed: "🟢 ASSIGNED", assigned: "🟢 ASSIGNED", en_route: "🟢 EN ROUTE",
          on_site: "🟢 ON SITE", in_progress: "🟢 IN PROGRESS",
          completed: "✅ COMPLETED", cancelled: "⚫ CANCELLED",
        };
        return map[s] ?? s.toUpperCase();
      };
      const listActiveJobs = async (limit = 50) => {
        const { data } = await supabase
          .from("jobs")
          .select("id, customer_name, postcode, issue_type, status, created_at")
          .or("status.is.null,status.not.in.(completed,cancelled,closed)")
          .order("created_at", { ascending: false })
          .limit(limit);
        return data ?? [];
      };
      const lookupJobByRef = findJobByRef;

      // ---- Intent 6 — JOB_STATUS_CHECK ----
      const runStatusForRef = async (ref: string) => {
        const matches = await lookupJobByRef(ref);
        if (matches.length === 0) {
          await sendReply(from, `No job found for ref #${ref.toUpperCase()}.`, channel);
          return;
        }
        if (matches.length > 1) {
          await sendReply(from, `Multiple jobs match #${ref.toUpperCase()} — please send the full 6-character ref.`, channel);
          return;
        }
        const job: any = matches[0];
        const shortRef = String(job.id).slice(0, 6).toUpperCase();
        const wheels = Array.isArray(job.affected_wheels) && job.affected_wheels.length
          ? job.affected_wheels.join(", ") : "—";
        const issueLine = `${job.vehicle_reg ?? "—"} · ${wheels} · ${job.issue_type ?? "—"}`;
        const { data: quotes } = await supabase
          .from("quotes")
          .select("price_gbp, eta_minutes, technician_id, status, created_at")
          .eq("job_id", job.id)
          .order("price_gbp", { ascending: true });
        const qList = quotes ?? [];
        let bestLine = "—";
        if (qList.length > 0) {
          const best: any = qList[0];
          let techName = "";
          if (best.technician_id) {
            const { data: t } = await supabase
              .from("technicians").select("name").eq("id", best.technician_id).maybeSingle();
            techName = (t as any)?.name ?? "";
          }
          bestLine = `£${best.price_gbp} · ${techName || "—"} · ${best.eta_minutes ?? "?"} min ETA`;
        }
        const payment = job.platform_fee_status === "paid" ? "✅ Paid"
          : job.platform_fee_status === "refunded" ? "↩️ Refunded"
          : "Pending";
        const msg = [
          `📊 Job #${shortRef} — Current Status`,
          ``,
          `👤 Customer: ${job.customer_name ?? "—"} (${job.customer_phone ?? "—"})`,
          `🚗 Vehicle: ${issueLine}`,
          `📍 Location: ${job.postcode ?? "—"}`,
          `🕐 Posted: ${formatRelative(job.created_at)}`,
          `📌 Current Status: ${statusBadge(job.status ?? "new")}`,
          `💬 Quotes Received: ${qList.length}`,
          `💷 Best Quote: ${bestLine}`,
          `💳 Payment: ${payment}`,
        ].join("\n");
        await sendReply(from, msg, channel);
      };

      // ---- Intent 7 — LIST_ALL_ACTIVE_JOBS ----
      const runListActiveJobs = async () => {
        const jobs = await listActiveJobs(50);
        if (!jobs || jobs.length === 0) {
          await sendReply(from, "📋 No active jobs right now.", channel);
          return;
        }
        const groups: Record<string, any[]> = {};
        for (const j of jobs) {
          const key = statusBadge(j.status ?? "new");
          (groups[key] ||= []).push(j);
        }
        const order = ["🔴 NEW", "🟡 AWAITING APPROVAL", "🟠 PENDING REVIEW", "🟡 MATCHING", "🟡 BROADCASTED", "🟡 QUOTING", "🟠 QUOTED", "🟣 AWAITING PAYMENT", "🟢 ASSIGNED", "🟢 EN ROUTE", "🟢 ON SITE", "🟢 IN PROGRESS"];
        const sections: string[] = [];
        for (const k of [...order, ...Object.keys(groups).filter((g) => !order.includes(g))]) {
          const arr = groups[k];
          if (!arr || !arr.length) continue;
          const lines = arr.slice(0, 10).map((j: any) =>
            `   • #${String(j.id).slice(0, 6).toUpperCase()} · ${j.postcode ?? "—"} · ${j.customer_name ?? "—"} · ${j.issue_type ?? "—"} · ${formatRelative(j.created_at)}`
          ).join("\n");
          sections.push(`${k} (${arr.length})\n${lines}`);
        }
        const msg = [
          `📋 Active Jobs Overview — ${jobs.length} Open`,
          ``,
          sections.join("\n\n"),
          ``,
          `Reply "status #JOBREF" for full details on any job.`,
        ].join("\n");
        await sendReply(from, msg, channel);
      };

      // ---- Intent 8 — CANCEL_JOB ----
      const runCancelPrompt = async (ref: string) => {
        const matches = await lookupJobByRef(ref);
        if (matches.length === 0) {
          await sendReply(from, `No job found for ref #${ref.toUpperCase()}.`, channel);
          return;
        }
        if (matches.length > 1) {
          await sendReply(from, `Multiple jobs match #${ref.toUpperCase()} — please send the full 6-character ref.`, channel);
          return;
        }
        const job: any = matches[0];
        const shortRef = String(job.id).slice(0, 6).toUpperCase();
        await setAdminState("await_cancel_confirm", job.id);
        await sendReply(from,
          `⚠️ Are you sure you want to cancel job #${shortRef}?\nReply: CONFIRM CANCEL #${shortRef} to proceed.`,
          channel,
        );
      };
      const runCancelConfirm = async (ref: string) => {
        const matches = await lookupJobByRef(ref);
        if (matches.length === 0) {
          await sendReply(from, `No job found for ref #${ref.toUpperCase()}.`, channel);
          return;
        }
        const job: any = matches[0];
        const shortRef = String(job.id).slice(0, 6).toUpperCase();
        await supabase.from("jobs").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", job.id);
        await clearAdminState();
        if (job.customer_phone) {
          await sendReply(
            job.customer_phone,
            `We're sorry — your tyre service request (Job #${shortRef}) has been cancelled by our team. If this is unexpected, please reply and we'll help right away.\n— Tyre Fly`,
            "whatsapp",
          );
        }
        await sendReply(from, `✅ Job #${shortRef} cancelled. Customer has been notified.`, channel);
      };

      // Pending-context helper: show available technicians for a job ref.
      // Mirrors the inline SHOW_TECHNICIAN_LIST case so a bare ref reply
      // (after we asked for the missing reference) completes the original intent.
      const runShowTechniciansForRef = async (ref: string) => {
        const matches = await findJobByRef(ref);
        if (matches.length === 0) {
          await sendReply(from, `No job found for ref #${ref.toUpperCase()}.`, channel);
          return;
        }
        if (matches.length > 1) {
          await sendReply(from, `Multiple jobs match #${ref.toUpperCase()} — please send the full 6-character ref.`, channel);
          return;
        }
        const job: any = matches[0];
        const shortRef = String(job.id).slice(0, 6).toUpperCase();
        const scored = await scoreNearbyTechs(job);
        if (scored.length === 0) {
          await sendReply(from, `Job #${shortRef} (${job.postcode}) — no approved technicians found nearby.`, channel);
          return;
        }
        const lines = scored.slice(0, 10).map(({ t, miles }: any, idx: number) => {
          const dist = miles != null ? `${miles.toFixed(1)} mi` : "Unknown";
          const code = t.tech_code ?? "TECH-????";
          return `${idx + 1}. 👤 ${code} · ${t.name}\n   Phone: ${t.phone}\n   Distance: ${dist}`;
        }).join("\n\n");
        const more = scored.length > 10 ? `\n\n…and ${scored.length - 10} more` : "";
        const divider = "──────────────────────";
        await setAdminState("await_broadcast_confirm", job.id);
        await sendReply(from,
          `Job #${shortRef} — Available Technicians (${job.postcode ?? "—"})\n\n${divider}\n\n${lines}${more}\n\n${divider}\n\nTotal: ${scored.length} technician(s) available\n\nBroadcast all:\nbroadcast #${shortRef}\n\nSend to one:\n#${shortRef} send to Hassan\n#${shortRef} send to TECH-0001\n\nSend to few:\n#${shortRef} send to Hassan, Pashma\n#${shortRef} send to TECH-0001, TECH-0003\n#${shortRef} send to TECH-0001, Hassan`,
          channel,
        );
      };

      const runUpdatePricePromptForRef = async (ref: string, techId: string) => {
        const refUp = ref.toUpperCase();
        const jobs = await findJobByRef(ref);
        if (jobs.length === 1) {
          await setAdminState(`await_price_update:${techId}`, String(jobs[0].id));
        }
        await sendReply(
          from,
          `Please provide the new price for ${techId} on job #${refUp}.\nExample: "update ${techId} price for #${refUp} to £55"`,
          channel,
        );
      };

      const runPendingAdminIntent = async (
        intent: string,
        ref: string,
        opts?: { technicianId?: string | null },
      ) => {
        const techId = opts?.technicianId ?? null;
        switch (intent) {
          case "SHOW_TECHNICIAN_LIST":
            await runShowTechniciansForRef(ref);
            return;
          case "BROADCAST_ALL":
            await runBroadcastForRef(ref);
            return;
          case "BROADCAST_ONE":
          case "BROADCAST_MULTIPLE_SPECIFIC":
            if (techId) {
              await runBroadcastToOne(ref, techId);
            } else {
              await sendReply(from, `Which technician should receive job #${ref.toUpperCase()}? Reply with their name, TECH-ID, or phone.`, channel);
            }
            return;
          case "FORWARD_QUOTE_ONE":
          case "FORWARD_QUOTE_MULTIPLE":
            await runSendQuoteForRef(ref, techId);
            return;
          case "FORWARD_QUOTE_UPDATED":
            await runSendUpdatedQuoteForRef(ref, techId);
            return;
          case "UPDATE_TECHNICIAN_PRICE":
            if (techId) {
              await runUpdatePricePromptForRef(ref, techId);
            } else {
              await sendReply(from, `Which technician's price should I update on job #${ref.toUpperCase()}? Reply with the name or TECH-ID.`, channel);
            }
            return;
          case "ASSIGN":
            await runShareContactsForRef(ref);
            return;
          case "CANCEL":
            await runCancelPrompt(ref);
            return;
          case "CONFIRM_CANCEL":
            await runCancelConfirm(ref);
            return;
          case "STATUS":
          default:
            await runStatusForRef(ref);
            return;
        }
      };

      if (pendingBareJobRef) {
        await clearPendingAdminAction();
        await clearAdminState();
        await runPendingAdminIntent(pendingBareJobRef.intent, pendingBareJobRef.ref, {
          technicianId: pendingBareJobRef.technicianId,
        });
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }



      // ---- Intent 3 — BROADCAST_JOB_TO_ONE_OR_MORE_TECHNICIANS ----
      // Splits identifier on commas / "and" / "&" and resolves each piece
      // individually (name, TECH-ID, or phone). Broadcasts to all resolved
      // technicians in a single call; reports any that didn't match.
      const splitTechnicianIdentifiers = (raw: string): string[] => {
        const parts: string[] = [];
        for (const chunk of raw.split(/\s*,\s*/)) {
          for (const piece of chunk.split(/\s+(?:and|&)\s+/i)) {
            const t = piece.trim().replace(/^[.;:!]+|[.;:!]+$/g, "");
            if (t) parts.push(t);
          }
        }
        return parts;
      };

      const runBroadcastToOne = async (ref: string, identifier: string) => {
        const matches = await lookupJobByRef(ref);
        if (matches.length === 0) {
          await sendReply(from, `No job found for ref #${ref.toUpperCase()}.`, channel);
          return;
        }
        if (matches.length > 1) {
          await sendReply(from, `Multiple jobs match #${ref.toUpperCase()} — please send the full 6-character ref.`, channel);
          return;
        }
        const job: any = matches[0];
        const shortRef = String(job.id).slice(0, 6).toUpperCase();

        const identifiers = splitTechnicianIdentifiers(identifier);
        if (identifiers.length === 0) {
          await sendReply(from, `Please specify at least one technician name, TECH-ID, or phone.`, channel);
          return;
        }

        const resolvedTechs: any[] = [];
        const seenIds = new Set<string>();
        const notFound: string[] = [];
        const ambiguous: { id: string; candidates: any[] }[] = [];

        for (const id of identifiers) {
          const candidates = await resolveTechnician(id);
          if (candidates.length === 0) {
            notFound.push(id);
          } else if (candidates.length > 1) {
            ambiguous.push({ id, candidates });
          } else {
            const t = candidates[0];
            if (!seenIds.has(t.id)) {
              seenIds.add(t.id);
              resolvedTechs.push(t);
            }
          }
        }

        for (const a of ambiguous) {
          const lines = a.candidates.slice(0, 5).map((t: any) =>
            `— ${t.tech_code ?? "TECH-????"} ${t.name} (${t.phone})`
          ).join("\n");
          await sendReply(from,
            `Multiple technicians found matching "${a.id}":\n${lines}\n\nWhich one should receive job #${shortRef}? Reply with the technician ID, e.g. "#${shortRef} send to ${a.candidates[0].tech_code ?? "TECH-XXXX"}".`,
            channel,
          );
        }

        if (resolvedTechs.length === 0) {
          if (notFound.length > 0 && ambiguous.length === 0) {
            const label = notFound.length === 1 ? notFound[0] : notFound.join(", ");
            await sendReply(from,
              `Could not find a technician matching "${label}".\nPlease check the name or ID and try again.`,
              channel,
            );
          }
          return;
        }

        const bRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/broadcast-job`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ job_id: job.id, mode: "specific", technician_ids: resolvedTechs.map((t) => t.id) }),
        });
        const bJson: any = await bRes.json().catch(() => ({}));
        const sent = bJson?.sent ?? 0;
        if (bRes.ok && sent > 0) {
          await supabase.from("jobs").update({ status: "broadcasting" }).eq("id", job.id);
          const techLines = resolvedTechs.map((t, i) =>
            `${i + 1}. ${t.tech_code ? `${t.tech_code} · ` : ""}${t.name}`
          ).join("\n");
          let msg = [
            `Broadcast Sent — Job #${shortRef}`,
            `──────────────────────`,
            `👤 Customer: ${job.customer_name ?? "—"}`,
            `🚗 Vehicle: ${job.vehicle_reg ?? "—"}`,
            `📍 Service Area: ${job.postcode ?? "—"}`,
            `──────────────────────`,
            ``,
            `Technicians Notified: ${resolvedTechs.length}`,
            ``,
            techLines,
            ``,
            `──────────────────────`,
            `Waiting for quotes...`,
          ].join("\n");
          if (notFound.length > 0) {
            const label = notFound.length === 1 ? notFound[0] : notFound.join(", ");
            msg += `\n\nCould not find a technician matching "${label}". All other technicians in your command were notified.`;
          }
          await sendReply(from, msg, channel);
        } else {
          const err = bJson?.error ? ` (${String(bJson.error).slice(0, 140)})` : "";
          const names = resolvedTechs.map((t) => t.name).join(", ");
          await sendReply(from, `⚠️ Failed to send job #${shortRef} to ${names}${err}.`, channel);
        }
      };

      // ---- Safety-only fast paths ----
      // Only the explicit CONFIRM CANCEL phrase and the matching state-driven
      // "yes" reply stay as regex — these are destructive actions and we want
      // a zero-ambiguity trigger. Everything else (cancel/status/list active/
      // broadcast-to-one/NL list/NL broadcast/forward quote/assign/etc.) is
      // routed by the LLM classifier below using the Admin AI Instructions.
      const _refMatchAny = trimmed.match(refRegexBoundary); // (kept for compatibility)

      // Intent 8 confirmation: "CONFIRM CANCEL #REF" / "confirm cancel REF"
      const confirmCancelMatch = trimmed.match(/^\s*confirm\s+cancel\s+#?\s*([0-9a-f]{6,8})\s*$/i);
      if (confirmCancelMatch) {
        await runCancelConfirm(confirmCancelMatch[1]);
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }
      // Or admin already in await_cancel_confirm and just sends "yes"
      if (adminState?.step === "await_cancel_confirm" && adminState.job_id &&
          /^\s*(y|yes|ok|confirm|do it)\s*[.!]?\s*$/i.test(trimmed)) {
        await runCancelConfirm(String(adminState.job_id).slice(0, 6));
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // Pending price-update context: if the admin was previously asked
      // "Please provide the new price for TECH-XXXX on job #YYYYYY" and now
      // replies with just a bare price (e.g. "£55", "55", "65.50"), resolve
      // it against the stored context instead of asking again.
      if (adminState?.step?.startsWith("await_price_update:") && adminState.job_id) {
        const bareMatch = trimmed.match(/^\s*(?:£|gbp\s*)?\s*(\d{1,4}(?:\.\d{1,2})?)\s*(?:£|gbp|pounds?)?\s*[.!]?\s*$/i);
        if (bareMatch) {
          const newPrice = Number(bareMatch[1]);
          const techIdent = adminState.step.slice("await_price_update:".length);
          const refShort = String(adminState.job_id).slice(0, 6);
          await runUpdateTechnicianPrice(refShort, techIdent, newPrice);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
      }

      // ---- LLM classifier — the single source of truth for admin NL ----
      // Reads the editable prompt at app_settings.admin_intent_system_prompt.
      const classification = await classifyAdminMessage(trimmed);
      const replyLang: AdminLanguage = classification?.language ?? "en";

      // Safety override: "change/chance/chnage/chagne/update ... price" must be
      // treated as a price-update intent, never as a quote-forward.
      if (
        classification &&
        /\b(change|chance|chnage|chagne|update|updte|udpate)\b[\s\S]*\bprice\b/i.test(trimmed)
      ) {
        classification.intent = "UPDATE_TECHNICIAN_PRICE";
      }

      // Safety override (HIGHEST PRIORITY): "connect both / share details /
      // send contacts / link both / send details to both" + a job ref always
      // means ASSIGN (share contact details after payment), never FORWARD_QUOTE.
      // The classifier sometimes confuses these because both involve "sending"
      // something to the customer. ASSIGN happens AFTER payment, FORWARD_QUOTE
      // happens BEFORE payment — they must never be conflated.
      const ASSIGN_KEYWORDS_RE = /\b(connect(?:\s+(?:both|them|customer|parties|for))?|share\s+(?:both\s+)?(?:details|contacts)|send\s+(?:details|contacts)\s+to\s+both|send\s+contacts|link\s+both)\b/i;
      const HAS_JOB_REF_RE = /#?\s*\b[0-9a-f]{6,8}\b/i;
      if (classification && ASSIGN_KEYWORDS_RE.test(trimmed) && HAS_JOB_REF_RE.test(trimmed)) {
        classification.intent = "ASSIGN";
      }

      if (classification && classification.intent !== "UNKNOWN") {

        const ref = classification.job_reference;
        const techId = classification.technician_identifier;

        // Rule 1 & 2: if ref missing for a per-job intent, count active jobs.
        const needsRef = ["SHOW_TECHNICIAN_LIST", "BROADCAST_ALL", "BROADCAST_ONE", "BROADCAST_MULTIPLE_SPECIFIC", "FORWARD_QUOTE_ONE", "FORWARD_QUOTE_MULTIPLE", "FORWARD_QUOTE_UPDATED", "UPDATE_TECHNICIAN_PRICE", "ASSIGN", "STATUS", "CANCEL", "CONFIRM_CANCEL"].includes(classification.intent);
        const isBroadcastIntent = ["BROADCAST_ALL", "BROADCAST_ONE", "BROADCAST_MULTIPLE_SPECIFIC"].includes(classification.intent);
        if (needsRef && !ref) {
          // Pending-context carry-forward: if we already have a technician
          // identifier (or a price for UPDATE_TECHNICIAN_PRICE), stash it so
          // the admin's next message (a bare job ref like #E2C9FE) completes
          // the original intent instead of being reclassified from scratch.
          if (isBroadcastIntent && techId) {
            await setAdminState(`await_ref_for_broadcast_to:${techId}`, null);
            await sendReply(
              from,
              `Please include the job reference number for this broadcast to ${techId}. Example:\n\n#E2C9FE\n\nOr if you are unsure of the reference:\n"show active jobs"`,
              channel,
            );
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
          }
          if (["FORWARD_QUOTE_ONE", "FORWARD_QUOTE_MULTIPLE", "FORWARD_QUOTE_UPDATED"].includes(classification.intent) && techId) {
            const stepName = classification.intent === "FORWARD_QUOTE_UPDATED"
              ? `await_ref_for_send_updated_quote_to:${techId}`
              : `await_ref_for_send_quote_to:${techId}`;
            await setAdminState(stepName, null);
            await sendReply(
              from,
              `Please include the job reference number to send the quote for ${techId}. Example:\n\n#E2C9FE\n\nOr if you are unsure of the reference:\n"show active jobs"`,
              channel,
            );
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
          }
          if (isBroadcastIntent) {
            await sendReply(
              from,
              `Please include the job reference number for this broadcast. Example:\n\n#E2C9FE send to TECH-0001, TECH-0002\n\nOr if you are unsure of the reference:\n"show active jobs"`,
              channel,
            );
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
          }
          const list = await listActiveJobs(10);
          if (list.length === 0) {
            await sendReply(from, `There are no active jobs right now.`, channel);
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
          }
          if (list.length > 1) {
            const sampleRef = `#${String(list[0].id).slice(0, 6).toUpperCase()}`;
            const techHint = techId || "Hassan";
            const exampleByIntent: Record<string, string> = {
              SHOW_TECHNICIAN_LIST: `techs for ${sampleRef}`,
              BROADCAST_ALL: `broadcast ${sampleRef}`,
              BROADCAST_ONE: `${sampleRef} send to ${techHint}`,
              BROADCAST_MULTIPLE_SPECIFIC: `${sampleRef} send to ${techHint} and Omar`,
              FORWARD_QUOTE_ONE: `send ${techHint} quote for ${sampleRef} to customer`,
              FORWARD_QUOTE_MULTIPLE: `send all quotes for ${sampleRef} to customer`,
              FORWARD_QUOTE_UPDATED: `send updated quotes for ${sampleRef} to customer`,
              UPDATE_TECHNICIAN_PRICE: `update ${techHint} price for ${sampleRef} to £45`,
              ASSIGN: `assign ${sampleRef}`,
              STATUS: `status ${sampleRef}`,
              CANCEL: `cancel ${sampleRef}`,
              CONFIRM_CANCEL: `CONFIRM CANCEL ${sampleRef}`,
            };
            const example = exampleByIntent[classification.intent] ?? `status ${sampleRef}`;
            // Persist the original intent so a bare ref reply (e.g. "#C977B3")
            // completes that intent instead of falling back to STATUS.
            const intentPayload = techId
              ? `${classification.intent}|${techId}`
              : classification.intent;
            await setAdminState(`await_ref_for_intent:${intentPayload}`, null);
            await setPendingAdminAction(classification.intent, "job_reference", {
              technicianId: techId,
              extraData: { source: "missing_job_reference" },
            });
            await sendReply(from,
              `There are currently ${list.length} active jobs. Please include the job reference number so I know which one to action.\n\nExample: "${example}"\n\nOr type "show active jobs" to see all open jobs.`,
              channel,
            );
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });

          }
          // Single active job — confirm with admin first.
          const onlyJob = list[0];
          const sr = String(onlyJob.id).slice(0, 6).toUpperCase();
          await setAdminState("await_single_job_confirm", onlyJob.id);
          await sendReply(from,
            `Just to confirm — you would like me to action job #${sr}. Is that correct? Reply YES to proceed.`,
            channel,
          );
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }


        switch (classification.intent) {
          case "SHOW_TECHNICIAN_LIST":
            // Reuse the existing list flow via a fake bare-ref by setting state
            // and delegating to the list path — simplest is to inline:
            await sendReply(from, `Fetching technicians for #${ref!.toUpperCase()}…`, channel);
            // Use the same scoring/output as the list block above.
            {
              const matches = await findJobByRef(ref!);
              if (matches.length === 0) {
                await sendReply(from, `No job found for ref #${ref!.toUpperCase()}.`, channel);
              } else if (matches.length > 1) {
                await sendReply(from, `Multiple jobs match #${ref!.toUpperCase()} — please send the full 6-character ref.`, channel);
              } else {
                const job: any = matches[0];
                const shortRef = String(job.id).slice(0, 6).toUpperCase();
                const scored = await scoreNearbyTechs(job);
                if (scored.length === 0) {
                  await sendReply(from, `Job #${shortRef} (${job.postcode}) — no approved technicians found nearby.`, channel);
                } else {
                  const lines = scored.slice(0, 10).map(({ t, miles }: any, idx: number) => {
                    const dist = miles != null ? `${miles.toFixed(1)} mi` : "Unknown";
                    const code = t.tech_code ?? "TECH-????";
                    return `${idx + 1}. 👤 ${code} · ${t.name}\n   Phone: ${t.phone}\n   Distance: ${dist}`;
                  }).join("\n\n");
                  const more = scored.length > 10 ? `\n\n…and ${scored.length - 10} more` : "";
                  const divider = "──────────────────────";
                  await setAdminState("await_broadcast_confirm", job.id);
                  await sendReply(from,
                    `Job #${shortRef} — Available Technicians (${job.postcode ?? "—"})\n\n${divider}\n\n${lines}${more}\n\n${divider}\n\nTotal: ${scored.length} technician(s) available\n\nBroadcast all:\nbroadcast #${shortRef}\n\nSend to one:\n#${shortRef} send to Hassan\n#${shortRef} send to TECH-0001\n\nSend to few:\n#${shortRef} send to Hassan, Pashma\n#${shortRef} send to TECH-0001, TECH-0003\n#${shortRef} send to TECH-0001, Hassan`,
                    channel,
                  );
                }
              }
            }
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
          case "BROADCAST_ALL":
            await runBroadcastForRef(ref!);
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
          case "BROADCAST_ONE":
          case "BROADCAST_MULTIPLE_SPECIFIC":
            if (!techId) {
              await sendReply(from, `Which technician should receive job #${ref!.toUpperCase()}? Reply with their name, TECH-ID, or phone.`, channel);
            } else {
              await runBroadcastToOne(ref!, techId);
            }
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
          case "FORWARD_QUOTE_ONE":
          case "FORWARD_QUOTE_MULTIPLE":
            await runSendQuoteForRef(ref!, techId);
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
          case "FORWARD_QUOTE_UPDATED":
            await runSendUpdatedQuoteForRef(ref!, techId);
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
          case "UPDATE_TECHNICIAN_PRICE": {
            // Extract the NEW price from the CURRENT message only.
            // Strip out job refs (#3EB08B) and tech codes (TECH-0001) first
            // so their digits cannot be misread as the price.
            const scrubbed = trimmed
              .replace(/#\s*[0-9a-f]{6,8}\b/gi, " ")
              .replace(/\bt(?:ech)?[-\s]?\d{1,6}\b/gi, " ");

            // Prefer £-prefixed amount, then "to <amount>", then "<amount> gbp/pounds".
            let priceStr: string | null = null;
            const mPound = scrubbed.match(/£\s*(\d{1,5}(?:\.\d{1,2})?)/i);
            const mTo = scrubbed.match(/\b(?:to|=|@)\s*£?\s*(\d{1,5}(?:\.\d{1,2})?)/i);
            const mSuffix = scrubbed.match(/(\d{1,5}(?:\.\d{1,2})?)\s*(?:gbp|pounds?|quid)\b/i);
            if (mPound) priceStr = mPound[1];
            else if (mTo) priceStr = mTo[1];
            else if (mSuffix) priceStr = mSuffix[1];
            const newPrice = priceStr ? Number(priceStr) : NaN;
            const hasPrice = Number.isFinite(newPrice) && newPrice > 0;
            const refUp = ref!.toUpperCase();
            if (!hasPrice) {
              const techLabel = techId ? techId : "the technician";
              if (techId) {
                // Resolve job UUID so the bare-price reply has all context.
                const jobs = await findJobByRef(ref!);
                const jobId = jobs.length === 1 ? String(jobs[0].id) : null;
                if (jobId) {
                  await setAdminState(`await_price_update:${techId}`, jobId);
                }
              }
              await sendReply(
                from,
                `Please provide the new price for ${techLabel} on job #${refUp}.\nExample: "update ${techId || "TECH-0001"} price for #${refUp} to £55"`,
                channel,
              );
              return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
            }
            if (!techId) {
              await sendReply(from, `Which technician's price should I update on job #${refUp}? Reply with the name or TECH-ID.`, channel);
              return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
            }
            await runUpdateTechnicianPrice(ref!, techId, newPrice);
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
          }
          case "ASSIGN":
            await runShareContactsForRef(ref!);
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
          case "STATUS":
            await runStatusForRef(ref!);
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
          case "LIST_ACTIVE":
            await runListActiveJobs();
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
          case "CANCEL":
            await runCancelPrompt(ref!);
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
          case "CONFIRM_CANCEL":
            await runCancelConfirm(ref!);
            return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
      }

      // Admin catchall — never let an admin message fall through to the
      // customer intake flow. Sent in the admin's detected language.
      await sendReply(from, adminMenuText(replyLang), channel);
      return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
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

      // Find the technician's open allocation(s).
      // NOTE: no FK from job_allocations.job_id → jobs.id, so we cannot use
      // PostgREST embedded select (`jobs(*)`) here — it errors silently and
      // makes us reply "no open job" even when a broadcast exists.
      const { data: openAllocs, error: allocErr } = await supabase
        .from("job_allocations")
        .select("*")
        .eq("technician_id", tech.id)
        .in("status", ["broadcast", "proposed"])
        .order("created_at", { ascending: false });
      if (allocErr) console.error("tech alloc lookup failed", allocErr);
      const allOpen = openAllocs ?? [];

      // Also load ALL closed allocations for this technician so we can give a
      // specific "window closed for #REF" reply even when a technician quotes
      // after the 3-minute window has expired, regardless of how long ago.
      const { data: closedAllocsRaw } = await supabase
        .from("job_allocations")
        .select("*")
        .eq("technician_id", tech.id)
        .eq("status", "expired")
        .order("created_at", { ascending: false });
      const allClosed = closedAllocsRaw ?? [];

      // Fetch postcodes for any open jobs (used when listing them back to
      // the technician).
      const openJobIds = Array.from(new Set(allOpen.map((a: any) => a.job_id).filter(Boolean)));
      let postcodeByJob = new Map<string, string>();
      if (openJobIds.length > 0) {
        const { data: jobRows } = await supabase
          .from("jobs")
          .select("id, postcode")
          .in("id", openJobIds);
        postcodeByJob = new Map((jobRows ?? []).map((j: any) => [j.id, j.postcode ?? ""]));
      }

      // If the technician included a job reference in their message, try to
      // route the quote to that specific allocation. This is essential when
      // they have multiple open broadcasts at once.
      const refInBody = (() => {
        const matches = Array.from(body.matchAll(/#?\b([0-9a-fA-F]{6})\b/g))
          .map((m) => m[1].toUpperCase())
          .filter((r) => /^[0-9A-F]{6}$/.test(r));
        for (const r of matches) {
          const hit = allOpen.find((a: any) => String(a.job_id).slice(0, 6).toUpperCase() === r);
          if (hit) return { ref: r, alloc: hit };
        }
        return null;
      })();

      let alloc: any = refInBody?.alloc ?? (allOpen.length === 1 ? allOpen[0] : null);

      const strippedBody = body.replace(GMAPS_URL_RE, "").replace(COORD_RE, "").replace(DMS_RE, "").replace(PLAIN_LATLNG_RE, "").trim();
      const looksLikeQuoteMsg = !!strippedBody && /£|\bpound|\bgbp\b|\bquid\b|\bmin(s|ute)?\b|\d/i.test(strippedBody);

      // If they have 2+ open broadcasts and didn't include a reference, and
      // the message looks like a quote, list the open jobs and ask for ref.
      if (!refInBody && allOpen.length > 1 && looksLikeQuoteMsg) {
        const sampleRef = String(allOpen[0].job_id).slice(0, 6).toUpperCase();
        const lines = allOpen.slice(0, 5).map((a: any) => {
          const ref = String(a.job_id).slice(0, 6).toUpperCase();
          const pc = postcodeByJob.get(a.job_id);
          return pc ? `• #${ref} — ${pc}` : `• #${ref}`;
        }).join("\n");
        await sendReply(
          from,
          `We couldn't attach your quote — please include a job reference.\n\nYour open jobs (quotes still accepted):\n${lines}\n\nTo quote, reply e.g: £85, 25 mins — ${sampleRef}`,
          channel,
        );
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      if (!alloc?.job_id) {
        // Decision is based purely on the technician's CURRENT open allocations.
        // Branch on (open count, closed count) per spec.
        if (looksLikeQuoteMsg) {
          if (allOpen.length === 0 && allClosed.length > 0) {
            // 0 open, 1+ recently closed → name the most recent closed job.
            const closedRef = String(allClosed[0].job_id).slice(0, 6).toUpperCase();
            await sendReply(
              from,
              `The quote window for Job #${closedRef} has closed (3-minute limit reached). No further quotes can be accepted for this job.`,
              channel,
            );
          } else {
            // 0 open, 0 closed
            await sendReply(
              from,
              `Thanks — we don't have an open job for you right now, so we can't attach this quote.`,
              channel,
            );
          }
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }

        // Pure location ping with no open job → just ack
        if (techPin && !strippedBody) {
          await sendReply(from, "Got your live location 📍 — tracking for the next 8 hours. We'll match you to nearby jobs.", channel);
        } else {
          await sendReply(from, "Thanks — no open job for you right now. We'll text when one matches.", channel);
        }
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }


      // Enforce the 3-minute quote window. Any reply after the window
      // closes — or once an allocation has been expired by the finalizer —
      // gets a single "job closed" notice and is not recorded as a quote.
      const allocCreatedMs = alloc.created_at ? new Date(alloc.created_at).getTime() : 0;
      const windowMs = 180_000;
      const windowExpiresMs = alloc.quote_window_expires_at
        ? new Date(alloc.quote_window_expires_at).getTime()
        : allocCreatedMs + windowMs;
      if (Date.now() > windowExpiresMs) {
        if (alloc.status === "broadcast" || alloc.status === "proposed") {
          await supabase
            .from("job_allocations")
            .update({ status: "expired" })
            .eq("id", alloc.id);
        }
        await sendReply(
          from,
          `This job has been closed. The 3-minute quote window for Job Ref #${alloc.job_id.slice(0, 6)} has ended and it is no longer accepting quotes.`,
          channel,
        );
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
        .gte("created_at", alloc.created_at)
        .order("created_at", { ascending: false })
        .limit(1);
      let draft: any = existingDrafts?.[0] ?? null;

      if (!draft) {
        const { data: inserted, error: insertErr } = await supabase.from("quotes").insert({
          job_id: alloc.job_id,
          technician_id: tech.id,
          status: "collecting",
          raw_message: body,
          confidence: parsed.confidence,
        }).select("*").single();
        if (insertErr) {
          console.error("quote draft insert FAILED", {
            job_id: alloc.job_id,
            technician_id: tech.id,
            error: insertErr,
          });
        }
        draft = inserted;
      }

      if (!draft) {
        console.error("quote draft missing after insert attempt — aborting", {
          job_id: alloc.job_id,
          technician_id: tech.id,
          raw_body: body,
        });
        await sendReply(from, "Sorry — we hit a snag saving your quote. Please resend price, ETA and your live location.", channel);
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // Merge new fields into the draft (don't overwrite previously-collected values with null).
      const mergedPrice = normalizeSuspiciousQuotePrice(
        draft.price_gbp ?? parsed.price_gbp ?? null,
        `${draft.raw_message ?? ""} | ${body}`,
      );
      const mergedCallout = draft.callout_fee_gbp ?? parsed.callout_fee_gbp ?? null;
      const mergedEta = draft.eta_minutes ?? parsed.eta_minutes ?? null;
      const mergedTyreIncl = draft.tyre_included ?? parsed.tyre_included ?? null;
      const mergedTyreCond = draft.tyre_condition ?? parsed.tyre_condition ?? null;

      // Pin location for quote completion must come from THIS job's quote flow:
      // either the current message, or a live location pin shared after this
      // allocation was created. An older saved technician pin must NOT satisfy
      // the quote requirement.
      let quoteFlowPins: Array<{ lat: number; lng: number; created_at: string; expires_at: string }> = [];
      if (alloc.created_at) {
        const { data: recentPins, error: recentPinsErr } = await supabase
          .from("technician_locations")
          .select("lat,lng,created_at,expires_at")
          .eq("technician_id", tech.id)
          .gte("created_at", alloc.created_at)
          .order("created_at", { ascending: false })
          .limit(5);
        if (recentPinsErr) {
          console.error("quote technician_locations lookup failed", recentPinsErr);
        } else {
          quoteFlowPins = recentPins ?? [];
        }
      }
      const quoteLocation = resolveQuoteLocationForAllocation({
        techPin,
        allocationCreatedAt: alloc.created_at ?? null,
        locationRows: quoteFlowPins,
      });

      const hasPrice = isCustomerQuoteAmountValid(mergedPrice);
      const hasEta = mergedEta != null;
      const hasPin = quoteLocation.hasPin;
      const pinLat = quoteLocation.lat;
      const pinLng = quoteLocation.lng;

      // Persist whatever we've collected so far. Log any failure loudly so it
      // can't silently leave price_gbp / eta_minutes NULL on a "completed" quote.
      const { error: persistErr } = await supabase.from("quotes").update({
        price_gbp: mergedPrice,
        callout_fee_gbp: mergedCallout,
        eta_minutes: mergedEta,
        tyre_included: mergedTyreIncl,
        tyre_condition: mergedTyreCond,
        raw_message: ((draft.raw_message ? draft.raw_message + " | " : "") + body).slice(0, 2000),
        confidence: parsed.confidence,
      }).eq("id", draft.id);
      if (persistErr) {
        console.error("quote draft update FAILED", {
          quote_id: draft.id,
          job_id: alloc.job_id,
          technician_id: tech.id,
          mergedPrice,
          mergedEta,
          error: persistErr,
        });
      } else {
        console.log("quote draft updated", {
          quote_id: draft.id,
          job_id: alloc.job_id,
          technician_id: tech.id,
          price_gbp: mergedPrice,
          eta_minutes: mergedEta,
          hasPin,
          ai_confidence: parsed.confidence,
          raw_body: body,
        });
      }

      if (!(hasPrice && hasEta && hasPin)) {
        const missing: string[] = [];
        if (!hasPrice) missing.push("💷 your price in £");
        if (!hasEta) missing.push("⏱️ ETA in minutes");
        if (!hasPin) missing.push("📍 your live location pin");
        const gotParts: string[] = [];
        if (mergedPrice != null) gotParts.push(`price £${mergedPrice}`);
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

      await supabase
        .from("job_allocations")
        .update({ status: "quoted" })
        .eq("id", alloc.id);

      const tyreNote = mergedTyreIncl
        ? ` (incl. ${mergedTyreCond ?? ""} tyre)`.replace("  ", " ")
        : (mergedTyreIncl === false ? " (tyre NOT included)" : "");
      const timeNote = onTime ? "⚡ within 60s" : `(${elapsedSec}s)`;

      await sendReply(
        from,
        [
          `✅ Quote received successfully for Job Ref #${shortRef} ${timeNote}`,
          ``,
          `💷 Price: £${mergedPrice}`,
          `⏱️ ETA: ${mergedEta} min${tyreNote}`,
          `📍 Location: shared`,
          ``,
          `We'll text you as soon as the customer makes a decision. Thank you!`,
        ].join("\n"),
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

      // NOTE: Per-quote WhatsApp notifications to admins are intentionally
      // disabled. Admins receive a single consolidated summary of every quote
      // for this job from finalize-broadcast once the 3-minute window ends.

      // Intentionally NO early-finalize here. The consolidated summary is
      // sent only after the full 3-minute quote window closes, so admins
      // always receive every quote that came in during the window in a
      // single message (scheduled via scheduled_tasks → finalize-broadcast).




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
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
        // No pending quote to accept — fall through so the open-job
        // clarification (3b.5) can handle "YES = start a new job".
      }

      // 3b.5 Open-job clarification — DISABLED by product decision.
      // Customers should never see old pending / awaiting-approval / in-progress
      // / completed jobs when they message us. Any free-form message from a
      // customer falls straight through to fresh intake (processCustomerIntake),
      // which creates a brand-new job and returns a new reference number.
      // Quote acceptance (3b above) and review rating (3a above) still work
      // because those require an explicit YES / 1-5 reply on a job that is
      // actually awaiting that exact response.

      // 3c. Locked-state photo enrichment — DISABLED by product decision.
      // Once a customer has received a reference number, the job is the
      // technician's responsibility. Any subsequent message starts a brand-new
      // intake instead of being silently appended to the old job.
    }


    // ─── Intent gate ─────────────────────────────────────────────────────
    // Before falling through to intake, classify the customer's intent.
    // The intake flow must ONLY trigger when the customer clearly describes
    // a tyre/vehicle problem (or is mid-intake answering our questions).
    // Mid-intake = an in-progress (non-complete) conversation in the last
    // 30 minutes. Photos always pass through (likely tyre images).
    let midIntake = false;
    try {
      const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: conv } = await supabase
        .from("conversations")
        .select("id,step,last_message_at")
        .eq("customer_phone", from)
        .neq("step", "complete")
        .gte("last_message_at", cutoff)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      midIntake = !!conv;
      // Belt-and-braces: also treat as mid-intake if the customer has any
      // recent job still in intake_pending state. This guarantees that short
      // follow-ups like "ok" / "thanks" / "status?" — which would otherwise
      // hit the intent gate — route through the intake parser first until
      // the intake form is fully complete.
      if (!midIntake && recentJob && String(recentJob.status) === "intake_pending") {
        const ageMs = Date.now() - new Date(recentJob.created_at).getTime();
        if (ageMs < 30 * 60_000) midIntake = true;
      }
    } catch (_) { /* best-effort */ }


    if (!midIntake && mediaUrls.length === 0 && body) {
      // FAQ matcher runs BEFORE intent detection. If the message is a
      // recognised FAQ (e.g. "do you offer tyre replacement"), reply with
      // the canned answer and STOP — never start the intake flow.
      const faqAnswer = matchFaq(body);
      if (faqAnswer) {
        console.log("faq match", { from, body: body.slice(0, 80) });
        await sendReply(from, faqAnswer, channel);
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      const intent = await classifyCustomerIntent(body);
      console.log("intent classify", { from, body: body.slice(0, 80), intent });


      // Pull customer name + active job for contextual replies.
      const { data: custRow } = await supabase
        .from("customers").select("full_name").eq("phone", from).maybeSingle();
      const firstName = firstNameOf((custRow as any)?.full_name);
      const activeJob = recentJob && ACTIVE_JOB_STATUSES.has(String(recentJob.status))
        ? recentJob : null;

      const shouldStartIntake =
        intent.intent === "INTENT_JOB_REQUEST" || intent.has_vehicle_issue === true;

      if (!shouldStartIntake) {
        let reply = "";
        switch (intent.intent) {
          case "INTENT_GREETING":
            reply = firstName
              ? `Hi ${firstName}! 👋 Welcome back to TyreFly. How can I help you today?`
              : `Hi there! 👋 Welcome to TyreFly, your 24/7 roadside tyre service. How can I help you today?`;
            break;
          case "INTENT_GRATITUDE":
            reply = activeJob
              ? `You're welcome${firstName ? `, ${firstName}` : ""}! 😊 We've received your job (Ref: ${jobRefOf(activeJob)}) and are taking care of it. We'll update you shortly.`
              : `You're welcome${firstName ? `, ${firstName}` : ""}! If you ever need tyre assistance, we're available 24/7. 🚗`;
            break;
          case "INTENT_ACKNOWLEDGEMENT":
            reply = activeJob
              ? `Got it${firstName ? `, ${firstName}` : ""} 👍 We'll keep you updated on job ${jobRefOf(activeJob)}.`
              : `Great! If you need anything else, just message us anytime. 🚗`;
            break;
          case "INTENT_JOB_STATUS_ENQUIRY":
            reply = activeJob
              ? `Your job ${jobRefOf(activeJob)} is currently *${String(activeJob.status).replace(/_/g, " ")}*. We'll send you an update as soon as there's progress.`
              : `I don't see an active job for your number. Would you like to report a tyre issue?`;
            break;
          case "INTENT_PAYMENT_ENQUIRY":
            reply = activeJob
              ? `Thanks${firstName ? `, ${firstName}` : ""} — let me check the payment status on job ${jobRefOf(activeJob)} and a team member will confirm shortly.`
              : `I don't see an active job for your number. If you've made a payment, please send the reference and we'll look into it.`;
            break;
          case "INTENT_CANCELLATION":
            reply = activeJob
              ? `Just to confirm — do you want to cancel job ${jobRefOf(activeJob)}? Reply *YES CANCEL* to confirm.`
              : `No problem — you don't have any active job with us right now. 🙂`;
            break;
          case "INTENT_COMPLAINT_OR_QUESTION":
            reply = `Happy to help! TyreFly is a 24/7 mobile tyre repair & replacement service. Could you share a bit more detail about what you'd like to know?`;
            break;
          default:
            reply = `I want to make sure I help you properly — could you tell me a bit more about what you need? 😊`;
        }
        await sendReply(from, reply, channel);
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }
      // Intent says job request / vehicle issue → fall through to intake.
    }


    // 3d. Guard: if the customer already has a very recent active job (intake
    //     just completed, broadcasting, quoting, awaiting payment, in-progress,
    //     etc.), do NOT auto-start a brand-new intake on a stray follow-up
    //     message. Acknowledge the existing job and require an explicit
    //     "NEW JOB" reply to start another one. Mid-intake conversations are
    //     unaffected (they hit the midIntake branch above).
    if (
      !midIntake &&
      recentJob &&
      ACTIVE_JOB_STATUSES.has(String(recentJob.status))
    ) {
      const recentAgeMs = Date.now() - new Date(recentJob.created_at).getTime();
      if (recentAgeMs < 2 * 60 * 60_000) {
        // Explicit "NEW JOB" keyword always starts a fresh intake.
        const explicitNewJob = /^\s*(new[\s_-]?job|new\s+booking|start\s+(again|over|new)|another\s+job|different\s+(job|tyre|problem))\s*[!.?]*\s*$/i
          .test(body || "");
        // Otherwise let the AI decide whether this is the same job or a new one,
        // passing the existing job state as context.
        const relation = explicitNewJob
          ? "new_job"
          : await aiClassifyJobContinuity({
              body: body || "",
              hasMedia: mediaUrls.length > 0,
              job: {
                id: recentJob.id,
                status: String(recentJob.status),
                issue_type: (recentJob as any).issue_type ?? null,
                postcode: (recentJob as any).postcode ?? null,
                created_at: recentJob.created_at,
                issue_description: (recentJob as any).issue_description ?? null,
              },
            });
        if (relation === "same_job") {
          const ref = jobRefOf(recentJob);
          const statusTxt = String(recentJob.status).replace(/_/g, " ");
          const reply =
            `Thanks! We've already got your job *#${ref}* (${statusTxt}) on file ` +
            `and our team is working on it — we'll be in touch shortly with a price and ETA.\n\n` +
            `If this is a *different* tyre problem, reply *NEW JOB* to start a new booking.`;
          await sendReply(from, reply, channel);
          return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
        }
        // relation === "new_job" → fall through to intake (starts a fresh job).
      }
    }

    // 4. Otherwise → route through the customer intake state machine.
    //    This is the single source of truth for the 6-step information gathering.
    //    It handles brand-new customers, returning customers (with memory pre-fill),
    //    and continuing an in-flight intake — all without re-asking completed steps.
    let customerMediaUrls = mediaUrls;
    const isPhotoOnlyCustomerMsg = mediaUrls.length > 0 && !(body || "").trim();
    if (isPhotoOnlyCustomerMsg) {
      const batch = await debounceCustomerPhotoBatch(supabase, {
        from,
        channel,
        mediaUrls,
        inboundMessageId: inboundLog?.id ?? null,
        inboundCreatedAt: inboundLog?.created_at ?? null,
      });
      if (!batch.shouldProcess) {
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }
      customerMediaUrls = batch.mediaUrls;
    }

    const outcome = await processCustomerIntake(supabase, {
      from,
      body,
      mediaUrls: customerMediaUrls,
      channel,
    });

    // Run vision analysis on any new photos (bounces back non-tyre photos).
    if (customerMediaUrls.length > 0 && outcome.job?.id) {
      try {
        const ar = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/analyze-damage`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            job_id: outcome.job.id,
            photo_urls: customerMediaUrls,
            issue_description: outcome.job.issue_description,
            issue_type: outcome.job.issue_type,
          }),
        });
        const aj = await ar.json();
        if (aj?.damage_type === "not-a-tyre") {
          // Remove the rejected photos from the job so they don't inflate the
          // checklist photo count.
          try {
            const { data: jrow } = await supabase
              .from("jobs")
              .select("photo_urls")
              .eq("id", outcome.job.id)
              .maybeSingle();
            const bad = new Set(customerMediaUrls);
            const kept = ((jrow?.photo_urls as string[]) ?? []).filter((u) => !bad.has(u));
            await supabase.from("jobs").update({ photo_urls: kept }).eq("id", outcome.job.id);
          } catch (e) {
            console.error("failed to strip rejected photos", e);
          }
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
