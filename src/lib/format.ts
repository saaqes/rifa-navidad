export const pad = (n: number) => String(n).padStart(2, "0");

export function formatMoney(amount: number, currency = "COP"): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
