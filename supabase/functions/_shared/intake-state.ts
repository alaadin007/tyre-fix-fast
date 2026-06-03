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

// ───────────────────────── AI field classifier ─────────────────────────
//
// Customers rarely send fields in order. This calls the Lovable AI gateway
// to read the message in natural language and return whichever fields are
// present (full name, vehicle reg, tyre size, affected wheels, issue type,
// issue description). Regex still runs first and wins for high-confidence
// matches; the AI only fills gaps the regex missed.

type ChangeField =
  | "customer_name"
  | "vehicle_reg"
  | "tyre_size"
  | "affected_wheels"
  | "issue_type"
  | "issue_description"
  | "postcode";

type AiExtract = {
  customer_name?: string | null;
  vehicle_reg?: string | null;
  tyre_size?: string | null;
  affected_wheels?: string[] | null;
  issue_type?: string | null;
  issue_description?: string | null;
  change_request?: {
    field?: ChangeField | null;
    value?: string | null;
  } | null;
};

async function classifyWithAI(body: string): Promise<AiExtract> {
  const text = (body || "").trim();
  if (!text || text.length < 2) return {};
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return {};
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "You extract structured fields from a UK mobile-tyre customer's WhatsApp message. " +
              "Fields: customer_name (a person's real full name, NOT greetings/'help'/'hi'), " +
              "vehicle_reg (UK number plate, uppercase, spaces ok, e.g. 'GB22 XYZ' or 'GB1122'), " +
              "tyre_size (format '205/55 R16'), " +
              "affected_wheels (array, any of: front-left, front-right, rear-left, rear-right), " +
              "issue_type (one of: puncture, flat tyre, blowout, low pressure, not sure), " +
              "issue_description (verbatim short phrase about the problem). " +
              "Customers write naturally e.g. 'vehicle reg # GB2432', 'Registration is GB1122', " +
              "'my name is Ajmal Kazmi', 'both fronts flat', '205/55 R16'. " +
              "Only return fields you are confident about. Omit unknown fields. " +
              "Never invent a name from greetings, postcodes, or registration plates.\n\n" +
              "ALSO detect CHANGE/EDIT/UPDATE requests for previously submitted info. Examples: " +
              "'change vehicle registration to GB55654', 'update my name to John Smith', " +
              "'I want to change the tyre size', 'edit reg', 'wrong plate', 'actually it's GB99 XYZ'. " +
              "Populate change_request with target field. If they included the new value, also set value. " +
              "If they expressed intent only (no new value), set field but leave value null. " +
              "field options: customer_name, vehicle_reg, tyre_size, affected_wheels, issue_type, issue_description, postcode. " +
              "Respond ONLY with the tool call.",
          },
          { role: "user", content: text },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_extracted_fields",
            description: "Save fields parsed from the customer message.",
            parameters: {
              type: "object",
              properties: {
                customer_name: { type: "string" },
                vehicle_reg: { type: "string" },
                tyre_size: { type: "string" },
                affected_wheels: {
                  type: "array",
                  items: { type: "string", enum: ["front-left", "front-right", "rear-left", "rear-right"] },
                },
                issue_type: {
                  type: "string",
                  enum: ["puncture", "flat tyre", "blowout", "low pressure", "not sure"],
                },
                issue_description: { type: "string" },
                change_request: {
                  type: "object",
                  properties: {
                    field: {
                      type: "string",
                      enum: ["customer_name", "vehicle_reg", "tyre_size", "affected_wheels", "issue_type", "issue_description", "postcode"],
                    },
                    value: { type: "string" },
                  },
                  additionalProperties: false,
                },
              },
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_extracted_fields" } },
      }),
    });
    if (!r.ok) {
      console.error("ai classify failed", r.status, await r.text().catch(() => ""));
      return {};
    }
    const j = await r.json();
    const call = j?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments;
    if (!args) return {};
    const parsed = typeof args === "string" ? JSON.parse(args) : args;
    return parsed as AiExtract;
  } catch (e) {
    console.error("ai classify error", e);
    return {};
  }
}

const FIELD_LABELS: Record<ChangeField, string> = {
  customer_name: "full name",
  vehicle_reg: "vehicle registration number",
  tyre_size: "tyre size",
  affected_wheels: "affected tyre(s)",
  issue_type: "nature of the issue",
  issue_description: "issue description",
  postcode: "location postcode",
};

function coerceFieldValue(field: ChangeField, raw: string): any | null {
  const s = (raw || "").trim();
  if (!s) return null;
  switch (field) {
    case "customer_name": {
      const cleaned = s.replace(/\s+/g, " ").trim();
      return isValidPersonName(cleaned) ? cleaned : null;
    }
    case "vehicle_reg": {
      const reg = extractReg(s) ?? s.toUpperCase().replace(/\s+/g, " ").trim();
      return /^[A-Z0-9 ]{4,10}$/.test(reg) ? reg : null;
    }
    case "tyre_size": {
      const ts = extractTyreSize(s);
      return ts ?? null;
    }
    case "affected_wheels": {
      const w = extractWheels(s);
      return w.length > 0 ? w : null;
    }
    case "issue_type": {
      const it = guessIssueType(s);
      if (it) return it;
      const allowed = new Set(["puncture", "flat tyre", "blowout", "low pressure", "not sure"]);
      return allowed.has(s.toLowerCase()) ? s.toLowerCase() : null;
    }
    case "issue_description":
      return s.slice(0, 2000);
    case "postcode": {
      const pc = extractPostcode(s);
      return pc ?? null;
    }
  }
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
function welcomeMessage(
  customer: any | null,
  isReturning: boolean,
  known: { name: string | null; reg: string | null },
): string {
  let greeting: string;
  if (isReturning && isValidPersonName(customer?.full_name)) {
    const firstName = customer!.full_name.trim().split(/\s+/)[0];
    greeting = `Welcome back, ${firstName} 👋`;
  } else if (isReturning) {
    greeting = "Welcome back 👋";
  } else {
    greeting = "Welcome to TyreFly 🚗";
  }

  const yourDetails: string[] = ["*YOUR DETAILS*"];
  if (known.name) {
    yourDetails.push(`👤 Full name: ${known.name} ✅`);
  } else {
    yourDetails.push("👤 Full name:");
  }
  yourDetails.push("📍 Live location — tap the pin icon in WhatsApp");
  if (known.reg) {
    yourDetails.push(`🚘 Vehicle reg number: ${known.reg} ✅`);
  } else {
    yourDetails.push("🚘 Vehicle reg number — e.g. YC67 PGX");
  }

  const lines = [
    greeting,
    "",
    "Sorry to hear you've got a tyre problem — don't worry, we've got you covered! Just send us the details below and we'll have a technician with you as soon as possible.",
    "",
    ...yourDetails,
    "",
    "*TYRE DETAILS*",
    "⚙️ Affected tyre(s)?",
    "Front-left / front-right / rear-left / rear-right / both front / both rear / all four",
    "⚠️ Nature of issue: puncture / flat / blowout / low pressure / not sure",
    "📏 Tyre size — found on the tyre sidewall, e.g. 205/55 R16",
    "📸 At least 2 clear photos of the affected tyre(s) — JPEG/PNG only (no PDFs, videos, or documents)",
    "",
  ];
  if (known.name || known.reg) {
    lines.push("_We've prefilled the details we already have on file — let us know if anything has changed._", "");
  }
  lines.push("Once you've shared everything above, we'll show you a summary to confirm before submitting.");
  return lines.join("\n");
}

function summaryMessage(job: any): string {
  const wheels = Array.isArray(job?.affected_wheels) && job.affected_wheels.length > 0
    ? job.affected_wheels.join(", ") : "—";
  const photos = (job?.photo_urls ?? []).length;
  const greenBar = "🟩".repeat(10);
  return [
    "Here's everything we have for your job:",
    "",
    `✅ Full name: ${job.customer_name}`,
    `✅ Live pin location: shared${job.postcode ? ` (${job.postcode})` : ""}`,
    `✅ Vehicle reg: ${job.vehicle_reg}`,
    `✅ Affected tyre(s): ${wheels}`,
    `✅ Nature of issue: ${job.issue_type || "noted"}`,
    `✅ Tyre size: ${job.tyre_size}`,
    `✅ Tyre photo(s): ${photos} received`,
    "",
    "You are submitting the following information. If anything needs to be changed, please let us know (e.g. \"change reg to GB1122\"). Otherwise, please type *DONE* and we can proceed.",
    "",
    `Progress: ${greenBar} *100%* (7/7) ✅`,
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
    issue: !hasIncidentContext(job?.issue_description ?? "") && (!job?.issue_type || job?.issue_type === "unknown"),
    tyreSize: !job?.tyre_size,
    photos: !((job?.photo_urls ?? []).length >= 2),
  };
}

function isComplete(missing: Missing): boolean {
  return !missing.name && !missing.pin && !missing.reg && !missing.wheels
      && !missing.issue && !missing.tyreSize && !missing.photos;
}

function progressBar(received: number, total: number): string {
  const pct = total === 0 ? 0 : Math.round((received / total) * 100);
  const filled = Math.max(0, Math.min(10, Math.round((received / total) * 10)));
  const empty = 10 - filled;
  return `${"█".repeat(filled)}${"░".repeat(empty)} ${pct}%`;
}

function checklistMessage(job: any, missing: Missing, opts: { header?: string; footer?: string } = {}): string {
  const mark = (ok: boolean) => (ok ? "✅" : "⬜");
  const wheels = Array.isArray(job?.affected_wheels) && job.affected_wheels.length > 0
    ? job.affected_wheels.join(", ") : "—";
  const photoCount = (job?.photo_urls ?? []).length;
  const items: Array<[boolean, string, string]> = [
    [!missing.name,     "Full name",         !missing.name ? job.customer_name : "_missing_"],
    [!missing.pin,      "Live pin location", !missing.pin ? `shared${job.postcode ? ` (${job.postcode})` : ""}` : "_missing — tap the 📎 pin icon in WhatsApp_"],
    [!missing.reg,      "Vehicle reg",       !missing.reg ? job.vehicle_reg : "_missing_"],
    [!missing.wheels,   "Affected tyre(s)",  !missing.wheels ? wheels : "_missing — e.g. front-left / all four_"],
    [!missing.issue,    "Nature of issue",   !missing.issue ? (job.issue_type || "noted") : "_missing — e.g. puncture / flat / blowout_"],
    [!missing.tyreSize, "Tyre size",         !missing.tyreSize ? job.tyre_size : "_missing — e.g. 205/55 R16_"],
    [!missing.photos,   "Tyre photo(s)",     !missing.photos ? `${photoCount} received` : `_${photoCount > 0 ? `${photoCount} received — need at least 2 valid tyre photos (JPEG/PNG)` : "missing — send at least 2 clear tyre photos (JPEG/PNG)"}_`],
  ];
  const received = items.filter(([ok]) => ok).length;
  const total = items.length;
  const header = opts.header ?? "You've submitted the following information so far:";
  const footer = opts.footer
    ?? (received === total
        ? "All set ✅ — please type *DONE* to submit your job."
        : "Please send the missing item(s) above. You can write naturally — e.g. \"reg is GB1122\" or \"tyre size 205/55 R16\".");
  const lines = [
    header,
    "",
    ...items.map(([ok, label, val]) => `${mark(ok)} ${label}: ${val}`),
    "",
    footer,
    "",
    `Progress: ${progressBar(received, total)}  (${received}/${total})`,
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

// Detect a generic greeting / "I need help" message with no concrete tyre
// details. Used to gate the intake form behind an explicit "new job" intent.
const GREETING_ONLY_RE = /^\s*(?:hi+|hey+|hello+|hiya|yo|hola|salaam|salam|good\s+(?:morning|afternoon|evening|day))[\s!.,@:-]*(?:tyre\s*fly|tyrefly|team)?[\s!.,?-]*$/i;
const GENERIC_HELP_RE = /^\s*(?:hi+|hey+|hello+|hiya|yo|hola|salaam|salam|good\s+(?:morning|afternoon|evening|day))?[\s!.,@:-]*(?:tyre\s*fly|tyrefly|team)?[\s!.,@:-]*(?:i\s*(?:am|'m|m)?\s*)?(?:need(?:ing)?|want(?:ing)?|require|after|looking\s+for)\s*(?:some\s+|a\s+little\s+|any\s+)?(?:help|assistance|support|service)\b[\s!.,?]*$/i;
const NEW_JOB_CONFIRM_RE = /\b(new\s*job|new\s*tyre|start(?:\s+a)?\s+(?:new\s+)?(?:tyre\s+)?job|book(?:ing)?|create\s+(?:a\s+)?(?:new\s+)?job|yes(?:\s+please)?|yeah|yep|^y$|sure|ok(?:ay)?|please)\b/i;

function looksLikeGenericHelp(body: string, mediaUrls: string[]): boolean {
  if (mediaUrls.length > 0) return false;
  const t = (body || "").trim();
  if (!t) return false;
  if (GREETING_ONLY_RE.test(t)) return true;
  if (GENERIC_HELP_RE.test(t)) return true;
  // Short "I need tyre help" type phrases with no concrete details.
  if (t.length < 60
      && /\b(?:need|want|after|require|looking\s+for)\b.*\b(?:tyre|tire|wheel)\b.*\b(?:help|service|support|assistance)\b/i.test(t)
      && !hasIssueDetails(t)
      && !extractCoords(t)
      && !extractPostcode(t)
      && !extractReg(t)
      && !extractTyreSize(t)
      && extractWheels(t).length === 0) {
    return true;
  }
  return false;
}

function intentPromptMessage(customer: any | null, isReturning: boolean): string {
  const firstName = isReturning && isValidPersonName(customer?.full_name)
    ? customer!.full_name.trim().split(/\s+/)[0]
    : null;
  const greeting = firstName ? `Hi ${firstName} 👋` : (isReturning ? "Hi 👋" : "Hi there 👋");
  return [
    `${greeting} — thanks for messaging TyreFly.`,
    "",
    "Would you like to *create a new tyre job*, or do you need help with something else?",
    "",
    "• Reply *NEW JOB* to start a new tyre booking.",
    "• Otherwise, please tell us what you need help with and we'll take care of it.",
  ].join("\n");
}

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

  // ─── Intent gate ────────────────────────────────────────────────────────
  // If the customer's message is a generic greeting or "I need help" with no
  // concrete tyre details, first ask whether they want to start a new tyre
  // job, instead of dumping them into the intake form or replying with the
  // stale "keep sending remaining details" nudge.
  const ctxExisting: Record<string, any> = (conversation?.context ?? {}) as any;
  const awaitingIntent = ctxExisting.awaiting_intent_confirm === true;
  const intentConfirmed = ctxExisting.intent_confirmed === true;

  // (a) We previously asked the clarification — interpret their reply.
  if (conversation && awaitingIntent) {
    if (NEW_JOB_CONFIRM_RE.test(body || "")) {
      await supabase.from("conversations")
        .update({
          step: "complete",
          context: { ...ctxExisting, awaiting_intent_confirm: false, intent_confirmed: true },
        })
        .eq("id", conversation.id);
      conversation = null; // fall through to "new conversation" → welcome
    } else {
      await supabase.from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversation.id);
      return {
        reply: "Thanks — could you share a bit more detail about what you need help with? If you'd like to book a new tyre job, just reply *NEW JOB* and we'll get started.",
        job: null,
        conversation,
        justCompleted: false,
      };
    }
  }

  // (b) Fresh contact with a generic greeting/help message → ask intent first.
  if (!conversation && looksLikeGenericHelp(body, mediaUrls)) {
    const { data: newConv } = await supabase.from("conversations").insert({
      customer_phone: from,
      current_job_id: null,
      step: COLLECTING_STEP,
      last_message_at: new Date().toISOString(),
      context: { awaiting_intent_confirm: true },
    }).select().single();
    return {
      reply: intentPromptMessage(customer, isReturning),
      job: null,
      conversation: newConv,
      justCompleted: false,
    };
  }

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

    const context: Record<string, any> = { intent_confirmed: true };
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
      reply: welcomeMessage(customer, isReturning, {
        name: isValidPersonName(seededName) ? seededName : null,
        reg: seededReg,
      }),
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

  // (c) Mid-intake generic greeting/help with no real progress yet → re-ask
  //     the intent question instead of nudging "keep sending remaining details".
  if (!intentConfirmed && looksLikeGenericHelp(body, mediaUrls)) {
    const m = evaluateJob(job, conversation);
    const noProgress = m.name && m.pin && m.reg && m.wheels && m.issue && m.tyreSize && m.photos;
    if (noProgress) {
      await supabase.from("conversations").update({
        context: { ...ctxExisting, awaiting_intent_confirm: true },
        last_message_at: new Date().toISOString(),
      }).eq("id", conversation.id);
      return {
        reply: intentPromptMessage(customer, isReturning),
        job,
        conversation,
        justCompleted: false,
      };
    }
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  const convContext: Record<string, any> = { ...(conversation.context ?? {}) };
  let contextChanged = false;

  // ─── Awaiting a field-change value? Treat this message as the new value. ───
  const awaitingField: ChangeField | undefined = convContext.awaiting_field_change;
  if (awaitingField && !DONE_RE.test(body || "")) {
    const coerced = coerceFieldValue(awaitingField, body || "");
    if (coerced !== null) {
      updates[awaitingField] = coerced;
      delete convContext.awaiting_field_change;
      contextChanged = true;
      await supabase.from("jobs").update(updates).eq("id", job.id);
      const { data: refreshed } = await supabase.from("jobs").select("*").eq("id", job.id).maybeSingle();
      if (refreshed) job = refreshed;
      await supabase.from("conversations").update({
        context: convContext,
        last_message_at: new Date().toISOString(),
      }).eq("id", conversation.id);
      conversation = { ...conversation, context: convContext };
      const missing = evaluateJob(job, conversation);
      const headerLabel = FIELD_LABELS[awaitingField];
      if (isComplete(missing)) {
        return {
          reply: `Updated your ${headerLabel} ✅\n\n${summaryMessage(job)}`,
          job,
          conversation,
          justCompleted: false,
        };
      }
      return {
        reply: checklistMessage(job, missing, {
          header: `Updated your ${headerLabel} ✅\n\nHere's what we have so far:`,
        }),
        job,
        conversation,
        justCompleted: false,
      };
    }
    // Could not parse — re-ask for a clearer value.
    await supabase.from("conversations").update({
      last_message_at: new Date().toISOString(),
    }).eq("id", conversation.id);
    return {
      reply: `Sorry, I couldn't read that as a valid ${FIELD_LABELS[awaitingField]}. Please send it again.`,
      job,
      conversation,
      justCompleted: false,
    };
  }


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

  // ─── AI classifier: fill gaps the regex missed ───
  // Only run when there's textual content to interpret.
  const trimmed = (body || "").trim();
  const shouldAskAI = trimmed.length >= 2 && !DONE_RE.test(trimmed) && !extractCoords(trimmed);
  if (shouldAskAI) {
    const ai = await classifyWithAI(trimmed);
    if (ai.customer_name && updates.customer_name == null) {
      const nm = ai.customer_name.trim();
      const currentName = job.customer_name;
      if (isValidPersonName(nm) && (!currentName || currentName === "Customer" || !isValidPersonName(currentName))) {
        updates.customer_name = nm;
      }
    }
    if (ai.vehicle_reg && updates.vehicle_reg == null && !job.vehicle_reg) {
      const reg = ai.vehicle_reg.toUpperCase().trim().replace(/\s+/g, " ");
      if (/^[A-Z0-9 ]{4,10}$/.test(reg)) updates.vehicle_reg = reg;
    }
    if (ai.tyre_size && updates.tyre_size == null && !job.tyre_size) {
      const ts = String(ai.tyre_size).trim();
      if (TYRE_SIZE_RE.test(ts)) {
        const m = ts.match(TYRE_SIZE_RE)!;
        updates.tyre_size = `${m[1]}/${m[2]} R${m[3]}`;
      }
    }
    if (Array.isArray(ai.affected_wheels) && ai.affected_wheels.length > 0 && updates.affected_wheels == null) {
      const allowed = new Set(["front-left", "front-right", "rear-left", "rear-right"]);
      const cleaned = Array.from(new Set(ai.affected_wheels.filter((w) => allowed.has(w))));
      if (cleaned.length > 0) updates.affected_wheels = cleaned;
    }
    if (ai.issue_type && updates.issue_type == null && (!job.issue_type || job.issue_type === "unknown")) {
      const allowed = new Set(["puncture", "flat tyre", "blowout", "low pressure", "not sure"]);
      if (allowed.has(ai.issue_type)) updates.issue_type = ai.issue_type;
    }
    if (ai.issue_description && updates.issue_description == null && !hasIssueDetails(job.issue_description ?? "")) {
      updates.issue_description = [job.issue_description, ai.issue_description].filter(Boolean).join("\n").slice(0, 2000);
    }

    // ─── Change-request handling (overrides existing values) ───
    const cr = ai.change_request;
    if (cr && cr.field) {
      const field = cr.field as ChangeField;
      if (cr.value && String(cr.value).trim()) {
        const coerced = coerceFieldValue(field, String(cr.value));
        if (coerced !== null) {
          updates[field] = coerced;
          if (convContext.awaiting_field_change === field) {
            delete convContext.awaiting_field_change;
            contextChanged = true;
          }
          await supabase.from("jobs").update(updates).eq("id", job.id);
          const { data: refreshed } = await supabase.from("jobs").select("*").eq("id", job.id).maybeSingle();
          if (refreshed) job = refreshed;
          if (contextChanged) {
            await supabase.from("conversations").update({ context: convContext }).eq("id", conversation.id);
            conversation = { ...conversation, context: convContext };
          }
          await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversation.id);
          const missing = evaluateJob(job, conversation);
          const headerLabel = FIELD_LABELS[field];
          if (isComplete(missing)) {
            return {
              reply: `Updated your ${headerLabel} ✅\n\n${summaryMessage(job)}`,
              job, conversation, justCompleted: false,
            };
          }
          return {
            reply: checklistMessage(job, missing, {
              header: `Updated your ${headerLabel} ✅\n\nHere's what we have so far:`,
            }),
            job, conversation, justCompleted: false,
          };
        }
      } else {
        // Intent only — ask for the new value.
        convContext.awaiting_field_change = field;
        contextChanged = true;
        await supabase.from("conversations").update({
          context: convContext,
          last_message_at: new Date().toISOString(),
        }).eq("id", conversation.id);
        conversation = { ...conversation, context: convContext };
        return {
          reply: `Okay — what is the new ${FIELD_LABELS[field]}?`,
          job, conversation, justCompleted: false,
        };
      }
    }
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
      reply: checklistMessage(job, missing, {
        header: "Almost there — here's what we have so far:",
      }),
      job,
      conversation,
      justCompleted: false,
    };
  }

  // ─── Non-DONE message: send an updated progress checklist every time. ───
  const missing = evaluateJob(job, conversation);
  if (isComplete(missing)) {
    // Everything is in — show a confirmation summary before they type DONE.
    return {
      reply: summaryMessage(job),
      job,
      conversation,
      justCompleted: false,
    };
  }
  return {
    reply: checklistMessage(job, missing),
    job,
    conversation,
    justCompleted: false,
  };
}
