// Finalize a job broadcast: close the 1.5-minute quote window, expire any
// open allocations, then send a single consolidated WhatsApp summary of every
// quote received to the admin master numbers.
//
// Idempotent: if jobs.quote_summary_sent_at is already set we exit early.
// Invoked by broadcast-job ~90s after the broadcast goes out.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({ job_id: z.string().uuid() });

const QUOTE_WINDOW_MS = 90_000; // 1.5 minutes

function dedupeQuotesByTechnician(quotes: any[]): any[] {
  const latestByKey = new Map<string, any>();
  for (const quote of quotes ?? []) {
    const key = quote.technician_id ?? `unknown:${quote.created_at}:${quote.price_gbp ?? "na"}`;
    const existing = latestByKey.get(key);
    if (!existing) {
      latestByKey.set(key, quote);
      continue;
    }
    const existingMs = new Date(existing.created_at ?? 0).getTime();
    const quoteMs = new Date(quote.created_at ?? 0).getTime();
    if (quoteMs >= existingMs) latestByKey.set(key, quote);
  }
  return Array.from(latestByKey.values()).sort((a, b) => {
    const priceA = a.price_gbp == null ? Number.POSITIVE_INFINITY : Number(a.price_gbp);
    const priceB = b.price_gbp == null ? Number.POSITIVE_INFINITY : Number(b.price_gbp);
    if (priceA !== priceB) return priceA - priceB;
    return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
  });
}

function firstName(name: string | null | undefined): string {
  return (name ?? "Technician").trim().split(/\s+/).filter(Boolean)[0] ?? "Technician";
}

function buildActionSection(jobRef: string, quotes: any[], techsById: Map<string, any>): string[] {
  const techMeta = quotes.map((q) => {
    const tech = q.technician_id ? techsById.get(q.technician_id) : null;
    return {
      code: tech?.tech_code ?? "TECH-0001",
      fullName: tech?.name ?? "Technician",
      shortName: firstName(tech?.name),
    };
  });
  const first = techMeta[0] ?? { code: "TECH-0001", fullName: "Technician", shortName: "Hassan" };
  const second = techMeta[1] ?? null;
  const multiple = techMeta.length > 1;

  const lines: string[] = [];
  lines.push("━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("What would you like to do next?");
  lines.push("");

  const pushSection = (heading: string, bullets: string[]) => {
    lines.push(heading);
    bullets.forEach((b, i) => {
      if (i > 0) lines.push("");
      lines.push(b);
    });
    lines.push("");
  };

  pushSection("SEND QUOTE TO CUSTOMER:", [
    `· send quote for #${jobRef} to customer`,
    `· send ${first.shortName} quote for #${jobRef} to customer`,
  ]);

  const updateBullets = [
    `· By name:    update ${first.shortName} price for #${jobRef} to £45`,
    `· By tech ID: update ${first.code} price for #${jobRef} to £45`,
  ];
  if (multiple && second) {
    updateBullets.push(
      `· Multiple:   update ${first.shortName} to £45 and ${second.shortName} to £30 for #${jobRef}\n              update ${first.code} to £45 and ${second.code} to £30 for #${jobRef}`,
    );
  }
  pushSection("UPDATE PRICE FIRST:", updateBullets);

  pushSection("SEND UPDATED QUOTE AFTER PRICE CHANGE:", [
    `· send updated quote for #${jobRef} to customer`,
  ]);

  if (multiple) {
    const secondShort = second?.shortName ?? "Omar";
    pushSection("SEND SELECTED QUOTES ONLY:", [
      `· send ${first.shortName} and ${secondShort} quotes for #${jobRef} to customer`,
      `· send ${first.code} quote for #${jobRef} to customer`,
    ]);
    pushSection("SEND ALL QUOTES:", [
      `· send all quotes for #${jobRef} to customer`,
    ]);
  }

  lines.push("━━━━━━━━━━━━━━━━━━━━━━");
  return lines;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { job_id } = parsed.data;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1) Load job + latest broadcast round metadata.
    const { data: job, error: jErr } = await supabase
      .from("jobs")
      .select("id, customer_name, vehicle_reg, quote_summary_sent_at")
      .eq("id", job_id)
      .maybeSingle();
    if (jErr || !job) {
      return new Response(JSON.stringify({ error: "job not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: allocations } = await supabase
      .from("job_allocations")
      .select("technician_id, status, created_at, quote_window_expires_at")
      .eq("job_id", job_id)
      .order("created_at", { ascending: false });

    const latestWindowIso = (allocations ?? [])
      .map((a: any) => a.quote_window_expires_at)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

    const currentRoundAllocs = latestWindowIso
      ? (allocations ?? []).filter((a: any) => a.quote_window_expires_at === latestWindowIso)
      : (allocations ?? []).slice(0, 1);

    const currentRoundStartIso = currentRoundAllocs
      .map((a: any) => a.created_at)
      .filter(Boolean)
      .sort()
      .at(0) ?? null;

    const hasNewerRoundSinceSummary = !!(
      job.quote_summary_sent_at &&
      currentRoundStartIso &&
      new Date(currentRoundStartIso).getTime() > new Date(job.quote_summary_sent_at).getTime()
    );

    if (job.quote_summary_sent_at && !hasNewerRoundSinceSummary) {
      return new Response(JSON.stringify({ ok: true, skipped: "already sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const summaryLockAt = new Date().toISOString();
    let lockRows: any[] | null = null;
    if (currentRoundStartIso) {
      const { data, error } = await supabase
        .from("jobs")
        .update({ quote_summary_sent_at: summaryLockAt })
        .eq("id", job_id)
        .lt("quote_summary_sent_at", currentRoundStartIso)
        .select("id");
      if (error) throw error;
      lockRows = data;
    }
    if (!lockRows || lockRows.length === 0) {
      const { data, error } = await supabase
        .from("jobs")
        .update({ quote_summary_sent_at: summaryLockAt })
        .eq("id", job_id)
        .is("quote_summary_sent_at", null)
        .select("id");
      if (error) throw error;
      lockRows = data;
    }
    if (!lockRows || lockRows.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: "already sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Expire any allocation that's still open and past its window.
    const cutoffIso = new Date(Date.now() - QUOTE_WINDOW_MS).toISOString();
    await supabase
      .from("job_allocations")
      .update({ status: "expired" })
      .eq("job_id", job_id)
      .in("status", ["broadcast", "proposed"])
      .lte("created_at", cutoffIso);

    // 3) Collect quotes for the CURRENT broadcast round only.
    const currentRoundTechIds = Array.from(new Set(
      currentRoundAllocs.map((a: any) => a.technician_id).filter(Boolean),
    )) as string[];

    let quotesQuery = supabase
      .from("quotes")
      .select("technician_id, price_gbp, eta_minutes, status, created_at")
      .eq("job_id", job_id)
      .order("price_gbp", { ascending: true, nullsFirst: false });

    if (currentRoundTechIds.length > 0) {
      quotesQuery = quotesQuery.in("technician_id", currentRoundTechIds);
    }
    if (currentRoundStartIso) {
      quotesQuery = quotesQuery.gte("created_at", currentRoundStartIso);
    }

    const { data: quotes } = await quotesQuery;
    const uniqueQuotes = dedupeQuotesByTechnician(quotes ?? []);

    // Fetch job details for customer + vehicle context in the summary.
    const { data: jobFull } = await supabase
      .from("jobs")
      .select("customer_name, customer_phone, vehicle_reg")
      .eq("id", job_id)
      .maybeSingle();

    const techIds = Array.from(new Set(uniqueQuotes.map((q) => q.technician_id).filter(Boolean))) as string[];

    let techsById = new Map<string, any>();
    if (techIds.length > 0) {
      const { data: techs } = await supabase
        .from("technicians")
        .select("id, tech_code, name, phone, last_lat, last_lng")
        .in("id", techIds);
      techsById = new Map((techs ?? []).map((t: any) => [t.id, t]));
    }

    const jobRef = String(job.id).slice(0, 6).toUpperCase();
    const customerName =
      (jobFull?.customer_name && String(jobFull.customer_name).trim()) ||
      (job.customer_name && String(job.customer_name).trim()) ||
      "—";
    const customerPhone = (jobFull?.customer_phone && String(jobFull.customer_phone).trim()) || "";
    const vehicleReg =
      (jobFull?.vehicle_reg && String(jobFull.vehicle_reg).trim()) ||
      (job.vehicle_reg && String(job.vehicle_reg).trim()) ||
      "—";

    const lines: string[] = [];
    lines.push(`📋 Quotes Received — Job #${jobRef}`);
    lines.push("");
    lines.push(`👤 Customer: ${customerName}`);
    lines.push(`🚗 Vehicle Reg: ${vehicleReg}`);
    lines.push("");

    if (uniqueQuotes.length === 0) {
      lines.push("Received 0 quote(s):");
      lines.push("");
      lines.push("No quotes were received within the 1.5-minute window.");
    } else {
      lines.push(`Received ${uniqueQuotes.length} quote(s):`);
      lines.push("");
      for (const q of uniqueQuotes) {
        const t = q.technician_id ? techsById.get(q.technician_id) : null;
        const code = t?.tech_code ?? "—";
        const name = t?.name ?? "Unknown";
        const price = q.price_gbp != null ? `£${q.price_gbp}` : "—";
        const eta = q.eta_minutes != null ? `${q.eta_minutes} min` : "—";
        const loc = (t?.last_lat != null && t?.last_lng != null)
          ? `https://maps.google.com/?q=${t.last_lat},${t.last_lng}`
          : "no live pin";
        lines.push(`🆔 ${code} · ${name}`);
        lines.push(`💷 Price: ${price}`);
        lines.push(`⏱ ETA: ${eta}`);
        lines.push(`📍 Location: ${loc}`);
        lines.push("");
      }
      if (lines[lines.length - 1] === "") lines.pop();
      lines.push("");
      lines.push(...buildActionSection(jobRef, uniqueQuotes, techsById));
    }
    const body = lines.join("\n");

    // 4) Send to admin master numbers via notify-admins free-text branch.
    let notifyRes: any = null;
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/notify-admins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ body, channel: "whatsapp" }),
      });
      notifyRes = await r.json().catch(() => ({}));
      if (!r.ok) console.error("notify-admins failed", r.status, notifyRes);
    } catch (e) {
      console.error("notify-admins call failed", e);
    }

    // 5) Log to ops_alerts for the dashboard. The send lock above already
    // marks this broadcast round as summarized, preventing duplicate sends.
    await supabase.from("ops_alerts").insert({
      level: "info",
      title: `Quote window closed — ${uniqueQuotes.length} quote(s)`,
      body,
      job_id,
    });

    return new Response(JSON.stringify({ ok: true, quotes: uniqueQuotes.length, notify: notifyRes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("finalize-broadcast error", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
