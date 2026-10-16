import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { releaseExpired } from "@/lib/raffle";
import { handle } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(req);
    return NextResponse.json({ released: await releaseExpired(admin) });
  } catch (e) {
    return handle(e);
  }
}
