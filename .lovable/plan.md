# Technician Portal

## What you'll get

A `/technician` area where technicians sign in with their phone (SMS code), build a profile, upload equipment photos + insurance/ID docs, and set their availability. New signups land in a queue you approve from `/admin` before they go live in dispatch.

## User flow

```text
/technician/login    → enter phone → SMS code → signed in
/technician/onboarding → first-time only: name, contact, area, skills, vehicle
/technician           → dashboard:
                          - Big "Available now" toggle (+ until time)
                          - Weekly schedule editor
                          - Profile + contact (phone/WhatsApp/email)
                          - Service postcodes + travel radius (miles)
                          - Equipment photos
                          - Documents (insurance, ID, public liability)
                          - Approval status banner
/admin (existing)    → new "Pending technicians" section → Approve / Reject
```

## Database changes

Extend `technicians`:
- `user_id uuid` (links to auth.users for phone-OTP login)
- `whatsapp text`, `travel_radius_miles int`
- `skills text[]` (puncture, blowout, locked-wheel, run-flat, alloy)
- `equipment_photo_urls text[]`
- `availability_now bool`, `available_until timestamptz`
- `weekly_schedule jsonb` (e.g. `{"mon":{"start":"08:00","end":"18:00"},...}`)
- `approval_status text` ('pending' | 'approved' | 'rejected'), `approved_at`, `rejected_reason`
- `insurance_doc_url`, `id_doc_url`, `public_liability_doc_url`

New `user_roles` table + `has_role()` security-definer function (admin role) — required so RLS can lock down approval and admin views without recursion.

Tighten RLS:
- Technicians can read/update **only their own row** (matched by `user_id`)
- Admins (via `has_role`) can read/update all + approve
- Public/anon: no longer reads PII from technicians (current "anyone can view" is too open)
- Storage buckets: `technician-photos` (public), `technician-docs` (private, owner + admin only)

Dispatch agent updated to filter on `approval_status='approved' AND active=true AND (availability_now OR within weekly_schedule)` and feed `skills`, `travel_radius_miles`, `equipment_photo_urls` into the AI matching prompt.

## Auth setup

Enable **Phone provider** in Lovable Cloud auth using Twilio (already connected). On first sign-in, if no `technicians` row exists for `user_id`, redirect to onboarding.

## Admin approval

Adds a "Pending Technicians" panel to `/admin` showing each pending tech's profile, photos, and docs with Approve / Reject buttons. Approving sets `approval_status='approved'`, `active=true`, and sends them an SMS via the existing Twilio function.

## Files

New:
- `src/pages/TechnicianLogin.tsx`
- `src/pages/TechnicianOnboarding.tsx`
- `src/pages/TechnicianDashboard.tsx`
- `src/components/technician/AvailabilityCard.tsx`
- `src/components/technician/WeeklyScheduleEditor.tsx`
- `src/components/technician/ProfileForm.tsx`
- `src/components/technician/PhotosUploader.tsx`
- `src/components/technician/DocumentsUploader.tsx`
- `src/components/admin/PendingTechnicians.tsx`
- `supabase/functions/notify-technician-approved/index.ts`

Edited:
- `src/App.tsx` (routes)
- `src/pages/Index.tsx` (small "Technicians: sign in" link in footer)
- `src/pages/Admin.tsx` (pending-approval panel)
- `supabase/functions/dispatch-agent/index.ts` (richer matching filters)

## Out of scope (flag for later)

- Background-check integration
- Stripe Connect payouts to technicians
- Native app contact-picker import (still web-only)

After you approve, I'll run the migration first, then build the UI and edge function.
