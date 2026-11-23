import { randomBytes } from "crypto";
import type { Db } from "./db";

export const TZ_OFFSET = "+05:30"; // Site visits happen in Jaipur (IST)
export const SLOT_HOURS = [10, 11, 12, 13, 14, 15, 16, 17]; // visit start times, 1 hour each

export class BookingError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** "2026-11-25" + 10 -> Date for 10:00 IST that day */
export function slotDate(day: string, hour: number): Date {
  return new Date(`${day}T${String(hour).padStart(2, "0")}:00:00${TZ_OFFSET}`);
}

export function isValidSlot(slot: Date): boolean {
  if (isNaN(slot.getTime())) return false;
  const ist = new Date(slot.getTime() + 330 * 60_000); // shift to IST wall clock
  return ist.getUTCMinutes() === 0 && ist.getUTCSeconds() === 0 && SLOT_HOURS.includes(ist.getUTCHours());
}

export async function getProperties(db: Db) {
  return db.query<{ id: string; name: string; location: string; description: string }>(
    "SELECT id, name, location, description FROM properties ORDER BY name"
  );
}

export async function getProperty(db: Db, id: string) {
  const rows = await db.query<{ id: string; name: string; location: string; description: string }>(
    "SELECT id, name, location, description FROM properties WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}

/** Slots for one property on one day, each marked available or not. */
export async function getSlots(db: Db, propertyId: string, day: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new BookingError(400, "Invalid date");
  const start = slotDate(day, 0);
  const end = new Date(start.getTime() + 24 * 3600_000);
  const taken = await db.query<{ slot: Date }>(
    "SELECT slot FROM bookings WHERE property_id = $1 AND slot >= $2 AND slot < $3",
    [propertyId, start.toISOString(), end.toISOString()]
  );
  const takenSet = new Set(taken.map((t) => new Date(t.slot).getTime()));
  return SLOT_HOURS.map((h) => {
    const d = slotDate(day, h);
    return {
      slot: d.toISOString(),
      label: `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`,
      available: d > now && !takenSet.has(d.getTime()),
    };
  });
}

export interface BookingInput {
  propertyId: string;
  slot: string;
  name: string;
  phone: string;
}

export async function createBooking(db: Db, input: BookingInput, now = new Date()) {
  const name = (input.name ?? "").trim();
  const phone = (input.phone ?? "").replace(/[\s-]/g, "").replace(/^\+91/, "");
  const slot = new Date(input.slot);

  if (name.length < 2 || name.length > 80) throw new BookingError(400, "Please enter your name");
  if (!/^[6-9]\d{9}$/.test(phone)) throw new BookingError(400, "Please enter a valid 10-digit mobile number");
  if (!isValidSlot(slot)) throw new BookingError(400, "That is not a valid visit slot");
  if (slot <= now) throw new BookingError(400, "That slot is in the past");
  if (!(await getProperty(db, input.propertyId))) throw new BookingError(404, "Property not found");

  // No "is it free?" pre-check: the UNIQUE (property_id, slot) constraint is the
  // single source of truth, so two simultaneous requests can't both win.
  const ref = "SV-" + randomBytes(4).toString("hex").toUpperCase();
  try {
    const rows = await db.query<{ ref: string; slot: Date }>(
      "INSERT INTO bookings (ref, property_id, slot, name, phone) VALUES ($1, $2, $3, $4, $5) RETURNING ref, slot",
      [ref, input.propertyId, slot.toISOString(), name, phone]
    );
    return rows[0];
  } catch (e) {
    const err = e as { code?: string; constraint?: string; message?: string };
    if (err.code === "23505" && (err.constraint === "one_booking_per_slot" || err.message?.includes("one_booking_per_slot"))) {
      throw new BookingError(409, "Sorry, that slot was just booked. Please pick another.");
    }
    throw e;
  }
}

export async function getBooking(db: Db, ref: string) {
  const rows = await db.query<{ ref: string; slot: Date; name: string; property_name: string; location: string }>(
    `SELECT b.ref, b.slot, b.name, p.name AS property_name, p.location
       FROM bookings b JOIN properties p ON p.id = b.property_id WHERE b.ref = $1`,
    [ref]
  );
  return rows[0] ?? null;
}

export async function listBookings(db: Db) {
  return db.query<{ ref: string; slot: Date; name: string; phone: string; property_name: string; created_at: Date }>(
    `SELECT b.ref, b.slot, b.name, b.phone, b.created_at, p.name AS property_name
       FROM bookings b JOIN properties p ON p.id = b.property_id
      ORDER BY b.slot ASC`
  );
}
