import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUsername, assertSameOrigin, checkCredentials, createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { clientIp, handle, rateLimit, readJson } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { query } from "@/lib/db";

const body = z.object({ username: z.string().max(100), password: z.string().max(200) });

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    rateLimit(`login:${clientIp(req)}`, 5, 15 * 60_000);
    const parsed = body.safeParse(await readJson(req));
    if (!parsed.success) throw new AppError(400, "Escribe tu usuario y contraseña.");
    if (!checkCredentials(parsed.data.username, parsed.data.password)) {
      await query("INSERT INTO audit_log (actor, action, details) VALUES ('anonymous','admin.login_failed',$1)", [
        JSON.stringify({ ip: clientIp(req) }),
      ]).catch(() => {});
      throw new AppError(401, "Credenciales incorrectas.");
    }
    const email = adminUsername();
    await query("INSERT INTO audit_log (actor, action) VALUES ($1,'admin.login')", [email]).catch(() => {});
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, createSessionToken(email), sessionCookieOptions);
    return res;
  } catch (e) {
    return handle(e);
  }
}
