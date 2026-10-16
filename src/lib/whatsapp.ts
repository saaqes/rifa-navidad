import { formatMoney, pad } from "./format";

export function buildWhatsappMessage(r: {
  name: string;
  numbers: number[];
  total: number;
  code: string;
  currency?: string;
}): string {
  return [
    "Hola, quiero participar en la Gran Rifa Navideña de Constructora Painting 2 S.A.S.",
    `Nombre: ${r.name}`,
    `Números seleccionados: ${r.numbers.map(pad).join(", ")}`,
    `Cantidad de boletas: ${r.numbers.length}`,
    `Valor total: ${formatMoney(r.total, r.currency)}`,
    `Código de reserva: ${r.code}`,
    "Por favor, indíquenme los pasos para completar mi participación.",
  ].join("\n");
}

/** Devuelve null si el número oficial aún no está configurado. */
export function buildWhatsappUrl(phone: string | null, message: string): string | null {
  if (!phone || !/^\d{8,15}$/.test(phone)) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
