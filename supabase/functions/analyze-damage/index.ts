// Analyze tyre damage from photos using Lovable AI vision
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DAMAGE_TYPES = [
  "puncture",
  "sidewall",
  "blowout",
  "wheel-damage",
  "worn-tread",
  "valve",
  "other",
] as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job_id, photo_urls, issue_description, issue_type } =
      await req.json();

    if (!job_id || !Array.isArray(photo_urls) || photo_urls.length === 0) {
      return new Response(
        JSON.stringify({ error: "job_id and photo_urls[] are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const userContent: Array<Record<string, unknown>> = [
      {
        type: "text",
        text:
          `A customer reported a tyre issue.\n` +
          `Issue type selected: ${issue_type ?? "unspecified"}\n` +
          `Customer description: ${issue_description ?? "(none)"}\n\n` +
          `Look at the attached photo(s) and extract everything useful. The photos may show different things — a damaged tyre, a wheel from a specific corner of the car, or the car's number plate. Multiple wheels may be affected.\n\n` +
          `1. Damage: classify type, write a 1–2 sentence summary, give a confidence level.\n` +
          `2. Tyre details (per visible sidewall): size (e.g. 225/45R17 94Y), brand, tyre type (summer/winter/all-season/run-flat/performance), tread condition (new/good/worn/illegal — UK legal limit 1.6mm), wheel material (alloy/steel).\n` +
          `3. Vehicle registration: if a UK number plate is visible in any photo, return it (uppercase, no spaces normalised, e.g. "AB12 CDE").\n` +
          `4. Affected wheels: which corner(s) of the car are damaged? Use any combination of "front-left", "front-right", "rear-left", "rear-right". Infer from photo angles, customer description, or visible context. If unclear, return an empty array.\n\n` +
          `Return null for anything not legible — do NOT guess. Use the record_damage_assessment tool.`,
      },
      ...photo_urls.slice(0, 6).map((url: string) => ({
        type: "image_url",
        image_url: { url },
      })),
    ];

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
                "You are an expert UK mobile tyre technician triaging customer photos. Be concise, specific, and honest about uncertainty.",
            },
            { role: "user", content: userContent },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "record_damage_assessment",
                description:
                  "Record the damage classification for this tyre/wheel.",
                parameters: {
                  type: "object",
                  properties: {
                    damage_type: {
                      type: "string",
                      enum: DAMAGE_TYPES,
                      description: "Best matching damage category.",
                    },
                    damage_summary: {
                      type: "string",
                      description:
                        "1–2 plain-English sentences a technician can read in an SMS. Mention what's visible and likely fix.",
                    },
                    damage_confidence: {
                      type: "string",
                      enum: ["low", "medium", "high"],
                      description:
                        "How confident you are based on the photo quality and clarity of the damage.",
                    },
                    tyre_size: {
                      type: ["string", "null"],
                      description:
                        "Tyre size marking if legible, e.g. '225/45R17 94Y'. Null if not visible.",
                    },
                    tyre_brand: {
                      type: ["string", "null"],
                      description:
                        "Brand/manufacturer if legible (e.g. Michelin, Continental, Pirelli). Null if unclear.",
                    },
                    tyre_type: {
                      type: ["string", "null"],
                      enum: ["summer", "winter", "all-season", "run-flat", "performance", null],
                      description:
                        "Best guess of tyre category from tread pattern and markings. Null if unclear.",
                    },
                    tread_condition: {
                      type: ["string", "null"],
                      enum: ["new", "good", "worn", "illegal", null],
                      description:
                        "Visual tread depth assessment. 'illegal' = below 1.6mm UK legal limit. Null if not visible.",
                    },
                    wheel_type: {
                      type: ["string", "null"],
                      enum: ["alloy", "steel", null],
                      description: "Wheel material if visible. Null if unclear.",
                    },
                    tyre_details: {
                      type: ["string", "null"],
                      description:
                        "Any other useful observations about the tyre/wheel (load index, speed rating, DOT date, locking nut, kerb damage on rim, etc.).",
                    },
                    vehicle_reg: {
                      type: ["string", "null"],
                      description:
                        "UK vehicle registration plate if visible in any photo, formatted like 'AB12 CDE'. Null if not visible.",
                    },
                    affected_wheels: {
                      type: "array",
                      items: {
                        type: "string",
                        enum: ["front-left", "front-right", "rear-left", "rear-right"],
                      },
                      description:
                        "Which corner(s) of the car are affected. Empty array if unclear.",
                    },
                  },
                  required: [
                    "damage_type",
                    "damage_summary",
                    "damage_confidence",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "record_damage_assessment" },
          },
        }),
      }
    );

    if (!aiResp.ok) {
      const text = await aiResp.text();
      console.error("AI gateway error", aiResp.status, text);
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, try again shortly." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted. Top up at Settings → Workspace → Usage.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await aiResp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call returned", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "No structured assessment returned" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments) as {
      damage_type: string;
      damage_summary: string;
      damage_confidence: string;
      tyre_size?: string | null;
      tyre_brand?: string | null;
      tyre_type?: string | null;
      tread_condition?: string | null;
      wheel_type?: string | null;
      tyre_details?: string | null;
      vehicle_reg?: string | null;
      affected_wheels?: string[];
    };

    // Merge affected_wheels with anything already on the job (multi-photo support)
    const { data: existing } = await supabase
      .from("jobs")
      .select("affected_wheels, vehicle_reg")
      .eq("id", job_id)
      .maybeSingle();
    const prevWheels: string[] = (existing?.affected_wheels as string[]) ?? [];
    const mergedWheels = Array.from(new Set([...prevWheels, ...(parsed.affected_wheels ?? [])]));

    const { error: updateError } = await supabase
      .from("jobs")
      .update({
        damage_type: parsed.damage_type,
        damage_summary: parsed.damage_summary,
        damage_confidence: parsed.damage_confidence,
        tyre_size: parsed.tyre_size ?? null,
        tyre_brand: parsed.tyre_brand ?? null,
        tyre_type: parsed.tyre_type ?? null,
        tread_condition: parsed.tread_condition ?? null,
        wheel_type: parsed.wheel_type ?? null,
        tyre_details: parsed.tyre_details ?? null,
        vehicle_reg: parsed.vehicle_reg ?? existing?.vehicle_reg ?? null,
        affected_wheels: mergedWheels,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job_id);

    if (updateError) {
      console.error("Update error", updateError);
      throw updateError;
    }

    return new Response(JSON.stringify({ success: true, ...parsed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-damage error", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
