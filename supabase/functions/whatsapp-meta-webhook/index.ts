// Meta WhatsApp Cloud API webhook.
// - GET: verification handshake (echoes hub.challenge if hub.verify_token matches)
// - POST: inbound messages → reshape into Twilio-style form fields and forward
//         to the existing twilio-inbound function so all routing logic is reused.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_GRAPH = "https://graph.facebook.com/v22.0";

async function reverseGeocodePostcode(lat: number, lng: number): Promise<string> {
  try {
    const nominatim = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { "User-Agent": "tyre-fix-fast/1.0" } },
    );
    if (nominatim.ok) {
      const j = await nominatim.json();
      const pc = j?.address?.postcode;
      if (typeof pc === "string" && pc.trim()) return pc.trim().toUpperCase();
    }
  } catch (e) {
    console.error("nominatim reverse geocode failed", e);
  }

  try {
    const r = await fetch(`https://api.postcodes.io/postcodes?lon=${lng}&lat=${lat}&limit=1`);
    if (r.ok) {
      const j = await r.json();
      const pc = j?.result?.[0]?.postcode;
      if (typeof pc === "string" && pc.trim()) return pc.trim().toUpperCase();
    }
  } catch (e) {
    console.error("postcodes.io reverse geocode failed", e);
  }

  return "";
}

// Try to extract { lat, lng } from a Google/Apple Maps URL inside arbitrary text.
// Supports: maps.google.com/?q=lat,lng, /@lat,lng,zoom, /place/.../@lat,lng,
// google.com/maps/search/?api=1&query=lat,lng, goo.gl/maps/..., maps.app.goo.gl/...
async function extractLatLngFromMapsUrl(text: string): Promise<{ lat: number; lng: number } | null> {
  if (!text) return null;
  const urlMatch = text.match(/https?:\/\/[^\s]+/i);
  if (!urlMatch) return null;
  let url = urlMatch[0].replace(/[)\].,]+$/, "");

  const isShort = /(?:goo\.gl\/maps|maps\.app\.goo\.gl|g\.co\/kgs)/i.test(url);
  if (isShort) {
    try {
      const r = await fetch(url, { redirect: "follow" });
      url = r.url || url;
    } catch (e) {
      console.error("maps short-url resolve failed", e);
    }
  }

  const patterns = [
    /[?&]query=(-?\d+\.\d+),(-?\d+\.\d+)/i,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/i,
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/i,
    /[?&]destination=(-?\d+\.\d+),(-?\d+\.\d+)/i,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /\/(-?\d+\.\d+),(-?\d+\.\d+)(?:[,/?]|$)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  }
  return null;
}

async function fetchMediaUrl(mediaId: string, token: string): Promise<{ url: string; mime: string } | null> {
  try {
    const r = await fetch(`${META_GRAPH}/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) {
      console.error("meta media lookup failed", mediaId, r.status, await r.text());
      return null;
    }
    const j = await r.json();
    return { url: j.url, mime: j.mime_type ?? "image/jpeg" };
  } catch (e) {
    console.error("meta media lookup error", mediaId, e);
    return null;
  }
}

async function transcribeAudio(buf: Uint8Array, mime: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY missing — cannot transcribe");
    return "";
  }
  // Encode to base64
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  const b64 = btoa(binary);
  const fmt = (mime || "audio/ogg").split("/")[1]?.split(";")[0] || "ogg";

  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You transcribe customer voice notes for a UK mobile-tyre service. Return the spoken words verbatim in English. If the speaker mentions a UK number plate, tyre size, or which wheel (front-left, front-right, rear-left, rear-right), include those. No commentary, just the transcript.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Transcribe this voice note." },
              { type: "input_audio", input_audio: { data: b64, format: fmt } },
            ],
          },
        ],
      }),
    });
    if (!r.ok) {
      console.error("transcription failed", r.status, await r.text());
      return "";
    }
    const j = await r.json();
    const text = j?.choices?.[0]?.message?.content ?? "";
    return typeof text === "string" ? text.trim() : "";
  } catch (e) {
    console.error("transcription error", e);
    return "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const VERIFY_TOKEN = Deno.env.get("META_WHATSAPP_VERIFY_TOKEN");
  const META_TOKEN = Deno.env.get("META_WHATSAPP_TOKEN");

  // GET — Meta verification handshake
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token && VERIFY_TOKEN && token === VERIFY_TOKEN) {
      return new Response(challenge ?? "", { status: 200 });
    }
    return new Response("forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  try {
    const payload = await req.json();
    console.log("meta webhook payload", JSON.stringify(payload).slice(0, 1000));

    const entry = payload?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages;
    const statuses = value?.statuses;
    const businessNumber = value?.metadata?.display_phone_number
      ? `+${String(value.metadata.display_phone_number).replace(/\D/g, "")}`
      : (Deno.env.get("TWILIO_WHATSAPP_NUMBER") ?? "");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Status events (sent/delivered/read/failed) — persist them so the dashboard
    // shows delivery failures instead of leaving accepted Meta sends as "sent".
    if (Array.isArray(statuses) && statuses.length > 0) {
      for (const s of statuses) {
        const messageId = s?.id;
        const status = String(s?.status ?? "").trim().toLowerCase();
        const error = Array.isArray(s?.errors) && s.errors.length > 0 ? s.errors[0] : null;
        if (!messageId || !status) continue;
        const nextStatus = status === "failed" ? "failed" : status;
        const { error: updErr } = await supabase
          .from("sms_messages")
          .update({ status: nextStatus })
          .eq("twilio_sid", messageId);
        if (updErr) console.error("meta status update failed", messageId, updErr);
        if (status === "failed") {
          console.error("meta outbound delivery failed", JSON.stringify({ messageId, error }));
        } else {
          console.log("meta outbound status", JSON.stringify({ messageId, status }));
        }
      }
      return new Response("ok", { status: 200 });
    }

    // No inbound message and no useful status payload.
    if (!messages || messages.length === 0) {
      return new Response("ok", { status: 200 });
    }

    const TWILIO_INBOUND_URL = `${SUPABASE_URL}/functions/v1/twilio-inbound`;

    for (const msg of messages) {
      const from = `+${String(msg.from).replace(/\D/g, "")}`;
      let body = "";
      const mediaUrls: string[] = [];
      const mediaTypes: string[] = [];

      if (msg.type === "text") {
        body = msg.text?.body ?? "";
        // If the text contains a Google/Apple Maps URL, treat it like a pin.
        const coords = await extractLatLngFromMapsUrl(body);
        if (coords) {
          const postcode = await reverseGeocodePostcode(coords.lat, coords.lng);
          const parts = [
            postcode ? `Location: ${postcode}` : "Location pin shared",
            `(${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`,
          ].filter(Boolean);
          body = parts.join(" — ");
          console.log("maps url parsed", JSON.stringify({ ...coords, postcode, body }));
        }
      } else if (msg.type === "image" || msg.type === "document" || msg.type === "video" || msg.type === "audio" || msg.type === "voice") {
        const kind = msg.type === "voice" ? "audio" : msg.type;
        const media = msg[kind] ?? msg[msg.type] ?? {};
        const mediaId = media?.id;
        body = (msg[kind]?.caption ?? msg[msg.type]?.caption) ?? "";
        if (META_TOKEN) {
          const directUrl = typeof media?.url === "string" && media.url ? media.url : null;
          const directMime = typeof media?.mime_type === "string" && media.mime_type ? media.mime_type : null;
          const m = directUrl
            ? { url: directUrl, mime: directMime ?? "image/jpeg" }
            : (mediaId ? await fetchMediaUrl(mediaId, META_TOKEN) : null);
          if (m) {
            try {
              const mr = await fetch(m.url, { headers: { Authorization: `Bearer ${META_TOKEN}` } });
              if (mr.ok) {
                const buf = new Uint8Array(await mr.arrayBuffer());

                // Voice note / audio → transcribe and inject as text body
                if (kind === "audio" || msg.type === "voice" || (m.mime && m.mime.startsWith("audio/"))) {
                  const transcript = await transcribeAudio(buf, m.mime);
                  if (transcript) {
                    body = body ? `${body}\n${transcript}` : transcript;
                    console.log("voice transcribed", JSON.stringify({ chars: transcript.length }));
                  } else {
                    console.error("voice transcription returned empty");
                  }
                } else {
                  const ext = (m.mime.split("/")[1] || "jpg").split(";")[0];
                  const path = `meta-inbound/${Date.now()}-${crypto.randomUUID()}.${ext}`;
                  const { error: upErr } = await supabase.storage
                    .from("job-photos")
                    .upload(path, buf, { contentType: m.mime, upsert: false });
                  if (!upErr) {
                    const { data: pub } = supabase.storage.from("job-photos").getPublicUrl(path);
                    const publicUrl = pub.publicUrl;
                    mediaUrls.push(publicUrl);
                    mediaTypes.push(m.mime);
                    console.log("meta media stored", JSON.stringify({ type: msg.type, path, publicUrl }));
                  } else {
                    console.error("meta media upload failed", msg.type, upErr);
                  }
                }
              } else {
                console.error("meta media download failed", msg.type, mr.status, m.url);
              }
            } catch (e) {
              console.error("meta media download/upload failed", e);
            }
          }
        }
      } else if (msg.type === "button") {
        body = msg.button?.text ?? "";
      } else if (msg.type === "interactive") {
        body = msg.interactive?.button_reply?.title
          ?? msg.interactive?.list_reply?.title
          ?? "";
      } else if (msg.type === "location") {
        const lat = msg.location?.latitude;
        const lng = msg.location?.longitude;
        const name = msg.location?.name ?? "";
        const addr = msg.location?.address ?? "";
        const postcode = typeof lat === "number" && typeof lng === "number"
          ? await reverseGeocodePostcode(lat, lng)
          : "";
        const parts = [
          postcode ? `Location: ${postcode}` : "Location pin shared",
          name, addr,
          (typeof lat === "number" && typeof lng === "number") ? `(${lat.toFixed(5)}, ${lng.toFixed(5)})` : "",
        ].filter(Boolean);
        body = parts.join(" — ");
        console.log("whatsapp location parsed", JSON.stringify({ lat, lng, postcode, body }));
      } else {
        body = `[${msg.type}]`;
      }

      // Reshape into Twilio-style form fields. Mark From/To with whatsapp: so
      // twilio-inbound treats it as the WhatsApp channel.
      const form = new URLSearchParams();
      form.set("From", `whatsapp:${from}`);
      form.set("To", `whatsapp:${businessNumber}`);
      form.set("Body", body);
      form.set("MessageSid", msg.id ?? "");
      form.set("NumMedia", String(mediaUrls.length));
      mediaUrls.forEach((u, i) => {
        form.set(`MediaUrl${i}`, u);
        form.set(`MediaContentType${i}`, mediaTypes[i] ?? "image/jpeg");
      });

      const r = await fetch(TWILIO_INBOUND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: form.toString(),
      });
      if (!r.ok) console.error("forward to twilio-inbound failed", r.status, await r.text());
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("whatsapp-meta-webhook error", e);
    // Always 200 so Meta doesn't disable the webhook.
    return new Response("ok", { status: 200 });
  }
});
