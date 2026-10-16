"use client";
import { useEffect, useRef } from "react";

/** Copos de nieve cayendo (canvas). Se desactiva con "reducir movimiento". */
export function Snowfall({ count = 110 }: { count?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, raf = 0;
    const make = (anywhere: boolean) => {
      const r = 1 + Math.random() * 3.6;
      return { x: Math.random() * w, y: anywhere ? Math.random() * h : -10, r, v: 0.35 + r * 0.28, ph: Math.random() * 6.28, sw: 0.4 + Math.random() * 0.9, a: 0.45 + Math.random() * 0.5, star: r > 3.2 };
    };
    let flakes: ReturnType<typeof make>[] = [];
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      flakes = Array.from({ length: Math.round(count * Math.min(1, w / 900 + 0.35)) }, () => make(true));
    };
    resize();
    window.addEventListener("resize", resize);

    let t = 0;
    const tick = () => {
      t += 0.012;
      ctx.clearRect(0, 0, w, h);
      for (const f of flakes) {
        f.y += f.v;
        f.x += Math.sin(t * f.sw + f.ph) * 0.5;
        if (f.y > h + 12) Object.assign(f, make(false));
        ctx.globalAlpha = f.a;
        ctx.fillStyle = "#fff";
        if (f.star) {
          ctx.font = `${f.r * 3.4}px sans-serif`;
          ctx.fillText("❄", f.x, f.y);
        } else {
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, 6.283);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [count]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-40" />;
}

const BULBS = ["#ff4d5a", "#ffd23f", "#4ade80", "#60a5fa", "#f472b6"];

/** Guirnalda de luces que parpadean. */
export function Lights() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-30 h-14 overflow-hidden">
      <svg className="absolute inset-x-0 top-0 h-8 w-full" viewBox="0 0 1000 30" preserveAspectRatio="none">
        <path d="M0 4 Q 25 26 50 4 T 100 4 T 150 4 T 200 4 T 250 4 T 300 4 T 350 4 T 400 4 T 450 4 T 500 4 T 550 4 T 600 4 T 650 4 T 700 4 T 750 4 T 800 4 T 850 4 T 900 4 T 950 4 T 1000 4" fill="none" stroke="#1b1b1b" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute inset-x-0 top-0 flex justify-between px-1">
        {Array.from({ length: 28 }, (_, i) => (
          <span key={i} className="bulb" style={{ ["--c" as string]: BULBS[i % BULBS.length], animationDelay: `${(i % 7) * 0.35}s`, marginTop: i % 2 ? 14 : 4 }} />
        ))}
      </div>
    </div>
  );
}

/** Bola navideña colgante que se balancea. */
export function Bauble({ color = "#b3202a", size = 56, className = "", delay = 0 }: { color?: string; size?: number; className?: string; delay?: number }) {
  return (
    <div aria-hidden className={`swing pointer-events-none absolute ${className}`} style={{ animationDelay: `${delay}s` }}>
      <svg width={size} height={size * 1.9} viewBox="0 0 60 114">
        <line x1="30" y1="0" x2="30" y2="46" stroke="#d4a437" strokeWidth="2" />
        <rect x="24" y="44" width="12" height="9" rx="2" fill="#d4a437" />
        <circle cx="30" cy="84" r="30" fill={color} />
        <circle cx="30" cy="84" r="30" fill="url(#shine)" />
        <path d="M6 84 Q 30 70 54 84" stroke="#ffe9a0" strokeWidth="2.5" fill="none" opacity=".8" />
        <ellipse cx="20" cy="70" rx="7" ry="11" fill="#fff" opacity=".35" transform="rotate(25 20 70)" />
        <defs><radialGradient id="shine" cx="35%" cy="30%" r="75%"><stop offset="0" stopColor="#fff" stopOpacity=".25" /><stop offset="1" stopColor="#000" stopOpacity=".3" /></radialGradient></defs>
      </svg>
    </div>
  );
}

/** Trineo de Santa cruzando el cielo. */
export function Sleigh() {
  return (
    <div aria-hidden className="sleigh pointer-events-none absolute left-0 top-24 z-10 whitespace-nowrap text-3xl sm:text-5xl">
      <span className="inline-block -scale-x-100">🦌🦌🦌</span><span>🛷</span>
    </div>
  );
}

/** Lluvia de confeti navideño (se muestra al confirmar una reserva). */
export function Confetti() {
  const items = ["🎄", "⭐", "🎁", "❄️", "🔔", "✨", "🍬", "🎅"];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 28 }, (_, i) => (
        <span key={i} className="confetti" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 9) * 0.12}s`, animationDuration: `${2.2 + (i % 5) * 0.4}s`, fontSize: 16 + (i % 4) * 5 }}>
          {items[i % items.length]}
        </span>
      ))}
    </div>
  );
}

/** Fila de figuras navideñas animadas para pies de página y secciones. */
export function DecorRow() {
  const f = ["🎅", "🎄", "🎁", "⛄", "🔔", "🦌", "⭐", "🧦", "🍪"];
  return (
    <div aria-hidden className="flex flex-wrap justify-center gap-3 text-3xl sm:text-4xl">
      {f.map((e, i) => (
        <span key={i} className="floaty inline-block" style={{ animationDelay: `${i * 0.25}s` }}>{e}</span>
      ))}
    </div>
  );
}
