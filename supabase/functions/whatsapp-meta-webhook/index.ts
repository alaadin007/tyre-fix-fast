// Meta WhatsApp Cloud API webhook.
// - GET: verification handshake (echoes hub.challenge if hub.verify_token matches)
// - POST: inbound messages → reshape into Twilio-style form fields and forward
//         to the existing twilio-inbound function so all routing logic is reused.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_GRAPH = "https://graph.facebook.com/v22.0";

async function fetchMediaUrl(mediaId: string, token: string): Promise<{ url: string; mime: string } | null> {
  try {
    const r = await fetch(`${META_GRAPH}/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const j = await r.json();
    return { url: j.url, mime: j.mime_type ?? "image/jpeg" };
  } catch {
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

    const TWILIO_INBOUND_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-inbound`;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    for (const msg of messages) {
      const from = `+${String(msg.from).replace(/\D/g, "")}`;
      let body = "";
      const mediaUrls: string[] = [];
      const mediaTypes: string[] = [];

      if (msg.type === "text") {
        body = msg.text?.body ?? "";
      } else if (msg.type === "image" || msg.type === "document" || msg.type === "video" || msg.type === "audio") {
        const mediaId = msg[msg.type]?.id;
        body = msg[msg.type]?.caption ?? "";
        if (mediaId && META_TOKEN) {
          const m = await fetchMediaUrl(mediaId, META_TOKEN);
          if (m) {
            // Twilio-inbound downloads media URLs with Twilio Basic Auth.
            // Meta media URLs need a Bearer token, so download here and
            // re-upload to a public URL the existing handler can ingest.
            try {
              const mr = await fetch(m.url, { headers: { Authorization: `Bearer ${META_TOKEN}` } });
              if (mr.ok) {
                const buf = new Uint8Array(await mr.arrayBuffer());
                const ext = (m.mime.split("/")[1] || "jpg").split(";")[0];
                const path = `meta-inbound/${Date.now()}-${crypto.randomUUID()}.${ext}`;
                const upRes = await fetch(
                  `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/job-photos/${path}`,
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${SERVICE_KEY}`,
                      "Content-Type": m.mime,
                    },
                    body: buf,
                  },
                );
                if (upRes.ok) {
                  const publicUrl = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/job-photos/${path}`;
                  mediaUrls.push(publicUrl);
                  mediaTypes.push(m.mime);
                }
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
        let postcode = "";
        if (typeof lat === "number" && typeof lng === "number") {
          try {
            const r = await fetch(`https://api.postcodes.io/postcodes?lon=${lng}&lat=${lat}&limit=1`);
            if (r.ok) {
              const j = await r.json();
              postcode = j?.result?.[0]?.postcode ?? "";
            }
          } catch (e) {
            console.error("reverse geocode failed", e);
          }
        }
        // Build a body the intake parser can read (its regex picks up the postcode).
        const parts = [
          postcode ? `Location: ${postcode}` : "Location pin shared",
          name, addr,
          (typeof lat === "number" && typeof lng === "number") ? `(${lat.toFixed(5)}, ${lng.toFixed(5)})` : "",
        ].filter(Boolean);
        body = parts.join(" — ");
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
