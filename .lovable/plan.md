
# FlatTyreNearMe — Agent Stack Implementation Plan

Goal: turn the admin console from a UI shell into a live, automated dispatch platform run by 5 specialist AI/edge-function agents, all observable and overridable by the Ops Co-Pilot (the chat panel the admin actually talks to).

## The mental model

```text
                ┌──────────────────────────────────────────────┐
                │          OPS CO-PILOT (admin chat)           │
                │  Talks to admin · reads live DB · can act    │
                └───────────┬──────────────────────────────────┘
                            │ tool calls (read + write)
   ┌────────────┬───────────┼────────────┬────────────┬───────────┐
   ▼            ▼           ▼            ▼            ▼           ▼
 INTAKE     DISPATCH     PARSING    CONFIRMATION   REVIEW     (humans)
 (form)     (broadcast)  (inbound)  (Stripe hook)  (timer)
   │            │           │            │            │
   └────────────┴────► Supabase (jobs, quotes, sms_messages, allocations, technicians) ◄────┘
```

Every agent is a Supabase Edge Function. They never talk to each other directly — they communicate by **writing to the database**, and Postgres triggers / Realtime / cron fire the next agent. That keeps the system debuggable and lets the Co-Pilot supervise everything from one place.

---

## Agent 1 — Intake Agent  📥

**Trigger:** customer submits the website form (already exists).
**Edge function:** `intake-agent` (new).

**Responsibilities**
- Validate UK postcode (regex + Google Maps geocode → lat/lng + region).
- Classify job type with Lovable AI (Gemini Flash, structured output): `puncture | blowout | tyre_change | mobile_fitting | runflat | other`.
- Severity score from photo (reuse `analyze-damage`) → `repairable | replace | unsure`.
- Spam/duplicate guard: same phone + postcode within 10 min → mark `status='duplicate'`, do not dispatch.
- Insert into `jobs` with `status='intake_complete'` → this is the signal Dispatch listens for.

**New columns on `jobs`:** `lat`, `lng`, `region`, `severity`, `is_duplicate`.

---

## Agent 2 — Dispatch Agent  📡

**Trigger:** Postgres trigger on `jobs` insert where `status='intake_complete'` calls `dispatch-agent` via `pg_net`.
**Edge function:** `dispatch-agent` (new). This is the heartbeat.

**Responsibilities**
- Pull active technicians whose `service_postcodes` cover the job's outward code, ordered by `rating DESC, jobs_completed DESC`.
- Phase 1 (0–8 min): SMS the top N matching techs via Twilio (max 50 per job). Insert one `job_allocations` row per tech with `status='broadcast'`.
- Phase 2 (8–16 min): if no quote received, widen radius (neighbouring outward codes) and re-broadcast to a second tier.
- Phase 3 (16 min): mark job `status='no_response'` and ping the Co-Pilot inbox (a row in a new `ops_alerts` table) so the admin sees it.
- Rate limiting: hard cap 50 SMS/job; per-technician cooldown 30 min between broadcasts.
- Manual mode (already in UI): if `app_settings.auto_dispatch=false`, don't actually send — just write `proposed` allocations for the admin to approve. Approve button calls the same send routine.

**Timer mechanism:** `pg_cron` job every minute scans for jobs in dispatch phases past their deadline and re-invokes `dispatch-agent` with `phase=2|3`.

---

## Agent 3 — Parsing Agent  🧠

**Trigger:** inbound webhook from Twilio (extend existing `twilio-inbound` function).
**Edge function:** extend `twilio-inbound` + new `parsing-agent` (called internally).

**Responsibilities**
- Look up the technician by `from_number`. If matched and there's an open job allocation for them → treat as a **quote reply**, not a customer message.
- Call Lovable AI (Gemini Flash, JSON tool-calling) with the SMS body and extract:
  ```json
  { "price_gbp": number|null, "eta_minutes": number|null, "accepts": boolean, "notes": string }
  ```
- Handles messy input: "ill do it for 70 mate, 20 mins away" → `{price:70, eta:20, accepts:true}`.
- Insert into a new `quotes` table linked to `job_id` + `technician_id`.
- If extraction confidence is low → reply to tech: "Got you — can you confirm price in £ and ETA in mins?"
- Update the job's customer-facing waiting room (Realtime push) so the customer sees quotes arriving live.
- Customer SMS replies ("yes", "accept tech 2") → flip the chosen quote to `accepted`, mark the others `lost`.

**New table:** `quotes (id, job_id, technician_id, price_gbp, eta_minutes, raw_message, status, created_at)`.

---

## Agent 4 — Confirmation Agent  💳

**Trigger:** Stripe webhook on `payment_intent.succeeded`.
**Edge function:** `confirmation-agent` (new).

**Responsibilities**
- Mark the accepted quote `status='paid'`, job `status='confirmed'`.
- Dual SMS via `twilio-send`: customer ("Tech X is on the way, ETA 20 min, reply HELP for issues") + technician ("Job confirmed, customer paid £X, address: ...").
- Schedule the Review Agent: insert a row into `scheduled_tasks` with `run_at = now() + eta + 30min`.
- Silence detector: if technician doesn't send a "started" or "arrived" SMS within ETA + 10 min → escalate (alert Co-Pilot, optionally re-dispatch).

---

## Agent 5 — Review & Close Agent  ⭐

**Trigger:** `pg_cron` minute scan of `scheduled_tasks` where `run_at <= now()`.
**Edge function:** `review-agent` (new).

**Responsibilities**
- SMS the customer: "How was [Tech name]? Reply 1–5 (or a quick comment)."
- Inbound parser (Parsing Agent route) detects numeric/short-text replies as a review → write to a `reviews` table.
- Update technician aggregate: `rating = avg(reviews)`, `jobs_completed += 1`.
- If `rating < 3.5` over last 5 jobs → flag tech, set `active=false` if last 3 are below 3, write `ops_alerts` for admin.
- Mark job `status='closed'`.

**New tables:** `reviews (job_id, technician_id, score, comment, created_at)`, `scheduled_tasks (id, kind, payload, run_at, done)`, `ops_alerts (id, level, title, body, job_id, read, created_at)`.

---

## Ops Co-Pilot — wire to live data 🤖

Today `admin-chat` is a generic Gemini chat. Upgrade it to a **tool-using agent** so the admin can ask real operational questions and trigger real actions from chat.

**Tools exposed to the model (Lovable AI Gateway function-calling):**

| Tool | Purpose |
|---|---|
| `query_jobs(filters)` | "show open jobs in W12" |
| `query_technicians(filters)` | "who's active in SE1 right now" |
| `pricing_history(postcode, hour, type)` | "fair price for runflat at 11pm" |
| `draft_broadcast_sms(audience, message)` | "draft SMS to all London techs about a surge tonight" — returns preview, requires admin to confirm |
| `send_broadcast_sms(audience, message, confirm_token)` | actually send after admin confirms |
| `daily_summary(date)` | "summarise yesterday" |
| `force_dispatch(job_id, technician_id)` | manual override |
| `suspend_technician(id, reason)` | quality control |

The Co-Pilot becomes the single pane of glass: it can observe what each agent did, explain it, and override it.

---

## What we'll build, in order

1. **Schema migration** — add `lat/lng/region/severity` to `jobs`; create `quotes`, `reviews`, `scheduled_tasks`, `ops_alerts`; add a `dispatch_phase` + deadlines to `jobs`; enable `pg_cron` + `pg_net`.
2. **Agent 2 — Dispatch Agent** edge function + Postgres trigger + cron timer (the heartbeat — highest impact).
3. **Agent 3 — Parsing Agent** wired into existing `twilio-inbound` (turns the chaos of SMS into structured quotes).
4. **Agent 1 — Intake Agent** (classification + dedupe).
5. **Co-Pilot upgrade** — function-calling with the 8 tools above, panel shows what tools were called.
6. **Agent 4 — Confirmation Agent** (after Stripe is wired; placeholder webhook in the meantime).
7. **Agent 5 — Review & Close Agent**.
8. **Admin UI additions** — Ops Alerts feed, Quotes column in Pending Approvals, "Dispatch phase" badge on each job, manual override buttons that call Co-Pilot tools.

## Open questions before I start coding

1. **Stripe** is referenced for Agent 4 — is Stripe already chosen / do you want me to enable Lovable's built-in payments now, or stub the Confirmation Agent behind a mock "mark paid" button until later?
2. **Google Maps API key** for postcode geocoding in the Intake Agent — add it as a secret now, or use the free `postcodes.io` UK-only API (no key, perfect for UK-only product)?
3. **Auto-dispatch default** — keep the current Manual Approval as default and only enable auto for Agent 2's phase-1 broadcast once you've watched a few cycles? (Recommended.)
4. **Scope for this build** — do you want all 8 steps in one go, or just steps 1–3 (Schema + Dispatch + Parsing) first so you can see the heartbeat working before we layer the rest?
