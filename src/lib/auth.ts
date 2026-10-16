import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { AppError } from "./errors";

export const SESSION_COOKIE = "rifa_admin";
const SESSION_HOURS = 8;

const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new AppError(503, "El acceso administrativo no está configurado.");
  return s;
};

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Formato del hash: scrypt$<salt hex>$<hash hex> (ver `npm run admin:hash`). */
export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function checkCredentials(email: string, password: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!adminEmail || !hash) throw new AppError(503, "El acceso administrativo no está configurado.");
  const emailOk = safeEqual(email.trim().toLowerCase(), adminEmail);
  const passOk = verifyPassword(password, hash); // siempre se evalúa, para no filtrar por tiempo
  return emailOk && passOk;
}

export function createSessionToken(email: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ e: email, x: now + SESSION_HOURS * 3600_000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
  try {
    const { e, x } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof e !== "string" || typeof x !== "number" || x < now) return null;
    return e;
  } catch {
    return null;
  }
}

export async function getAdmin(): Promise<string | null> {
  const jar = await cookies();
  try {
    return readSessionToken(jar.get(SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
}

/** Autorización del lado del servidor: úsala al inicio de TODA ruta administrativa. */
export async function requireAdmin(req?: Request): Promise<string> {
  if (req && req.method !== "GET") assertSameOrigin(req);
  const admin = await getAdmin();
  if (!admin) throw new AppError(401, "No autorizado.");
  return admin;
}

export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) throw new AppError(403, "Origen no permitido.");
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_HOURS * 3600,
};
