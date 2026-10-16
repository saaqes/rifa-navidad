import { RAFFLE_DEFAULTS } from "@/config/raffle-data";

// Los datos oficiales viven en src/config/raffle-data.ts; las variables de entorno
// permiten sobrescribir el precio y definir condiciones, pago y datos legales.
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
    ticketPrice: int(e.RAFFLE_TICKET_PRICE) ?? RAFFLE_DEFAULTS.ticketPrice,
    currency: e.RAFFLE_CURRENCY || "COP",
    totalPrizes: RAFFLE_DEFAULTS.totalPrizes,
    prizes: RAFFLE_DEFAULTS.prizes.map((p) => ({ ...p })),
    lotteryNote: RAFFLE_DEFAULTS.lotteryNote,
    terms: list(e.RAFFLE_TERMS),
    paymentInstructions: e.RAFFLE_PAYMENT_INSTRUCTIONS?.trim() || null,
    legalInfo: e.COMPANY_LEGAL_INFO?.trim() || null,
    countryCode: (e.WHATSAPP_COUNTRY_CODE ?? RAFFLE_DEFAULTS.defaultCountryCode).replace(/\D/g, "") || "57",
    reservationTtlMinutes: int(e.RESERVATION_TTL_MINUTES) ?? 60,
    maxNumbersPerReservation: int(e.MAX_NUMBERS_PER_RESERVATION) ?? 20,
  };
}

export type RaffleConfig = ReturnType<typeof getRaffleConfig>;
