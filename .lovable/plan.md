# WhatsApp AI technician onboarding

Lets a new technician join entirely over WhatsApp. The website OTP flow stays as the alternative path.

## How it works (user-facing)

1. New tech texts the Tyre Fly WhatsApp number something like *"I want to join as a technician"* (or scans a QR/click-to-chat link from the website that pre-fills that phrase).
2. The AI replies with one welcoming message asking for everything it needs, then guides them step-by-step, accepting text, voice notes, and photos.
3. Required fields (international-friendly):
   - Full name
   - Service area — UK postcodes (W5, W12) **or** US ZIPs (90210) **or** city names. Stored in `service_postcodes` as-is.
   - Vehicle (make/model/year)
   - Equipment photo(s) — uploaded to `technician-photos` bucket
   - Compliance docs — Insurance, ID, Public Liability — uploaded to `technician-docs` bucket (private)
   - Live location pin (sets `last_lat`/`last_lng`)
   - Travel radius (miles or km — AI normalises to miles)
   - Weekly availability (free text → JSON)
4. When all required fields are present, status flips to `pending` (existing trigger already pings admins to APPROVE).
5. After APPROVE, the tech receives the existing "🎉 You're approved" WhatsApp.

The existing OTP login still works for techs who prefer the website or who already have an approved account.

## Backend changes

### `supabase/functions/twilio-inbound/index.ts`
Add a new section between section 1 (master) and section 2 (existing technician), and update section 4 (unknown sender):

- **New trigger detection**: if `body` matches `/become|join|sign[\s-]?up|apply|i.?m a (mobile )?(tyre|tire) (fitter|technician)|work for|i fit tyres|i'?m a fitter/i` AND no existing technician row → start tech onboarding instead of customer intake.
- **New helper `aiExtractTechProfile(history, latest, mediaUrls, currentRow)`**: calls `google/gemini-3-flash-preview` via the AI Gateway with a tool-call schema returning `{ name, service_postcodes[], vehicle, travel_radius_miles, weekly_schedule, availability_summary, missing_fields[] }`. Sends recent `sms_messages` for that number as conversation context.
- **Doc/photo classification**: when the latest message has media, ask the AI to classify each as `insurance | id | public_liability | equipment | other` and assign to the correct column on `technicians`.
- **State row**: a `technicians` row with `approval_status='intake'` (new value) is created on first trigger. Each subsequent message updates it. When `missing_fields` is empty the row flips to `approval_status='pending'`, which fires the existing `trigger_notify_new_tech_application` trigger.

### Existing tables — no schema change needed
All target columns already exist: `name`, `phone`, `service_postcodes[]`, `vehicle`, `equipment_photo_urls[]`, `insurance_doc_url`, `id_doc_url`, `public_liability_doc_url`, `last_lat`, `last_lng`, `travel_radius_miles`, `weekly_schedule`, `notes`, `approval_status`. Only the value `'intake'` is added by application code (column is plain `text`).

## Frontend changes

### `src/pages/TechnicianLogin.tsx`
Add a small alternative link below the Send-code button:

> *Prefer WhatsApp? Get onboarded by chat →*

It opens `https://wa.me/<TF_NUMBER>?text=I%20want%20to%20join%20as%20a%20Tyre%20Fly%20technician`. Number comes from `src/lib/whatsapp.ts` (already exists).

## Internationalisation note
The AI prompt explicitly tells the model: "Service areas can be UK postcodes (e.g. W5, SW1A), US ZIPs (90210), Canadian postcodes (M5V 2T6), or city/borough names. Store whatever the technician gives you, do not reformat." Same for travel radius — accept km, convert to miles.

## Out of scope for this change
- No edits to `dispatch-agent` (matching logic already reads `service_postcodes` as text — works for ZIPs too, but matching by ZIP/city accuracy is a follow-up).
- No new admin UI — existing PENDING/APPROVE/REJECT WhatsApp commands cover review.

## Risks / things to verify after build
- Twilio media authentication for docs (already handled by existing media-download block).
- Ensure private `technician-docs` bucket policy allows service-role uploads (it does — uploads happen with the service-role client).
- AI might mis-classify equipment vs insurance photos; we'll trust it and let the admin reject if wrong.
