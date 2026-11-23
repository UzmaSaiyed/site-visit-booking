import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { listBookings } from "@/lib/bookings";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ bookings: await listBookings(await getDb()) });
}
