# EventGo — Event Ticket Booking (Seat Reservation Flow)

A simplified event ticket booking system: browse events, pick seats on a live seat
map, hold them with a 10-minute reservation, and confirm the booking — all with
safe handling of concurrent users fighting over the same seats.

**Stack:** Node.js + Express + MongoDB (backend) · React + Vite (frontend)

---

## Project structure

```
ticket-booking/
├── backend/         Express API, MongoDB models, transaction logic
└── frontend/        React (Vite) single-page app
```

---

## Prerequisites

- Node.js 18+
- MongoDB **running as a replica set** (required — see below, this is not optional)

### Why a replica set?

Seat reservation has to be atomic across *multiple* seat documents at once (e.g.
reserving seats A1, A2, A3 together) and across multiple collections (Seat +
Reservation). MongoDB only supports multi-document ACID transactions on a
replica set (or sharded cluster) — not on a standalone `mongod`. This app uses
real transactions (`session.withTransaction`) for that guarantee, rather than a
workaround, so a replica set is required to run it.

**Easiest option — MongoDB Atlas (free tier):** Atlas clusters are already
configured as replica sets. Just create a free cluster and use its connection
string as `MONGO_URI`.

**Local option — single-node replica set:**

```bash
# Start mongod with replication enabled
mongod --replSet rs0 --dbpath /your/data/path

# In a separate terminal, initiate the replica set (one-time)
mongosh --eval "rs.initiate()"
```

After that, `mongodb://localhost:27017/ticket-booking?replicaSet=rs0` works as
a normal connection string.

---

## Running the backend

```bash
cd backend
cp .env.example .env        # edit MONGO_URI / JWT_SECRET if needed
npm install
npm run seed                # creates 3 sample events with seat grids
npm run dev                 # starts on http://localhost:5000
```

The seed script wipes and recreates `Event`, `Seat`, and `Reservation`
collections with three sample events (varying seat-grid sizes) so the frontend
has something to show immediately.

## Running the frontend

```bash
cd frontend
npm install
npm run dev                 # starts on http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:5000`, so no CORS
configuration is needed in development (the backend also has `cors()` enabled
generally, for convenience).

Open `http://localhost:5173`, sign up for an account, and start booking.

---

## API summary

| Method | Endpoint              | Auth | Description                                   |
|--------|------------------------|------|------------------------------------------------|
| POST   | `/api/auth/signup`     | —    | Create an account, returns a JWT               |
| POST   | `/api/auth/login`      | —    | Log in, returns a JWT                          |
| GET    | `/api/events`          | —    | List events with live available-seat counts    |
| GET    | `/api/events/:id`      | —    | Event details + full seat map                  |
| POST   | `/api/reserve`         | JWT  | Reserve seats for 10 minutes                    |
| POST   | `/api/bookings`        | JWT  | Confirm a reservation, marks seats booked       |

`POST /api/reserve` body: `{ "eventId": "...", "seatNumbers": ["A1", "A2"] }`
`POST /api/bookings` body: `{ "reservationId": "..." }`

---

## Design decisions

### Avoiding double booking

This is the core constraint, so it's worth explaining precisely:

1. **Seat is the single source of truth.** Every seat for every event is a
   single document with a `status` field (`available` / `reserved` / `booked`)
   and a unique compound index on `(eventId, seatNumber)` — duplicates are
   impossible at the schema level.

2. **Atomic, filtered updates.** Reserving never does a "read status, then
   write status" round trip (which would have a race window). Instead it runs
   one `updateMany` whose **filter** requires `status: 'available'` and whose
   **update** sets `status: 'reserved'`. MongoDB evaluates the filter and the
   write together, atomically, per document — if two requests hit the same
   seat at the same instant, only one can match `status: 'available'`; the
   other's filter simply matches nothing.

3. **Transactions for multi-seat batches.** A single atomic update handles one
   seat safely, but a *booking* usually wants several seats together, and we
   need "all of them or none of them" — if a user requests A1–A3 and someone
   else grabs A2 a millisecond earlier, the user shouldn't end up holding just
   A1 and A3. So the whole reserve operation runs inside a MongoDB session
   transaction: we update all requested seats in one `updateMany`, then check
   `matchedCount === requestedSeats.length`. If it's short, we throw and the
   transaction rolls back everything — no partial reservations, ever.

4. **Booking confirmation is transactional too.** `POST /api/bookings` flips
   `reserved → booked` and the reservation to `confirmed` inside another
   transaction, after re-validating that the reservation belongs to the
   requesting user, is still `active`, and hasn't expired.

5. **Expired reservations can't be booked.** `expiresAt` is checked at booking
   time regardless of background cleanup — if it's in the past, the seats are
   released back to `available` immediately and the request is rejected
   (`410 Gone`). A lightweight cron job (`node-cron`, every 30s) also sweeps
   for expired reservations proactively, so the seat map looks fresh for other
   browsing users even if nobody tries to book the stale reservation.

### Frontend state handling for the live booking flow

The seat-selection screen explicitly models four stages (`browsing` →
`reserved` → `confirming` → `booked`) rather than a tangle of booleans, so it's
always clear what actions are valid. If the backend rejects a reservation
because a seat was just taken (`409`), the UI surfaces exactly which seats
conflicted, refetches the live seat map, and drops only the conflicting seats
from the user's selection — they don't lose their whole selection over one
contested seat. If the 10-minute countdown reaches zero, or a booking attempt
returns `410` (expired), the flow resets to browsing automatically.

### Authentication

Auth is intentionally minimal, per the assignment's "basic" auth requirement —
the focus of this exercise is the booking/concurrency logic, not an auth
system. Signup/login issue a JWT (7-day expiry) which the frontend attaches via
an Axios request interceptor. Passwords are salted and hashed with Node's
built-in `crypto.scryptSync` rather than plaintext, but this is **not**
production-hardened (no rate limiting, no refresh tokens, no password reset
flow) — a real app should use bcrypt/argon2 and a proper session strategy.

### Why Express transactions, not optimistic locking / version fields

An alternative, lighter-weight approach is a `version` field with
compare-and-swap. I chose real multi-document transactions instead because
this domain has a natural multi-document invariant (a reservation spans N seat
documents + 1 reservation document, and they must all succeed or all fail
together) — transactions express that invariant directly rather than
approximating it with manual rollback logic.

---

## Assumptions

- A "seat" is permanently tied to one event (not reused across events).
- Seat numbering follows a `<RowLetter><Number>` convention (e.g. `A1`, `B12`);
  the frontend groups seats into visual rows by parsing the leading letters.
  Any consistent seat-number scheme would still work for the booking logic
  itself — only the visual grouping assumes this pattern.
- One reservation can hold multiple seats but belongs to exactly one user.
- A user can have multiple concurrent reservations for *different* seat sets
  (the assignment didn't specify a one-active-reservation-per-user limit, so
  this wasn't enforced — easy to add via a unique partial index if desired).
- No payment step — "Confirm Booking" directly finalizes the seats as booked,
  per the assignment's described flow.

---

## Testing the concurrency behavior manually

To see the double-booking prevention in action:

1. Open the same event in two browser tabs (or log in as two different users).
2. Select the *same* seat in both tabs.
3. Click "Reserve seats" in both tabs as close together as possible.
4. One request succeeds; the other receives a `409` with the conflicting seat
   listed, and its UI shows the "just taken by someone else" message after
   refreshing the live seat map.

You can also test expiry by reserving seats, waiting 10 minutes (or
temporarily lowering `RESERVATION_TTL_MINUTES` in `.env` for a faster test),
and confirming that "Confirm booking" then fails with an expired-reservation
error and the seats become selectable again for other users.
