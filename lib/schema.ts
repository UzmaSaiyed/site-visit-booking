export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS properties (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  location    TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id          SERIAL PRIMARY KEY,
  ref         TEXT NOT NULL UNIQUE,
  property_id TEXT NOT NULL REFERENCES properties(id),
  slot        TIMESTAMPTZ NOT NULL,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One visit per property per slot, enforced by the database itself.
  -- (An app-level "check then insert" is not enough: concurrent requests all pass the check.)
  CONSTRAINT one_booking_per_slot UNIQUE (property_id, slot)
);
`;

// Demo data only — fictional listings.
export const SEED_SQL = `
INSERT INTO properties (id, name, location, description) VALUES
  ('aravali-heights', 'Aravali Heights — 3 BHK', 'Vaishali Nagar, Jaipur', 'Corner 3 BHK with a large balcony, covered parking and a clubhouse.'),
  ('pink-city-residency', 'Pink City Residency — 2 BHK', 'Mansarovar, Jaipur', 'Compact 2 BHK near the metro, ready to move in.'),
  ('jagatpura-villas', 'Jagatpura Villas — 4 BHK villa', 'Jagatpura, Jaipur', 'Independent villa with a private garden and home automation.')
ON CONFLICT (id) DO NOTHING;
`;
