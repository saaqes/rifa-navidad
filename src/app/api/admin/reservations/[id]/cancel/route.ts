import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { cancelReservation } from "@/lib/raffle";
import { cancelInput } from "@/lib/validation";
import { handle, readJson } from "@/lib/http";
import { AppError } from "@/lib/errors";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await ctx.params;
    if (!z.uuid().safeParse(id).success) throw new AppError(400, "Identificador inválido.");
    const body = cancelInput.parse(await readJson(req).catch(() => ({})));
    return NextResponse.json(await cancelReservation(id, admin, body.reason || undefined));
  } catch (e) {
    return handle(e);
  }
}
