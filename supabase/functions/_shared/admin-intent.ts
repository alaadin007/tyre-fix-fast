// LLM-backed intent classifier for admin WhatsApp/SMS messages.
// Used as the LAST stop before the catchall menu in twilio-inbound, so
// fast-path regexes still take precedence for predictable performance.
//
// Returns a structured intent + extracted slots + detected language so the
// admin branch can dispatch to the right handler and reply in the admin's
// language for the catchall.

export type AdminIntent =
  | "SHOW_TECHNICIAN_LIST"
  | "BROADCAST_ALL"
  | "BROADCAST_ONE"
  | "FORWARD_QUOTE"
  | "ASSIGN"
  | "STATUS"
  | "LIST_ACTIVE"
  | "CANCEL"
  | "CONFIRM_CANCEL"
  | "UNKNOWN";

export type AdminLanguage = "en" | "ur" | "roman_ur";

export interface AdminClassification {
  intent: AdminIntent;
  job_reference: string | null;        // 6-8 hex chars, normalized lowercase
  technician_identifier: string | null; // name / TECH-id / +phone
  language: AdminLanguage;
  confidence: "high" | "low";
}

export const DEFAULT_ADMIN_SYSTEM_PROMPT = `You classify WhatsApp/SMS messages sent by an ADMIN of a UK roadside tyre service to their dispatch bot. The admin manages tyre-repair jobs and technicians. They may write in English, Urdu (script), or Roman Urdu (Urdu in Latin letters, e.g. "job cancel kar do").

Job references are 6-8 hexadecimal characters (0-9, a-f) and may be written as "9593CB", "#9593CB", "job 9593CB", "ref 9593CB", "reference 9593CB", "Reference Number 9593CB".

Possible intents:
- SHOW_TECHNICIAN_LIST: admin wants to see available technicians for a job. e.g. "show me technicians for #X", "who is available for X", "techs for X", "X ke liye technicians dikhao".
- BROADCAST_ALL: broadcast a job to ALL nearby technicians. e.g. "broadcast #X", "send out job X to all", "X sab ko bhej do".
- BROADCAST_ONE: send a job to ONE named technician only. e.g. "#X send to Hassan", "only send #X to TECH-0001", "X sirf Hassan ko bhejo".
- FORWARD_QUOTE: forward a technician quote to the customer. e.g. "send quote for X to customer", "forward the quote for X", "X ka quote customer ko bhej do".
- ASSIGN: confirm technician assignment after payment. e.g. "assign #X", "send details for X", "X ke details bhej do".
- STATUS: full status check for one job. e.g. "what is the status of X", "where is X right now", "X ki kya situation hai".
- LIST_ACTIVE: overview of all currently open jobs. e.g. "show all active jobs", "how many jobs are open right now", "kitne jobs open hain".
- CANCEL: cancel a job. e.g. "cancel job X", "close X", "X cancel kar do".
- CONFIRM_CANCEL: explicit cancel confirmation phrase. e.g. "CONFIRM CANCEL #X", "haan cancel kar do X".
- UNKNOWN: greeting, small talk, or anything that doesn't match.

Language values: "en" English, "ur" Urdu in Arabic script, "roman_ur" Urdu written with Latin letters.

Confidence "high" only if you are sure. Otherwise "low".

Return ONLY a JSON object with these exact keys: intent, job_reference (lowercase hex or null), technician_identifier (string or null — preserve original spelling, may be a name, "TECH-0001", or "+923..."), language, confidence. No prose.`;

export const ADMIN_INTENT_PROMPT_KEY = "admin_intent_system_prompt";

// 60s in-memory cache so we don't hit the DB on every inbound message.
let cachedPrompt: { value: string; expiresAt: number } | null = null;

async function loadAdminSystemPrompt(): Promise<string> {
  const now = Date.now();
  if (cachedPrompt && cachedPrompt.expiresAt > now) return cachedPrompt.value;

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  let value = DEFAULT_ADMIN_SYSTEM_PROMPT;
  if (url && key) {
    try {
      const r = await fetch(
        `${url}/rest/v1/app_settings?key=eq.${ADMIN_INTENT_PROMPT_KEY}&select=value`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } },
      );
      if (r.ok) {
        const rows = await r.json();
        const stored = rows?.[0]?.value?.prompt;
        if (typeof stored === "string" && stored.trim().length > 50) value = stored;
      }
    } catch (e) {
      console.warn("loadAdminSystemPrompt failed, using default", e);
    }
  }
  cachedPrompt = { value, expiresAt: now + 60_000 };
  return value;
}

export async function classifyAdminMessage(
  body: string,
  opts?: { lovableApiKey?: string; model?: string },
): Promise<AdminClassification | null> {
  const key = opts?.lovableApiKey ?? Deno.env.get("LOVABLE_API_KEY");
  if (!key) {
    console.warn("classifyAdminMessage: LOVABLE_API_KEY not set, skipping");
    return null;
  }
  const model = opts?.model ?? "google/gemini-3-flash-preview";
  const systemPrompt = await loadAdminSystemPrompt();

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 6000);

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: ctrl.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: body },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    });
    clearTimeout(timeout);

    if (!r.ok) {
      console.error("admin-intent classifier HTTP", r.status, await r.text().catch(() => ""));
      return null;
    }
    const j = await r.json();
    const raw = j?.choices?.[0]?.message?.content;
    if (!raw || typeof raw !== "string") return null;

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) return null;
      parsed = JSON.parse(m[0]);
    }

    let intent = String(parsed.intent ?? "UNKNOWN").toUpperCase() as AdminIntent;
    // Alias map — accept new intent names from custom admin system prompts
    // and route them to the existing handlers in twilio-inbound.
    const aliasMap: Record<string, AdminIntent> = {
      "FORWARD_QUOTE_ONE": "FORWARD_QUOTE",
      "FORWARD_QUOTE_MULTIPLE": "FORWARD_QUOTE",
      "FORWARD_QUOTE_UPDATED": "FORWARD_QUOTE",
      "SEND_QUOTE": "FORWARD_QUOTE",
      "SEND_QUOTES": "FORWARD_QUOTE",
      "SEND_UPDATED_QUOTES": "FORWARD_QUOTE",
      "UPDATE_TECHNICIAN_PRICE": "FORWARD_QUOTE",
      "UPDATE_PRICE": "FORWARD_QUOTE",
      "BROADCAST_MULTIPLE_SPECIFIC": "BROADCAST_ONE",
    };
    if (aliasMap[intent as string]) intent = aliasMap[intent as string];
    const validIntents: AdminIntent[] = [
      "SHOW_TECHNICIAN_LIST", "BROADCAST_ALL", "BROADCAST_ONE", "FORWARD_QUOTE",
      "ASSIGN", "STATUS", "LIST_ACTIVE", "CANCEL", "CONFIRM_CANCEL", "UNKNOWN",
    ];
    if (!validIntents.includes(intent)) {
      console.warn("admin-intent: unknown intent from LLM, falling back to UNKNOWN", intent);
      intent = "UNKNOWN";
    }

    const ref = parsed.job_reference;
    const refClean = typeof ref === "string" && /^[0-9a-f]{6,8}$/i.test(ref.trim())
      ? ref.trim().toLowerCase() : null;

    const techId = parsed.technician_identifier;
    const techClean = typeof techId === "string" && techId.trim()
      ? techId.trim() : null;

    let lang = String(parsed.language ?? "en").toLowerCase() as AdminLanguage;
    if (lang !== "en" && lang !== "ur" && lang !== "roman_ur") lang = "en";

    const conf = parsed.confidence === "high" ? "high" : "low";

    return {
      intent,
      job_reference: refClean,
      technician_identifier: techClean,
      language: lang,
      confidence: conf,
    };
  } catch (e) {
    console.error("classifyAdminMessage error", e);
    return null;
  }
}

// Localized version of the admin command-menu catchall.
export function adminMenuText(lang: AdminLanguage): string {
  if (lang === "ur") {
    return [
      "السلام علیکم! میں آپ کی ان کاموں میں مدد کر سکتا ہوں:",
      "• ٹیکنیشن کی لسٹ      → 'techs for #JOBREF'",
      "• سب کو بھیجیں        → 'broadcast #JOBREF'",
      "• ایک کو بھیجیں        → '#JOBREF send to [نام/ID]'",
      "• قیمت بھیجیں         → 'send quote #JOBREF to customer'",
      "• ٹیکنیشن assign کریں  → 'assign #JOBREF'",
      "• جاب کی صورتحال      → 'status #JOBREF'",
      "• تمام فعال جابز       → 'show active jobs'",
      "• جاب منسوخ کریں      → 'cancel #JOBREF'",
    ].join("\n");
  }
  if (lang === "roman_ur") {
    return [
      "Salam! Main in kaamon mein madad kar sakta hoon:",
      "• Technician list         → 'techs for #JOBREF'",
      "• Sab ko bhejein          → 'broadcast #JOBREF'",
      "• Sirf aik ko bhejein     → '#JOBREF send to [naam/ID]'",
      "• Quote bhejein           → 'send quote #JOBREF to customer'",
      "• Technician assign karein → 'assign #JOBREF'",
      "• Job ki status           → 'status #JOBREF'",
      "• Sab active jobs         → 'show active jobs'",
      "• Job cancel karein       → 'cancel #JOBREF'",
    ].join("\n");
  }
  return [
    "Hi! Here's what I can help you with:",
    "• Technician list   → 'techs for #JOBREF'",
    "• Broadcast to all  → 'broadcast #JOBREF'",
    "• Broadcast to one  → '#JOBREF send to [name/ID]'",
    "• Send quote        → 'send quote #JOBREF to customer'",
    "• Assign technician → 'assign #JOBREF'",
    "• Job status        → 'status #JOBREF'",
    "• All active jobs   → 'show active jobs'",
    "• Cancel job        → 'cancel #JOBREF'",
  ].join("\n");
}
