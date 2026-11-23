import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

// Minimal admin auth: one shared password (ADMIN_PASSWORD env var).
// The cookie stores an HMAC of a fixed string, never the password itself.
const COOKIE = "admin_session";

function token(): string {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error("ADMIN_PASSWORD is not set");
  return createHmac("sha256", secret).update("admin-session-v1").digest("hex");
}

export function checkPassword(pw: string): boolean {
  const expected = Buffer.from(process.env.ADMIN_PASSWORD ?? "");
  const given = Buffer.from(pw ?? "");
  return expected.length > 0 && expected.length === given.length && timingSafeEqual(expected, given);
}

export async function setAdminCookie() {
  (await cookies()).set(COOKIE, token(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
}

export async function isAdmin(): Promise<boolean> {
  if (!process.env.ADMIN_PASSWORD) return false;
  const c = (await cookies()).get(COOKIE)?.value;
  if (!c) return false;
  const a = Buffer.from(c), b = Buffer.from(token());
  return a.length === b.length && timingSafeEqual(a, b);
}
