# SiteVisit — property site-visit booking

A small full-stack app for a real-estate developer: a buyer picks a property, chooses a one-hour visit slot, and gets an instant confirmation. The sales team sees every booking on a password-protected admin page.

**Live demo:** https://site-visit-booking.vercel.app/ · **Demo video (60s):** https://drive.google.com/file/d/1mAqNvTfFPoYYrfYJtEnYEbeEQqV_7VC1/view?usp=sharing

> **The AI generated the booking flow. Its first version double-booked slots: it checked "is this slot free?" and then inserted, so 10 simultaneous requests all passed the check and all 10 got booked. A concurrency test caught it. The fix: a `UNIQUE (property_id, slot)` constraint in Postgres, with the API turning the violation into a clean `409 "slot was just booked"`.**

## Features

- Property list → slot picker (next 7 days, 10 AM–5 PM IST, past and taken slots disabled) → confirmation page with a booking reference
- Admin view at `/admin` (shared password via `ADMIN_PASSWORD`, HMAC session cookie, `httpOnly`)
- Server-side validation: Indian mobile numbers (accepts `+91` / spaces), on-the-hour slots inside visiting hours only, no past slots, unknown property → 404
- If someone else grabs your slot while you're filling in the form, you get a friendly message and the slot grid refreshes
- Mobile-friendly UI

## Stack

Next.js 15 (App Router, TypeScript) · PostgreSQL (Neon in production) · [PGlite](https://pglite.dev) (Postgres in WASM) for local dev and tests, so tests run the same SQL and constraints as prod, with no Docker needed · Vitest.

```
lib/schema.ts      tables + UNIQUE (property_id, slot) constraint
lib/bookings.ts    all booking logic (validation, slots, create, list)
lib/db.ts          pg Pool in prod, PGlite locally/tests
lib/auth.ts        admin password check + session cookie
app/api/...        slots, bookings, admin login, admin bookings
tests/             8 tests, incl. 10 concurrent requests for one slot
docs/              test output before and after the fix
```

## How it was built and tested

See [BUILD_LOG.md](BUILD_LOG.md) for what the AI wrote, what went wrong, and how each issue was caught.

```bash
npm install
npm test          # 8 tests, real Postgres semantics via PGlite
ADMIN_PASSWORD=demo123 npm run dev   # http://localhost:3000, data in ./.data
```

## Deploy (Vercel + Neon, free tiers)

1. Create a free Postgres DB at neon.tech and copy its connection string.
2. Import this repo in Vercel and set the env vars `DATABASE_URL` (the Neon string) and `ADMIN_PASSWORD`.
3. Deploy. Tables and demo properties are created automatically on the first request.

Listings are fictional demo data.
