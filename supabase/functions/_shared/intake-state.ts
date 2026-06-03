// Customer intake — single-message flow.
//
// On first contact we send ONE welcome message listing every detail we need.
// The customer then sends those details (across one or more messages) and
// types "DONE" when finished. We parse every inbound message and accumulate
// fields onto the job. On "DONE" we either:
//   • acknowledge completion + return a job reference, OR
//   • reply with a ✅/❌ checklist of what is still missing.
//
// Required fields:
//   1. Full name
//   2. Live pin location (lat/lng from a shared WhatsApp pin)
//   3. Vehicle registration
//   4. Affected tyre(s)
//   5. Nature of issue
//   6. Tyre size
//   7. At least one tyre photo
//
// The conversation uses a single active step ("awaiting_description") as the
// collecting state, and "complete" when the job is submitted.

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

const COLLECTING_STEP: IntakeStep = "awaiting_description";

// ───────────────────────── parsing helpers ─────────────────────────

const POSTCODE_RE = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i;
const COORD_RE = /\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)/;
const PLATE_HINT_RE = /\b(?:reg(?:istration)?|plate|number\s*plate|licen[cs]e\s*plate|tag)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\s\-]{2,12}[A-Z0-9])\b/i;
const PLATE_LOOSE_RE = /\b([A-Z]{2}\d{2}[\s\-]?[A-Z]{3})\b/g; // UK style e.g. YC67 PGX
const TYRE_SIZE_RE = /\b(\d{3})\s*\/\s*(\d{2,3})\s*[rR]\s*(\d{2})\b/;
const DONE_RE = /^\s*done\b[\s.!?]*$/i;

export function extractPostcode(t: string): string | null {
  const m = (t || "").match(POSTCODE_RE);
  return m ? `${m[1].toUpperCase()} ${m[2].toUpperCase()}` : null;
}

export function extractCoords(t: string): { lat: number; lng: number } | null {
  const m = (t || "").match(COORD_RE);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function extractReg(t: string): string | null {
  if (!t) return null;
  const upper = t.toUpperCase();
  const hinted = t.match(PLATE_HINT_RE);
  if (hinted) {
    const cand = hinted[1].toUpperCase().trim().replace(/\s+/g, " ");
    if (!POSTCODE_RE.test(cand)) return cand;
  }
  const matches = upper.matchAll(PLATE_LOOSE_RE);
  for (const m of matches) {
    const raw = m[1].replace(/\s+/g, "");
    if (POSTCODE_RE.test(raw)) continue;
    return m[1].trim();
  }
  return null;
}

export function extractTyreSize(t: string): string | null {
  const m = (t || "").match(TYRE_SIZE_RE);
  if (!m) return null;
  return `${m[1]}/${m[2]} R${m[3]}`;
}

export function extractWheels(t: string): string[] {
  const s = (t || "").toLowerCase();
  const out = new Set<string>();
  const has = (re: RegExp) => re.test(s);
  if (has(/\ball\s*(four|4)\b/)) {
    return ["front-left", "front-right", "rear-left", "rear-right"];
  }
  if (has(/\b(?:both|two|2)\s+front\b|\bfront\s+(?:both|two|2)\b/)) {
    out.add("front-left"); out.add("front-right");
  }
  if (has(/\b(?:both|two|2)\s+(?:rear|back)\b|\b(?:rear|back)\s+(?:both|two|2)\b/)) {
    out.add("rear-left"); out.add("rear-right");
  }
  if (has(/front[-\s]?left|\bfl\b|nearside front/)) out.add("front-left");
  if (has(/front[-\s]?right|\bfr\b|offside front/)) out.add("front-right");
  if (has(/(rear|back)[-\s]?left|\brl\b|nearside rear/)) out.add("rear-left");
  if (has(/(rear|back)[-\s]?right|\brr\b|offside rear/)) out.add("rear-right");
  return Array.from(out);
}

const NAME_BLOCKLIST = new Set([
  "hey","hi","hello","hiya","yo","sup","help","urgent","please","pls","thanks","thank you",
  "ok","okay","yes","no","yeah","yep","nope","sure","mate","sir","madam","customer","done",
  "hii","hiii","heyy","heyyy","hola","hai","good","morning","evening","afternoon","night",
  "tyre","tire","tyres","tires","wheel","flat","puncture","car","emergency","name","full",
]);

export function isValidPersonName(s: string | null | undefined): boolean {
  if (!s) return false;
  const cleaned = s.trim();
  if (cleaned.length < 2) return false;
  if (cleaned.toLowerCase() === "customer") return false;
  const lower = cleaned.toLowerCase();
  if (NAME_BLOCKLIST.has(lower)) return false;
  if (!/^[A-Za-z][A-Za-z .'-]{1,38}$/.test(cleaned)) return false;
  const words = cleaned.toLowerCase().split(/\s+/);
  if (words.some((w) => NAME_BLOCKLIST.has(w))) return false;
  if (words.length === 1 && words[0].length < 3) return false;
  if (words.length > 4) return false;
  return true;
}

export function extractName(t: string): string | null {
  if (!t) return null;
  const explicit = t.match(/(?:my name is|i am|i'm|im|this is|name[:\-])\s+([A-Za-z][A-Za-z .'-]{1,38})/i);
  if (explicit) {
    const cand = explicit[1].trim().replace(/\s+/g, " ");
    return isValidPersonName(cand) ? cand : null;
  }
  // Look for a "Name: X" style line
  const lines = t.split(/\n+/);
  for (const line of lines) {
    const m = line.match(/^\s*(?:full\s*name|name)\s*[:\-]\s*([A-Za-z][A-Za-z .'-]{1,38})\s*$/i);
    if (m && isValidPersonName(m[1])) return m[1].trim().replace(/\s+/g, " ");
  }
  // Bare short message that looks like a name
  const s = t.trim();
  if (/^[A-Za-z][A-Za-z .'-]{1,38}$/.test(s) && s.split(/\s+/).length <= 4) {
    return isValidPersonName(s) ? s : null;
  }
  return null;
}

const INCIDENT_RE = /(nail|screw|slow\s+puncture|flat|puncture|blow[- ]?out|blew|burst|bust(?:ed)?|popp(?:ed|ing)|shred|ripped|gash|leak|leaking|losing\s+air|going\s+down|psi|valve|damage|damaged|broken|snapp(?:ed|ing)|tear|tore|torn|cut|slash|deflat|low\s+pressure|pressure|bulge|split|crack|cracked|sidewall|kerb|curb|pothole|hit|stuck|stranded|hiss(?:ing)?|vibrat|wobbl|soft|spongy|tpms|not\s+sure|don'?t\s+know|unsure)/i;

export function hasIssueDetails(t: string): boolean {
  return INCIDENT_RE.test(t || "");
}
export function hasTyreServiceIntent(t: string): boolean {
  if (hasIssueDetails(t)) return true;
  return /\b(tyre|tire|wheel|puncture|blowout|flat)s?\b.*\b(help|service|technician|come|send|need|book|fix|repair|replace|change|stuck|stranded)\b/i.test(t || "");
}
export function hasIncidentContext(t: string): boolean { return hasIssueDetails(t); }

export function guessIssueType(t: string): string | null {
  const s = (t || "").toLowerCase();
  if (/blow.?out|burst|busted|shred|exploded/.test(s)) return "blowout";
  if (/low\s+pressure|psi/.test(s)) return "low pressure";
  if (/flat|deflat/.test(s)) return "flat tyre";
  if (/punct|nail|screw/.test(s)) return "puncture";
  if (/not\s+sure|unsure|don'?t\s+know/.test(s)) return "not sure";
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

type Supa = ReturnType<typeof createClient>;

async function loadCustomer(supabase: Supa, phone: string) {
  const { data } = await supabase.from("customers").select("*").eq("phone", phone).maybeSingle();
  return data as any | null;
}

async function loadRecentJobMemory(supabase: Supa, phone: string) {
  const { data } = await supabase
    .from("jobs")
    .select("*")
    .eq("customer_phone", phone)
    .order("created_at", { ascending: false })
    .limit(10);
  const jobs = Array.isArray(data) ? data : [];
  if (jobs.length === 0) return null;
  const fallbackName = jobs.find((job: any) => isValidPersonName(job?.customer_name))?.customer_name ?? null;
  const fallbackReg = jobs.find((job: any) => job?.vehicle_reg)?.vehicle_reg ?? null;
  return { full_name: fallbackName, vehicle_reg: fallbackReg, total_jobs: jobs.length };
}

function mergeCustomerMemory(customer: any | null, recent: any | null) {
  const fallbackName = isValidPersonName(recent?.full_name) ? recent.full_name : null;
  return {
    ...(customer ?? {}),
    full_name: isValidPersonName(customer?.full_name) ? customer.full_name : fallbackName,
    vehicle_reg: customer?.vehicle_reg ?? recent?.vehicle_reg ?? null,
    total_jobs: Math.max(Number(customer?.total_jobs ?? 0), Number(recent?.total_jobs ?? 0)),
  };
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
  const clean = Object.fromEntries(
    Object.entries(patch).filter(([_, v]) => v !== null && v !== undefined && v !== "")
  );
  if (existing) {
    await supabase.from("customers").update({ last_seen_at: new Date().toISOString(), ...clean }).eq("phone", phone);
  } else {
    await supabase.from("customers").insert({ phone, last_seen_at: new Date().toISOString(), total_jobs: 0, ...clean });
  }
}

// Build the welcome / questions message.
function welcomeMessage(customer: any | null, isReturning: boolean): string {
  let greeting: string;
  if (isReturning && isValidPersonName(customer?.full_name)) {
    const firstName = customer!.full_name.trim().split(/\s+/)[0];
    greeting = `Welcome back, ${firstName} 👋`;
  } else if (isReturning) {
    greeting = "Welcome back 👋";
  } else {
    greeting = "Welcome to TyreFly 🚗";
  }
  return [
    greeting,
    "",
    "Sorry to hear you've got a tyre problem — don't worry, we've got you covered! Just send us the details below and we'll have a technician with you as soon as possible.",
    "",
    "*YOUR DETAILS*",
    "👤 Full name:",
    "📍 Live location — tap the pin icon in WhatsApp",
    "🚘 Vehicle reg number — e.g. YC67 PGX",
    "",
    "*TYRE DETAILS*",
    "⚙️ Affected tyre(s)?",
    "Front-left / front-right / rear-left / rear-right / both front / both rear / all four",
    "⚠️ Nature of issue: puncture / flat / blowout / low pressure / not sure",
    "📏 Tyre size — found on the tyre sidewall, e.g. 205/55 R16",
    "📸 1–2 photos of the tyre",
    "",
    "Please type *DONE* once you have provided all the information above.",
  ].join("\n");
}

type Missing = {
  name: boolean;
  pin: boolean;
  reg: boolean;
  wheels: boolean;
  issue: boolean;
  tyreSize: boolean;
  photos: boolean;
};

function evaluateJob(job: any, conversation: any | null): Missing {
  return {
    name: !(job?.customer_name && job.customer_name !== "Customer" && isValidPersonName(job.customer_name)),
    pin: !(conversation?.context?.location_pin_confirmed && job?.lat != null && job?.lng != null),
    reg: !job?.vehicle_reg,
    wheels: !(Array.isArray(job?.affected_wheels) && job.affected_wheels.length > 0),
    issue: !hasIncidentContext(job?.issue_description ?? "") && !job?.issue_type || job?.issue_type === "unknown",
    tyreSize: !job?.tyre_size,
    photos: !((job?.photo_urls ?? []).length >= 1),
  };
}

function isComplete(missing: Missing): boolean {
  return !missing.name && !missing.pin && !missing.reg && !missing.wheels
      && !missing.issue && !missing.tyreSize && !missing.photos;
}

function checklistMessage(job: any, missing: Missing): string {
  const mark = (ok: boolean) => (ok ? "✅" : "❌");
  const wheels = Array.isArray(job?.affected_wheels) && job.affected_wheels.length > 0
    ? job.affected_wheels.join(", ") : "—";
  const lines = [
    "Thanks! Here's what I've got so far:",
    "",
    `${mark(!missing.name)} 👤 Full name: ${!missing.name ? job.customer_name : "_missing_"}`,
    `${mark(!missing.pin)} 📍 Live pin location: ${!missing.pin ? "shared" : "_missing — please tap the pin icon in WhatsApp_"}`,
    `${mark(!missing.reg)} 🚘 Vehicle reg: ${!missing.reg ? job.vehicle_reg : "_missing_"}`,
    `${mark(!missing.wheels)} ⚙️ Affected tyre(s): ${!missing.wheels ? wheels : "_missing_"}`,
    `${mark(!missing.issue)} ⚠️ Nature of issue: ${!missing.issue ? (job.issue_type || "noted") : "_missing_"}`,
    `${mark(!missing.tyreSize)} 📏 Tyre size: ${!missing.tyreSize ? job.tyre_size : "_missing — e.g. 205/55 R16_"}`,
    `${mark(!missing.photos)} 📸 Tyre photo: ${!missing.photos ? `${(job.photo_urls ?? []).length} received` : "_missing — please send 1–2 photos_"}`,
    "",
    "Please send the missing item(s) above, then type *DONE* again.",
  ];
  return lines.join("\n");
}

function completionMessage(job: any): string {
  const ref = String(job.id).slice(0, 6).toUpperCase();
  return [
    "We have all of the information ✅",
    "",
    "We'll find you a nearby technician and send you a price and estimated arrival time — usually within minutes. Thank you!",
    "",
    `Your job reference: *#${ref}*`,
  ].join("\n");
}

async function bumpCustomer(supabase: Supa, phone: string, job: any) {
  const existing = await loadCustomer(supabase, phone);
  await upsertCustomer(supabase, phone, {
    full_name: isValidPersonName(job.customer_name) ? job.customer_name : existing?.full_name ?? null,
    default_postcode: job.postcode || existing?.default_postcode || null,
    vehicle_reg: job.vehicle_reg || existing?.vehicle_reg || null,
    total_jobs: ((existing?.total_jobs ?? 0) as number) + 1,
  });
}

// Back-compat exports (unused by current callers, but kept to avoid breakage).
export function buildStepPlan(): IntakeStep[] { return [COLLECTING_STEP]; }

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
  const storedCustomer = await loadCustomer(supabase, from);
  const recentJobMemory = await loadRecentJobMemory(supabase, from);
  const hasPriorJobHistory = Number(recentJobMemory?.total_jobs ?? 0) > 0;
  const customer = hasPriorJobHistory ? mergeCustomerMemory(storedCustomer, recentJobMemory) : null;
  const isReturning = hasPriorJobHistory;

  let conversation = await loadActiveConversation(supabase, from);
  let job: any = null;

  // ─── New conversation: create job, send the welcome + all-questions message ───
  if (!conversation) {
    const coords = extractCoords(body);
    const postcode = extractPostcode(body)
      ?? (coords ? await reverseGeocodePostcode(coords.lat, coords.lng) : null);

    const seededName = isValidPersonName(customer?.full_name) ? customer!.full_name : "Customer";
    const seededReg = customer?.vehicle_reg ?? null;

    const initial: Record<string, any> = {
      customer_phone: from,
      customer_name: seededName,
      postcode: postcode ?? "",
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      issue_type: "unknown",
      issue_description: null,
      photo_urls: mediaUrls,
      vehicle_reg: seededReg,
      affected_wheels: [],
      status: "intake_pending",
    };

    const { data: newJob, error: jobErr } = await supabase.from("jobs").insert(initial).select().single();
    if (jobErr) throw jobErr;
    job = newJob;

    const context: Record<string, any> = {};
    if (coords) context.location_pin_confirmed = true;

    const { data: newConv, error: convErr } = await supabase.from("conversations").insert({
      customer_phone: from,
      current_job_id: job.id,
      step: COLLECTING_STEP,
      last_message_at: new Date().toISOString(),
      context,
    }).select().single();
    if (convErr) throw convErr;
    conversation = newConv;

    return {
      reply: welcomeMessage(customer, isReturning),
      job,
      conversation,
      justCompleted: false,
    };
  }

  // ─── Existing conversation: parse anything and accumulate onto the job ───
  job = await loadJob(supabase, conversation.current_job_id);
  if (!job) {
    await supabase.from("conversations").update({ step: "complete" }).eq("id", conversation.id);
    return processCustomerIntake(supabase, input);
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  const convContext: Record<string, any> = { ...(conversation.context ?? {}) };
  let contextChanged = false;

  // Location pin
  const coords = extractCoords(body);
  if (coords) {
    updates.lat = coords.lat;
    updates.lng = coords.lng;
    convContext.location_pin_confirmed = true;
    contextChanged = true;
    if (!job.postcode) {
      const pc = extractPostcode(body) ?? await reverseGeocodePostcode(coords.lat, coords.lng);
      if (pc) updates.postcode = pc;
    }
  } else {
    const pc = extractPostcode(body);
    if (pc && !job.postcode) updates.postcode = pc;
  }

  // Plate
  if (!job.vehicle_reg) {
    const reg = extractReg(body);
    if (reg) updates.vehicle_reg = reg;
  }

  // Name
  if (!job.customer_name || job.customer_name === "Customer" || !isValidPersonName(job.customer_name)) {
    const nm = extractName(body);
    if (nm) updates.customer_name = nm;
  }

  // Issue description / type
  if (hasIssueDetails(body)) {
    updates.issue_description = [job.issue_description, body].filter(Boolean).join("\n").slice(0, 2000);
    const it = guessIssueType(body);
    if (it) updates.issue_type = it;
  }

  // Wheels
  const wheels = extractWheels(body);
  if (wheels.length > 0) {
    updates.affected_wheels = wheels;
  }

  // Tyre size
  if (!job.tyre_size) {
    const ts = extractTyreSize(body);
    if (ts) updates.tyre_size = ts;
  }

  // Photos
  if (mediaUrls.length > 0) {
    updates.photo_urls = [...(job.photo_urls ?? []), ...mediaUrls].slice(0, 4);
  }

  if (Object.keys(updates).length > 1) {
    const { data: updated } = await supabase.from("jobs").update(updates).eq("id", job.id).select().single();
    if (updated) job = updated;
  }
  if (contextChanged) {
    await supabase.from("conversations").update({ context: convContext }).eq("id", conversation.id);
    conversation = { ...conversation, context: convContext };
  }
  await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversation.id);

  // ─── Handle DONE ───
  if (DONE_RE.test(body || "")) {
    const missing = evaluateJob(job, conversation);
    if (isComplete(missing)) {
      await supabase.from("jobs").update({ status: "intake_complete" }).eq("id", job.id);
      await supabase.from("conversations").update({ step: "complete" }).eq("id", conversation.id);
      await bumpCustomer(supabase, from, job);
      return {
        reply: completionMessage(job),
        job,
        conversation: { ...conversation, step: "complete" },
        justCompleted: true,
      };
    }
    return {
      reply: checklistMessage(job, missing),
      job,
      conversation,
      justCompleted: false,
    };
  }

  // ─── Non-DONE message: just acknowledge silently with a short nudge if we
  //     parsed nothing, otherwise stay quiet (avoid spamming customer) by
  //     sending a brief progress note. ───
  const missing = evaluateJob(job, conversation);
  if (isComplete(missing)) {
    // Everything is in already — gently remind them to send DONE.
    return {
      reply: "Looks like you've shared everything 👌 — please type *DONE* to submit your job.",
      job,
      conversation,
      justCompleted: false,
    };
  }
  // Brief acknowledgement so customer knows we received the message.
  return {
    reply: "Got it — keep sending the remaining details, then type *DONE* when finished.",
    job,
    conversation,
    justCompleted: false,
  };
}
