// Ops Co-Pilot — tool-using agent over live data
// Streams responses; the model can call read+write tools and we re-prompt with results.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `You are the Ops Co-Pilot for FlatTyreNearMe.Com — a UK mobile-tyre rescue dispatcher.
You can read live data and take actions through tools. Speak crisply, use bullet points, surface risks.
The 5 background agents are: Intake → Dispatch → Parsing → Confirmation → Review. Each writes to the database; you observe and override.
Use tools to answer with REAL data, not guesses. When asked to broadcast, ALWAYS draft first and ask for confirmation before sending.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "query_jobs",
      description: "List recent jobs, optionally filtered.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "e.g. intake_complete, broadcasting, awaiting_approval, confirmed, closed, no_response" },
          postcode_prefix: { type: "string", description: "Outward code, e.g. W12" },
          limit: { type: "integer", default: 20 },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_technicians",
      description: "List technicians, optionally filtered.",
      parameters: {
        type: "object",
        properties: {
          active_only: { type: "boolean", default: true },
          postcode_prefix: { type: "string" },
          limit: { type: "integer", default: 50 },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pricing_history",
      description: "Recent quote prices, optionally filtered by area or issue type, to gauge fair pricing.",
      parameters: {
        type: "object",
        properties: {
          postcode_prefix: { type: "string" },
          issue_type: { type: "string" },
          days: { type: "integer", default: 30 },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "daily_summary",
      description: "Operations summary (counts of jobs by status, top techs, alerts) for a date range.",
      parameters: {
        type: "object",
        properties: { days: { type: "integer", default: 1 } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_broadcast_sms",
      description: "Compose a broadcast SMS to a tech audience and return a preview + confirm_token. Does NOT send.",
      parameters: {
        type: "object",
        properties: {
          audience: { type: "string", enum: ["all_active", "by_postcode_prefix"] },
          postcode_prefix: { type: "string" },
          message: { type: "string" },
        },
        required: ["audience", "message"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_broadcast_sms",
      description: "Send a previously drafted broadcast. Requires the confirm_token from draft_broadcast_sms.",
      parameters: {
        type: "object",
        properties: { confirm_token: { type: "string" } },
        required: ["confirm_token"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "force_dispatch",
      description: "Manually assign a job to a specific technician (overrides AI).",
      parameters: {
        type: "object",
        properties: { job_id: { type: "string" }, technician_id: { type: "string" } },
        required: ["job_id", "technician_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suspend_technician",
      description: "Set a technician inactive (cannot receive new jobs).",
      parameters: {
        type: "object",
        properties: { technician_id: { type: "string" }, reason: { type: "string" } },
        required: ["technician_id", "reason"],
        additionalProperties: false,
      },
    },
  },
];

// Lightweight in-memory broadcast draft cache, keyed by confirm_token (server-process scope)
const draftCache = new Map<string, { audience: string; postcode_prefix?: string; message: string; expires: number }>();
function newToken() {
  return crypto.randomUUID();
}

async function runTool(name: string, args: any, supabase: SupabaseClient): Promise<any> {
  try {
    switch (name) {
      case "query_jobs": {
        let q = supabase.from("jobs").select("id, customer_name, postcode, issue_type, status, dispatch_phase, created_at").order("created_at", { ascending: false }).limit(args.limit ?? 20);
        if (args.status) q = q.eq("status", args.status);
        if (args.postcode_prefix) q = q.ilike("postcode", `${args.postcode_prefix}%`);
        const { data, error } = await q;
        if (error) return { error: error.message };
        return { jobs: data };
      }
      case "query_technicians": {
        let q = supabase.from("technicians").select("id, name, phone, service_postcodes, rating, jobs_completed, active").limit(args.limit ?? 50);
        if (args.active_only !== false) q = q.eq("active", true);
        const { data, error } = await q;
        if (error) return { error: error.message };
        let rows = data ?? [];
        if (args.postcode_prefix) {
          const pp = String(args.postcode_prefix).toUpperCase();
          rows = rows.filter((t: any) => (t.service_postcodes ?? []).some((p: string) => p.toUpperCase().startsWith(pp) || pp.startsWith(p.toUpperCase())));
        }
        return { technicians: rows };
      }
      case "pricing_history": {
        const since = new Date(Date.now() - (args.days ?? 30) * 86400_000).toISOString();
        let q = supabase.from("quotes").select("price_gbp, eta_minutes, created_at, jobs!inner(postcode, issue_type)").gte("created_at", since).limit(200);
        const { data, error } = await q;
        if (error) return { error: error.message };
        let rows = (data ?? []) as any[];
        if (args.postcode_prefix) {
          const pp = String(args.postcode_prefix).toUpperCase();
          rows = rows.filter((r) => r.jobs?.postcode?.toUpperCase().startsWith(pp));
        }
        if (args.issue_type) rows = rows.filter((r) => r.jobs?.issue_type === args.issue_type);
        const prices = rows.map((r) => Number(r.price_gbp)).filter((n) => !isNaN(n));
        const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
        const median = prices.length ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] : null;
        return { count: prices.length, avg_gbp: avg ? Math.round(avg) : null, median_gbp: median, sample: rows.slice(0, 10) };
      }
      case "daily_summary": {
        const since = new Date(Date.now() - (args.days ?? 1) * 86400_000).toISOString();
        const { data: jobs } = await supabase.from("jobs").select("status").gte("created_at", since);
        const counts: Record<string, number> = {};
        for (const j of jobs ?? []) counts[j.status] = (counts[j.status] ?? 0) + 1;
        const { data: alerts } = await supabase.from("ops_alerts").select("level, title").gte("created_at", since);
        const { data: quotes } = await supabase.from("quotes").select("price_gbp").gte("created_at", since);
        const prices = (quotes ?? []).map((q) => Number(q.price_gbp)).filter((n) => !isNaN(n));
        const revenue = prices.reduce((a, b) => a + b, 0);
        return { since, jobs_by_status: counts, total_quotes: prices.length, avg_quote: prices.length ? Math.round(revenue / prices.length) : null, alerts: alerts ?? [] };
      }
      case "draft_broadcast_sms": {
        const token = newToken();
        // Resolve audience size for preview
        let q = supabase.from("technicians").select("id, name", { count: "exact" }).eq("active", true);
        const { count } = await q;
        let audienceCount = count ?? 0;
        if (args.audience === "by_postcode_prefix" && args.postcode_prefix) {
          const { data: techs } = await supabase.from("technicians").select("id, service_postcodes").eq("active", true);
          const pp = String(args.postcode_prefix).toUpperCase();
          audienceCount = (techs ?? []).filter((t: any) => (t.service_postcodes ?? []).some((p: string) => p.toUpperCase().startsWith(pp))).length;
        }
        draftCache.set(token, {
          audience: args.audience,
          postcode_prefix: args.postcode_prefix,
          message: args.message,
          expires: Date.now() + 10 * 60_000,
        });
        return { confirm_token: token, audience_count: audienceCount, preview: args.message };
      }
      case "send_broadcast_sms": {
        const draft = draftCache.get(args.confirm_token);
        if (!draft) return { error: "Token not found or expired. Re-draft." };
        if (Date.now() > draft.expires) { draftCache.delete(args.confirm_token); return { error: "Draft expired" }; }
        const { data: techs } = await supabase.from("technicians").select("id, phone, service_postcodes").eq("active", true);
        let recipients = (techs ?? []) as any[];
        if (draft.audience === "by_postcode_prefix" && draft.postcode_prefix) {
          const pp = draft.postcode_prefix.toUpperCase();
          recipients = recipients.filter((t) => (t.service_postcodes ?? []).some((p: string) => p.toUpperCase().startsWith(pp)));
        }
        const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-send`;
        let sent = 0;
        for (const r of recipients) {
          const ok = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
            body: JSON.stringify({ to: r.phone, body: draft.message, channel: "sms" }),
          }).then((r) => r.ok).catch(() => false);
          if (ok) sent++;
        }
        draftCache.delete(args.confirm_token);
        return { sent, attempted: recipients.length };
      }
      case "force_dispatch": {
        await supabase.from("job_allocations").insert({
          job_id: args.job_id,
          technician_id: args.technician_id,
          ai_reasoning: "Manual override by Co-Pilot",
          match_score: 100,
          status: "approved",
          approved_by: "ops_copilot",
          approved_at: new Date().toISOString(),
        });
        await supabase.from("jobs").update({ status: "broadcasting" }).eq("id", args.job_id);
        return { ok: true };
      }
      case "suspend_technician": {
        await supabase.from("technicians").update({ active: false, notes: `Suspended: ${args.reason}` }).eq("id", args.technician_id);
        await supabase.from("ops_alerts").insert({
          level: "warn",
          title: "Technician suspended (manual)",
          body: `Tech ${args.technician_id.slice(0, 6)} — ${args.reason}`,
        });
        return { ok: true };
      }
      default:
        return { error: `Unknown tool ${name}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "tool error" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const convo: any[] = [{ role: "system", content: SYSTEM }, ...messages];

    // Tool-calling loop (max 4 rounds to keep latency bounded)
    for (let round = 0; round < 4; round++) {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: convo,
          tools: TOOLS,
          tool_choice: "auto",
          stream: false,
        }),
      });
      if (!r.ok) {
        if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit hit, please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (r.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted — top up in Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const data = await r.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) break;
      convo.push(msg);

      const toolCalls = msg.tool_calls ?? [];
      if (toolCalls.length === 0) {
        // Final answer
        return new Response(
          JSON.stringify({ content: msg.content ?? "", trace: convo.filter((m) => m.role === "tool").map((m) => ({ name: m.name, content: m.content })) }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Run each tool
      for (const tc of toolCalls) {
        const args = (() => { try { return JSON.parse(tc.function.arguments || "{}"); } catch { return {}; } })();
        const result = await runTool(tc.function.name, args, supabase);
        convo.push({
          role: "tool",
          tool_call_id: tc.id,
          name: tc.function.name,
          content: JSON.stringify(result),
        });
      }
    }

    return new Response(JSON.stringify({ content: "I had to stop after 4 rounds of tool calls. Try a more focused question." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
