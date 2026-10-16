"use client";
import { useState } from "react";

/**
 * Muestra el logo oficial desde /public/brand/logo.png (o .svg).
 * Si el archivo aún no se ha copiado al proyecto, muestra el nombre de la empresa.
 */
export function Logo({ className = "h-14" }: { className?: string }) {
  const [srcIdx, setSrcIdx] = useState(0);
  const sources = ["/brand/logo.png", "/brand/logo.svg"];
  if (srcIdx >= sources.length) {
    return <span className="font-display text-lg font-bold text-gold">Constructora Painting 2 S.A.S.</span>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={sources[srcIdx]} alt="Constructora Painting 2 S.A.S." className={`${className} w-auto`} onError={() => setSrcIdx((i) => i + 1)} />;
}
