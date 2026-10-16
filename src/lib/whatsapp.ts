import { pad } from "./format";

/** Convierte el teléfono guardado en el formato internacional que exige wa.me. */
export function toWhatsappPhone(phone: string, countryCode = "57"): string | null {
  const digits = phone.replace(/\D/g, "");
  const full = digits.length === 10 ? countryCode + digits : digits;
  return /^\d{10,15}$/.test(full) ? full : null;
}

/** Mensaje que el administrador envía al comprador cuando su pago queda confirmado. */
export function buildConfirmationMessage(r: {
  name: string;
  code: string;
  numbers: number[];
  origin: string;
  lotteryNote?: string;
}): string {
  const lines = [
    `¡Hola ${r.name}! 🎄 Tu participación en la Gran Rifa Navideña de Constructora Painting 2 S.A.S. quedó *confirmada*.`,
    `Código de reserva: ${r.code}`,
    "",
    r.numbers.length === 1 ? "Tu boleta:" : "Tus boletas:",
    ...r.numbers.map((n) => `• Número ${pad(n)}: ${ticketUrl(r.origin, r.code, n)}`),
    "",
    r.lotteryNote ? `${r.lotteryNote}.` : "",
    "¡Mucha suerte! 🍀",
  ];
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export const ticketUrl = (origin: string, code: string, n: number) =>
  `${origin.replace(/\/$/, "")}/boleta/${code}/${pad(n)}`;

/** Devuelve null si el teléfono del comprador no es válido. */
export function buildWhatsappUrl(phone: string | null, message: string): string | null {
  if (!phone || !/^\d{10,15}$/.test(phone)) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
