import Link from "next/link";
import { getDb } from "@/lib/db";
import { getProperties } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const properties = await getProperties(await getDb());
  return (
    <>
      <h1>Book a site visit</h1>
      <p className="muted">Pick a property, choose a one-hour slot, and get an instant confirmation.</p>
      <div className="grid">
        {properties.map((p) => (
          <Link key={p.id} href={`/property/${p.id}`} className="card">
            <h2>{p.name}</h2>
            <p className="muted">{p.location}</p>
            <p>{p.description}</p>
            <span className="cta">Choose a slot →</span>
          </Link>
        ))}
      </div>
    </>
  );
}
