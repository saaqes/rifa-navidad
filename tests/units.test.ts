import { describe, expect, it } from "vitest";
import { reservationInput } from "@/lib/validation";
import { buildConfirmationMessage, buildWhatsappUrl, toWhatsappPhone } from "@/lib/whatsapp";
import { renderTicket } from "@/lib/ticket";
import sharp from "sharp";
import { checkCredentials, createSessionToken, readSessionToken, verifyPassword } from "@/lib/auth";
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

describe("WhatsApp (administrador -> comprador)", () => {
  const msg = buildConfirmationMessage({ name: "Ana", numbers: [3, 12], code: "RN-ABC234", origin: "https://rifa.example/", lotteryNote: "Juega con la Lotería" });
  it("incluye un enlace de boleta por número y los datos reales", () => {
    expect(msg).toContain("Ana");
    expect(msg).toContain("• Número 03: https://rifa.example/boleta/RN-ABC234/03");
    expect(msg).toContain("• Número 12: https://rifa.example/boleta/RN-ABC234/12");
    expect(msg).toContain("RN-ABC234");
  });
  it("agrega el indicativo a teléfonos de 10 dígitos y rechaza inválidos", () => {
    expect(toWhatsappPhone("3001234567", "57")).toBe("573001234567");
    expect(toWhatsappPhone("573001234567", "57")).toBe("573001234567");
    expect(toWhatsappPhone("12345", "57")).toBeNull();
  });
  it("el enlace wa.me codifica el mensaje", () => {
    const url = buildWhatsappUrl("573001234567", msg)!;
    expect(url.startsWith("https://wa.me/573001234567?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1])).toBe(msg);
    expect(buildWhatsappUrl(null, msg)).toBeNull();
  });
});

describe("boleta con número", () => {
  it("genera un JPEG de 1024x1536 con el número", async () => {
    const img = await renderTicket(7, "http://localhost");
    const meta = await sharp(img).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["jpeg", 1024, 1536]);
    const other = await renderTicket(85, "http://localhost");
    expect(Buffer.compare(img, other)).not.toBe(0);
    expect(img.length).toBeLessThan(600_000); // apto para vista previa de WhatsApp
  });
});

describe("autenticación", () => {
  process.env.SESSION_SECRET = "x".repeat(40);
  it("el usuario es «admin» y la contraseña se valida con scrypt", () => {
    const salt = randomBytes(16).toString("hex");
    process.env.ADMIN_PASSWORD_HASH = `scrypt$${salt}$${scryptSync("clave-larga-de-prueba", salt, 64).toString("hex")}`;
    delete process.env.ADMIN_USER;
    expect(checkCredentials("admin", "clave-larga-de-prueba")).toBe(true);
    expect(checkCredentials(" ADMIN ", "clave-larga-de-prueba")).toBe(true);
    expect(checkCredentials("admin", "otra")).toBe(false);
    expect(checkCredentials("root", "clave-larga-de-prueba")).toBe(false);
  });
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
