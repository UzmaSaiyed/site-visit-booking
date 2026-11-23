import { getDb } from "@/lib/db";
import { listBookings } from "@/lib/bookings";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

export default async function Admin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  if (!(await isAdmin())) {
    return (
      <form className="panel narrow" method="post" action="/api/admin/login">
        <h1>Admin login</h1>
        {!process.env.ADMIN_PASSWORD && <p className="error">ADMIN_PASSWORD is not configured on the server.</p>}
        <label>
          Password
          <input type="password" name="password" required autoFocus />
        </label>
        {error && <p className="error">Wrong password</p>}
        <button className="primary">Log in</button>
      </form>
    );
  }

  const bookings = await listBookings(await getDb());
  const now = Date.now();
  return (
    <>
      <h1>Site visits</h1>
      <p className="muted">{bookings.length} booking{bookings.length === 1 ? "" : "s"} · {bookings.filter((b) => new Date(b.slot).getTime() > now).length} upcoming</p>
      {bookings.length === 0 ? (
        <p>No bookings yet.</p>
      ) : (
        <div className="tablewrap">
          <table>
            <thead>
              <tr><th>When</th><th>Property</th><th>Visitor</th><th>Mobile</th><th>Ref</th><th>Booked at</th></tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.ref} className={new Date(b.slot).getTime() < now ? "past" : ""}>
                  <td>{fmt(b.slot)}</td>
                  <td>{b.property_name}</td>
                  <td>{b.name}</td>
                  <td><a href={`tel:+91${b.phone}`}>{b.phone}</a></td>
                  <td><code>{b.ref}</code></td>
                  <td className="muted">{fmt(b.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
