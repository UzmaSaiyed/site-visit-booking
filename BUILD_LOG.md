# Build log: what the AI wrote, what broke, how it was caught

Built with an AI coding agent (Claude). The brief: *a site-visit booking page for a property. Pick a slot, get a confirmation, admin sees the list.*

## 1. Double booking under concurrent requests (the important one)

**What the agent wrote first:** `createBooking` ran `SELECT 1 FROM bookings WHERE property_id=$1 AND slot=$2`. If no row came back, it ran `INSERT`. There was no constraint on the table. It looks correct and it passes a "book the same slot twice in a row" test.

**How it was caught:** a test that fires 10 booking requests for the same slot at the same time (`Promise.allSettled`). Expected: 1 success, 9 conflicts. Actual:

```
AssertionError: expected [ { status: 'fulfilled', …(1) }, …(9) ] to have a length of 1 but got 10
```

All 10 passed the "is it free?" check before any of them inserted. Full output: [`docs/test-run-before-fix.txt`](docs/test-run-before-fix.txt).

**Fix:** removed the pre-check and added `CONSTRAINT one_booking_per_slot UNIQUE (property_id, slot)`. The database is now the single source of truth. The API catches Postgres error `23505` on that constraint and returns `409 "Sorry, that slot was just booked"`. The UI refreshes the slot grid when that happens. After the fix: 8/8 tests pass ([`docs/test-run-after-fix.txt`](docs/test-run-after-fix.txt)).

**Checked again over real HTTP** against the production build: 3 simultaneous `curl` POSTs for one slot returned `201, 409, 409`.

**Why the tests use PGlite:** it is real Postgres compiled to WASM, so the unique constraint and error codes in tests match production. A mocked DB would have hidden this bug.

## 2. Smaller issues found while testing

| Issue | How it showed up | Fix |
|---|---|---|
| Next.js build failed: `Can't resolve '@/lib/db'` | `next build` | `npm` had installed TypeScript 7, and Next 15 can't read `tsconfig` paths with it. Pinned `typescript@5`. |
| Every request returned 500 locally | Server log: `ENOENT mkdir .data/pglite` | Create the data folder recursively. Also stopped caching a failed DB connection, which had kept the app broken until restart. |
| Today showed no slots late in the evening | Headless-browser run at 11:30 PM IST | Correct behaviour (past slots are disabled). The page now says "No slots left on this day. Try another day." |

## 3. What's tested

`npm test`: concurrent double-booking, sequential double-booking, same slot at different properties is allowed, booked slot shows unavailable, past slots rejected, off-grid times (11:30, 9 PM, garbage) rejected, phone validation (incl. `+91 98765 43210`), unknown property → 404.

Manual end-to-end check in headless Chrome: home → property → pick slot → confirm → admin list. Admin API returns 401 without login.

## 4. Known limits / next steps

- Single shared admin password, with no per-user accounts or logout.
- No SMS/WhatsApp confirmation. The obvious next feature is a WhatsApp message to the buyer and the sales rep.
- No cancellation/reschedule flow.
