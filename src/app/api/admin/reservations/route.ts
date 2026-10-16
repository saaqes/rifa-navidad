import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { searchReservations } from "@/lib/raffle";
import { handle } from "@/lib/http";
import { getRaffleConfig } from "@/lib/config";
import { buildConfirmationMessage, buildWhatsappUrl, toWhatsappPhone } from "@/lib/whatsapp";

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
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
    const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
    const origin = `${proto}://${host}`;
    const reservations = rows.map((r) => ({
      ...r,
      // Solo las reservas con pago confirmado generan el enlace para enviar la boleta.
      whatsappUrl:
        r.status === "confirmed"
          ? buildWhatsappUrl(
              toWhatsappPhone(r.phone, cfg.countryCode),
              buildConfirmationMessage({ name: r.name, code: r.code, numbers: r.numbers, origin, lotteryNote: cfg.lotteryNote }),
            )
          : null,
    }));
    return NextResponse.json({ reservations }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return handle(e);
  }
}
