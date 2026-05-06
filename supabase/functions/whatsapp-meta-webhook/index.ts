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
    const businessNumber = value?.metadata?.display_phone_number
      ? `+${String(value.metadata.display_phone_number).replace(/\D/g, "")}`
      : (Deno.env.get("TWILIO_WHATSAPP_NUMBER") ?? "");

    // Status events (sent/delivered/read) — ack and ignore.
    if (!messages || messages.length === 0) {
      return new Response("ok", { status: 200 });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const TWILIO_INBOUND_URL = `${SUPABASE_URL}/functions/v1/twilio-inbound`;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    for (const msg of messages) {
      const from = `+${String(msg.from).replace(/\D/g, "")}`;
      let body = "";
      const mediaUrls: string[] = [];
      const mediaTypes: string[] = [];

      if (msg.type === "text") {
        body = msg.text?.body ?? "";
      } else if (msg.type === "image" || msg.type === "document" || msg.type === "video" || msg.type === "audio") {
        const media = msg[msg.type] ?? {};
        const mediaId = media?.id;
        body = msg[msg.type]?.caption ?? "";
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
