import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { findConfirmedTicket } from "@/lib/raffle";
import { Snowfall } from "@/components/Decor";

export const dynamic = "force-dynamic";

type P = { params: Promise<{ code: string; number: string }> };

async function validate(p: P["params"]) {
  const { code, number } = await p;
  const c = code.toUpperCase();
  if (!/^RN-[A-Z0-9]{6}$/.test(c) || !/^\d{2}$/.test(number)) notFound();
  if (!(await findConfirmedTicket(c, Number(number)))) notFound();
  return { code: c, number };
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { code, number } = await validate(params);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
  const image = `${origin}/boleta/${code}/${number}/imagen`;
  const title = `Boleta N.º ${number} | Gran Rifa Navideña`;
  return {
    title,
    description: "Boleta confirmada de la Gran Rifa Navideña de Constructora Painting 2 S.A.S.",
    robots: { index: false },
    openGraph: { title, description: "Tu boleta confirmada. ¡Mucha suerte!", images: [{ url: image, width: 1024, height: 1536 }] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

export default async function TicketPage({ params }: P) {
  const { code, number } = await validate(params);
  const src = `/boleta/${code}/${number}/imagen`;
  return (
    <main className="relative min-h-screen bg-gradient-to-b from-pine-dark via-pine to-pine-dark px-4 py-8 text-center text-cream">
      <Snowfall />
      <div className="relative z-10 mx-auto max-w-md">
        <p className="text-sm uppercase tracking-[0.25em] text-gold">🎄 Boleta confirmada</p>
        <h1 className="mt-1 font-display text-3xl font-bold">Número {number}</h1>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`Boleta de la Gran Rifa Navideña, número ${number}`} className="mx-auto mt-5 w-full rounded-2xl shadow-2xl ring-4 ring-gold/60" />
        <a href={src} download={`boleta-${number}.jpg`} className="mt-5 inline-block rounded-full bg-gold px-6 py-3 font-semibold text-pine-dark hover:brightness-110">Descargar boleta</a>
        <p className="mt-3 text-xs text-cream/70">Código de reserva {code}</p>
      </div>
    </main>
  );
}
