
## Goal

Let customers attach photos of their tyre damage when submitting a job. Store the photos securely, run an AI vision pass to classify the damage, and include that summary in the SMS broadcast and waiting room.

## Scope of this build

In:
- Photo upload UI on the job request form (up to 3 images, ~5MB each, JPG/PNG/HEIC→JPEG)
- Cloud storage bucket for job photos with proper access rules
- AI damage-type summary generated on submit
- Display of damage summary + thumbnails in the waiting room and admin job view
- Damage summary line included in the SMS that goes to technicians

Out (separate follow-ups):
- Per-quote photo annotations
- Customer editing photos after submission
- Video uploads

## User flow

```text
Customer fills form
   │
   ▼
Selects up to 3 photos (preview thumbnails, remove button)
   │
   ▼
Submit
   ├─► Upload images to storage  ──┐
   │                                ▼
   ├─► Create job row              AI vision summarizes damage
   │                                │
   │                                ▼
   └─► Save photo URLs + damage_summary on the job
                                    │
                                    ▼
                  SMS broadcast to technicians includes summary
                                    │
                                    ▼
                  Waiting room shows summary + thumbnails
```

## UX details

Job form additions:
- New section "Add photos (optional)" below the issue description
- Drag-and-drop zone + "Choose photos" button
- Thumbnails with × to remove, file size shown, max 3 enforced
- Validation: type (image/*), size (<5MB each), client-side compression for large photos
- Helper text: "Photos help technicians give an accurate quote faster."

Submit button:
- Shows "Uploading photos…" → "Analyzing damage…" → redirect to waiting room
- If AI summary fails, job still proceeds; summary falls back to the user's own description

Waiting room:
- Small "AI damage assessment" card above the quote feed: damage type chip (e.g. "Sidewall puncture") + 1–2 sentence summary
- Photo thumbnails in a row, click to lightbox

Admin job detail:
- Photos gallery + AI summary visible alongside the quote list

## Technical details

Storage:
- New public-read bucket `job-photos` with path convention `jobs/{job_id}/{uuid}.jpg`
- RLS: anyone can insert (anonymous customers submit), public can read (so techs can open photo links from SMS), only service role can delete
- Signed URLs not required since SMS recipients are unauthenticated technicians

Database (new columns on `jobs`):
- `photo_urls text[]` — public URLs in submission order
- `damage_type text` — short label, e.g. "puncture", "sidewall", "blowout", "wheel-damage", "other"
- `damage_summary text` — 1–2 sentence human-readable summary
- `damage_confidence text` — "low" | "medium" | "high"

Edge function `analyze-damage`:
- Input: `job_id`, `photo_urls[]`, `issue_description`
- Calls Lovable AI Gateway with `google/gemini-3-flash-preview` (multimodal, fast, cheap) using tool-calling for structured output:
  - `damage_type` enum, `damage_summary` string, `damage_confidence` enum
- Updates the job row with the result
- Handles 429/402 gracefully — logs and leaves fields null so the job still flows

Edge function `trigger-quotes` (extend existing plan):
- After photos analyzed (or after a 6s timeout if AI is slow), include a line in the SMS:
  - `"Damage: {damage_type} — {short_summary}. Photos: {first_photo_url}"`
- Only the first photo URL is sent in SMS to keep messages short; full set is in the techs' job view if/when we build a tech portal

Frontend:
- New `PhotoUploader` component (controlled, returns `File[]`)
- Submit handler sequence:
  1. Insert `jobs` row (status `pending`)
  2. Upload files in parallel to storage, collect public URLs
  3. Update job row with `photo_urls`
  4. Invoke `analyze-damage` (fire-and-forget — waiting room subscribes to the row)
  5. Invoke `trigger-quotes`
  6. Navigate to `/waiting/{job_id}`
- Waiting room subscribes to the job row so `damage_summary` appears as soon as the AI returns

Validation & safety:
- Reject non-image MIME types client- and server-side
- Strip EXIF on upload (privacy)
- Rate limit: max 3 jobs with photos per phone number per hour (cheap in-memory check in edge function, good enough for MVP)

## Open questions deferred

- Whether to show the AI damage assessment to the customer before they pay (could feel intrusive if wrong) — defaulting to yes, easy to toggle later
- Whether to gate SMS broadcast on AI completion or send immediately — defaulting to 6s soft wait then send regardless
