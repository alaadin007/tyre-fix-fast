
# Connect your custom domain to FlatTyreNearMe

## What you do (in the Lovable UI)

1. **Publish the project** if you haven't yet — Publish button (top-right desktop / `…` menu mobile). This creates the `*.lovable.app` URL the domain will sit on top of.
2. **Project Settings → Domains → Buy new domain** → search the domain you have in mind → complete payment.
3. Lovable auto-creates the A records, verifies, and provisions SSL. Status will move: *Verifying → Setting up → Active* (usually minutes; up to 72h worst case).
4. Add **both** the apex (`yourdomain.com`) **and** `www.yourdomain.com` and pick one as **Primary** so the other redirects.

Requires a paid plan; project must be published first.

## What I'll change in the code (after the domain shows as Active)

The site already hardcodes `https://flattyrenearme.com/` in several places. If your purchased domain matches that, **no code changes are needed**. If it differs, I'll do a clean sweep:

1. **`index.html` SEO tags** — update canonical, `og:url`, `og:image`, Twitter image, and JSON-LD `url` to the real domain.
2. **Generate `public/sitemap.xml`** — single entry for `/` (and `/job/:id` is dynamic so excluded). Reference it from `robots.txt`.
3. **Customer SMS payment-link stub** — in `supabase/functions/twilio-inbound/index.ts` the booking confirmation currently says *"Payment link: (stub)"*. I'll replace the stub with `https://yourdomain.com/job/<id>` so customers tap straight into their live status page.
4. **Add a tiny shared constant** `SITE_URL` (read from `import.meta.env.VITE_SITE_URL` with a hardcoded fallback) so future references stay in one place.
5. **No DNS / email work** — per your answer, domain only.

## Verification checklist (I'll run after deploy)

- `curl -I https://yourdomain.com` → `200` + valid TLS
- `https://yourdomain.com/job/<test-id>` loads the status page (proves SPA fallback works on the new domain)
- View-source on `/` shows the canonical pointing at the new domain
- `/sitemap.xml` and `/robots.txt` both load

## What I need from you to start

- Tell me the exact domain you bought (e.g. `flattyrenearme.co.uk`) so I know whether to keep the existing `flattyrenearme.com` hardcoding or swap it.
- Confirm when status in **Settings → Domains** shows **Active** so I don't ship code against a domain that isn't live yet.

That's it — buying happens in Lovable's UI; my job is the SEO + status-link cleanup once it's connected.
