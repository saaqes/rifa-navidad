import { NextResponse } from "next/server";
import { createReservation } from "@/lib/raffle";
import { reservationInput } from "@/lib/validation";
import { clientIp, handle, rateLimit, readJson } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { getRaffleConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    rateLimit(`reserve:${clientIp(req)}`, 10, 60_000);
    const parsed = reservationInput.safeParse(await readJson(req));
    if (!parsed.success) {
      throw new AppError(400, parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    const cfg = getRaffleConfig();
    if (cfg.terms.length > 0 && parsed.data.acceptedTerms !== true) {
      throw new AppError(400, "Debes aceptar las condiciones de participación.");
    }
    const r = await createReservation(parsed.data);
    return NextResponse.json(
      { reservation: r, paymentInstructions: cfg.paymentInstructions },
      { status: 201 },
    );
  } catch (e) {
    return handle(e);
  }
}
