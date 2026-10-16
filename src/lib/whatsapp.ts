import { pad } from "./format";

/** Convierte el teléfono guardado en el formato internacional que exige wa.me. */
export function toWhatsappPhone(phone: string, countryCode = "57"): string | null {
  const digits = phone.replace(/\D/g, "");
  const full = digits.length === 10 ? countryCode + digits : digits;
  return /^\d{10,15}$/.test(full) ? full : null;
}

/** Mensaje que el administrador envía al comprador cuando su pago queda confirmado. */
export function buildConfirmationMessage(r: { name: string; numbers: number[]; lotteryNote?: string }): string {
  return [
    `¡Hola ${r.name}! Tu participación en la Gran Rifa Navideña de Constructora Painting 2 S.A.S. quedó *confirmada*.`,
    "",
    r.numbers.length === 1 ? "Tu boleta:" : "Tus boletas:",
    ...r.numbers.map((n) => `• Número ${pad(n)}`),
    "",
    r.lotteryNote ? `${r.lotteryNote}.` : "",
    "¡Mucha suerte!",
  ].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Ruta de la imagen de la boleta con el número superpuesto. */
export const ticketImagePath = (code: string, n: number) => `/boleta/${code}/${pad(n)}/imagen`;

/** Devuelve null si el teléfono del comprador no es válido. */
export function buildWhatsappUrl(phone: string | null, message: string): string | null {
  if (!phone || !/^\d{10,15}$/.test(phone)) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
