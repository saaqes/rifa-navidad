import { describe, expect, it } from "vitest";
import { reservationInput } from "@/lib/validation";
import { buildWhatsappMessage, buildWhatsappUrl } from "@/lib/whatsapp";
import { createSessionToken, readSessionToken, verifyPassword } from "@/lib/auth";
import { pad } from "@/lib/format";
import { randomBytes, scryptSync } from "node:crypto";

describe("formato", () => {
  it("siempre dos dígitos", () => {
    const all = Array.from({ length: 100 }, (_, i) => pad(i));
    expect(all[0]).toBe("00");
    expect(all[9]).toBe("09");
    expect(all[99]).toBe("99");
    expect(all.every((s) => /^\d{2}$/.test(s))).toBe(true);
  });
});

describe("validación", () => {
  const ok = { name: "Ana María Pérez", phone: "+57 300 123 4567", numbers: [1, 2] };
  it("acepta y normaliza el teléfono", () => {
    const r = reservationInput.parse(ok);
    expect(r.phone).toBe("573001234567");
  });
  it("rechaza datos inválidos", () => {
    expect(reservationInput.safeParse({ ...ok, phone: "abc" }).success).toBe(false);
    expect(reservationInput.safeParse({ ...ok, phone: "123" }).success).toBe(false);
    expect(reservationInput.safeParse({ ...ok, name: "A" }).success).toBe(false);
    expect(reservationInput.safeParse({ ...ok, name: "<script>" }).success).toBe(false);
    expect(reservationInput.safeParse({ ...ok, numbers: [1, 1] }).success).toBe(false);
    expect(reservationInput.safeParse({ ...ok, numbers: [100] }).success).toBe(false);
    expect(reservationInput.safeParse({ ...ok, numbers: [] }).success).toBe(false);
  });
});

describe("WhatsApp", () => {
  const msg = buildWhatsappMessage({ name: "Ana", numbers: [3, 12], total: 10000, code: "RN-ABC234" });
  it("genera el mensaje con datos reales", () => {
    expect(msg).toContain("Nombre: Ana");
    expect(msg).toContain("Números seleccionados: 03, 12");
    expect(msg).toContain("Cantidad de boletas: 2");
    expect(msg).toContain("Código de reserva: RN-ABC234");
  });
  it("el enlace codifica el mensaje y no existe sin número configurado", () => {
    const url = buildWhatsappUrl("573001112233", msg)!;
    expect(url.startsWith("https://wa.me/573001112233?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1])).toBe(msg);
    expect(buildWhatsappUrl(null, msg)).toBeNull();
    expect(buildWhatsappUrl("abc", msg)).toBeNull();
  });
});

describe("autenticación", () => {
  process.env.SESSION_SECRET = "x".repeat(40);
  it("firma y verifica sesiones; rechaza manipuladas o vencidas", () => {
    const t = createSessionToken("a@b.co");
    expect(readSessionToken(t)).toBe("a@b.co");
    const [p, s] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ e: "evil@x.co", x: Date.now() + 1e9 })).toString("base64url");
    expect(readSessionToken(`${forged}.${s}`)).toBeNull();
    expect(readSessionToken(`${p}.deadbeef`)).toBeNull();
    expect(readSessionToken(undefined)).toBeNull();
    expect(readSessionToken(t, Date.now() + 9 * 3600_000)).toBeNull();
  });
  it("verifica contraseñas scrypt", () => {
    const salt = randomBytes(16).toString("hex");
    const stored = `scrypt$${salt}$${scryptSync("clave-larga-de-prueba", salt, 64).toString("hex")}`;
    expect(verifyPassword("clave-larga-de-prueba", stored)).toBe(true);
    expect(verifyPassword("otra", stored)).toBe(false);
    expect(verifyPassword("x", "basura")).toBe(false);
  });
});
