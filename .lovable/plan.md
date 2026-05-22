## Goal

Add a comprehensive visual Admin Dashboard for managing the entire job lifecycle, while keeping the existing WhatsApp automation flow untouched. The dashboard becomes a read/monitor + light-control layer over the same database tables (`jobs`, `quotes`, `job_allocations`, `technicians`, `sms_messages`, `scheduled_tasks`).

## Scope

**In scope (UI only, no business-logic changes to WhatsApp flow):**
- New dashboard pages/sections under `/admin` (Console)
- Visual KPIs, lists, filters, detail drawers, timelines
- Light controls already supported by existing edge functions (rebroadcast, mark paid, refund, send quote to customer)

**Out of scope:**
- Any change to `twilio-inbound`, `broadcast-job`, `whatsapp-meta-send`, `payments-webhook` business logic
- Database schema changes (existing tables already have everything we need)

## Dashboard structure

New `/admin` layout with a left sidebar and these sections:

1. **Overview** — KPI cards + recent activity
   - Today / 7d / 30d counters: jobs created, broadcasts sent, quotes received, quotes accepted, jobs completed, revenue (sum of `quotes.price_gbp` where accepted/paid), platform fees collected
   - Funnel: Created → Broadcasting → Quoted → Accepted → In Progress → Completed → Paid
   - Live "needs attention" list (awaiting_approval, awaiting_payment, stalled jobs)

2. **Jobs** — filterable table
   - Columns: Ref, Customer, Postcode, Issue, Status (colored badge), Broadcasted to (count), Quotes (count), Assigned tech, Created
   - Filters: status, region, date range, has_quotes, payment_status
   - Row click → Job Detail Drawer

3. **Job Detail Drawer** (the core "visual workflow" view)
   - Header: ref, customer, postcode, status, vehicle reg, photos
   - **Timeline** (vertical): job created → broadcast batches with technician chips → each quote arrival → admin approval → customer notification → payment → completion. Built from `jobs`, `job_allocations`, `quotes`, `sms_messages`, `scheduled_tasks`
   - **Broadcasts panel**: list of `job_allocations` rows showing tech, status (proposed/sent/accepted/declined/expired), match_score, sent time
   - **Quotes panel**: list of `quotes` with tech, price, ETA, status (pending/accepted/lost), "Send to customer" button (calls existing twilio-inbound-equivalent or directly updates and invokes confirmation flow)
   - **Payment panel**: platform_fee_status, stripe_session_id link, "Mark paid" / "Refund" buttons (existing edge functions)
   - **Messages panel**: chronological `sms_messages` for this job_id (existing `JobConversation`)

4. **Technicians** — already partially exists; enhance with:
   - Columns: name, active, rating, jobs_completed, current location age, pending quotes count, accepted jobs count
   - Row → drawer with their conversation history, recent quotes, recent jobs, live location

5. **Quotes** — flat list across all jobs
   - Filters: status, technician, date
   - Quick actions: forward to customer (for pending), view job

6. **Payments** — list view
   - Columns: job ref, customer, amount, platform fee, status, stripe session, paid_at, refunded_at
   - Filters by status

7. **Activity log** — unified feed of `sms_messages` + `ops_alerts` + status transitions

## Technical approach

- New route components under `src/pages/admin/` and `src/components/admin/dashboard/`
- Restructure `/admin` (`Console.tsx`) into a layout with sidebar nav + nested routes
- Reuse `useConsoleData` and extend with hooks: `useJobsWithRelations`, `useQuotesFeed`, `useAllocationsForJob`, `usePaymentsFeed`
- All data via existing Supabase tables + realtime channels (already enabled pattern in `useConsoleData`)
- Status badges use semantic tokens from `index.css` (define `--status-*` if needed)
- Drawer/dialog via existing `Sheet`/`Dialog` components
- KPI queries done client-side with date filtering (jobs table is small enough; can move to RPC later if needed)
- "Send quote to customer" button calls a small new edge function `admin-send-quote` that reuses the same `sendQuoteToCustomer` helper from `twilio-inbound` (factored into `_shared/quote-to-customer.ts`) — this keeps WhatsApp behavior identical whether triggered by admin "YES" reply or dashboard button
- "Rebroadcast" button calls existing `broadcast-job` function
- "Mark paid" / "Refund" call existing `payments-webhook` mock path / `refund-fee` function

## Files to create

```
src/pages/admin/
  DashboardLayout.tsx        # sidebar + outlet
  Overview.tsx               # KPIs + funnel + needs-attention
  JobsPage.tsx               # filterable jobs table
  JobDetailDrawer.tsx        # timeline + panels
  TechniciansPage.tsx        # enhanced tech list
  QuotesPage.tsx
  PaymentsPage.tsx
  ActivityPage.tsx
src/components/admin/dashboard/
  KpiCard.tsx
  FunnelChart.tsx
  StatusBadge.tsx
  JobTimeline.tsx
  BroadcastsPanel.tsx
  QuotesPanel.tsx
  PaymentPanel.tsx
src/hooks/
  useDashboardMetrics.ts
  useJobDetail.ts
supabase/functions/
  _shared/quote-to-customer.ts   # extracted helper
  admin-send-quote/index.ts      # thin wrapper for dashboard button
```

## Files to modify

- `src/App.tsx` — nest admin routes under `DashboardLayout`
- `src/pages/Console.tsx` — keep as legacy map view, link from new dashboard, or fold into Overview
- `supabase/functions/twilio-inbound/index.ts` — import shared helper instead of inline `sendQuoteToCustomer` (no behavior change)

## Out-of-scope guarantees

- No changes to template IDs, message wording, state-machine, or admin/tech WhatsApp flows
- No schema migrations
- No auth changes (existing admin role gating remains)

## Open questions

1. Do you want the new dashboard at `/admin` (replacing current Console) with the old map view as a sub-tab, or as a separate route like `/admin/dashboard` keeping `/admin` as-is?
2. For the "Send quote to customer" button on the dashboard — should it bypass the WhatsApp "YES" confirmation entirely, or should clicking it just trigger the same `await_send_quote_confirm` prompt the admin gets on WhatsApp?
3. Any specific KPIs/metrics that matter most to you (e.g. avg time-to-quote, broadcast acceptance rate) that should be front-and-center on the Overview?
