import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { adminOverview } from "@/lib/raffle";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    return NextResponse.json(await adminOverview(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return handle(e);
  }
}
