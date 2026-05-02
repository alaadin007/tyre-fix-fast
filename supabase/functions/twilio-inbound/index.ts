// Twilio inbound webhook — routes to the right Agent
// 1. From a known technician → Parsing Agent (extract price + ETA → quotes)
// 2. From a known customer with a numeric reply → Review Agent (rating)
// 3. From a known customer with "yes"/"accept" → quote acceptance
// 4. Anything else → log only (Co-Pilot can review)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TWIML_OK = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

function normPhone(p: string): string {
  return (p || "").replace(/^whatsapp:/, "").replace(/[^\d+]/g, "");
}

async function aiExtractQuote(text: string): Promise<{
  price_gbp: number | null;
  eta_minutes: number | null;
  accepts: boolean;
  notes: string;
  confidence: "high" | "medium" | "low";
}> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return { price_gbp: null, eta_minutes: null, accepts: false, notes: "no api key", confidence: "low" };
  }
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            "You parse mobile-tyre technician SMS bids. Extract price in GBP and ETA in minutes from messy human text. Examples: 'ill do it for 70 mate, 20 mins away' → price 70, eta 20, accepts true. 'sorry busy' → accepts false.",
        },
        { role: "user", content: text },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_quote",
            description: "Submit the parsed technician bid",
            parameters: {
              type: "object",
              properties: {
                price_gbp: { type: ["number", "null"] },
                eta_minutes: { type: ["integer", "null"] },
                accepts: { type: "boolean" },
                notes: { type: "string" },
                confidence: { type: "string", enum: ["high", "medium", "low"] },
              },
              required: ["accepts", "confidence", "notes"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "submit_quote" } },
    }),
  });
  if (!r.ok) {
    console.error("AI parse failed", r.status, await r.text());
    return { price_gbp: null, eta_minutes: null, accepts: false, notes: "ai error", confidence: "low" };
  }
  const data = await r.json();
  try {
    const args = JSON.parse(data.choices[0].message.tool_calls[0].function.arguments);
    return {
      price_gbp: args.price_gbp ?? null,
      eta_minutes: args.eta_minutes ?? null,
      accepts: !!args.accepts,
      notes: args.notes ?? "",
      confidence: args.confidence ?? "low",
    };
  } catch (e) {
    console.error("AI parse JSON error", e);
    return { price_gbp: null, eta_minutes: null, accepts: false, notes: "parse failed", confidence: "low" };
  }
}

async function sendReply(to: string, body: string, channel: "sms" | "whatsapp") {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-send`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ to, body, channel }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [k, v] of formData.entries()) params[k] = String(v);

    const fromRaw = params.From ?? "";
    const toRaw = params.To ?? "";
    const isWhatsApp = fromRaw.startsWith("whatsapp:") || toRaw.startsWith("whatsapp:");
    const channel = isWhatsApp ? "whatsapp" : "sms";
    const from = fromRaw.replace(/^whatsapp:/, "");
    const to = toRaw.replace(/^whatsapp:/, "");
    const body = (params.Body ?? "").trim();
    const sid = params.MessageSid ?? null;
    const numMedia = parseInt(params.NumMedia ?? "0", 10) || 0;
    const mediaUrls: string[] = [];
    for (let i = 0; i < numMedia; i++) {
      const u = params[`MediaUrl${i}`];
      if (u) mediaUrls.push(u);
    }

    // 1. Always log
    await supabase.from("sms_messages").insert({
      direction: "inbound",
      channel,
      from_number: from,
      to_number: to,
      body,
      twilio_sid: sid,
      num_media: numMedia,
      media_urls: mediaUrls,
      status: "received",
    });

    const fromN = normPhone(from);

    // 2. Technician? → Parsing Agent
    const { data: techMatch } = await supabase
      .from("technicians")
      .select("*")
      .eq("active", true);
    const tech = (techMatch ?? []).find((t: any) => normPhone(t.phone) === fromN);

    if (tech) {
      // Find their most recent open allocation
      const { data: allocs } = await supabase
        .from("job_allocations")
        .select("*, jobs(*)")
        .eq("technician_id", tech.id)
        .in("status", ["broadcast", "proposed"])
        .order("created_at", { ascending: false })
        .limit(1);
      const alloc: any = allocs?.[0];

      if (!alloc?.job_id) {
        await sendReply(from, "Thanks — no open job for you right now. We'll text when one matches.", channel);
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      const parsed = await aiExtractQuote(body);

      if (!parsed.accepts) {
        await supabase
          .from("job_allocations")
          .update({ status: "declined" })
          .eq("id", alloc.id);
        await sendReply(from, "Got it — passing on this one. Thanks for the quick reply.", channel);
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      if (parsed.price_gbp == null || parsed.eta_minutes == null || parsed.confidence === "low") {
        await sendReply(
          from,
          `Almost there — please reply with PRICE in £ and ETA in mins, e.g. "70, 25 min" for job ${alloc.job_id.slice(0, 6)}.`,
          channel,
        );
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      await supabase.from("quotes").insert({
        job_id: alloc.job_id,
        technician_id: tech.id,
        price_gbp: parsed.price_gbp,
        eta_minutes: parsed.eta_minutes,
        raw_message: body,
        status: "pending",
        confidence: parsed.confidence,
      });

      await sendReply(
        from,
        `Quote received: £${parsed.price_gbp}, ETA ${parsed.eta_minutes} min. We'll text when the customer chooses.`,
        channel,
      );
      return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
    }

    // 3. Customer? Look up their most recent job
    const { data: customerJobs } = await supabase
      .from("jobs")
      .select("*")
      .eq("customer_phone", from)
      .order("created_at", { ascending: false })
      .limit(1);
    const job: any = customerJobs?.[0];

    const INTAKE_TEMPLATE =
      "Hi 👋 Tyre Fly here. To get a technician to you ASAP, please reply with:\n\n" +
      "1) Your name\n" +
      "2) Postcode or location (a Google Maps pin works too)\n" +
      "3) What happened, and what do YOU think it is? E.g.\n" +
      "   • Slow puncture (still drivable)?\n" +
      "   • Fully flat / blowout?\n" +
      "   • Bulge or split on the sidewall?\n" +
      "   • Nail or screw still in the tyre?\n" +
      "   • Locked wheel / lost locking key?\n" +
      "4) A photo really helps — the damaged area, any nail/screw, AND the tyre size on the sidewall (e.g. 225/45 R17). Use flash at night.\n\n" +
      "Reply all in one message or several — we'll put it together.";

    // Helpers for parsing follow-up intake messages
    const POSTCODE_RE = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i;
    const extractPostcode = (t: string) => {
      const m = t.match(POSTCODE_RE);
      return m ? `${m[1].toUpperCase()} ${m[2].toUpperCase()}` : null;
    };
    const guessIssueType = (t: string) => {
      const s = t.toLowerCase();
      if (/blow.?out/.test(s)) return "blowout";
      if (/lock|locking/.test(s)) return "locked wheel";
      if (/flat|deflat/.test(s)) return "flat tyre";
      if (/punct|nail|screw/.test(s)) return "puncture";
      if (/sidewall|bulge/.test(s)) return "sidewall damage";
      return null;
    };

    // 3a. If there's an in-flight intake (intake_pending), enrich it
    if (job && job.status === "intake_pending") {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      const newDesc = [job.issue_description, body].filter(Boolean).join("\n").slice(0, 2000);
      updates.issue_description = newDesc;
      if (mediaUrls.length > 0) {
        updates.photo_urls = [...(job.photo_urls ?? []), ...mediaUrls].slice(0, 12);
      }
      const pc = extractPostcode(body);
      if (pc && !job.postcode) updates.postcode = pc;
      const it = guessIssueType(body);
      if (it && (!job.issue_type || job.issue_type === "unknown")) updates.issue_type = it;
      // Naive name capture: first non-postcode/issue line if name still placeholder
      if (!job.customer_name || job.customer_name === "Customer") {
        const firstLine = body.split(/\n|,|\./).map((s) => s.trim()).find((s) =>
          s && s.length < 40 && !POSTCODE_RE.test(s) && !/punct|flat|blow|lock|tyre|tire|nail/i.test(s),
        );
        if (firstLine && /^[A-Za-z][A-Za-z .'-]{1,38}$/.test(firstLine)) {
          updates.customer_name = firstLine;
        }
      }

      const haveName = (updates.customer_name ?? job.customer_name) && (updates.customer_name ?? job.customer_name) !== "Customer";
      const havePostcode = !!(updates.postcode ?? job.postcode);
      const finalDesc: string = updates.issue_description ?? job.issue_description ?? "";
      const finalPhotos: string[] = updates.photo_urls ?? job.photo_urls ?? [];
      const haveDetails = finalDesc.length > 5 || finalPhotos.length > 0;

      // Diagnostic depth: do we actually understand the problem?
      // We need EITHER a photo OR a description that mentions a specific
      // failure mode (puncture/blowout/sidewall/etc.) AND some extra context
      // (nail, slow, driving, when it happened, etc.).
      const finalIssueType = updates.issue_type ?? job.issue_type;
      const lowerDesc = finalDesc.toLowerCase();
      const hasContext =
        /(nail|screw|slow|fast|sudden|drove|driving|park|kerb|pothole|bulge|split|crack|flat overnight|lost.*key|valve|leak)/i.test(lowerDesc) ||
        lowerDesc.length > 60;
      const diagnosisOk = finalPhotos.length > 0 || (finalIssueType && finalIssueType !== "unknown" && hasContext);

      if (haveName && havePostcode && haveDetails && diagnosisOk) {
        updates.status = "intake_complete"; // fires dispatch trigger
      }

      await supabase.from("jobs").update(updates).eq("id", job.id);

      // Acknowledge with what's still missing
      const missing: string[] = [];
      if (!haveName) missing.push("your name");
      if (!havePostcode) missing.push("postcode/location");
      if (!haveDetails) missing.push("what happened (and a photo if possible)");

      let reply: string;
      if (missing.length > 0) {
        reply = `Thanks! Still need: ${missing.join(", ")}.`;
      } else if (!diagnosisOk) {
        // We have the basics but not enough to brief the technician well.
        // Ask the customer's own theory + a photo.
        const probes: string[] = [];
        if (finalPhotos.length === 0) {
          probes.push("📸 A quick photo of the tyre helps a lot (damaged area + the tyre size on the sidewall, e.g. 225/45 R17).");
        }
        if (!finalIssueType || finalIssueType === "unknown") {
          probes.push("What do YOU think it is? Slow puncture, blowout, sidewall bulge, nail still in it, or locked wheel?");
        } else {
          probes.push(
            `You mentioned ${finalIssueType}. A bit more would help the technician arrive prepared:\n` +
            "• Did it happen suddenly or go down slowly?\n" +
            "• Can you see anything stuck in it (nail/screw)?\n" +
            "• Any bulge or split on the side wall?\n" +
            "• Is the car drivable or stuck?",
          );
        }
        reply = `Thanks ${(updates.customer_name ?? job.customer_name) || ""}! Before we dispatch, two quick things:\n\n${probes.join("\n\n")}`;
      } else {
        reply = "Got it — finding you a technician now. We'll text the moment one is matched.";
      }
      await sendReply(from, reply, channel);
      return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
    }

    // 3b. Existing customer with a known job — handle review or quote acceptance
    if (job && ["closed_pending_review", "broadcasting", "awaiting_approval", "intake_complete", "pending"].includes(job.status)) {
      // Review (numeric 1-5)
      const ratingMatch = body.match(/^\s*([1-5])\b/);
      if (ratingMatch && job.status === "closed_pending_review") {
        const score = parseInt(ratingMatch[1], 10);
        const { data: q } = await supabase
          .from("quotes")
          .select("technician_id")
          .eq("job_id", job.id)
          .eq("status", "paid")
          .maybeSingle();
        await supabase.from("reviews").insert({
          job_id: job.id,
          technician_id: q?.technician_id ?? null,
          score,
          comment: body,
        });
        await supabase.from("jobs").update({ status: "closed" }).eq("id", job.id);
        await sendReply(from, `Thanks for the ${score}★ rating!`, channel);
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // Quote acceptance ("yes" / "accept")
      if (/\b(yes|y|accept|ok|book it)\b/i.test(body)) {
        const { data: pending } = await supabase
          .from("quotes")
          .select("*")
          .eq("job_id", job.id)
          .eq("status", "pending")
          .order("price_gbp", { ascending: true })
          .limit(1);
        const cheapest: any = pending?.[0];
        if (cheapest) {
          await supabase.from("quotes").update({ status: "accepted" }).eq("id", cheapest.id);
          await supabase.from("quotes").update({ status: "lost" }).eq("job_id", job.id).eq("status", "pending");
          await supabase.from("jobs").update({ status: "awaiting_payment" }).eq("id", job.id);
          await sendReply(
            from,
            `Booked! £${cheapest.price_gbp}, ETA ${cheapest.eta_minutes} min. Payment link will follow shortly.`,
            channel,
          );
        }
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // Otherwise treat extra texts/photos as enrichment to the open job
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (body) updates.issue_description = [job.issue_description, body].filter(Boolean).join("\n").slice(0, 2000);
      if (mediaUrls.length > 0) updates.photo_urls = [...(job.photo_urls ?? []), ...mediaUrls].slice(0, 12);
      if (Object.keys(updates).length > 1) {
        await supabase.from("jobs").update(updates).eq("id", job.id);
        await sendReply(from, "Thanks — added that to your job. We'll text as soon as a technician is matched.", channel);
        return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }
    }

    // 4. Unknown sender (or stale closed job) → start intake automatically
    const pc0 = extractPostcode(body);
    const it0 = guessIssueType(body);
    const { data: newJob } = await supabase
      .from("jobs")
      .insert({
        customer_name: "Customer",
        customer_phone: from,
        postcode: pc0 ?? "",
        issue_type: it0 ?? "unknown",
        issue_description: body || null,
        photo_urls: mediaUrls,
        status: "intake_pending",
      })
      .select()
      .single();

    await supabase.from("ops_alerts").insert({
      level: "info",
      title: "New inbound — intake started",
      body: `From ${from} (${channel}): "${body.slice(0, 120)}"`,
      job_id: newJob?.id ?? null,
    });

    await sendReply(from, INTAKE_TEMPLATE, channel);
    return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
  } catch (e) {
    console.error("twilio-inbound error", e);
    return new Response(TWIML_OK, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
  }
});
