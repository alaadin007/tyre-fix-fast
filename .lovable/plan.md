# £15 Customer Unlock Fee (Stripe)

## How it works in plain English

1. Customer submits a job → technicians SMS quotes → admin (or auto-assign) **approves a quote**.
2. Instead of immediately handing over phone numbers, the customer gets an **SMS with a payment link** for £15 ("Pay £15 to confirm your tech and unlock their direct number").
3. Once Stripe confirms payment:
   - Customer sees the technician's name, photo (if any) and **direct phone number** on a confirmation page.
   - Technician gets an SMS: *"Customer has paid the platform fee. Their number is 07… — please call to arrange ETA. Collect the £X job total directly (cash / bank / card)."*
4. If the technician **no-shows** (admin marks it in the console), Stripe automatically refunds the £15 to the customer.

The £80 (or whatever) job money never touches the platform — tech and customer settle directly.

## Plan

### 1. Enable Stripe payments (Lovable built-in)
- Run `enable_stripe_payments` (Stripe is the right fit — physical/in-person service, not Paddle-eligible).
- Configure with **full compliance handling** so VAT on the £15 is collected, filed and remitted automatically (+3.5% on top of base Stripe fees).

### 2. Create the product in Stripe
- One product: **"Platform connection fee"**, one-time price **£15.00 GBP**, tax code = `txcd_10000000` (general services). Created via `batch_create_product` after enable.

### 3. Database changes
Add to `jobs`:
- `platform_fee_status` text (`pending` | `paid` | `refunded`) default `pending`
- `platform_fee_paid_at` timestamptz
- `stripe_session_id` text
- `stripe_payment_intent_id` text
- `assigned_technician_id` uuid — the tech whose quote was approved (so we know who to release on payment).

### 4. New flow in admin "Approve quote"
When admin clicks **Approve** on a quote (existing button in `Admin.tsx → approveQuote`):
- Mark quote accepted, job status → `awaiting_payment` (instead of `accepted`).
- Set `assigned_technician_id` on the job.
- Call new edge function `create-fee-checkout` → returns Stripe Checkout URL.
- Send SMS to customer via existing `twilio-send`:
  > "Your tyre tech is matched! Pay the £15 platform fee to confirm and get their direct number: <link>"

### 5. New edge functions
- **`create-fee-checkout`** — creates a Stripe Checkout Session (mode=`payment`, £15 line item, `managed_payments.enabled=true`, `success_url` = `/confirmed?job=<id>`, metadata `{ job_id }`).
- **`stripe-webhook`** — handles `checkout.session.completed`:
  - Mark job `platform_fee_status='paid'`, status `confirmed`, store IDs.
  - SMS the technician their customer's number.
  - SMS the customer the technician's number + "Your tech will call shortly."
- **`refund-fee`** — called from the admin "Mark no-show" button: refunds the PaymentIntent and sets `platform_fee_status='refunded'`.

### 6. Frontend additions
- **`/confirmed?job=<id>` page** — polls the job, then shows tech name + tappable phone number once `platform_fee_status='paid'`.
- **Admin console**: in the "Accepted / Waiting" column add a small badge — `Fee: pending / paid / refunded` — and a **"Mark no-show & refund"** button on rows where status = paid.

### 7. Customer-facing wording on the homepage
Tiny line under the form: *"£15 platform fee on confirmed match. The technician quotes the job separately and is paid directly."* (transparency).

## Technical notes

- Stripe webhook signature verified using the Lovable-managed `STRIPE_WEBHOOK_SIGNING_SECRET` provided after `enable_stripe_payments`.
- All money flows go through Stripe — we never store card data.
- Refund logic: full refund only (no partial). One refund per job.
- Job status machine becomes: `pending → intake_complete → quoted → awaiting_payment → confirmed → in_progress → completed` (with `refunded` as a terminal off-ramp).
- The existing `approveQuote` function in `src/pages/Admin.tsx` is the single mutation point — all change funnels through there, no other callers need updating.

## What I will NOT change
- Twilio / SMS quote intake — untouched.
- Dispatch agent + matching logic — untouched.
- The 4-column admin layout you just approved — untouched, only badges + one button added.

Approve and I'll start by enabling Stripe (that triggers a form for you to fill in), then create the product, then ship the rest.