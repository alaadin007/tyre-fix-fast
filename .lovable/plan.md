# Operations Console at `/console`

A dispatcher's command-centre — swimlane job board on the left, live map on the right. Ships with a realistic dummy demo first, with a toggle that flips it to live data from your real `jobs` and `technicians` tables.

## Layout

```text
┌──────────────────────────────────────────────────────────────────┐
│  Operations Console      • LIVE   6 jobs · 4 techs    [Demo|Live]│
├────────────────────────────────────────────────────────────────────┤
│ Jobs today 6 | Avg response 8m | On duty 4 | Revenue today £340  │
├──────────────────────┬─────────────────────────────────────────────┤
│ INCOMING (2)         │                                             │
│  ┌────────────────┐  │                                             │
│  │ W5 3HN         │  │                                             │
│  │ Puncture · 2:14│  │              Live map (Leaflet)             │
│  │ ⭐4.9 Sam · 6m │  │                                             │
│  │ [Dispatch]     │  │           orange = jobs                     │
│  └────────────────┘  │           blue pulse = techs                │
│ DISPATCHED (1)       │                                             │
│ IN PROGRESS (2)      │                                             │
│ COMPLETED (1)        │                                             │
└──────────────────────┴─────────────────────────────────────────────┘
```

- **Left 40% / right 60%** on desktop.
- **Mobile**: map hides, board goes full-width, bottom tab bar switches between **Board** and **Map**.

## Top bar

- Title "Operations Console"
- Pulsing `LIVE` badge
- Job count + tech-on-duty count
- **Mode toggle**: `Demo` ↔ `Live data` (persisted to `localStorage`)
- 4 stat tiles: Jobs today · Avg response · On duty · Revenue today

## Job board (left)

Four vertical sections (collapsible headers, scrollable list under each), not four side-by-side columns — fits the 40% width better:

1. **Incoming** (blue dot)
2. **Dispatched** (orange dot)
3. **In progress** (green dot)
4. **Completed** (grey dot)

### Job card
- Postcode (large, bold)
- Job type pill (Puncture / Tyre change / Blowout / Locked wheel)
- **Live timer** counting up from `created_at`
  - Green 0–5 min · amber 5–15 min · red 15+ min
  - Updates every second via a single `useTick` hook
- Nearest technician: `⭐ rating · Name · ETA min`
- Orange `Dispatch` button (Incoming column only)
- Tap card → opens dispatch modal

## Live map (right)

- Reuses your existing Leaflet setup from `src/components/admin/TechnicianLiveMap.tsx` (same `react-leaflet` + OSM tiles).
- **Orange pins** for jobs, **blue pulsing pins** for technicians.
- Pin popup: name / postcode / status / quick `Dispatch` link.
- Centred on London by default; auto-fits to all visible pins.

## Dispatch modal

Opens when a card is tapped:
- Customer name, phone, postcode, full description
- Photo thumbnails
- Pre-built WhatsApp broadcast preview (read-only)
- **Top 3 nearest available technicians** ranked by distance, with ETA + rating
- `Dispatch to {Name}` button per row
  - Demo mode: just moves the card to "Dispatched" locally
  - Live mode: inserts a `job_allocations` row and updates `jobs.status`
- Close (×) top-right, also closes on Esc / backdrop click

## Demo vs Live data

A single hook `useConsoleData(mode)`:

- **Demo**: returns 6 hand-crafted jobs across UK postcodes (W5 3HN, SW1A 1AA, E14 5AB, N1 9GU, SE1 7PB, NW1 6XE) and 4 fake London techs (Sam, Aisha, Marco, Leo), each with lat/lng, rating, vehicle.
- **Live**: queries `jobs` (latest 50, any status) + `technicians` where `active=true`. Subscribes to realtime changes on both tables so the board and map update without refresh.

Toggle is a small segmented control in the top bar; choice saved to `localStorage` so the dispatcher's preference sticks.

## Files to add

- `src/pages/Console.tsx` — page shell, route guard (admin only via existing `useAuthSession` + `has_role` check)
- `src/components/console/TopBar.tsx`
- `src/components/console/StatTiles.tsx`
- `src/components/console/JobBoard.tsx`
- `src/components/console/JobCard.tsx`
- `src/components/console/DispatchModal.tsx`
- `src/components/console/ConsoleMap.tsx` — wraps existing Leaflet logic
- `src/hooks/useConsoleData.ts` — demo / live data + realtime
- `src/hooks/useTick.ts` — single 1-second tick for all timers

## Files to edit

- `src/App.tsx` — add `<Route path="/console" element={<Console />} />`

## Theme

Uses your existing semantic tokens (`--background`, `--card`, `--primary` already orange, `--muted`). No new hex values added. The "navy" already matches your dark surfaces; the orange `Dispatch` button uses `bg-primary`.

## Out of scope (separate follow-ups, as the prompt notes)

- Drag-and-drop between columns
- New-job sound alert
- AI matching logic (your `dispatch-agent` edge function already does this — the modal could call it later)

## Risks

- Live mode needs admin role; non-admins are redirected to `/`.
- Realtime requires the `jobs` and `technicians` tables to be in `supabase_realtime` publication — will add a migration if not already enabled.
