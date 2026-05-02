// Agent 1 — Intake Agent
// POST { customer_name, customer_phone, customer_email?, postcode, issue_type, issue_description?, photo_urls? }
// - Validates UK postcode against postcodes.io
// - Classifies the job using Lovable AI (structured output)
// - Detects duplicates (same phone + postcode in last 10 min)
// - Inserts into jobs with status='intake_complete' → trigger fires Dispatch Agent

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  customer_name: z.string().trim().min(1).max(200),
  customer_phone: z.string().trim().min(7).max(20),
  customer_email: z.string().email().optional().nullable(),
  postcode: z.string().trim().min(2).max(10),
  issue_type: z.string().trim().min(1).max(80).optional(),
  issue_description: z.string().trim().max(2000).optional().nullable(),
  photo_urls: z.array(z.string().url()).default([]),
  damage_summary: z.string().optional().nullable(),
  damage_confidence: z.string().optional().nullable(),
});

async function lookupPostcode(pc: string) {
  try {
    const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`);
    if (!r.ok) return null;
    const j = await r.json();
    return j?.result ?? null;
  } catch {
    return null;
  }
}

async function classify(text: string): Promise<{
  issue_type: string;
  severity: "repairable" | "replace" | "unsure";
}> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return { issue_type: "puncture", severity: "unsure" };
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: "You classify UK mobile-tyre customer requests. Pick the closest issue_type and a severity guess.",
        },
        { role: "user", content: text || "no description" },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "classify_request",
            description: "Classify the tyre issue",
            parameters: {
              type: "object",
              properties: {
                issue_type: {
                  type: "string",
                  enum: ["puncture", "blowout", "tyre_change", "mobile_fitting", "runflat", "other"],
                },
                severity: { type: "string", enum: ["repairable", "replace", "unsure"] },
              },
              required: ["issue_type", "severity"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "classify_request" } },
    }),
  });
  if (!r.ok) return { issue_type: "puncture", severity: "unsure" };
  const j = await r.json();
  try {
    const args = JSON.parse(j.choices[0].message.tool_calls[0].function.arguments);
    return { issue_type: args.issue_type, severity: args.severity };
  } catch {
    return { issue_type: "puncture", severity: "unsure" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const input = parsed.data;

    // Postcode validation + geocode
    const pcInfo = await lookupPostcode(input.postcode);
    if (!pcInfo) {
      return new Response(JSON.stringify({ error: "Invalid UK postcode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const normalizedPostcode: string = pcInfo.postcode;
    const lat: number = pcInfo.latitude;
    const lng: number = pcInfo.longitude;
    const region: string = pcInfo.region ?? pcInfo.admin_district ?? "UK";

    // Duplicate check (10 min window, same phone + outward code)
    const outward = normalizedPostcode.split(" ")[0];
    const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    const { data: dupes } = await supabase
      .from("jobs")
      .select("id")
      .eq("customer_phone", input.customer_phone)
      .ilike("postcode", `${outward}%`)
      .gte("created_at", tenMinAgo)
      .limit(1);
    if (dupes && dupes.length > 0) {
      await supabase.from("jobs").insert({
        customer_name: input.customer_name,
        customer_phone: input.customer_phone,
        customer_email: input.customer_email ?? null,
        postcode: normalizedPostcode,
        issue_type: input.issue_type ?? "puncture",
        issue_description: input.issue_description ?? null,
        photo_urls: input.photo_urls,
        lat, lng, region,
        is_duplicate: true,
        status: "duplicate",
      });
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Classify (use form-provided issue_type if any, else AI)
    const text = [input.issue_type, input.issue_description, input.damage_summary]
      .filter(Boolean)
      .join(" — ");
    const cls = input.issue_type
      ? { issue_type: input.issue_type, severity: "unsure" as const }
      : await classify(text);

    const { data: job, error: insErr } = await supabase
      .from("jobs")
      .insert({
        customer_name: input.customer_name,
        customer_phone: input.customer_phone,
        customer_email: input.customer_email ?? null,
        postcode: normalizedPostcode,
        issue_type: cls.issue_type,
        issue_description: input.issue_description ?? null,
        photo_urls: input.photo_urls,
        damage_summary: input.damage_summary ?? null,
        damage_confidence: input.damage_confidence ?? null,
        lat, lng, region,
        severity: cls.severity,
        status: "intake_complete", // → trigger fires dispatch-agent
      })
      .select()
      .single();

    if (insErr) {
      console.error("intake insert error", insErr);
      return new Response(JSON.stringify({ error: "Could not create job" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, job }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("intake-agent error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
