// Customer intake state machine — single source of truth for the WhatsApp/SMS
// information gathering flow. Driven by the `conversations` and `customers`
// tables so we never re-ask a question we already answered.
//
// Steps (linear, one-at-a-time):
//   1. awaiting_location   → postcode / pin / address
//   2. awaiting_plate      → vehicle number plate
//   3. awaiting_name       → customer's full name
//   4. awaiting_description→ what happened
//   5. awaiting_wheels     → which tyres are affected
//   6. awaiting_photos     → one photo per affected tyre
//   7. complete            → job intake_complete (fires dispatch)
//
// A conversation is considered "active" if its last message was within 24h
// AND step <> 'complete'. Anything older is treated as a brand-new case, but
// the long-term customers table is reused (name/postcode/reg/total_jobs).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;

export type IntakeStep =
  | "awaiting_location"
  | "awaiting_plate_confirm"
  | "awaiting_plate"
  | "awaiting_name"
  | "awaiting_description"
  | "awaiting_wheels"
  | "awaiting_photos"
  | "complete"
  | "idle";

const STEP_ORDER: IntakeStep[] = [
  "awaiting_location",
  "awaiting_plate_confirm",
  "awaiting_plate",
  "awaiting_name",
  "awaiting_description",
  "awaiting_wheels",
  "awaiting_photos",
];

// Minimum photos we always require before completing intake, regardless of
// how many wheels are affected — keeps the damage assessment meaningful.
const MIN_REQUIRED_PHOTOS = 2;

// ───────────────────────── parsing helpers ─────────────────────────

const POSTCODE_RE = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i;
const COORD_RE = /\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)/;
const ADDRESS_HINT_RE = /\b(street|st\b|road|rd\b|avenue|ave\b|lane|ln\b|drive|dr\b|close|crescent|way|place|pl\b|square|sq\b|terrace|court|ct\b|mews|gardens|park|hill|row)\b/i;
const PLATE_HINT_RE = /\b(?:reg(?:istration)?|plate|number\s*plate|licen[cs]e\s*plate|tag)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\s\-]{2,12}[A-Z0-9])\b/i;
const PLATE_LOOSE_RE = /\b([A-Z0-9]{2,4}[\s\-]?[A-Z0-9]{2,5})\b/g;

export function extractPostcode(t: string): string | null {
  const m = (t || "").match(POSTCODE_RE);
  return m ? `${m[1].toUpperCase()} ${m[2].toUpperCase()}` : null;
}

export function extractReg(t: string): string | null {
  if (!t) return null;
  const hinted = t.match(PLATE_HINT_RE);
  if (hinted) return hinted[1].toUpperCase().trim().replace(/\s+/g, " ");
  const matches = t.toUpperCase().matchAll(PLATE_LOOSE_RE);
  for (const m of matches) {
    const raw = m[1].replace(/\s+/g, "");
    if (!/[A-Z]/.test(raw) || !/\d/.test(raw)) continue;
    if (POSTCODE_RE.test(raw)) continue;
    if (raw.length < 4 || raw.length > 10) continue;
    return m[1].toUpperCase().trim();
  }
  return null;
}

export function extractWheels(t: string): string[] {
  const s = (t || "").toLowerCase();
  const out = new Set<string>();
  const has = (re: RegExp) => re.test(s);
  if (has(/front[-\s]?left|fl\b|nearside front|front near.?side/)) out.add("front-left");
  if (has(/front[-\s]?right|fr\b|offside front|front off.?side/)) out.add("front-right");
  if (has(/(rear|back)[-\s]?left|rl\b|nearside rear|nearside back|rear near.?side/)) out.add("rear-left");
  if (has(/(rear|back)[-\s]?right|rr\b|offside rear|offside back|rear off.?side/)) out.add("rear-right");
  if (has(/\b(?:both|two|2)\s+front(?:\s+(?:tyres?|tires?|wheels?|ones?))?\b|\bfront\s+(?:both|two|2)\b|\bboth\s+front\s+ones?\b/)) {
    out.add("front-left"); out.add("front-right");
  }
  if (has(/\b(?:both|two|2)\s+(?:rear|back)(?:\s+(?:tyres?|tires?|wheels?|ones?))?\b|\b(?:rear|back)\s+(?:both|two|2)\b|\bboth\s+(?:rear|back)\s+ones?\b/)) {
    out.add("rear-left"); out.add("rear-right");
  }
  if (has(/all\s*(four|4)\b/)) {
    ["front-left","front-right","rear-left","rear-right"].forEach((w) => out.add(w));
  }
  return Array.from(out);
}

// Common greeting / filler words that must never be saved as a customer name.
const NAME_BLOCKLIST = new Set([
  "hey","hi","hello","hiya","yo","sup","help","urgent","please","pls","thanks","thank you",
  "ok","okay","yes","no","yeah","yep","nope","sure","mate","sir","madam","customer",
  "hii","hiii","heyy","heyyy","hola","hai","good","morning","evening","afternoon","night",
  "tyre","tire","tyres","tires","wheel","flat","puncture","car","emergency",
]);

export function isValidPersonName(s: string | null | undefined): boolean {
  if (!s) return false;
  const cleaned = s.trim();
  if (cleaned.length < 2) return false;
  if (cleaned.toLowerCase() === "customer") return false;
  const lower = cleaned.toLowerCase();
  if (NAME_BLOCKLIST.has(lower)) return false;
  // Require letters only (with spaces, hyphens, apostrophes, dots).
  if (!/^[A-Za-z][A-Za-z .'-]{1,38}$/.test(cleaned)) return false;
  // Reject if ANY word in the string is a blocklisted greeting/filler
  // (catches "Hey I need help", "Hi mate", "Hello please" etc.).
  const words = cleaned.toLowerCase().split(/\s+/);
  if (words.some((w) => NAME_BLOCKLIST.has(w))) return false;
  if (words.length === 1 && words[0].length < 3) return false;
  if (words.length > 4) return false;
  return true;
}

export function extractName(t: string): string | null {
  if (!t) return null;
  const explicit = t.match(/\b(?:my name is|i am|i'm|im|this is|name[:\-])\s+([A-Za-z][A-Za-z .'-]{1,38})/i);
  if (explicit) {
    const cand = explicit[1].trim().replace(/\s+/g, " ");
    return isValidPersonName(cand) ? cand : null;
  }
  const s = t.trim();
  if (/^[A-Za-z][A-Za-z .'-]{1,38}$/.test(s) && s.split(/\s+/).length <= 4) {
    return isValidPersonName(s) ? s : null;
  }
  return null;
}

// Words/phrases that indicate the customer is describing a real tyre/wheel
// incident — used to decide whether the first message already carries enough
// context to skip the "what happened" question. Kept deliberately broad so
// free-form phrasing ("my tyre burst on the road", "leaking air", "stuck with
// a damaged tyre", "need urgent puncture repair") all qualify.
const INCIDENT_RE = /(nail|screw|slow|fast|sudden|drove|driving|park|kerb|curb|pothole|bulge|split|crack|flat|puncture|blow[- ]?out|burst|busted|shred|ripped|gash|gouge|leak|leaking|valve|hit|damage|damaged|tear|tore|cut|deflat|pressure|stuck|stranded|roadside|emergency|urgent|repair|fix(?:ing)?|replace|change\s+(?:my\s+)?(?:tyre|tire|wheel)|new\s+(?:tyre|tire)|no idea|not sure|don'?t know|dont know|dunno|unsure|no clue)/i;

// A loose tyre/wheel mention combined with any service verb is also enough
// signal — handles "Can you send a technician? My car tyre needs help".
const TYRE_MENTION_RE = /\b(tyre|tire|wheel|puncture|blowout|flat)s?\b/i;
const SERVICE_VERB_RE = /\b(help|service|technician|come|send|need|require|book|fix|repair|replace|change|sort|stuck|stranded)\b/i;

export function hasIncidentContext(t: string): boolean {
  const s = t || "";
  if (INCIDENT_RE.test(s)) return true;
  if (TYRE_MENTION_RE.test(s) && SERVICE_VERB_RE.test(s)) return true;
  return false;
}

export function guessIssueType(t: string): string | null {
  const s = (t || "").toLowerCase();
  if (/blow.?out|burst|busted|shred|exploded/.test(s)) return "blowout";
  if (/lock|locking/.test(s)) return "locked wheel";
  if (/flat|deflat/.test(s)) return "flat tyre";
  if (/punct|nail|screw/.test(s)) return "puncture";
  if (/sidewall|bulge|buckl/.test(s)) return "sidewall damage";
  if (/kerb|curb|pothole|hit|impact|crash|bump/.test(s)) return "impact damage";
  if (/leak|valve|pressure|going down|deflating|losing air/.test(s)) return "slow leak";
  if (/replace|new\s+(tyre|tire)|change\s+(my\s+)?(tyre|tire|wheel)|fit(ting)?\s+(a\s+)?(new\s+)?(tyre|tire)/.test(s)) return "tyre replacement";
  if (/damage|damaged|repair|fix/.test(s)) return "tyre damage";
  return null;
}

async function reverseGeocodePostcode(lat: number, lng: number): Promise<string | null> {
  try {
    const r = await fetch(`https://api.postcodes.io/postcodes?lon=${lng}&lat=${lat}&limit=1`);
    if (r.ok) {
      const j = await r.json();
      const pc = j?.result?.[0]?.postcode;
      if (typeof pc === "string" && pc.trim()) return pc.trim().toUpperCase();
    }
  } catch (e) { console.error("reverseGeocode failed", e); }
  return null;
}

async function geocodeAddressToPostcode(address: string): Promise<string | null> {
  const q = (address || "").trim();
  if (q.length < 4) return null;
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=gb&q=${encodeURIComponent(q)}`,
      { headers: { "User-Agent": "tyre-fix-fast/1.0" } },
    );
    if (!r.ok) return null;
    const arr = await r.json();
    const hit = Array.isArray(arr) ? arr[0] : null;
    if (!hit) return null;
    let pc: string | null = hit?.address?.postcode ?? null;
    if (pc) return pc.trim().toUpperCase();
    const lat = Number(hit.lat); const lng = Number(hit.lon);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return reverseGeocodePostcode(lat, lng);
  } catch (e) { console.error("geocodeAddress failed", e); }
  return null;
}

async function resolvePostcode(body: string): Promise<string | null> {
  let pc = extractPostcode(body);
  if (pc) return pc;
  const coords = body.match(COORD_RE);
  if (coords) {
    const lat = Number(coords[1]); const lng = Number(coords[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      pc = await reverseGeocodePostcode(lat, lng);
      if (pc) return pc;
    }
  }
  if (ADDRESS_HINT_RE.test(body)) {
    pc = await geocodeAddressToPostcode(body);
    if (pc) return pc;
  }
  return null;
}

type Supa = ReturnType<typeof createClient>;

async function loadCustomer(supabase: Supa, phone: string) {
  const { data } = await supabase.from("customers").select("*").eq("phone", phone).maybeSingle();
  return data as any | null;
}

async function loadActiveConversation(supabase: Supa, phone: string) {
  const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();
  const { data } = await supabase
    .from("conversations")
    .select("*")
    .eq("customer_phone", phone)
    .neq("step", "complete")
    .gte("last_message_at", cutoff)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as any | null;
}

async function loadJob(supabase: Supa, id: string) {
  const { data } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
  return data as any | null;
}

async function upsertCustomer(supabase: Supa, phone: string, patch: Record<string, any>) {
  const existing = await loadCustomer(supabase, phone);
  if (existing) {
    const merged: Record<string, any> = { last_seen_at: new Date().toISOString() };
    for (const [k, v] of Object.entries(patch)) {
      if (v !== null && v !== undefined && v !== "") merged[k] = v;
    }
    await supabase.from("customers").update(merged).eq("phone", phone);
  } else {
    await supabase.from("customers").insert({
      phone,
      last_seen_at: new Date().toISOString(),
      total_jobs: 0,
      ...Object.fromEntries(Object.entries(patch).filter(([_, v]) => v !== null && v !== undefined && v !== "")),
    });
  }
}

function firstMissingStep(job: any, customer: any, conversation: any | null): IntakeStep {
  if (!job.postcode) return "awaiting_location";
  if (!job.vehicle_reg) {
    // Returning customer with a plate on file: confirm before reusing.
    if (customer?.vehicle_reg && !conversation?.context?.plate_confirm_done) {
      return "awaiting_plate_confirm";
    }
    return "awaiting_plate";
  }
  if (!job.customer_name || job.customer_name === "Customer") return "awaiting_name";
  if (!hasIncidentContext(job.issue_description ?? "")) return "awaiting_description";
  if (!Array.isArray(job.affected_wheels) || job.affected_wheels.length === 0) return "awaiting_wheels";
  const need = (job.affected_wheels ?? []).length;
  const have = (job.photo_urls ?? []).length;
  const required = Math.max(MIN_REQUIRED_PHOTOS, need);
  if (have < required) return "awaiting_photos";
  return "complete";
}

function stepNumberAndTotal(step: IntakeStep, customer: any | null): { n: number; total: number } | null {
  if (step === "complete" || step === "idle") return null;
  const knowsName = isValidPersonName(customer?.full_name);
  const hasStoredReg = !!(customer?.vehicle_reg);
  const visible = STEP_ORDER.filter((s) => {
    if (s === "awaiting_name" && knowsName) return false;
    // Only ONE of the two plate steps is ever shown per conversation.
    if (s === "awaiting_plate_confirm" && !hasStoredReg) return false;
    if (s === "awaiting_plate" && hasStoredReg) return false;
    return true;
  });
  const idx = visible.indexOf(step);
  if (idx === -1) return null;
  return { n: idx + 1, total: visible.length };
}

function prompt(step: IntakeStep, ctx: { job: any; customer: any | null; greeting?: string }): string {
  const meta = stepNumberAndTotal(step, ctx.customer);
  const head = meta ? `*Step ${meta.n} of ${meta.total}* — ` : "";
  const greet = ctx.greeting ? ctx.greeting + "\n\n" : "";
  switch (step) {
    case "awaiting_location":
      return `${greet}${head}Your *current* location 📍\nShare a WhatsApp pin 📍, your *postcode* (e.g. SW1A 1AA), or your *full address* for this job. (We always need a fresh location — never reuse a previous one.)`;
    case "awaiting_plate_confirm": {
      const reg = ctx.customer?.vehicle_reg ?? "your vehicle";
      return `${greet}${head}Vehicle 🚗\nWe've got *${reg}* on file for you. Reply *YES* to use the same vehicle, or send the *new number plate* if it's a different car this time.`;
    }
    case "awaiting_plate":
      return `${greet}${head}Number plate 🚗\nWhat's the car's *number plate*? (text it, e.g. "C13 ATA", or send a clear photo of it).`;
    case "awaiting_name":
      return `${greet}${head}Your name 👤\nWhat's your *full name*? (first + last, e.g. "John Smith").`;
    case "awaiting_description":
      return `${greet}${head}What happened? 🛞\nA short description please — e.g. "hit a kerb last night", "slow puncture", "nail in the tyre". If you really don't know, reply *"not sure"*.`;
    case "awaiting_wheels": {
      return `${greet}${head}Which tyre(s)? 🛞\nReply with *front-left*, *front-right*, *rear-left*, *rear-right*, *both front*, *both rear*, or *all four*.`;
    }
    case "awaiting_photos": {
      const need = (ctx.job.affected_wheels ?? []).length;
      const have = (ctx.job.photo_urls ?? []).length;
      const required = Math.max(MIN_REQUIRED_PHOTOS, need);
      const remaining = Math.max(1, required - have);
      return `${greet}${head}Photos 📸 (${have}/${required} so far)\nPlease send ${remaining} more *clear tyre photo${remaining === 1 ? "" : "s"}* — we need at least ${required} images before we can match a technician. Image files only — no videos or PDFs.`;
    }
    default:
      return "";
  }
}

export type IntakeOutcome = {
  reply: string;
  job: any;
  conversation: any;
  justCompleted: boolean;
};

export async function processCustomerIntake(
  supabase: Supa,
  input: { from: string; body: string; mediaUrls: string[]; channel: "sms" | "whatsapp" },
): Promise<IntakeOutcome> {
  const { from, body, mediaUrls } = input;
  const customer = await loadCustomer(supabase, from);
  let conversation = await loadActiveConversation(supabase, from);
  let job: any = null;
  // "Returning" = we have any record of this phone before — name, plate or a
  // prior job. We don't gate on total_jobs because some prior conversations
  // never reached intake_complete but the customer is still a known number.
  const isReturning = !!customer && (
    (customer.total_jobs ?? 0) > 0 ||
    isValidPersonName(customer.full_name) ||
    !!customer.vehicle_reg ||
    !!customer.default_postcode
  );
  let isNew = false;

  if (!conversation) {
    isNew = true;
    // IMPORTANT — never reuse the customer's previous postcode. Each job must
    // have a fresh current location. We also do NOT seed customer_name from a
    // greeting like "hi" or "I need help" (the loose name regex matches those).
    // For returning customers we use the stored full_name; otherwise leave it
    // as "Customer" and ask in the awaiting_name step.
    const extractedPostcode = await resolvePostcode(body);
    const extractedWheels = extractWheels(body);
    const extractedDesc = hasIncidentContext(body) ? body.slice(0, 500) : null;
    const issueType = guessIssueType(body) ?? "unknown";

    const initial = {
      customer_phone: from,
      customer_name: isValidPersonName(customer?.full_name) ? customer!.full_name : "Customer",
      postcode: extractedPostcode ?? "",
      issue_type: issueType,
      issue_description: extractedDesc,
      photo_urls: mediaUrls,
      // Don't silently reuse customer.vehicle_reg — we ask via awaiting_plate_confirm.
      vehicle_reg: null,
      affected_wheels: extractedWheels,
      status: "intake_pending",
    };

    const { data: newJob, error: jobErr } = await supabase.from("jobs").insert(initial).select().single();
    if (jobErr) throw jobErr;
    job = newJob;

    const step = firstMissingStep(job, customer, null);
    const { data: newConv, error: convErr } = await supabase.from("conversations").insert({
      customer_phone: from,
      current_job_id: job.id,
      step,
      last_message_at: new Date().toISOString(),
      context: {},
    }).select().single();
    if (convErr) throw convErr;
    conversation = newConv;

    let greeting: string;
    if (isReturning && isValidPersonName(customer?.full_name)) {
      const firstName = customer!.full_name.trim().split(/\s+/)[0];
      greeting = `Welcome back ${firstName} 👋 New job — let's get you sorted. I'll need a fresh location for this one.`;
    } else if (isReturning) {
      greeting = "Welcome back 👋 New job — let's get you sorted. I'll need a fresh location for this one.";
    } else {
      greeting = "Tyre Fly here 👋 I'll get you sorted quickly.";
    }

    if (step === "complete") {
      await supabase.from("conversations").update({ step: "complete" }).eq("id", conversation.id);
      await supabase.from("jobs").update({ status: "intake_complete" }).eq("id", job.id);
      await bumpCustomer(supabase, from, job);
      return { reply: `${greeting}\n\nAll done ✅ Finding you a technician now — we'll message the moment one is matched.`, job, conversation: { ...conversation, step: "complete" }, justCompleted: true };
    }

    return { reply: prompt(step, { job, customer, greeting }), job, conversation, justCompleted: false };
  }

  job = await loadJob(supabase, conversation.current_job_id);
  if (!job) {
    await supabase.from("conversations").update({ step: "complete" }).eq("id", conversation.id);
    return processCustomerIntake(supabase, input);
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  const convContext: Record<string, any> = { ...(conversation.context ?? {}) };
  let contextChanged = false;
  let parsedSomething = false;

  // Special handling for the plate-confirmation step: don't fall through to the
  // generic reg-extraction (which would only capture a brand-new plate). We
  // need to accept short YES/NO style answers too.
  if (conversation.step === "awaiting_plate_confirm" && !job.vehicle_reg) {
    const reg = extractReg(body);
    const yes = /^\s*(y|yes|yeah|yep|same|use it|use that|confirm|ok(?:ay)?|keep|correct|sure)\b/i.test(body);
    const no = /^\s*(n|no|new|different|change|nope|nah)\b/i.test(body);
    if (reg) {
      updates.vehicle_reg = reg;
      convContext.plate_confirm_done = true; contextChanged = true;
      parsedSomething = true;
    } else if (yes && customer?.vehicle_reg) {
      updates.vehicle_reg = customer.vehicle_reg;
      convContext.plate_confirm_done = true; contextChanged = true;
      parsedSomething = true;
    } else if (no) {
      convContext.plate_confirm_done = true; contextChanged = true;
      parsedSomething = true;
    }
  } else {
    const reg = extractReg(body);
    if (reg && !job.vehicle_reg) { updates.vehicle_reg = reg; parsedSomething = true; }
  }

  const pc = await resolvePostcode(body);
  if (pc && !job.postcode) { updates.postcode = pc; parsedSomething = true; }

  if ((!job.customer_name || job.customer_name === "Customer")
      && conversation.step === "awaiting_name") {
    const nm = extractName(body);
    if (nm) { updates.customer_name = nm; parsedSomething = true; }
  }

  if (!hasIncidentContext(job.issue_description ?? "") && hasIncidentContext(body)) {
    updates.issue_description = body.slice(0, 500);
    const it = guessIssueType(body); if (it) updates.issue_type = it;
    parsedSomething = true;
  }

  const wheels = extractWheels(body);
  if (wheels.length > 0) {
    const explicit = /\b(just|only|actually|sorry|correction|i meant)\b/i.test(body) || /all\s*(four|4)\b/i.test(body);
    const merged = explicit ? wheels : Array.from(new Set([...(job.affected_wheels ?? []), ...wheels]));
    updates.affected_wheels = merged;
    parsedSomething = true;
  }

  if (mediaUrls.length > 0) {
    updates.photo_urls = [...(job.photo_urls ?? []), ...mediaUrls].slice(0, 12);
    parsedSomething = true;
  }

  if (Object.keys(updates).length > 1) {
    const { data: updated } = await supabase.from("jobs").update(updates).eq("id", job.id).select().single();
    if (updated) job = updated;
  }

  if (contextChanged) {
    await supabase.from("conversations").update({ context: convContext }).eq("id", conversation.id);
    conversation = { ...conversation, context: convContext };
  }

  const nextStep = firstMissingStep(job, customer, conversation);
  const justCompleted = nextStep === "complete" && conversation.step !== "complete";
  await supabase.from("conversations").update({
    step: nextStep,
    last_message_at: new Date().toISOString(),
  }).eq("id", conversation.id);
  conversation = { ...conversation, step: nextStep };

  if (justCompleted) {
    await supabase.from("jobs").update({ status: "intake_complete" }).eq("id", job.id);
    await bumpCustomer(supabase, from, job);
    return {
      reply: "All done ✅ Finding you a technician now — we'll message the moment one is matched.",
      job, conversation, justCompleted: true,
    };
  }

  if (!parsedSomething && (body.trim().length > 0 || mediaUrls.length > 0)) {
    const nudge = nudgeFor(conversation.step);
    return { reply: `${nudge}\n\n${prompt(nextStep, { job, customer })}`, job, conversation, justCompleted: false };
  }

  return { reply: prompt(nextStep, { job, customer }), job, conversation, justCompleted: false };
}

function nudgeFor(step: IntakeStep): string {
  switch (step) {
    case "awaiting_location": return "I couldn't read a postcode or location from that ❌";
    case "awaiting_plate": return "I couldn't read a number plate from that ❌";
    case "awaiting_plate_confirm": return "Please reply *YES* to reuse the plate on file, or send the new number plate ❌";
    case "awaiting_name": return "I need your full name as text (e.g. \"John Smith\") ❌";
    case "awaiting_description": return "I need a short description of what happened ❌";
    case "awaiting_wheels": return "I need to know which tyre positions are affected ❌";
    case "awaiting_photos": return "I need clear tyre photos (image files only — no videos or PDFs) ❌";
    default: return "";
  }
}

async function bumpCustomer(supabase: Supa, phone: string, job: any) {
  const existing = await loadCustomer(supabase, phone);
  const patch: Record<string, any> = {
    full_name: isValidPersonName(job.customer_name) ? job.customer_name : (isValidPersonName(existing?.full_name) ? existing!.full_name : null),
    default_postcode: job.postcode || existing?.default_postcode || null,
    vehicle_reg: job.vehicle_reg || existing?.vehicle_reg || null,
    last_seen_at: new Date().toISOString(),
    total_jobs: ((existing?.total_jobs ?? 0) as number) + 1,
  };
  await upsertCustomer(supabase, phone, patch);
}
