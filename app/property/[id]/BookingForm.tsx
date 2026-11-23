"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Slot = { slot: string; label: string; available: boolean };

// Next 7 days as YYYY-MM-DD in IST
function nextDays(n = 7) {
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.now() + i * 86400_000);
    const value = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const label = d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" });
    out.push({ value, label: i === 0 ? `Today, ${label.split(", ")[1] ?? label}` : label });
  }
  return out;
}

export default function BookingForm({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [days] = useState(nextDays);
  const [day, setDay] = useState(days[0].value);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadSlots(d: string) {
    setSlots(null);
    const r = await fetch(`/api/slots?propertyId=${encodeURIComponent(propertyId)}&date=${d}`, { cache: "no-store" });
    const j = await r.json();
    setSlots(j.slots ?? []);
  }

  useEffect(() => {
    setSelected(null);
    loadSlots(day);
  }, [day]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return setError("Please pick a time slot");
    setSubmitting(true);
    setError(null);
    const r = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, slot: selected, name, phone }),
    });
    const j = await r.json();
    setSubmitting(false);
    if (r.ok) return router.push(`/booked/${j.ref}`);
    setError(j.error ?? "Something went wrong");
    if (r.status === 409) {
      setSelected(null);
      loadSlots(day); // someone else got it — refresh the grid
    }
  }

  return (
    <form className="panel" onSubmit={submit}>
      <h3>1. Pick a day</h3>
      <div className="chips">
        {days.map((d) => (
          <button type="button" key={d.value} className={d.value === day ? "chip on" : "chip"} onClick={() => setDay(d.value)}>
            {d.label}
          </button>
        ))}
      </div>

      <h3>2. Pick a time</h3>
      {!slots ? (
        <p className="muted">Loading slots…</p>
      ) : slots.every((s) => !s.available) ? (
        <p className="muted">No slots left on this day. Try another day.</p>
      ) : (
        <div className="chips">
          {slots.map((s) => (
            <button
              type="button"
              key={s.slot}
              disabled={!s.available}
              className={s.slot === selected ? "chip on" : "chip"}
              onClick={() => setSelected(s.slot)}
              title={s.available ? "" : "Not available"}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <h3>3. Your details</h3>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} />
      </label>
      <label>
        Mobile number
        <input value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" placeholder="98765 43210" />
      </label>

      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" disabled={submitting || !selected}>
        {submitting ? "Booking…" : "Confirm site visit"}
      </button>
    </form>
  );
}
