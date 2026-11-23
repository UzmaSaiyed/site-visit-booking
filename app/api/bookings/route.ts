import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createBooking, BookingError } from "@/lib/bookings";

export async function POST(req: Request) {
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    const booking = await createBooking(await getDb(), {
      propertyId: String(body.propertyId ?? ""),
      slot: String(body.slot ?? ""),
      name: String(body.name ?? ""),
      phone: String(body.phone ?? ""),
    });
    return NextResponse.json({ ref: booking.ref }, { status: 201 });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
