import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { getProperty } from "@/lib/bookings";
import BookingForm from "./BookingForm";

export const dynamic = "force-dynamic";

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await getProperty(await getDb(), id);
  if (!property) notFound();
  return (
    <>
      <Link href="/" className="back">← All properties</Link>
      <h1>{property.name}</h1>
      <p className="muted">{property.location}</p>
      <p>{property.description}</p>
      <BookingForm propertyId={property.id} />
    </>
  );
}
