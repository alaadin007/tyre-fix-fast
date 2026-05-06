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
          `Look at the attached photo(s) of the tyre/wheel and:\n` +
          `1. Classify the damage (type, severity, confidence).\n` +
          `2. Identify tyre details where visible: size markings (e.g. 225/45R17 94Y), brand/manufacturer, ` +
          `tyre type (summer/winter/all-season/run-flat), tread condition (new/good/worn/illegal), ` +
          `and wheel type (alloy/steel). If something is not legible in the photo, return null for that field — do not guess.\n` +
          `Use the record_damage_assessment tool to return your answer.`,
      },
      ...photo_urls.slice(0, 3).map((url: string) => ({
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
    };

    const { error: updateError } = await supabase
      .from("jobs")
      .update({
        damage_type: parsed.damage_type,
        damage_summary: parsed.damage_summary,
        damage_confidence: parsed.damage_confidence,
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
