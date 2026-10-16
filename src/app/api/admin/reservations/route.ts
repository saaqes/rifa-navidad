import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { searchReservations } from "@/lib/raffle";
import { handle } from "@/lib/http";

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
    return NextResponse.json({ reservations: rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return handle(e);
  }
}
