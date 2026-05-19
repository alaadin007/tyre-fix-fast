# Rewrite Customer Intake Flow + Memory

## Problem (from screenshots + code)

- `twilio-inbound/index.ts` is 1669 lines with multiple branches that each independently send "Step 1 of 4 — Your location". After "All done ✅" the same handler falls through and re-asks step 1.
- No clear conversation state — the bot infers progress from `jobs` row fields, so any null field re-triggers the question.
- No customer memory: a returning client is treated as brand new, even when we already have their name / vehicle / past jobs.

## Goal

One linear, deterministic intake. Returning customers skip what we already know but always start a **new case**.

## New conversation model

Two tables, one state machine.

**`customers`** (one row per phone, the long-term memory)
- `phone` (PK), `full_name`, `default_postcode`, `vehicle_reg`, `last_seen_at`, `total_jobs`, `notes`

**`conversations`** (one row per active WhatsApp thread)
- `id`, `customer_phone`, `current_job_id`, `step` enum, `last_message_at`, `context jsonb`
- `step`: `idle | awaiting_location | awaiting_plate | awaiting_name | awaiting_description | awaiting_wheels | awaiting_photos | complete`
- Conversation auto-expires after 24h of silence → next inbound starts a **new case**, but `customers` row is reused.

## Intake state machine (single source of truth)

```text
inbound msg
   │
   ▼
load customer (by phone) → load active conversation (<24h)
   │
   ├─ no active convo  → create new job + conversation, step = first missing field
   │                     using customer memory to pre-fill name/postcode/reg
   │
   └─ active convo     → route by conversation.step, NOT by job fields
```

Each step handler does exactly three things:
1. Try to parse the inbound message for its field.
2. If parsed → save to job + customer memory, advance `step`, send next prompt.
3. If not parsed → resend *only* the current step prompt (no progress checklist spam).

When `step` becomes `complete`:
- Mark job `intake_complete` (fires dispatch trigger).
- Send the "All done ✅" message **once**.
- Set conversation `step = idle`. No further prompts until customer sends something new.

## Returning customer behaviour

On new conversation, if `customers` row exists:
- Greet by name: "Welcome back, {name} 👋 New job?"
- Pre-fill `customer_name`, optionally `vehicle_reg` and `postcode` from memory.
- Skip those steps; jump straight to "What happened this time?"
- Never carry over: previous photos, previous damage, previous affected wheels, previous job status.
- Always create a fresh `jobs` row.

## What gets deleted / rewritten

- All the duplicate "Step 1 of 4" branches in `twilio-inbound/index.ts` collapse into one `sendStepPrompt(step)` helper.
- The post-completion fall-through that re-asks step 1 is removed.
- `whatsapp-meta-webhook/index.ts` routed through the same state machine (shared module).

## Technical section

**Files**
- `supabase/functions/_shared/intake-state.ts` (new) — pure state machine: `nextStep(conversation, job, customer, inboundText, mediaUrls) → { updates, reply }`.
- `supabase/functions/twilio-inbound/index.ts` — thin: parse Twilio body, call shared state machine, send reply.
- `supabase/functions/whatsapp-meta-webhook/index.ts` — same, for Meta.

**Migration**
- Create `customers` + `conversations` tables with RLS (service-role only; no end-user auth on these).
- Backfill `customers` from existing `jobs` (group by `customer_phone`, keep latest non-null values).
- Add index `conversations(customer_phone) where step <> 'complete'`.

**Out of scope (not touching)**
- `dispatch-agent`, `notify-admins`, technician side, admin console, payments.
- The approved Meta template `new_job_alert_to_admin` keeps firing exactly as today once `status = intake_complete`.

## Confirm before I build

1. **24h window** for "same case vs new case" — OK, or do you want shorter (e.g. 2h) / longer?
2. **What to remember** between visits — name + postcode + vehicle reg + count of past jobs. Anything else (preferred technician, last damage type)?
3. **Returning-customer greeting** — should it confirm details ("Same car C13ATA?") or silently reuse them?
