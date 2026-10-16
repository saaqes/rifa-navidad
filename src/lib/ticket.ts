import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { DIGITS } from "./digit-paths";

const WIDTH = 1024;
const HEIGHT = 1536;

function numberPath(number: number, cx: number, cy: number, height: number): string {
  const digits = String(number).padStart(2, "0").split("");
  const scale = height / 1000 / 0.75; // los dígitos miden ~0.73 em de alto
  const gap = 14;
  const widths = digits.map((c) => (DIGITS[c].x2 - DIGITS[c].x1) * scale);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (digits.length - 1);
  let x = cx - total / 2;
  const top = digits.reduce((m, c) => Math.min(m, DIGITS[c].y1), 0) * scale;
  const bottom = digits.reduce((m, c) => Math.max(m, DIGITS[c].y2), 0) * scale;
  const baseY = cy - (top + bottom) / 2;
  return digits
    .map((c, i) => {
      const g = DIGITS[c];
      const tx = x - g.x1 * scale;
      x += widths[i] + gap;
      return `<path d="${g.d}" transform="translate(${tx.toFixed(1)} ${baseY.toFixed(1)}) scale(${scale.toFixed(4)})"/>`;
    })
    .join("");
}

/** Insignia con el número en la esquina superior derecha de la boleta. */
function badgeSvg(number: number): string {
  const cx = 914;
  const cy = 140;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <radialGradient id="g" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#e0303a"/><stop offset="1" stop-color="#8c1820"/></radialGradient>
    <linearGradient id="r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b3"/><stop offset=".5" stop-color="#e3b23c"/><stop offset="1" stop-color="#a97811"/></linearGradient>
    <filter id="s" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity=".55"/></filter>
  </defs>
  <g filter="url(#s)">
    <circle cx="${cx}" cy="${cy}" r="102" fill="url(#r)"/>
    <circle cx="${cx}" cy="${cy}" r="88" fill="url(#g)"/>
    <circle cx="${cx}" cy="${cy}" r="80" fill="none" stroke="#ffe9a0" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/>
  </g>
  <g fill="#000" opacity=".35" transform="translate(3 5)">${numberPath(number, cx, cy, 90)}</g>
  <g fill="#ffffff">${numberPath(number, cx, cy, 90)}</g>
</svg>`;
}

async function loadBackground(origin: string): Promise<Buffer> {
  try {
    return await readFile(path.join(process.cwd(), "public", "brand", "boleta.jpg"));
  } catch {
    const res = await fetch(`${origin}/brand/boleta.jpg`);
    if (!res.ok) throw new Error("No se encontró la imagen base de la boleta.");
    return Buffer.from(await res.arrayBuffer());
  }
}

/** Genera la boleta oficial con el número del participante (JPEG ligero, apto para vista previa de WhatsApp). */
export async function renderTicket(number: number, origin: string): Promise<Buffer> {
  const bg = await loadBackground(origin);
  return sharp(bg)
    .resize(WIDTH, HEIGHT, { fit: "cover" })
    .composite([{ input: Buffer.from(badgeSvg(number)), top: 0, left: 0 }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}
