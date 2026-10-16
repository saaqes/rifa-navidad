import { NextResponse } from "next/server";
import { AppError } from "./errors";

export function handle(e: unknown) {
  if (e instanceof AppError) {
    return NextResponse.json({ error: e.message, ...e.extra }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: "Ocurrió un error inesperado. Intenta de nuevo." }, { status: 500 });
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError(400, "Solicitud inválida.");
  }
}

const hits = new Map<string, number[]>();
/** Limitador simple en memoria (por instancia). Suficiente como primera barrera. */
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) throw new AppError(429, "Demasiados intentos. Espera un momento e intenta de nuevo.");
  arr.push(now);
  hits.set(key, arr);
}

export const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
