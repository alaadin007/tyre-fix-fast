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

    // Fetch job details for customer + vehicle context in the summary.
    const { data: jobFull } = await supabase
      .from("jobs")
      .select("customer_name, customer_phone, vehicle_reg")
      .eq("id", job_id)
      .maybeSingle();

    const techIds = Array.from(new Set((quotes ?? []).map((q) => q.technician_id).filter(Boolean))) as string[];

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
    lines.push(`📊 For Job Reference #${jobRef}, here are the quotes:`);
    lines.push(`👤 Customer: ${customerName}${customerPhone ? ` (${customerPhone})` : ""}`);
    lines.push(`🚘 Vehicle Reg: ${vehicleReg}`);
    lines.push("");

    if (!quotes || quotes.length === 0) {
      lines.push("No quotes were received within the 1.5-minute window.");
    } else {
      lines.push(`Received ${quotes.length} quote${quotes.length === 1 ? "" : "s"}:`);
      lines.push("");
      let i = 1;
      for (const q of quotes) {
        const t = q.technician_id ? techsById.get(q.technician_id) : null;
        const code = t?.tech_code ?? "—";
        const name = t?.name ?? "Unknown";
        const phone = t?.phone ? ` (${t.phone})` : "";
        const price = q.price_gbp != null ? `£${q.price_gbp}` : "—";
        const eta = q.eta_minutes != null ? `${q.eta_minutes} min` : "—";
        const loc = (t?.last_lat != null && t?.last_lng != null)
          ? `https://maps.google.com/?q=${t.last_lat},${t.last_lng}`
          : "no live pin";
        lines.push(`${i}. 🆔 ${code} · 👨‍🔧 ${name}${phone}`);
        lines.push(`   🔖 Job Ref: #${jobRef}`);
        lines.push(`   💷 Price: ${price}   ⏱️ ETA: ${eta}`);
        lines.push(`   📍 Live Location: ${loc}`);
        i++;
      }
      lines.push("");
      lines.push(`Reply YES #${jobRef} to forward your preferred quote to the customer.`);
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

    // 5) Mark summary as sent and log to ops_alerts for the dashboard.
    await supabase
      .from("jobs")
      .update({ quote_summary_sent_at: new Date().toISOString() })
      .eq("id", job_id);

    await supabase.from("ops_alerts").insert({
      level: "info",
      title: `Quote window closed — ${quotes?.length ?? 0} quote(s)`,
      body,
      job_id,
    });

    return new Response(JSON.stringify({ ok: true, quotes: quotes?.length ?? 0, notify: notifyRes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("finalize-broadcast error", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
