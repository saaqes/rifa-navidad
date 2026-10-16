import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deleteReservations } from "@/lib/raffle";
import { handle } from "@/lib/http";

/** Elimina de una vez todas las reservas canceladas y vencidas. */
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(req);
    return NextResponse.json(await deleteReservations(admin));
  } catch (e) {
    return handle(e);
  }
}
