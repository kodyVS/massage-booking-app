# Vital Touch Massage - Booking App

Production-ready booking app for **Vital Touch Massage**: public booking flow,
admin portal, worker portal, transactional SMS + email, and a 24-hour reminder
cron. Built with Next.js (App Router) + TypeScript + MongoDB (Mongoose) +
NextAuth + Twilio + Resend, deployed to Vercel.

---

## Quick start

```sh
# 1. Install
npm install

# 2. Bring up MongoDB on a non-default port (avoids host conflicts)
docker run -d --name massage-booking-mongo -p 27021:27017 mongo:7

# 3. Configure environment
cp .env.example .env.local
# edit .env.local - at minimum set MONGODB_URI, NEXTAUTH_SECRET, JWT_SECRET, CRON_SECRET

# 4. Seed the DB
npm run seed

# 5. Run
npm run dev
# open http://localhost:3000
```

A fresh dev should be able to clone, install, seed, and book end-to-end in
under 10 minutes.

### Seed credentials

Created by `npm run seed`:

| Role   | Email                          | Password     |
|--------|--------------------------------|--------------|
| Admin  | `admin@vitaltouch.com`         | `Admin123!`  |
| Worker | `luna@vitaltouch.com`          | `Worker123!` |
| Worker | `kira@vitaltouch.com`          | `Worker123!` |

The seed script logs a warning to change the admin password before production.

---

## Environment variables

All vars are documented inline in `.env.example`. The 17 required keys:

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Mongoose connection string |
| `NEXTAUTH_SECRET` | NextAuth JWT signing - `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Public origin (`http://localhost:3000` in dev) |
| `JWT_SECRET` | Magic-link token signing - `openssl rand -base64 32` |
| `SMS_ENABLED` | Master SMS kill-switch (`true` / `false`) |
| `TWILIO_ACCOUNT_SID` | Twilio SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_FROM_NUMBER` | E.164 sender, e.g. `+15551234567` |
| `EMAIL_ENABLED` | Master email kill-switch (`true` / `false`) |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Verified Resend sender (or `onboarding@resend.dev` in sandbox) |
| `TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL (rate limiting) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `BUSINESS_TIMEZONE` | IANA tz, e.g. `America/Los_Angeles` |
| `CRON_SECRET` | Bearer secret for `/api/cron/reminders` |

> **Dual-toggle pattern.** SMS and email each have an env-level kill-switch
> (`SMS_ENABLED` / `EMAIL_ENABLED`) AND a Settings-level toggle
> (`smsNotificationsEnabled` / `emailNotificationsEnabled`). Both must be
> `true` for messages to fire. The Settings toggle is exposed in
> `/admin/settings`; it is shown disabled with explanatory text when the env
> kill-switch is `false`.

---

## Scripts

| Command | What it does |
|---------|---------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint (incl. backend boundary rules - failures fail CI) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run seed` | Idempotent seed (admin + 3 workers + 3 therapists + 4 services + settings) |
| `npm run ensure-indexes` | Build every model's indexes against the live DB (run once after deploy) |
| `npm run test:backend` | Backend test suite (17 tests, runs against the live test DB) |

---

## Backend Architecture

The backend is organized as a **self-contained, extractable module** under
`src/backend/`. The folder is a candidate for being lifted into a standalone
service later (Express/Fastify/NestJS, separate repo, etc.) with minimal
rewriting - see "Extraction path" below.

### Folder layout

```
src/
  app/                              # Next.js routes - THIN delegators only
    api/                            #   each route handler is < 20 lines
    (public)/                       # landing + booking + intake + manage + privacy + terms
    (auth)/                         # /login
    (admin)/                        # admin portal
    (portal)/                       # worker portal
    error.tsx                       # app-level error boundary
    global-error.tsx                # last-resort error boundary
    not-found.tsx                   # 404 (on-brand)
    sitemap.ts                      # public sitemap
  backend/                          # SELF-CONTAINED, EXTRACTABLE
    index.ts                        # public surface - re-exports controllers + types
    controllers/                    # validate input → call services → return DTOs
    services/                       # business logic - no HTTP, no framework
    models/                         # Mongoose schemas + TS interfaces + DTO converters
    db/connection.ts                # cached Mongoose connection
    types/                          # DTOs + typed errors
    validation/                     # Zod input schemas
    __tests__/                      # backend test suite
  components/                       # React UI - frontend only
  emails/                           # Email templates - presentational, third-party-only imports
  hooks/                            # React hooks - frontend only
  lib/                              # frontend helpers (cn, format, api-response, …)
  middleware.ts                     # NextAuth role gating for /admin and /portal
scripts/
  seed.ts                           # idempotent seed (uses tsx)
  ensure-indexes.ts                 # builds Mongo indexes (uses tsx)
public/
  brand/                            # brand artwork
  therapists/                       # therapist photos (paste-only for v1)
  robots.txt
```

### Layer responsibilities

| Layer | Responsibility | May import from |
|-------|----------------|-----------------|
| **Models** (`backend/models/`) | Mongoose schemas + TS doc interfaces + `toDTO()` converters | other models, `mongoose` |
| **Services** (`backend/services/`) | Business logic. Receives DTOs, returns DTOs. Throws typed errors. **Zero knowledge of HTTP, NextRequest, NextResponse, cookies, headers.** | models, other services, third-party libs |
| **Controllers** (`backend/controllers/`) | Validate input via Zod, call services, return DTOs or throw. Never touches `Response`/`NextResponse`. | services, models, validation, types |
| **Validation** (`backend/validation/`) | Zod input schemas, one per entity | `zod` |
| **Public surface** (`backend/index.ts`) | Re-exports controllers + DTO types so route handlers can `import { bookingsController } from "@/backend"` | everything inside `backend/` |
| **Next routes** (`app/api/.../route.ts`) | Parse request, call controller, map result/throws to HTTP - **target ≤ 20 lines** | `@/backend`, `@/lib/api-response` |
| **Server actions** (`app/.../actions.ts`) | Same rule - thin wrapper around a controller call. Target ≤ 25 lines per action. | `@/backend`, `@/lib/staff-context`, `@/lib/action-result`, `@/auth` |
| **Email templates** (`src/emails/`) | Presentational HTML. Imported BY `email.service.ts`, never reach back into `backend/`. | `src/emails/`, third-party libs |

### Dependency rules (enforced by ESLint)

The eslint config in `eslint.config.mjs` runs `eslint-plugin-boundaries` and
`no-restricted-imports`. **Violations fail `npm run lint`** (i.e. fail CI).

1. `src/backend/**` may import from itself + a small allowlist of third-party
   libs (`mongoose`, `zod`, `bcryptjs`, `date-fns`, `jsonwebtoken`, `twilio`,
   `resend`, `ics`, `@upstash/*`). It must NOT import from `next/*`,
   `next-auth`, `src/app/**`, `src/components/**`, `src/hooks/**`, or
   `src/lib/**`.
2. `src/app/**`, `src/components/**`, and `src/hooks/**` may import from
   `@/backend` (the public surface) but must NOT reach into
   `src/backend/services/**`, `src/backend/models/**`,
   `src/backend/controllers/**`, `src/backend/db/**`, or
   `src/backend/validation/**` directly. The seam stays visible.
3. `src/emails/` may only import from itself and third-party libs.
4. `scripts/` is intentionally outside `src/` so `scripts/ensure-indexes.ts`
   can import from `src/backend/models/` directly (indexes are a
   model-layer concern).

### Audit greps (must all return zero)

```sh
grep -rn 'from "next' src/backend/                       # 0
grep -rn 'from "next-auth' src/backend/                  # 0
grep -rn '@/backend/services' src/components/ src/app/   # 0
grep -rn '@/backend/models'   src/components/ src/app/   # 0
```

### Extraction path

To lift the backend into a standalone service:

1. Copy `src/backend/` (and `src/emails/`, since `email.service.ts` imports
   templates from there) into a new repo.
2. Replace the Next route handlers in `src/app/api/.../route.ts` with
   Express/Fastify handlers that call the same controller methods. Each
   handler is already < 20 lines, so this is a near-mechanical port.
3. Replace the NextAuth wrapper in `src/auth.ts` and the Credentials provider
   `authorize` callback. The backend already exposes
   `authController.verifyCredentials({ input })` - your replacement just
   needs to call it.
4. Replace the rate limiting in `src/lib/rate-limit.ts` (currently used by
   `/api/holds` and `/api/bookings`) with whatever your new framework
   provides. Rate limiting is intentionally outside the backend.
5. Run `scripts/ensure-indexes.ts` against the production Mongo to ensure
   every model's indexes exist.

Zero changes are needed inside `src/backend/services/`, `src/backend/models/`,
or any business logic.

---

## Booking flow (end-to-end)

```
POST /api/holds                                   (≤ 20 lines)
  └─ holdsController.create
       └─ holdsService.createHold              (10-min TTL lock; conflict check)

POST /api/bookings                                (≤ 20 lines)
  └─ bookingsController.create
       ├─ verifyTurnstileToken (skipped for staff)
       └─ bookingsService.createBooking
            ├─ verifyHold (consumes the hold on success)
            ├─ atomic claim-then-verify insert with overlap detection
            ├─ sendBookingConfirmation (SMS + email - non-throwing)
            └─ returns BookingDTO (with manageToken)
```

### Concurrency

`bookingsService.createBooking` uses **claim-then-verify** for atomic overlap
rejection without needing a transaction. Two simultaneous requests for the
same slot deterministically resolve to one survivor (smallest `_id` wins,
losers self-delete). Verified by `bookings-concurrency.test.ts`.

### Reminders

`vercel.json` registers `/api/cron/reminders` to run every 15 minutes.
`reminders.service.sendDueReminders()` finds confirmed bookings starting
in `[now+23.5h, now+24.5h]` with `reminderSentAt` null, **stamps
`reminderSentAt` BEFORE sending** (so concurrent fires can't double-send),
then runs SMS + email. The 60-min scan window overlaps 4 cron fires for
resilience.

---

## Deploy to Vercel

1. Push to GitHub and import into Vercel.
2. Set every variable from `.env.example` in the Vercel project settings.
   - For `NEXTAUTH_URL`, use the Vercel-assigned domain.
   - For `RESEND_FROM_EMAIL`, use a verified domain (or
     `onboarding@resend.dev` for sandbox testing - only delivers to the
     account owner).
3. The cron in `vercel.json` is registered automatically. Verify in Vercel's
   "Cron Jobs" tab after the first deploy.
4. After the first successful deploy, run `npm run ensure-indexes` against
   the production Mongo (or do it once locally with the production
   `MONGODB_URI`).

### Production checklist

- [ ] All 17 env vars set in Vercel
- [ ] `MONGODB_URI` points at your Atlas cluster (not the dev container)
- [ ] `NEXTAUTH_URL` matches the Vercel domain
- [ ] `RESEND_FROM_EMAIL` uses a verified domain
- [ ] `TWILIO_FROM_NUMBER` is a real number (E.164)
- [ ] `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` are production keys (not the test keys)
- [ ] `SMS_ENABLED` and `EMAIL_ENABLED` flipped to `true` after sandbox testing
- [ ] `npm run ensure-indexes` run once against the production DB
- [ ] Admin password changed from the seed default before going public
- [ ] Privacy policy + Terms of service reviewed by counsel (search for `[LEGAL]` markers)
- [ ] First reminder cron fire observed in Vercel logs

---

## Testing

```sh
npm run test:backend
```

The backend test suite (17 tests, ~25 seconds with `--test-concurrency=1`)
covers:

- Availability slot generation (5 cases - empty day, existing-booking
  exclusion, buffer behavior, missing therapist↔service link, inactive
  therapist)
- Booking concurrency (2 cases - simultaneous double-book, sequential)
- Hold TTL (2 cases - index definition + live Mongo expiry)
- Integrations (8 cases - SMS + email dual-toggle gates, reminders idempotency,
  reminder window)

Tests share a single Mongo at `MONGODB_URI` (with the path replaced by
`virtual-touch-test`). `--test-concurrency=1` is required because all
suites use the same DB.

---

## Known limitations (v1)

- **Testimonials are hardcoded** in `src/app/(public)/page.tsx` (TODO marker
  in the file). A future phase can wire them up to a `Testimonial` model and
  expose CRUD in the admin portal.
- **Therapist photos are paste-only** - admins paste a Cloudinary or
  Vercel Blob URL into the `photoUrl` field. No upload widget yet.
- **Privacy policy and Terms of service are starter templates** - search
  for `[LEGAL]` markers; review with counsel before going public.
- **Hard-delete of therapists is intentionally unsupported.** The admin UI
  exposes Deactivate (sets `active = false`), which preserves existing
  bookings (FK-style references stay valid; DTO-level reads still resolve)
  while blocking new ones. To remove a therapist's data entirely, an admin
  must currently do it via direct DB access.
- **Cookie banner**: not present (no analytics added yet). If you add
  analytics, add the banner.

---

## License

Proprietary - © Vital Touch Massage. Internal use only.
