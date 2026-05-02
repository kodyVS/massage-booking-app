# Virtual Touch Massage — Claude Teams Build Prompt

## Project Overview

Build a production-ready booking app for **Virtual Touch Massage** using Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui, MongoDB (Mongoose), NextAuth, Twilio, and Resend. Deploy target: Vercel.

**Brand palette** (watercolor — coral / periwinkle / cream):
- Coral `#E07A6B` (primary)
- Periwinkle `#A9B8E0` (secondary)
- Soft Blush `#F4D5CE` (card backgrounds)
- Cream `#FBF7F4` (page background)
- Ink `#2A2D3A` (text)
- Coral-Dark `#B85A4D` (text-on-cream variant for AA contrast)

**Fonts**: Fraunces (display/serif) + Inter (body).

**Three audiences**: public customers (landing + booking), admins (full control portal), workers/therapists (their own schedule + availability portal).

**Default services** (admin can add/edit/delete more):
1. Deep Tissue
2. Sports Massage
3. Couples Massage
4. Reflexology

**Payment model**: pay at visit, no online payments.

---

## Global Rules (apply to every agent)

1. **TypeScript strict mode**. No `any` unless justified in a comment.
2. **Server Components by default**; use `"use client"` only when needed (forms, interactivity).
3. **All times stored as UTC** in MongoDB. Render in business timezone (read from Settings).
4. **Validate at boundaries** with Zod. API routes parse input through Zod schemas.
5. **No secrets in code**. Everything sensitive in `.env.local` (and Vercel env).
6. **Accessibility**: every interactive element must be keyboard-reachable; all form inputs need labels.
7. **Mobile-first**. Test every screen at 375px width.
8. **Don't break the previous phase.** When you finish, the prior agent's checklist items must still pass.
9. **Log your handoff** to `HANDOFF.md` at the end of your phase: what you built, what files you touched, any deviations from the spec, and what the next agent needs to know.
10. **Backend isolation is non-negotiable.** All persistence, business logic, and external integrations live in `src/backend/` (see "Backend Architecture" below). Next.js API routes and server actions are *thin delegators only* — they parse the request, call a controller, return the response. No Mongoose calls, no business logic, and no `import` from anywhere outside `src/backend/` is allowed inside the backend folder.

---

## Backend Architecture (read carefully — applies to every agent)

The backend must be organized as a self-contained module under `src/backend/` so it can be extracted into a standalone service later (Express, Fastify, NestJS, separate repo, etc.) with minimal rewriting.

### Folder layout

```
src/
  app/                              # Next.js routes — THIN
    api/
      bookings/route.ts             # calls bookingsController.create(...)
      bookings/[id]/route.ts        # calls bookingsController.update / cancel
      holds/route.ts
      holds/[id]/route.ts
      availability/route.ts
      therapists/route.ts
      services/route.ts
      schedules/route.ts
      settings/route.ts
      intake/[token]/route.ts
      cron/reminders/route.ts
    (public)/                       # landing + booking pages
    (auth)/                         # /login
    (admin)/                        # admin portal
    (portal)/                       # worker portal
  backend/                          # SELF-CONTAINED, EXTRACTABLE
    index.ts                        # public surface — re-exports controllers + types
    controllers/                    # HTTP-shaped: validate input, call services, shape response
      auth.controller.ts
      availability.controller.ts
      bookings.controller.ts
      holds.controller.ts
      intake.controller.ts
      schedules.controller.ts
      services.controller.ts
      settings.controller.ts
      therapists.controller.ts
    services/                       # business logic — no HTTP, no framework
      audit.service.ts
      auth.service.ts
      availability.service.ts       # slot generation
      bookings.service.ts           # creation w/ conflict prevention, reschedule, cancel
      email.service.ts              # dual-toggle wrapper around Resend
      holds.service.ts              # 10-min slot holds
      ics.service.ts                # .ics generation
      intake.service.ts
      reminders.service.ts          # 24h reminder logic for cron
      schedules.service.ts          # working hours + time off
      services.service.ts           # massage service catalog
      settings.service.ts
      sms.service.ts                # dual-toggle wrapper around Twilio
      therapists.service.ts
      tokens.service.ts             # magic link JWT
      turnstile.service.ts
    models/                         # Mongoose schemas + TS interfaces
      auditLog.model.ts
      booking.model.ts
      bookingHold.model.ts
      service.model.ts
      settings.model.ts
      therapist.model.ts
      therapistService.model.ts
      timeOff.model.ts
      user.model.ts
      workingHours.model.ts
    db/
      connection.ts                 # cached Mongoose connection
    types/
      index.ts                      # shared DTOs (BookingDTO, TherapistDTO, etc.)
      errors.ts                     # custom error classes (NotFoundError, ConflictError, ValidationError)
    validation/
      bookings.schema.ts            # Zod schemas — input validation
      therapists.schema.ts
      ...
  components/                       # React — frontend only
  hooks/                            # React hooks — frontend only
  lib/                              # frontend-only helpers (e.g. cn(), date formatting for display)
  middleware.ts                     # Next.js middleware (auth gating)
```

### Layer responsibilities

**Models (`src/backend/models/`)**
- Mongoose schema + model + exported TypeScript interface for documents
- May define instance/static methods on the schema
- Do NOT import from controllers or services

**Services (`src/backend/services/`)**
- All business logic lives here
- Receives plain objects (DTOs), returns plain objects (DTOs) — never returns raw Mongoose documents to callers
- May import from models and other services
- Throws typed errors from `backend/types/errors.ts`
- Has **zero knowledge of HTTP, Next.js, NextRequest, NextResponse, cookies, or headers**
- Reusable from a future Express/Fastify server with no changes

**Controllers (`src/backend/controllers/`)**
- Accepts already-parsed input (the Next.js route handler does the parsing) OR accepts a request-shaped object and parses it via Zod
- Calls one or more services
- Returns DTOs or throws typed errors — never touches `Response`/`NextResponse` directly
- Convention: every controller method takes an `input` object and an optional `context` object (`{ userId?, role? }` for authenticated calls)

**Next.js routes (`src/app/api/.../route.ts`)**
- Read the request (JSON, form data, params, headers)
- Call `auth()` if the route requires a session, build a `context` object
- Call the appropriate controller method
- Map controller return → `NextResponse.json(...)`
- Map typed errors → HTTP status codes (a single helper in `src/lib/api-response.ts` does this)
- **Target: under 20 lines per route.** If a route grows past that, move logic into the controller or a service.

**Server actions** (used in admin/worker portals): same rule — thin wrapper that calls a controller. No business logic in the action body.

### Dependency rules (enforce these — they are what make extraction possible)

1. `src/backend/**` may import from: `src/backend/**`, `mongoose`, `zod`, `bcryptjs`, `date-fns`, `jsonwebtoken`, `twilio`, `resend`, `ics`, `@upstash/*` — i.e. only third-party libs and itself.
2. `src/backend/**` may **NOT** import from: `src/app/**`, `src/components/**`, `src/hooks/**`, `src/lib/**`, `next/*`, `next-auth` (NextAuth lives in the route layer; the backend exposes a pure `verifyCredentials(email, password)` service that NextAuth wraps).
3. `src/app/**` and components/hooks may import from `src/backend/index.ts` (the public surface) — never reach into `src/backend/services/*` or `src/backend/models/*` directly. This makes the seam visible.
4. Add an ESLint rule (`no-restricted-imports` or `eslint-plugin-boundaries`) that enforces rules 1–3. Violations fail CI.

### Public surface (`src/backend/index.ts`)

Re-exports the controllers and types that Next.js routes need:

```ts
export * as bookingsController from "./controllers/bookings.controller";
export * as therapistsController from "./controllers/therapists.controller";
// ... etc
export * from "./types";
export * from "./types/errors";
export { connectDB } from "./db/connection";
```

Routes import like: `import { bookingsController } from "@/backend";`

### Example: end-to-end shape of one booking creation

```
POST /api/bookings (Next route handler, ~15 lines)
  └─ parses JSON body
  └─ calls bookingsController.create({ input, context })
       └─ Zod-validates input
       └─ calls bookingsService.createBooking(...)
            └─ verifies hold via holdsService
            └─ atomic insert via Booking model with conflict check
            └─ fires sms/email side effects via smsService + emailService (non-throwing)
            └─ returns BookingDTO
       └─ returns BookingDTO
  └─ NextResponse.json({ booking })
```

A future extraction is then: copy `src/backend/` into a new repo, replace the Next route handlers with Express handlers that call the same controllers. Zero changes to services, models, or business logic.

---

## Team Roles

### Agent 1 — Architect (Phase 0: Foundation)
**Mission**: Stand up the skeleton so other agents can build into a working repo.

**Scope**:
- Initialize Next.js 15 with App Router, TypeScript (strict), Tailwind
- Install and configure shadcn/ui with the brand palette in `tailwind.config.ts` and `globals.css` (CSS variables)
- Set up Fraunces + Inter via `next/font/google`
- Install: `mongoose`, `next-auth@beta`, `bcryptjs`, `zod`, `react-hook-form`, `@hookform/resolvers`, `date-fns`, `date-fns-tz`, `jsonwebtoken`, `twilio`, `resend`, `ics`, `@upstash/ratelimit`, `@upstash/redis`, `@marsidev/react-turnstile`
- Install dev: `eslint-plugin-boundaries` (or equivalent for the import-boundary rule)
- Build the **full backend folder skeleton** under `src/backend/` per the "Backend Architecture" section — every controllers/, services/, models/, db/, types/, validation/ subfolder exists with placeholder `index.ts` files where appropriate
- Create `src/backend/db/connection.ts` exporting `connectDB()` with a cached Mongoose connection on `global` (Vercel serverless-safe)
- Create `src/backend/index.ts` as the public surface (empty re-exports for now, agents will fill it)
- Create `src/backend/types/errors.ts` with `NotFoundError`, `ConflictError`, `ValidationError`, `UnauthorizedError`, `ForbiddenError` classes
- Create `src/lib/api-response.ts` — single helper that maps backend typed errors to HTTP responses (used by every Next route handler)
- Configure ESLint with the boundary rules from "Dependency rules" (1–3) — failures must break `npm run lint`
- Add a `tsconfig.json` path alias `@/backend/*` → `src/backend/*` (and `@/*` → `src/*`)
- Create `.env.example` with all required vars and inline comments
- Create the `src/app/` route group structure: `(public)`, `(auth)`, `(admin)`, `(portal)`, plus `api/` placeholder folders
- Set up `middleware.ts` skeleton (no logic yet — just the file with role-based route matching commented)
- Add `vercel.json` with cron config placeholder for the 24h reminder job
- Configure `next.config.js` with `images.remotePatterns` for Cloudinary/Vercel Blob

**Deliverable checklist** — every item must be checked before handoff:
- [ ] `npm run dev` starts without error and shows a placeholder homepage
- [ ] `npm run build` completes successfully
- [ ] `npm run lint` passes (including the new boundary rules)
- [ ] `tsc --noEmit` passes
- [ ] Tailwind classes using `bg-coral`, `text-ink`, `bg-cream` resolve correctly
- [ ] Both fonts load (verify in browser dev tools)
- [ ] Full `src/backend/` folder tree exists with every subfolder from the spec
- [ ] `src/backend/db/connection.ts` exports `connectDB()` that caches the connection in `global` to survive hot reloads
- [ ] `src/backend/types/errors.ts` exports all five error classes
- [ ] `src/lib/api-response.ts` exists and maps typed errors → HTTP status codes
- [ ] ESLint boundary rule rejects a test import from `src/backend/services/...` into `src/components/...` (verify by adding then removing a violating import)
- [ ] ESLint boundary rule rejects a test import from `src/backend/...` into `next/*` (same — verify, then remove)
- [ ] Path aliases `@/backend` and `@/` resolve in TS and at build time
- [ ] `.env.example` lists: `MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `JWT_SECRET`, `SMS_ENABLED`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `EMAIL_ENABLED`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `BUSINESS_TIMEZONE`, `CRON_SECRET`
- [ ] Folder structure matches the spec exactly
- [ ] `HANDOFF.md` written

---

### Agent 2 — Backend Engineer (Phase 1: Data Layer + Auth)
**Mission**: Models, seed data, authentication, and the foundational business-logic helpers that the booking flow will depend on.

**Scope** — every piece of this work lives under `src/backend/`. The only files this agent should touch outside `src/backend/` are: `middleware.ts`, `src/app/(auth)/login/page.tsx`, `src/app/api/auth/[...nextauth]/route.ts`, and `scripts/seed.ts`.

- Mongoose models in `src/backend/models/`:
  - `user.model.ts` (email unique, passwordHash, role: `'admin' | 'worker'`, therapistId?, active)
  - `therapist.model.ts` (name, photoUrl, bio, specialties[], licenseNumber?, yearsExperience?, active)
  - `service.model.ts` (name, description, durationMin, price, active)
  - `therapistService.model.ts` (therapistId, serviceId) — compound unique index
  - `workingHours.model.ts` (therapistId, dayOfWeek 0–6, startTime "HH:mm", endTime "HH:mm")
  - `timeOff.model.ts` (therapistId, startAt, endAt, reason, status)
  - `booking.model.ts` (therapistId, serviceId, customerName, customerEmail, customerPhone, startAt, endAt, status: `'pending'|'confirmed'|'cancelled'|'completed'|'no_show'`, notes, intakeFormData?, manageToken (unique), reminderSentAt?, createdAt) — **compound index on (therapistId, startAt)**
  - `bookingHold.model.ts` (therapistId, serviceId, startAt, endAt, sessionId, expiresAt) — **TTL index on expiresAt**
  - `auditLog.model.ts` (actorId, actorRole, action, entityType, entityId, before, after, createdAt)
  - `settings.model.ts` (singleton: `defaultOpenTime`, `defaultCloseTime`, `defaultDaysOpen[]`, `slotIntervalMin`, `bufferMin`, `cancellationPolicy`, `smsNotificationsEnabled`, `emailNotificationsEnabled`, `intakeRequired`, `businessName`, `businessPhone`, `businessAddress`, `businessTimezone`)
- Each model exports both the Mongoose model AND a plain TS interface (`IBooking`, `BookingDTO`, etc.). Services convert documents to DTOs before returning.
- DTO types collected in `src/backend/types/index.ts`.
- Zod input schemas in `src/backend/validation/` — one file per entity (e.g. `bookings.schema.ts`).
- Services in `src/backend/services/`:
  - `availability.service.ts` — `getAvailableSlots(therapistId, serviceId, date)` accounting for working hours, time off, existing bookings, active holds, service duration, buffer; `getFirstAvailableAcrossTherapists(serviceId)`
  - `holds.service.ts` — `createHold`, `releaseHold`, `verifyHold` (10-min TTL)
  - `bookings.service.ts` — `createBooking` (atomic conflict prevention via `findOneAndUpdate` with overlap query OR a transaction), `rescheduleBooking`, `cancelBooking`, `markNoShow`, `markCompleted`, `listBookings(filters)`
  - `therapists.service.ts`, `services.service.ts`, `schedules.service.ts`, `settings.service.ts` — CRUD + business rules (e.g. workers can't set hours outside business envelope)
  - `auth.service.ts` — `verifyCredentials(email, password)` returns user DTO or throws `UnauthorizedError`. **No NextAuth import here** — NextAuth wraps this from the route layer.
  - `tokens.service.ts` — `generateManageToken(bookingId)`, `verifyManageToken(token)` using `jsonwebtoken` with `JWT_SECRET`
  - `audit.service.ts` — `record({ actorId, action, entityType, entityId, before, after })`
- Controllers in `src/backend/controllers/`:
  - One controller per entity, each method takes `{ input, context? }` where `context = { userId?, role? }`
  - Validates input via the Zod schema before calling services
  - Catches and re-throws as typed errors from `backend/types/errors.ts`
  - Returns DTOs only — never raw documents, never `Response` objects
- Public surface: update `src/backend/index.ts` to re-export all controllers and DTO types.
- NextAuth config at `src/app/api/auth/[...nextauth]/route.ts` (or equivalent v5 setup) — credentials provider that calls `authService.verifyCredentials(...)`. JWT strategy. Role embedded in token/session.
- Login page at `/login` — form posts to a server action that calls NextAuth `signIn` and redirects admin → `/admin`, worker → `/portal`. The server action does NOT touch the DB directly.
- `middleware.ts` enforces role-based access on `/admin/*` (admin only) and `/portal/*` (worker only); unauthenticated → `/login`.
- Seed script `scripts/seed.ts` (run with `tsx`) — imports services from `src/backend/services/*` (NOT models directly) where reasonable; idempotent:
  - 1 admin user (`admin@virtualtouch.com` / `Admin123!` — log a warning to change in production)
  - 3 sample therapists with bios + specialties + working hours (Mon–Fri 9–5 default)
  - 1 worker user per therapist
  - The 4 default services (Deep Tissue, Sports, Couples, Reflexology)
  - TherapistService links (each therapist offers all 4)
  - Settings document with sensible defaults

**Deliverable checklist**:
- [ ] All 10 models created in `src/backend/models/` with proper TypeScript types exported
- [ ] Booking model has compound index on `(therapistId, startAt)`
- [ ] BookingHold has TTL index that auto-expires holds
- [ ] All services exist in `src/backend/services/` and pass `tsc --noEmit`
- [ ] No service file imports from `next/*`, `next-auth`, or anywhere outside `src/backend/`
- [ ] All controllers exist in `src/backend/controllers/` and re-export through `src/backend/index.ts`
- [ ] Each controller method validates input via Zod before calling services
- [ ] Services return DTOs, not Mongoose documents
- [ ] `npm run seed` populates a fresh DB and is idempotent (drops + recreates safely)
- [ ] Login at `/login` works with seeded admin and worker credentials (NextAuth wraps `authService.verifyCredentials`)
- [ ] Middleware redirects unauthenticated users to `/login`
- [ ] Admin trying to access `/portal/*` is redirected to `/admin` and vice versa
- [ ] `availabilityService.getAvailableSlots()` returns correct slots given a therapist, service, date — verified with a unit test
- [ ] `bookingsService.createBooking()` rejects a second booking that overlaps (test fires two concurrent calls; exactly one wins)
- [ ] `holdsService.createHold()` and TTL-driven cleanup verified (insert hold, set short TTL, confirm Mongo expires it)
- [ ] ESLint boundary rules still pass (no leakage of frontend imports into backend)
- [ ] `tsc --noEmit` passes; `npm run build` passes
- [ ] `HANDOFF.md` updated with seed credentials, model decisions, and a list of which controllers/methods are now available for FE agents to call

---

### Agent 3 — Public Frontend Engineer (Phase 2: Landing + Booking Flow)
**Mission**: The customer experience — landing page, therapist selection, calendar, and booking confirmation. This is what sells the business.

**Scope**:

**Landing page (`/`)**:
- Hero: business name (Fraunces), tagline, the watercolor brand artwork (placeholder image OK — use `next/image` with a stable filename so it's swappable), prominent "Book Now" CTA → `/book`
- Services section: pulls from DB, shows the 4 (or current) services as cards with name, duration, price, short description
- "Meet Our Therapists" section: pulls from DB, shows therapist cards (photo, name, specialties)
- Testimonials section (3 hardcoded for now, marked with a TODO to make CMS-driven later)
- FAQ accordion (what to wear, parking, first-visit, cancellation policy from Settings)
- Footer: business info, hours, address, phone, social placeholders

**Booking flow**:
- `/book` — therapist grid + "Any therapist (first available)" option at the top
- `/book/[therapistId]` — therapist profile (full bio, credentials), service picker (cards with duration + price), date picker (next 30 days), time-slot list for selected date, "Continue" button. Mobile-first: date scroller → vertical slot list.
- `/book/confirm` — form for name, email, phone, optional notes; booking summary panel; cancellation policy displayed; Turnstile widget; submit
- Slot hold: when user picks a time, call `POST /api/holds` to lock for 10 min; show a countdown; release on navigation away or expiry
- On submit: server action calls `createBooking()`, redirects to `/book/success?token=...` showing confirmation details + "Add to calendar" (.ics download) + "Manage your booking" magic link

**Manage booking page (`/manage/[token]`)**:
- Token-gated view of the booking
- Buttons: "Reschedule" (returns to calendar with their booking pre-loaded) and "Cancel" (with confirmation modal)
- Shows cancellation policy

**API routes (all THIN — under 20 lines each, delegate to controllers)**:
- `POST /api/holds` — calls `holdsController.create({ input, context })` (rate-limited via Upstash)
- `DELETE /api/holds/[id]` — calls `holdsController.release({ input })`
- `POST /api/bookings` — calls `bookingsController.create({ input, context })` (verifies hold + Turnstile token via controller; rate-limited)
- `PATCH /api/bookings/[id]` — calls `bookingsController.reschedule({ input })` (token-authenticated; token verified inside controller)
- `DELETE /api/bookings/[id]` — calls `bookingsController.cancel({ input })`
- `GET /api/availability` — calls `availabilityController.list({ input })`
- All routes use the `src/lib/api-response.ts` helper to map typed errors → HTTP status codes
- Rate limiting (Upstash) is applied at the route layer, not inside controllers

**FE notes**:
- Server-rendered DB reads (landing page, therapist list) call controllers directly: `import { therapistsController } from "@/backend"` — no need to round-trip through `/api/*`
- Client-side mutations (booking submit, hold creation) hit the `/api/*` routes
- Components live in `src/components/booking/` etc., not in `src/backend/`

**Deliverable checklist**:
- [ ] Landing page renders all DB-driven sections (services + therapists update when DB changes)
- [ ] No component file imports from `src/backend/services/*` or `src/backend/models/*` directly — only from `@/backend` (the public surface)
- [ ] No API route file is over 20 lines of logic (parsing + controller call + response mapping)
- [ ] All pages pass Lighthouse mobile score ≥ 90 for performance and accessibility
- [ ] Color contrast verified: body text uses `coral-dark` on `cream` (passes WCAG AA)
- [ ] Booking flow works end-to-end with seeded data
- [ ] Two simultaneous booking attempts on the same slot — exactly one succeeds, the other gets a clear error
- [ ] Slot hold expires after 10 min and releases the slot
- [ ] Slot generator excludes times that would run into the next booking (90-min service can't start 30 min before existing booking)
- [ ] "Any therapist" option surfaces the earliest slot across all therapists for the chosen service
- [ ] `.ics` download opens in macOS Calendar / Google Calendar correctly
- [ ] Magic link `/manage/[token]` allows reschedule + cancel without login
- [ ] Turnstile blocks submissions with invalid/missing token
- [ ] Rate limit on `/api/bookings` and `/api/holds` (5 req/min per IP)
- [ ] Keyboard-only navigation works through entire booking flow
- [ ] All forms have visible focus states using the periwinkle accent
- [ ] ESLint boundary rules still pass
- [ ] `npm run build` passes; no console errors in browser
- [ ] `HANDOFF.md` updated

---

### Agent 4 — Internal Portals Engineer (Phase 3: Admin + Worker Portals)
**Mission**: The two authenticated dashboards that admins and therapists use to run the business.

**Scope**:

**Admin portal (`/admin`)**:
- Dashboard home — today's bookings count, this week's bookings, occupancy rate, upcoming bookings list
- `/admin/therapists` — list, create, edit, deactivate. Form fields: name, photo URL (paste-only for v1), bio, specialties (tag input), license #, years exp, active toggle
- `/admin/services` — list, create, edit, deactivate. Fields: name, description, duration (min), price, active. Assign which therapists offer each (multi-select)
- `/admin/schedules` — week view of all therapists side-by-side; click a cell to view/edit booking; click empty cell to create booking or block time
- `/admin/bookings` — table with filters (date range, therapist, status, customer name); row actions: view, reschedule, cancel, mark no-show, mark completed
- `/admin/customers` — derived from bookings; click into a customer view that shows their booking history + private notes (admin can add notes attached to email)
- `/admin/settings` — business info, hours, slot interval, buffer, cancellation policy, **SMS toggle** (disabled with explanation if `SMS_ENABLED=false` in env), **email toggle** (same pattern with `EMAIL_ENABLED`)

**Worker portal (`/portal`)**:
- Dashboard home — today's schedule, next appointment, upcoming bookings
- `/portal/schedule` — week view of their own bookings (read-only on the booking itself; can drag empty time to block)
- `/portal/availability` — toggle days on/off, request time off (shows as pending until admin approves OR auto-approved per Settings flag)
- `/portal/hours` — set per-day working hours (within admin-defined business hours envelope; UI prevents going outside)
- `/portal/bookings/[id]` — read-only booking detail with customer intake form data + therapist-private notes field they can edit

**Shared infrastructure**:
- Shared layout with sidebar nav, role-aware (different items for admin vs worker)
- Toast notifications for all mutations (success/error)
- Loading + empty + error states for every page
- **All mutations via server actions that are THIN delegators** — each action: gets the session, builds context, calls a controller, returns the result. No DB calls, no business logic. Zod validation happens inside the controller.
- Server actions live next to the page they're used on (e.g. `src/app/(admin)/admin/therapists/actions.ts`) and only import from `@/backend`
- Audit logging happens inside the relevant service (not in the action), so it works regardless of how the controller is invoked

**Deliverable checklist**:
- [ ] Admin can create/edit/delete therapists and the changes appear on the public site
- [ ] Admin can create a new service and assign therapists; it appears in the booking flow
- [ ] Admin can reschedule a booking and the slot changes immediately
- [ ] Admin can mark a booking as no-show; status persists
- [ ] Admin Settings SMS toggle is disabled (with explanatory text) when `SMS_ENABLED=false`
- [ ] Admin Settings SMS toggle becomes editable when `SMS_ENABLED=true`
- [ ] Same toggle pattern works for email
- [ ] Worker can view their schedule but cannot see other therapists' bookings
- [ ] Worker can edit their working hours within business-hours envelope; UI rejects outside-envelope times
- [ ] Worker can block off time (e.g., lunch 12–1) and it disappears from public booking availability
- [ ] Worker can add private notes to a booking; admin can see them; customer cannot
- [ ] Audit log records show up in the DB for every write action (verified via direct DB query)
- [ ] No server action file is over 25 lines of logic
- [ ] No portal page imports from `src/backend/services/*` or `src/backend/models/*` directly — only from `@/backend`
- [ ] All forms have client + server validation
- [ ] All pages have loading skeletons and empty states
- [ ] Keyboard navigation works for all admin tables and forms
- [ ] ESLint boundary rules still pass
- [ ] `npm run build` passes; portal works end-to-end with seed data
- [ ] `HANDOFF.md` updated

---

### Agent 5 — Integrations Engineer (Phase 4: SMS, Email, Reminders, Intake Forms)
**Mission**: External services and the time-based jobs that make the app feel professional.

**Scope**:

All integrations live in `src/backend/services/` so they're portable with the rest of the backend. Email templates are the one exception — they live in `src/emails/` since they're presentational.

**SMS service (`src/backend/services/sms.service.ts`)**:
- `sendSms(to, body)` — checks `process.env.SMS_ENABLED === 'true'` AND `settings.smsNotificationsEnabled === true`; if either is false, no-op silently and log
- Validates phone format (E.164) before sending
- Wraps Twilio errors and logs without throwing (booking creation must not fail because SMS failed)
- Helpers: `sendBookingConfirmation(booking)`, `sendReminder(booking)`, `sendCancellation(booking)`
- Each message includes business name, time (in business TZ), therapist, "Reply STOP to opt out"
- Called by `bookings.service.ts` (after successful create/cancel/reschedule) and `reminders.service.ts` (cron)

**Email service (`src/backend/services/email.service.ts`)**:
- `sendEmail({ to, subject, html, ics? })` — same dual-toggle pattern (`EMAIL_ENABLED` env + `settings.emailNotificationsEnabled`)
- Renders templates from `src/emails/` (React components or HTML strings):
  - Booking confirmation (with .ics attachment + magic-link button)
  - 24h reminder
  - Cancellation notice
  - Reschedule confirmation
- All templates use brand palette and Fraunces/Inter where webfonts are supported
- `email.service.ts` may import from `src/emails/` (string templates) but `src/emails/` must NOT import from anywhere outside `src/emails/` and third-party libs — keeps the dependency direction clean

**ICS service (`src/backend/services/ics.service.ts`)**:
- `generateBookingIcs(booking)` returns a string + filename
- Used by both the email service (as attachment) and the public success page (as download)

**Reminders service + cron**:
- `src/backend/services/reminders.service.ts` — `sendDueReminders()` finds bookings in 23.5–24.5h window where `reminderSentAt` is null, sends SMS + email, sets `reminderSentAt`. Idempotent.
- `src/backend/controllers/cron.controller.ts` (or fold into existing) — `sendReminders()` method
- `src/app/api/cron/reminders/route.ts` — thin route handler that:
  1. Verifies `CRON_SECRET` header (returns 401 if missing/wrong)
  2. Calls the controller
  3. Returns count
- Registered in `vercel.json` to run every 15 min

**Intake form**:
- Schema field on Booking: `intakeFormData` (sub-document: pressurePreference, problemAreas[], allergies, medications, healthConditions, pregnancyStatus, recentInjuries, firstVisit boolean, signedAt) — already in the model from Phase 1
- `intake.service.ts` — `getByToken(token)`, `submit(token, data)`
- `intake.controller.ts` — exposes those for the public intake page
- Page at `src/app/(public)/intake/[token]/page.tsx` (token-gated, no login) — fetches via controller, submits via thin server action that calls the controller
- Therapist sees completed intake on their booking detail page (already wired in Phase 3)
- Admin Settings has `intakeRequired` toggle that the email service checks (only attaches intake link when true)

**Turnstile service (`src/backend/services/turnstile.service.ts`)**:
- `verifyToken(token, ip?)` returns boolean or throws `ValidationError`
- Called by `bookingsService.createBooking` if a token is provided in input

**Deliverable checklist**:
- [ ] All integration code lives in `src/backend/services/` (sms, email, ics, reminders, intake, turnstile)
- [ ] No service imports from `next/*` or any frontend module
- [ ] SMS no-ops cleanly when `SMS_ENABLED=false` (verify with logs, no Twilio call made)
- [ ] SMS no-ops cleanly when env=true but settings toggle=false
- [ ] SMS sends successfully when both flags are true (verified with Twilio test credentials or live test)
- [ ] Same dual-toggle behavior verified for email
- [ ] Booking creation triggers confirmation SMS + email (when enabled) — verified with seeded test
- [ ] Cancellation triggers cancellation SMS + email
- [ ] Reminder cron endpoint returns 401 without `CRON_SECRET`
- [ ] Reminder cron correctly identifies bookings in the 24h window and only sends once (idempotent — second run doesn't double-send)
- [ ] Cron route handler is under 20 lines (delegates to controller)
- [ ] `.ics` attachment opens correctly in Apple Calendar, Google Calendar, Outlook
- [ ] Intake form magic link works; submission persists to booking; therapist can view it
- [ ] Turnstile rejects requests with invalid/missing tokens (verified by sending bad token)
- [ ] All Twilio/Resend errors are caught and logged — booking creation never fails because of integration errors
- [ ] ESLint boundary rules still pass
- [ ] `HANDOFF.md` updated with how to test each integration locally (Twilio test creds, Resend test domain)

---

### Agent 6 — QA & Polish (Phase 5: Final Pass)
**Mission**: Make it feel finished. Hunt edge cases, fix rough edges, prepare for production deploy.

**Scope**:

**Accessibility audit**:
- Run axe-core / Lighthouse on every page; fix all critical and serious issues
- Verify keyboard-only flows for booking, login, and admin CRUD
- Confirm focus states are visible and consistent (periwinkle outline)
- All images have alt text; all icons have aria-labels
- Color contrast: every text/background pair passes WCAG AA (4.5:1 for body, 3:1 for large text)
- Form errors are announced to screen readers (aria-live regions)

**Edge cases to test and fix**:
- Booking right at midnight (timezone boundaries)
- Booking on DST transition days
- Therapist deactivated mid-flow (existing bookings preserved, new bookings blocked)
- Service deactivated mid-flow (same)
- Admin deletes a therapist with future bookings (must block or cascade with warning)
- Customer enters invalid phone (E.164 validation with a clear error)
- Customer enters phone without country code (auto-prepend default OR clear error)
- Two browser tabs both holding the same slot
- Hold expires while user is on confirm page (graceful re-route with explanation)
- Network failure during booking submit (no double-submit, clear retry path)
- Worker tries to set hours outside business envelope (UI prevents + server rejects)

**Mobile polish**:
- Test every page at 375px and 414px
- Calendar/slot picker works smoothly on touch
- All tap targets ≥ 44px
- No horizontal scroll anywhere

**Production readiness**:
- README with setup, env vars, seed instructions, deploy steps
- README must include a "Backend Architecture" section explaining the `src/backend/` separation, dependency rules, and how to extract it later
- Verify all env vars are present in Vercel project settings before deploy
- Configure Vercel Cron in `vercel.json`
- MongoDB Atlas: ensure indexes exist in production (write a `scripts/ensure-indexes.ts` that imports from `src/backend/models/`)
- Add a basic error boundary at the app root with a friendly fallback
- Add a 404 page on-brand
- Add `robots.txt` and a basic `sitemap.ts`
- Add Open Graph + Twitter card meta on landing page
- Ensure no `console.log` in production code (use a logger or remove)

**Architecture audit** (final boundary check before sign-off):
- Spot-check 5 random API routes: each must be a thin delegator (parse → controller → response)
- Spot-check 5 random server actions: same rule
- `grep -rn "from \"next" src/backend/` — must return zero results
- `grep -rn "from \"next-auth" src/backend/` — must return zero results
- `grep -rn "src/backend/services" src/components/ src/app/` — must return zero results outside `src/backend/`
- `grep -rn "src/backend/models" src/components/ src/app/` — must return zero results outside `src/backend/` and `scripts/ensure-indexes.ts`

**Privacy & compliance**:
- Privacy policy page (template OK, with notes for legal review)
- Terms page
- SMS opt-in language on booking form: "By providing your number, you agree to receive booking-related SMS. Reply STOP to opt out."
- Cookie banner if any analytics added (skip if none)

**Deliverable checklist**:
- [ ] Lighthouse scores on `/`, `/book`, `/book/[id]`: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95 (mobile)
- [ ] axe-core: zero serious or critical violations on every page
- [ ] All edge cases above tested and handled
- [ ] Mobile at 375px: every page passes visual review with no overflow, no overlapping elements
- [ ] README complete and accurate (a fresh dev can clone and run in under 10 min)
- [ ] `.env.example` matches actual usage; no missing or stale vars
- [ ] Production build deploys to Vercel preview successfully
- [ ] Seeded production preview demonstrates a full booking flow end-to-end
- [ ] Cron job fires on Vercel preview (verify in logs)
- [ ] Privacy/terms pages exist and are linked from footer + booking form
- [ ] No `console.log` in `src/`
- [ ] All TODOs in the codebase either resolved or filed as issues with rationale
- [ ] Architecture audit (greps above) all pass with zero violations
- [ ] README documents the backend extraction path
- [ ] Final `HANDOFF.md` summarizes what's done and any known limitations

---

## Phase Order & Handoff Protocol

```
Architect (0)  →  Backend (1)  →  Public FE (2)  →  Portals (3)  →  Integrations (4)  →  QA (5)
```

**Handoff rules**:
1. Each agent only starts when the prior agent's full checklist is green.
2. Each agent reads `HANDOFF.md` first to understand what's already there.
3. Each agent commits in small, descriptive chunks. No giant single commits.
4. If a downstream agent finds a defect in upstream work, they fix it forward (don't block) but document the fix in `HANDOFF.md`.
5. The QA agent has authority to send any phase back for rework if checklist items are not actually satisfied.

---

## Definition of Done (whole project)

- [ ] All 6 phase checklists complete
- [ ] Production deployment to Vercel works
- [ ] Real test booking can be made end-to-end with SMS + email confirmation received
- [ ] Admin can manage therapists, services, schedules, bookings, settings
- [ ] Worker can manage their own schedule, hours, availability, view bookings + intake forms
- [ ] All 12 polish items (slot locking, service-aware slots, email + .ics, 24h reminder, magic-link manage, block-off time, customer notes, intake form, Turnstile, DB conflict prevention, cancellation policy, mobile-first calendar) are functional
- [ ] Backend isolation verified: `src/backend/` has zero imports from `next/*`, `next-auth`, or frontend folders; all API routes and server actions are thin delegators
- [ ] No critical accessibility violations
- [ ] README enables a new dev to set up and run the project
