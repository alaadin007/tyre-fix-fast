## Goal
Make the Console a single, simple, working dispatcher view that shows **every job** with its **full WhatsApp conversation, photos, and customer details** — no hidden tabs, no missing data.

## What's wrong today
1. The Console hides jobs in 3 tabs (New / In progress / Completed). Statuses like `superseded`, `no_response`, `intake_pending` get buried — that's why CO55DOC didn't show up.
2. The job card only shows postcode + issue type. The actual intake info (Porsche, reg, "front right", photos, location pin) lives in `sms_messages` and is **never displayed**.
3. The dispatch modal shows fields from the `jobs` row but not the message thread, so dispatchers can't see what the customer actually said.

## Plan

### 1. One unified job list (no tabs)
- Replace the 3 tabs with a single scrollable list, newest first.
- Add a small filter bar at the top: `All · New · In progress · Completed` (just filters the same list, doesn't hide jobs by default).
- Each card shows: postcode, customer name, phone, reg, issue, status pill, timer, first photo thumbnail, last inbound message snippet.

### 2. Show the full conversation in the dispatch modal
- When a job is opened, fetch all `sms_messages` where `job_id = job.id` **OR** `from_number / to_number = customer_phone` (since intake messages may be linked by phone before a job_id is set).
- Render a chat-style thread (inbound left, outbound right) with timestamps, photos inline, and location pins as links.
- Subscribe to realtime so new messages appear live.

### 3. Surface all extracted intake fields
- Show every field the AI extracted: `vehicle_reg`, `tyre_size`, `tyre_brand`, `wheel_type`, `affected_wheels`, `damage_type`, `damage_summary`, lat/lng, etc. — in a compact grid in the modal header.

### 4. Top-bar counters reflect reality
- "X jobs · Y techs" counts every job in the database (last 50), not just the visible tab.

### 5. Keep dispatch flow as-is
- The "Send pay link" button still calls the existing `manual-dispatch` edge function. No backend changes.

## Files to change
- `src/pages/Console.tsx` — flatten tabs into one filterable list; richer cards.
- `src/components/console/JobConversation.tsx` *(new)* — chat thread component.
- `src/pages/Console.tsx` (DispatchModal section) — embed `<JobConversation>` and the full intake grid.
- `src/hooks/useConsoleData.ts` — return all jobs (already does), no status filter.

## Out of scope
- No new edge functions, no schema changes, no auth changes. The backend already works — this is a presentation fix.
- Drag-and-drop, sound alerts, AI rematch — separate follow-ups.

Ready to implement on approval.