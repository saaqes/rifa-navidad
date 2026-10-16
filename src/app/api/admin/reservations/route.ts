import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { searchReservations } from "@/lib/raffle";
import { handle } from "@/lib/http";
import { getRaffleConfig } from "@/lib/config";
import { buildConfirmationMessage, buildWhatsappUrl, ticketImagePath, toWhatsappPhone } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const valid = ["active", "confirmed", "cancelled", "expired"];
    const rows = await searchReservations(
      (url.searchParams.get("q") ?? "").slice(0, 100),
      status && valid.includes(status) ? status : undefined,
    );
    const cfg = getRaffleConfig();
    const reservations = rows.map((r) => {
      // Solo las reservas con pago confirmado generan mensajes/boletas para enviar.
      const phone = toWhatsappPhone(r.phone, cfg.countryCode);
      const tickets =
        r.status === "confirmed"
          ? (r.numbers as number[]).map((n) => {
              const message = buildConfirmationMessage({ name: r.name, numbers: [n], lotteryNote: cfg.lotteryNote });
              return { number: n, message, url: buildWhatsappUrl(phone, message), imagePath: ticketImagePath(r.code, n) };
            })
          : [];
      return { ...r, tickets };
    });
    return NextResponse.json({ reservations }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return handle(e);
  }
}
