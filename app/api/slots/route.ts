import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSlots, BookingError } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const propertyId = url.searchParams.get("propertyId") ?? "";
  const date = url.searchParams.get("date") ?? "";
  try {
    return NextResponse.json({ slots: await getSlots(await getDb(), propertyId, date) });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
