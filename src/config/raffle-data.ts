// Datos oficiales de la rifa, tomados de la boleta aprobada. Edita este archivo para cambiarlos.
export const RAFFLE_DEFAULTS = {
  ticketPrice: 200_000, // pesos colombianos por número (se puede sobrescribir con RAFFLE_TICKET_PRICE)
  totalPrizes: 10_000_000,
  prizes: [
    { title: "1.er premio", amount: 5_000_000, playDate: "22 de diciembre de 2026" },
    { title: "2.º premio", amount: 5_000_000, playDate: "29 de diciembre de 2026" },
  ],
  lotteryNote: "Juega con las ÚLTIMAS DOS CIFRAS de la Lotería de la Cruz Roja",
  // Indicativo que se antepone a teléfonos de 10 dígitos al abrir WhatsApp (Colombia = 57).
  defaultCountryCode: "57",
} as const;
