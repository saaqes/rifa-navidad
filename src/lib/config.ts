// Configuración de la rifa. Todo proviene de variables de entorno; lo que falta
// queda como `null` y la interfaz lo muestra como "PENDIENTE". No hay datos inventados.
const list = (v: string | undefined) =>
  (v ?? "").split("|").map((s) => s.trim()).filter(Boolean);

const int = (v: string | undefined) => {
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export function getRaffleConfig() {
  const e = process.env;
  return {
    companyName: "Constructora Painting 2 S.A.S.",
    raffleName: "Gran Rifa Navideña",
    ticketPrice: int(e.RAFFLE_TICKET_PRICE),
    currency: e.RAFFLE_CURRENCY || "COP",
    drawDate: e.RAFFLE_DRAW_DATE?.trim() || null,
    prizes: list(e.RAFFLE_PRIZES),
    terms: list(e.RAFFLE_TERMS),
    paymentInstructions: e.RAFFLE_PAYMENT_INSTRUCTIONS?.trim() || null,
    legalInfo: e.COMPANY_LEGAL_INFO?.trim() || null,
    whatsappNumber: (e.WHATSAPP_NUMBER ?? "").replace(/\D/g, "") || null,
    reservationTtlMinutes: int(e.RESERVATION_TTL_MINUTES) ?? 60,
    maxNumbersPerReservation: int(e.MAX_NUMBERS_PER_RESERVATION) ?? 20,
  };
}

export type RaffleConfig = ReturnType<typeof getRaffleConfig>;
