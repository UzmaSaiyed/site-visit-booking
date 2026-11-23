import { describe, it, expect, beforeEach } from "vitest";
import { createPgliteDb, type Db } from "../lib/db";
import { createBooking, getSlots, slotDate, BookingError } from "../lib/bookings";

const NOW = new Date("2026-11-24T06:00:00Z"); // 11:30 IST
const DAY = "2026-11-25";
const SLOT = slotDate(DAY, 11).toISOString();
const base = { propertyId: "aravali-heights", slot: SLOT, name: "Test User", phone: "9876543210" };

let db: Db;
beforeEach(async () => {
  db = await createPgliteDb(); // fresh in-memory Postgres per test
});

describe("double booking", () => {
  it("rejects a second booking for the same property and slot", async () => {
    await createBooking(db, base, NOW);
    await expect(createBooking(db, { ...base, phone: "9123456780" }, NOW)).rejects.toMatchObject({ status: 409 });
  });

  it("allows only one of many simultaneous requests for the same slot", async () => {
    // Simulates two people tapping "Book" at the same moment.
    const attempts = Array.from({ length: 10 }, (_, i) =>
      createBooking(db, { ...base, name: `Visitor ${i}`, phone: `98765432${String(i).padStart(2, "0")}` }, NOW)
    );
    const results = await Promise.allSettled(attempts);
    const ok = results.filter((r) => r.status === "fulfilled");
    const conflicts = results.filter(
      (r) => r.status === "rejected" && (r.reason as BookingError).status === 409
    );
    expect(ok).toHaveLength(1);
    expect(conflicts).toHaveLength(9);
    const rows = await db.query("SELECT * FROM bookings WHERE property_id = $1", [base.propertyId]);
    expect(rows).toHaveLength(1);
  });

  it("allows the same slot at a different property", async () => {
    await createBooking(db, base, NOW);
    await expect(createBooking(db, { ...base, propertyId: "jagatpura-villas" }, NOW)).resolves.toBeTruthy();
  });

  it("marks a booked slot unavailable", async () => {
    await createBooking(db, base, NOW);
    const slots = await getSlots(db, base.propertyId, DAY, NOW);
    expect(slots.find((s) => s.slot === SLOT)?.available).toBe(false);
    expect(slots.filter((s) => s.available)).toHaveLength(7);
  });
});

describe("validation", () => {
  it("rejects slots in the past", async () => {
    const past = slotDate("2026-11-23", 11).toISOString();
    await expect(createBooking(db, { ...base, slot: past }, NOW)).rejects.toMatchObject({ status: 400 });
  });

  it("rejects off-grid slots (e.g. 11:30 or 9 PM)", async () => {
    for (const s of ["2026-11-25T11:30:00+05:30", "2026-11-25T21:00:00+05:30", "not-a-date"]) {
      await expect(createBooking(db, { ...base, slot: s }, NOW)).rejects.toMatchObject({ status: 400 });
    }
  });

  it("rejects invalid phone numbers and accepts +91 format", async () => {
    await expect(createBooking(db, { ...base, phone: "12345" }, NOW)).rejects.toMatchObject({ status: 400 });
    await expect(createBooking(db, { ...base, phone: "+91 98765 43210" }, NOW)).resolves.toBeTruthy();
  });

  it("rejects unknown properties", async () => {
    await expect(createBooking(db, { ...base, propertyId: "nope" }, NOW)).rejects.toMatchObject({ status: 404 });
  });
});
