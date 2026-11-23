// Database access. Production uses real Postgres (DATABASE_URL, e.g. a free Neon DB).
// Local dev and tests use PGlite: real Postgres compiled to WASM, so the same SQL
// (including the unique constraint) behaves identically everywhere.
import { Pool } from "pg";
import { SCHEMA_SQL, SEED_SQL } from "./schema";

export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

export async function createPgliteDb(dataDir?: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  if (dataDir) (await import("fs")).mkdirSync(dataDir, { recursive: true });
  const pg = new PGlite(dataDir);
  await pg.exec(SCHEMA_SQL);
  await pg.exec(SEED_SQL);
  return {
    async query(sql, params = []) {
      const r = await pg.query(sql, params as unknown[]);
      return r.rows as never;
    },
  };
}

function createPoolDb(url: string): Db {
  const pool = new Pool({ connectionString: url, ssl: url.includes("localhost") ? false : { rejectUnauthorized: false } });
  let ready: Promise<unknown> | null = null;
  return {
    async query(sql, params = []) {
      ready ??= pool.query(SCHEMA_SQL).then(() => pool.query(SEED_SQL));
      await ready;
      const r = await pool.query(sql, params as unknown[]);
      return r.rows as never;
    },
  };
}

const g = globalThis as unknown as { __db?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!g.__db) {
    g.__db = process.env.DATABASE_URL
      ? Promise.resolve(createPoolDb(process.env.DATABASE_URL))
      : createPgliteDb("./.data/pglite");
    g.__db.catch(() => (g.__db = undefined)); // don't cache a failed init
  }
  return g.__db;
}
