import { NextResponse } from "next/server";
import { listPublicNumbers } from "@/lib/raffle";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const numbers = await listPublicNumbers();
    return NextResponse.json({ numbers }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return handle(e);
  }
}
