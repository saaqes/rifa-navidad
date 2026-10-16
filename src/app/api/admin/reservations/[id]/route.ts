import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { deleteReservations } from "@/lib/raffle";
import { handle } from "@/lib/http";
import { AppError } from "@/lib/errors";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await ctx.params;
    if (!z.uuid().safeParse(id).success) throw new AppError(400, "Identificador inválido.");
    return NextResponse.json(await deleteReservations(admin, [id]));
  } catch (e) {
    return handle(e);
  }
}
