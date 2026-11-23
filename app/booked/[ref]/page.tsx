import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { getBooking } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export default async function Booked({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const b = await getBooking(await getDb(), ref);
  if (!b) notFound();
  const when = new Date(b.slot).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "short" });
  return (
    <div className="panel confirm">
      <div className="tick">✓</div>
      <h1>Site visit confirmed</h1>
      <p>Thanks, {b.name}. We'll see you at <strong>{b.property_name}</strong>, {b.location}.</p>
      <p className="when">{when}</p>
      <p className="muted">Booking reference: <code>{b.ref}</code></p>
      <Link href="/" className="back">← Book another visit</Link>
    </div>
  );
}
