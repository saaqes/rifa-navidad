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

/* ===================== Decoración tipo boleta ===================== */

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 300, H = 150;
const stemY = (t: number) => H * 0.3 + t * H * 0.3 + Math.sin(t * 3.2) * 7;
const stemX = (t: number) => 4 + t * (W - 24);

const GREENS = ["#0d4a2a", "#14663a", "#1d8a4c", "#2fa85f", "#0a3a22"];

/** Rama de pino con bolas, bayas y lucecitas. Se genera siempre igual (semilla fija). */
export function PineBranch({ seed = 1, className = "", baubles = ["#b3202a", "#d4a437", "#b3202a"] }: { seed?: number; className?: string; baubles?: string[] }) {
  const r = rng(seed);
  const lines: { x1: number; y1: number; x2: number; y2: number; c: string; w: number }[] = [];
  for (let i = 0; i <= 78; i++) {
    const t = i / 78;
    const x = stemX(t), y = stemY(t);
    const len = 58 * (1 - 0.68 * t) + 12;
    for (const side of [-1, 1]) {
      const a = side * (0.45 + r() * 0.75);
      const l = len * (0.7 + r() * 0.5);
      lines.push({ x1: x, y1: y, x2: x + Math.cos(a) * l, y2: y + Math.sin(a) * l, c: GREENS[Math.floor(r() * GREENS.length)], w: 2.6 + r() * 1.6 });
    }
  }
  const berries = Array.from({ length: 7 }, () => { const t = 0.1 + r() * 0.8; return { x: stemX(t) + (r() - 0.5) * 30, y: stemY(t) + (r() - 0.5) * 50 }; });
  const lights = Array.from({ length: 6 }, () => { const t = 0.05 + r() * 0.9; return { x: stemX(t) + (r() - 0.5) * 40, y: stemY(t) + (r() - 0.5) * 60, d: r() * 2 }; });
  const balls = baubles.map((c, i) => { const t = 0.2 + i * (0.6 / Math.max(1, baubles.length - 1)); return { c, x: stemX(t) + (i % 2 ? 6 : -4), y: stemY(t) + (i % 2 ? 26 : -22), r: 11 + ((i * 5) % 6) }; });
  return (
    <svg aria-hidden viewBox={`0 0 ${W} ${H}`} className={`pointer-events-none ${className}`}>
      {lines.map((l, i) => <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.c} strokeWidth={l.w} strokeLinecap="round" />)}
      <path d={`M0 ${stemY(0)} ${Array.from({ length: 20 }, (_, i) => `L${stemX((i + 1) / 20)} ${stemY((i + 1) / 20)}`).join(" ")}`} stroke="#4a2a12" strokeWidth="4" fill="none" />
      {berries.map((b, i) => <g key={i}><circle cx={b.x} cy={b.y} r="4.2" fill="#d62b36" /><circle cx={b.x - 1.2} cy={b.y - 1.2} r="1.2" fill="#fff" opacity=".7" /></g>)}
      {balls.map((b, i) => (
        <g key={i}>
          <line x1={b.x} y1={b.y - b.r - 8} x2={b.x} y2={b.y - b.r} stroke="#d4a437" strokeWidth="1.5" />
          <rect x={b.x - 3.5} y={b.y - b.r - 3} width="7" height="5" rx="1.5" fill="#d4a437" />
          <circle cx={b.x} cy={b.y} r={b.r} fill={b.c} />
          <circle cx={b.x} cy={b.y} r={b.r} fill="url(#bshine)" />
          <ellipse cx={b.x - b.r * 0.35} cy={b.y - b.r * 0.4} rx={b.r * 0.22} ry={b.r * 0.34} fill="#fff" opacity=".55" transform={`rotate(30 ${b.x - b.r * 0.35} ${b.y - b.r * 0.4})`} />
        </g>
      ))}
      {lights.map((l, i) => <circle key={i} cx={l.x} cy={l.y} r="3.2" fill="#ffe27a" className="twk" style={{ animationDelay: `${l.d}s` }} />)}
      <defs><radialGradient id="bshine" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#fff" stopOpacity=".2" /><stop offset="1" stopColor="#000" stopOpacity=".35" /></radialGradient></defs>
    </svg>
  );
}

/** Regalo con moño. */
export function Gift({ body = "#b3202a", lid = "#8c1820", ribbon = "#f2c14e", size = 90, className = "", style }: { body?: string; lid?: string; ribbon?: string; size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 100 100" className={className} style={style}>
      <rect x="10" y="40" width="80" height="54" rx="4" fill={body} />
      <rect x="6" y="28" width="88" height="17" rx="4" fill={lid} />
      <rect x="44" y="28" width="12" height="66" fill={ribbon} />
      <rect x="44" y="28" width="12" height="17" fill="#d8a52a" />
      <ellipse cx="36" cy="22" rx="17" ry="11" fill={ribbon} transform="rotate(-25 36 22)" />
      <ellipse cx="64" cy="22" rx="17" ry="11" fill={ribbon} transform="rotate(25 64 22)" />
      <ellipse cx="36" cy="22" rx="9" ry="5" fill="#d8a52a" transform="rotate(-25 36 22)" opacity=".6" />
      <ellipse cx="64" cy="22" rx="9" ry="5" fill="#d8a52a" transform="rotate(25 64 22)" opacity=".6" />
      <circle cx="50" cy="26" r="8" fill={ribbon} />
      <rect x="14" y="44" width="6" height="46" fill="#fff" opacity=".12" />
    </svg>
  );
}

function Ball({ c, size, className = "" }: { c: string; size: number; className?: string }) {
  return (
    <span aria-hidden className={`inline-block rounded-full ${className}`} style={{ width: size, height: size, background: `radial-gradient(circle at 32% 28%, #fff9 0 12%, ${c} 40%, #0006 120%)`, boxShadow: "0 4px 8px rgba(0,0,0,.4)" }} />
  );
}

/** Montón de regalos y bolas para las esquinas inferiores. */
export function GiftStack({ mirror = false }: { mirror?: boolean }) {
  return (
    <div aria-hidden className={`pointer-events-none flex items-end gap-0 ${mirror ? "flex-row-reverse" : ""}`}>
      <div className="relative">
        <Gift size={96} body="#b3202a" lid="#8c1820" className="relative z-10 sm:!h-[130px] sm:!w-[130px]" />
        <Gift size={64} body="#1d7a46" lid="#0f5a30" ribbon="#ffe9a0" className="absolute -top-9 left-5 -rotate-6 sm:-top-12 sm:left-7 sm:!h-[88px] sm:!w-[88px]" />
      </div>
      <div className="-ml-3 flex flex-col items-center sm:-ml-4">
        <Gift size={62} body="#d4a437" lid="#a97811" ribbon="#b3202a" className="sm:!h-[86px] sm:!w-[86px]" />
        <div className="-mt-1 flex gap-1"><Ball c="#d62b36" size={22} /><Ball c="#d4a437" size={18} /></div>
      </div>
      <Ball c="#b3202a" size={30} className="-ml-1 hidden sm:inline-block" />
    </div>
  );
}

function branchTile(): string {
  const r = rng(11);
  const w = 80, h = 240;
  const out: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const y = 4 + (i / 40) * (h - 8);
    for (const dir of [-1, 1]) {
      const a = dir * (0.4 + r() * 0.7);
      const l = 26 + r() * 22;
      out.push(`<line x1='0' y1='${y.toFixed(1)}' x2='${(Math.cos(a) * l).toFixed(1)}' y2='${(y + Math.sin(a) * l).toFixed(1)}' stroke='${GREENS[Math.floor(r() * 5)]}' stroke-width='${(2.4 + r() * 1.6).toFixed(1)}' stroke-linecap='round'/>`);
    }
  }
  out.push(`<circle cx='20' cy='60' r='11' fill='#b3202a'/><circle cx='16' cy='55' r='3.5' fill='#fff' opacity='.5'/><circle cx='26' cy='150' r='9' fill='#d4a437'/><circle cx='22' cy='146' r='3' fill='#fff' opacity='.5'/><circle cx='14' cy='214' r='5' fill='#d62b36'/><circle cx='30' cy='104' r='4' fill='#d62b36'/><circle cx='12' cy='188' r='4' fill='#ffe27a'/>`);
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${out.join("")}</svg>`)}")`;
}

/** Decoración de las esquinas y bordes de la página (ramas, bolas, regalos). */
export function CornerDecor({ bottomOffset = "0px", gifts = true }: { bottomOffset?: string; gifts?: boolean }) {
  const tile = branchTile();
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      <PineBranch seed={3} className="absolute -left-3 top-3 w-[190px] sm:w-[340px]" />
      <PineBranch seed={9} baubles={["#d4a437", "#b3202a", "#d4a437"]} className="absolute -right-3 top-3 w-[190px] -scale-x-100 sm:w-[340px]" />
      <div className="absolute inset-y-0 left-0 hidden w-[80px] min-[1200px]:block" style={{ backgroundImage: tile, backgroundRepeat: "repeat-y", backgroundSize: "80px 240px" }} />
      <div className="absolute inset-y-0 right-0 hidden w-[80px] -scale-x-100 min-[1200px]:block" style={{ backgroundImage: tile, backgroundRepeat: "repeat-y", backgroundSize: "80px 240px" }} />
      {gifts && (
        <>
          <div className="absolute left-1 sm:left-3" style={{ bottom: bottomOffset }}><GiftStack /></div>
          <div className="absolute right-1 sm:right-3" style={{ bottom: bottomOffset }}><GiftStack mirror /></div>
        </>
      )}
    </div>
  );
}

/** Cinta con extremos doblados (como en la boleta). */
export function Ribbon({ children, className = "", color = "from-[#d8323d] to-[#a51a24]" }: { children: React.ReactNode; className?: string; color?: string }) {
  return (
    <div className={`ribbon ${className}`}>
      <span className="ribbon-tail ribbon-tail-l" />
      <span className="ribbon-tail ribbon-tail-r" />
      <div className={`ribbon-body bg-gradient-to-b ${color}`}>{children}</div>
    </div>
  );
}

/** Moño rojo de las bolas de premio. */
export function Bow({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 120 70" className={className}>
      <path d="M60 36 C 30 -4, 2 8, 8 36 C 12 56, 40 54, 60 36Z" fill="#c4252f" />
      <path d="M60 36 C 90 -4, 118 8, 112 36 C 108 56, 80 54, 60 36Z" fill="#c4252f" />
      <path d="M60 36 C 34 10, 16 18, 20 34 C 24 46, 44 46, 60 36Z" fill="#e03a45" opacity=".7" />
      <path d="M60 36 L 38 68 L 52 62 L 60 70 Z" fill="#9c1a22" />
      <path d="M60 36 L 82 68 L 68 62 L 60 70 Z" fill="#9c1a22" />
      <circle cx="60" cy="36" r="10" fill="#e03a45" />
      <circle cx="56" cy="32" r="3" fill="#fff" opacity=".5" />
    </svg>
  );
}

/** Acebo con bayas. */
export function Holly({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 100 40" className={className}>
      <path d="M50 22 C 38 4, 14 6, 6 20 C 20 22, 34 30, 50 22Z" fill="#1d8a4c" />
      <path d="M50 22 C 62 4, 86 6, 94 20 C 80 22, 66 30, 50 22Z" fill="#14663a" />
      <path d="M50 22 C 40 36, 20 38, 12 32 C 26 24, 38 22, 50 22Z" fill="#2fa85f" />
      <path d="M50 22 C 60 36, 80 38, 88 32 C 74 24, 62 22, 50 22Z" fill="#1d8a4c" />
      {[[42, 22], [52, 18], [58, 26]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="5" fill="#d62b36" /><circle cx={x - 1.5} cy={y - 1.5} r="1.5" fill="#fff" opacity=".7" /></g>)}
    </svg>
  );
}

/** Bloque «Patrocinador» con el logo circular de la empresa. */
export function Sponsor({ compact = false }: { compact?: boolean }) {
  const size = compact ? 40 : 76;
  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo.png" alt="Constructora Painting 2 S.A.S." width={size} height={size} className="shrink-0 rounded-full bg-white shadow-md ring-2 ring-gold" style={{ width: size, height: size }} />
      <div className={`border-l-2 border-gold/60 pl-3 text-left leading-tight ${compact ? "text-[11px]" : "text-sm"}`}>
        <div className="font-bold uppercase tracking-wider text-gold">Patrocinador:</div>
        <div className={`font-bold text-white ${compact ? "text-xs" : "text-base"}`}>Constructora Painting</div>
      </div>
    </div>
  );
}
