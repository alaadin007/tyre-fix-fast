
# Switch WhatsApp from Twilio Sandbox → your Meta-verified number

You're already on the right Twilio account (the connector is linked). Today the code uses:

- **SMS** from `+447447184489` (your real UK number)
- **WhatsApp** from `+14155238886` (Twilio's shared **sandbox** number — requires customers to text `join <code>` first, not production-grade)

We swap WhatsApp to use your Meta-verified number — same number as SMS — so one number does both.

## What I need from you

Just **confirm the number** that has Meta WhatsApp approval in the Twilio account currently connected. Two scenarios:

- **A. The same `+447447184489` is already approved as a WhatsApp Sender** → I change one line and deploy. Done.
- **B. A different number in that same account is the approved WhatsApp Sender** → Tell me the E.164 (e.g. `+44…`) and whether you want to also switch SMS to it (recommended, single number for everything).

How to check: Twilio Console → **Messaging → Senders → WhatsApp senders**. Status must be **Online / Approved**, not Sandbox.

## Code changes (one file)

`supabase/functions/twilio-send/index.ts`:

```ts
// Replace these two lines
const FROM_SMS = "+447447184489";
const FROM_WHATSAPP = "+14155238886";

// With (read from env so we don't hardcode again)
const FROM_SMS = Deno.env.get("TWILIO_PHONE_NUMBER") ?? "+447447184489";
const FROM_WHATSAPP = Deno.env.get("TWILIO_WHATSAPP_NUMBER") ?? FROM_SMS;
```

Then I add `TWILIO_WHATSAPP_NUMBER` as a runtime secret set to your verified number (with `whatsapp:` stripped — code adds the prefix).

The inbound function (`twilio-inbound`) already handles both channels correctly via the `whatsapp:` prefix on `From`/`To`, so no change there.

## Twilio Console steps (you do these once)

1. **Messaging → Senders → WhatsApp senders → [your number] → Sender configuration**
   - Set **"When a message comes in"** webhook to:
     `https://ctxtvezeeijkjjuzodvi.supabase.co/functions/v1/twilio-inbound`
   - Method: `POST`
2. **(Already done for SMS, verify it's still there)** Phone Numbers → Manage → Active Numbers → `+447447184489` → Messaging → "A MESSAGE COMES IN" → same URL above.
3. **Recommended hardening** before any real customer traffic:
   - Messaging → **SMS Pumping Protection** → Enable
   - Messaging → **Geo Permissions** → enable only **United Kingdom** (and any other country you serve)

## Frontend changes (only if WhatsApp number differs from SMS number)

`src/pages/Index.tsx` has `wa.me` links hardcoded to the SMS number. If WhatsApp uses the same number → no change. If different → I'll swap those links to the WhatsApp number.

## Verification after deploy

1. Send "TEST" via WhatsApp from my phone to your verified number → should appear in Admin Console with the **WhatsApp** badge (not SMS).
2. Hit **Reply** in admin, pick **WhatsApp** channel, send → arrives on my phone via WhatsApp (no `join` step required).
3. Check `twilio-send` edge function logs for the `From: whatsapp:+44…` line.

## Out of scope (per your earlier answers)

- Web domain purchase / SEO swap — separate task, waiting on your domain name.
- Email setup on the domain — not now.

---

**Tell me the verified WhatsApp number** (or just "same as SMS, +447447184489") and I'll execute.
