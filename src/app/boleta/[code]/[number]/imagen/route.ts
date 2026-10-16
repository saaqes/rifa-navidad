import { findConfirmedTicket } from "@/lib/raffle";
import { renderTicket } from "@/lib/ticket";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ code: string; number: string }> }) {
  const { code, number } = await ctx.params;
  const c = code.toUpperCase();
  if (!/^RN-[A-Z0-9]{6}$/.test(c) || !/^\d{2}$/.test(number)) return new Response("No encontrada", { status: 404 });
  try {
    if (!(await findConfirmedTicket(c, Number(number)))) return new Response("No encontrada", { status: 404 });
    const img = await renderTicket(Number(number), new URL(req.url).origin);
    return new Response(new Uint8Array(img), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "Content-Disposition": `inline; filename="boleta-${number}.jpg"`,
      },
    });
  } catch (e) {
    console.error(e);
    return new Response("Error generando la boleta", { status: 500 });
  }
}
