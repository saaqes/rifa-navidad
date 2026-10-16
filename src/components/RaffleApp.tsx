"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatMoney, pad } from "@/lib/format";
import type { RaffleConfig } from "@/lib/config";
import { Bauble, Bow, Confetti, CornerDecor, DecorRow, Holly, Lights, Ribbon, Sleigh, Snowfall, Sponsor } from "./Decor";

type Status = "available" | "reserved" | "sold";
type Result = {
  reservation: { code: string; name: string; numbers: number[]; quantity: number; total: number; expiresAt: string };
  paymentInstructions: string | null;
};

const POLL_MS = 8000;

export function RaffleApp({ config }: { config: RaffleConfig }) {
  const [statuses, setStatuses] = useState<Record<number, Status>>({});
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [notice, setNotice] = useState("");
  const [step, setStep] = useState<"grid" | "form" | "review" | "done">("grid");
  const [form, setForm] = useState({ name: "", phone: "", accepted: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [doneName, setDoneName] = useState({ phone: "" });
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/numbers", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data: { numbers: { number: number; status: Status }[] } = await res.json();
      const map: Record<number, Status> = {};
      data.numbers.forEach((n) => (map[n.number] = n.status));
      setStatuses(map);
      setLoaded(true);
      setLoadError("");
      const lost = selectedRef.current.filter((n) => map[n] !== "available");
      if (lost.length) {
        setSelected((s) => s.filter((n) => !lost.includes(n)));
        setNotice(`Lo sentimos: ${lost.map(pad).join(", ")} ya no ${lost.length > 1 ? "están disponibles" : "está disponible"} y se quitó de tu selección.`);
      }
    } catch {
      setLoadError("No pudimos actualizar la disponibilidad. Reintentando…");
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const price = config.ticketPrice;
  const total = price * selected.length;
  const counts = useMemo(() => {
    const c = { available: 0, reserved: 0, sold: 0 };
    Object.values(statuses).forEach((s) => c[s]++);
    return c;
  }, [statuses]);
  const money = (n: number) => formatMoney(n, config.currency);

  function toggle(n: number) {
    if (statuses[n] !== "available") return;
    setNotice("");
    setSelected((s) => {
      if (s.includes(n)) return s.filter((x) => x !== n);
      if (s.length >= config.maxNumbersPerReservation) {
        setNotice(`Máximo ${config.maxNumbersPerReservation} números por reserva.`);
        return s;
      }
      return [...s, n].sort((a, b) => a - b);
    });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!/^[\p{L}][\p{L}\s.'-]{2,119}$/u.test(form.name.trim())) e.name = "Escribe tu nombre completo (solo letras).";
    const digits = form.phone.replace(/[\s\-().+]/g, "");
    if (!/^\+?[\d\s\-().]+$/.test(form.phone.trim()) || !/^\d{7,15}$/.test(digits)) e.phone = "Teléfono inválido: usa entre 7 y 15 dígitos.";
    if (config.terms.length && !form.accepted) e.accepted = "Debes aceptar las condiciones para continuar.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    setSubmitting(true);
    setServerError("");
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, phone: form.phone, numbers: selected, acceptedTerms: form.accepted }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && Array.isArray(data.unavailable)) {
          setSelected((s) => s.filter((n) => !data.unavailable.includes(n)));
          setNotice(`${data.unavailable.map(pad).join(", ")} ya no ${data.unavailable.length > 1 ? "están disponibles" : "está disponible"}. Revisa tu selección.`);
          setStep("grid");
          refresh();
        } else {
          setServerError(data.error ?? "No se pudo completar la reserva.");
        }
        return;
      }
      setResult(data);
      setDoneName({ phone: form.phone.trim() });
      setSelected([]);
      setStep("done");
      refresh();
    } catch {
      setServerError("Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  const reset = () => { setStep("grid"); setResult(null); setForm({ name: "", phone: "", accepted: false }); setNotice(""); };

  return (
    <div className="relative min-h-screen overflow-x-clip pb-44 sm:pb-32 [--bar-h:11rem] sm:[--bar-h:8rem]">
      <Snowfall />
      <Lights />
      <CornerDecor bottomOffset="var(--bar-h)" />

      {/* ---------- Encabezado / héroe (como la boleta) ---------- */}
      <header className="relative px-3 pb-10 pt-14 text-center text-cream sm:px-4">
        <Sleigh />
        <Bauble className="left-[26%] top-9 hidden md:block" color="#d4a437" size={34} delay={0.8} />
        <Bauble className="right-[26%] top-9 hidden md:block" color="#b3202a" size={34} delay={1.2} />

        <div className="relative z-10 mx-auto max-w-3xl fade-up">
          {/* Placa «Valor de la boleta» */}
          <div className="relative mx-auto inline-block rounded-[1.4rem] border-4 border-[#f2c14e] bg-gradient-to-b from-[#d8323d] to-[#9c1a22] px-8 py-2 shadow-xl">
            <span aria-hidden className="absolute -left-3 top-1/2 -translate-y-1/2 text-xl text-gold">★</span>
            <span aria-hidden className="absolute -right-3 top-1/2 -translate-y-1/2 text-xl text-gold">★</span>
            <div className="font-title text-sm uppercase tracking-wide text-white sm:text-lg">Valor de la boleta</div>
            <div className="font-title text-4xl leading-none text-[#ffd23f] drop-shadow-[0_3px_0_#6f1017] sm:text-6xl">{money(price).replace("$ ", "$")}</div>
          </div>

          {/* Título + cinta NAVIDEÑA */}
          <div className="relative mt-2">
            <h1 className="sr-only">Gran Rifa Navideña</h1>
            <div aria-hidden className="title-3d mx-auto whitespace-nowrap text-[clamp(2.3rem,12.2vw,7.4rem)]" data-text="GRAN RIFA"><span>GRAN RIFA</span></div>
            <Ribbon className="-mt-1 w-[96%] max-w-[34rem]">
              <div aria-hidden className="title-white py-1 text-[clamp(2.2rem,11.5vw,5.2rem)] leading-none">NAVIDEÑA</div>
            </Ribbon>
            <div aria-hidden className="floaty -mt-3 text-3xl text-gold drop-shadow">⭐</div>
          </div>

          {/* Cinta de premios */}
          <Ribbon className="mt-1 w-[98%] max-w-[36rem]">
            <div className="px-2 py-1.5">
              <div className="font-title text-[clamp(2.1rem,10.5vw,4.4rem)] leading-none text-[#ffd23f] drop-shadow-[0_3px_0_#6f1017]">{money(config.totalPrizes).replace("$ ", "$")}</div>
              <div className="font-title text-lg tracking-wide text-white sm:text-2xl">EN PREMIOS</div>
            </div>
          </Ribbon>
        </div>

        {/* Bolas de premio */}
        <div className="relative z-10 mx-auto mt-10 grid max-w-3xl gap-9 sm:grid-cols-2 sm:gap-6" aria-label="Premios">
          {config.prizes.map((p, i) => (
            <div key={p.title} className="prize-ball fade-up mx-auto flex aspect-square w-full max-w-[19rem] flex-col items-center justify-center px-4 pb-6 pt-8 text-pine-dark" style={{ animationDelay: `${0.15 * (i + 1)}s` }}>
              <span aria-hidden className="prize-cap" />
              <Bow className="absolute -top-9 left-1/2 w-24 -translate-x-1/2" />
              <div className={`absolute left-1/2 top-[13%] w-[92%] -translate-x-1/2 rounded-md px-2 py-1 font-title text-sm uppercase tracking-wide text-white shadow-md sm:text-base ${i === 0 ? "bg-gradient-to-b from-[#1f7a46] to-[#0f4d2c]" : "bg-gradient-to-b from-[#c4252f] to-[#8c1820]"}`} style={{ clipPath: "polygon(0 0,100% 0,96% 50%,100% 100%,0 100%,4% 50%)" }}>
                <span className="text-gold">★</span> {p.title} <span className="text-gold">★</span>
              </div>
              <div className="mt-8 font-title text-[2.2rem] leading-none text-[#c4161f] drop-shadow-[0_2px_0_#fff3] sm:text-4xl">{money(p.amount).replace("$ ", "$")}</div>
              <div aria-hidden className="mx-auto my-2 flex items-center justify-center gap-2 text-sm text-pine"><span className="h-px w-10 bg-pine/40" />🎄<span className="h-px w-10 bg-pine/40" /></div>
              <div className="text-sm font-semibold leading-snug">Juega el {p.playDate}</div>
              <Holly className="absolute -bottom-3 left-1/2 w-40 -translate-x-1/2" />
              <span aria-hidden className="absolute left-4 top-1/2 text-xl text-gold/60">❄</span>
              <span aria-hidden className="absolute right-4 top-1/2 text-xl text-gold/60">❄</span>
            </div>
          ))}
        </div>

        <p className="relative z-10 mx-auto mt-10 flex max-w-xl items-center justify-center gap-3 rounded-2xl border-[3px] border-[#e0b040] bg-cream px-4 py-2.5 text-sm font-bold leading-snug text-pine shadow-xl sm:text-base">
          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-berry bg-white text-xl font-black text-berry">✚</span>
          <span>{config.lotteryNote}</span>
        </p>

        <div className="relative z-10 mx-auto mt-6 grid max-w-md grid-cols-3 gap-2 text-sm text-cream">
          <Stat label="Disponibles" value={loaded ? counts.available : "–"} />
          <Stat label="Reservados" value={loaded ? counts.reserved : "–"} />
          <Stat label="Vendidos" value={loaded ? counts.sold : "–"} />
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl space-y-10 px-4">
        {/* ---------- Números ---------- */}
        <section id="participar" aria-labelledby="t-grid" className="panel scroll-mt-4 p-4 sm:p-6">
          <h2 id="t-grid" className="font-display text-3xl font-black text-pine">🎁 Elige tus números</h2>
          <p className="mt-1 text-sm text-stone-600">Toca los números que quieres. Del 00 al 99.</p>
          {loadError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{loadError}</p>}
          {notice && <p role="alert" className="mt-3 rounded-lg border border-berry/40 bg-red-50 p-3 text-sm text-berry-dark">{notice}</p>}

          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Leyenda">
            {([["ball-available", "Disponible"], ["ball-selected", "Seleccionado"], ["ball-reserved", "Reservado"], ["ball-sold", "Vendido"]] as const).map(([c, l]) => (
              <li key={l} className="flex items-center gap-2"><span className={`ball inline-block !min-h-0 h-6 w-6 !animate-none ${c}`} />{l}</li>
            ))}
          </ul>

          <div className="mt-4 grid grid-cols-5 gap-2.5 sm:grid-cols-10 sm:gap-3" role="group" aria-label="Números del 00 al 99">
            {Array.from({ length: 100 }, (_, n) => {
              const st: Status = statuses[n] ?? "available";
              const isSel = selected.includes(n);
              const kind = !loaded ? "loading" : isSel ? "selected" : st;
              const text = { loading: "cargando", available: "disponible", selected: "seleccionado", reserved: "reservado", sold: "vendido" }[kind];
              return (
                <button key={n} type="button" disabled={!loaded || st !== "available"} aria-pressed={isSel} aria-label={`Número ${pad(n)}, ${text}`}
                  onClick={() => toggle(n)} className={`ball ball-${kind}`}>
                  {pad(n)}
                  {isSel && <span aria-hidden className="absolute -right-1 -top-2 text-sm">⭐</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* ---------- La boleta ---------- */}
        <section aria-labelledby="t-ticket" className="grid items-center gap-6 md:grid-cols-2">
          <div className="text-cream">
            <h2 id="t-ticket" className="font-display text-3xl font-black text-gold">🎟️ Tu boleta</h2>
            <p className="mt-2 text-cream/90">Cuando el administrador confirme tu pago, recibirás por WhatsApp tu boleta oficial con tu número en la esquina superior derecha.</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>🎄 Valor de la boleta: <b>{money(price)}</b></li>
              {config.prizes.map((p) => <li key={p.title}>🏆 {p.title}: <b>{money(p.amount)}</b> · {p.playDate}</li>)}
              <li>🔴 {config.lotteryNote}</li>
            </ul>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/boleta.jpg" alt="Boleta oficial de la Gran Rifa Navideña" loading="lazy" className="mx-auto w-full max-w-xs rounded-2xl shadow-2xl ring-4 ring-gold/70 transition duration-300 hover:rotate-1 hover:scale-[1.03]" />
        </section>

        {/* ---------- Cómo participar ---------- */}
        <section aria-labelledby="t-how" className="panel p-5 sm:p-6">
          <h2 id="t-how" className="font-display text-2xl font-black text-pine">🎅 ¿Cómo participar?</h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-4">
            {[
              ["🎯", "Elige uno o varios números disponibles."],
              ["📝", "Pulsa «Continuar con la reserva» y escribe tu nombre completo y teléfono."],
              ["💬", "Te daremos un código de reserva y el administrador te escribirá por WhatsApp para coordinar el pago."],
              ["🎟️", "Al confirmar tu pago, recibes tu boleta con tu número. ¡Y a esperar el sorteo!"],
            ].map(([e, t], i) => (
              <li key={i} className="rounded-xl bg-white p-3 text-sm shadow-sm ring-1 ring-gold/40">
                <div className="flex items-center gap-2 font-bold text-berry"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-berry text-white">{i + 1}</span><span className="text-xl">{e}</span></div>
                <p className="mt-2">{t}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-stone-600">Tu reserva se mantiene {config.reservationTtlMinutes} minutos; si no se confirma el pago, los números vuelven a estar disponibles.</p>
        </section>

        {config.terms.length > 0 && (
          <section aria-labelledby="t-terms" className="text-sm text-cream">
            <h2 id="t-terms" className="font-display text-xl font-bold text-gold">Condiciones de participación</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">{config.terms.map((t) => <li key={t}>{t}</li>)}</ul>
          </section>
        )}
      </main>

      <footer className="relative z-10 mt-12 px-4 pb-48 pt-8 text-center text-sm text-cream/85 sm:pb-24">
        <DecorRow />
        <div className="mt-6 flex justify-center"><Sponsor /></div>
        <p className="mt-4 font-semibold text-cream">Constructora Painting 2 S.A.S.</p>
        {config.legalInfo && <p className="mt-1">{config.legalInfo}</p>}
        <p className="mt-1 text-gold">¡Felices fiestas! 🎄</p>
        <a href="/admin" className="mt-3 inline-block text-xs text-cream/40 hover:text-cream">Administración</a>
      </footer>

      {/* ---------- Barra de selección ---------- */}
      {step === "grid" && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t-4 border-gold bg-pine-dark/95 p-3 text-cream shadow-[0_-8px_24px_rgba(0,0,0,.4)] backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1" aria-live="polite">
              <p className="text-sm font-bold text-gold">{selected.length} {selected.length === 1 ? "número" : "números"} · {money(total)}</p>
              <p className="truncate text-sm text-cream/80">{selected.length ? selected.map(pad).join(", ") : "Aún no has elegido números"}</p>
            </div>
            {selected.length > 0 && <button type="button" onClick={() => setSelected([])} className="self-start text-sm text-gold-light underline sm:self-auto">Limpiar</button>}
            <button type="button" disabled={!selected.length} onClick={() => setStep("form")} className={`btn-primary w-full sm:w-auto ${selected.length ? "glow" : ""}`}>Continuar con la reserva</button>
            <div className="flex justify-center border-t border-gold/30 pt-2 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0"><Sponsor compact /></div>
          </div>
        </div>
      )}

      {/* ---------- Formulario / resumen / confirmación ---------- */}
      {step !== "grid" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Reserva">
          <div className="panel relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-b-none p-5 fade-up sm:rounded-b-[1.25rem]">
            {step === "done" && <Confetti />}
            {step === "form" && (
              <form noValidate onSubmit={(e) => { e.preventDefault(); if (validate()) setStep("review"); }} className="space-y-4">
                <h2 className="font-display text-2xl font-black text-pine">🎄 Tus datos</h2>
                <Field id="name" label="Nombre completo" error={errors.name}>
                  <input id="name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
                </Field>
                <Field id="phone" label="Número de teléfono / WhatsApp" error={errors.phone}>
                  <input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" placeholder="300 123 4567" />
                </Field>
                <Summary nums={selected} total={money(total)} />
                {config.terms.length > 0 && (
                  <div>
                    <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={form.accepted} onChange={(e) => setForm({ ...form, accepted: e.target.checked })} className="mt-1 h-4 w-4" />Acepto las condiciones de participación.</label>
                    {errors.accepted && <p className="mt-1 text-sm text-berry">{errors.accepted}</p>}
                  </div>
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep("grid")} className="btn-secondary">Volver</button>
                  <button type="submit" className="btn-primary flex-1">Revisar resumen</button>
                </div>
              </form>
            )}
            {step === "review" && (
              <div className="space-y-4">
                <h2 className="font-display text-2xl font-black text-pine">✅ Confirma tu reserva</h2>
                <dl className="space-y-1 text-sm"><Row k="Nombre" v={form.name.trim()} /><Row k="Teléfono" v={form.phone.trim()} /></dl>
                <Summary nums={selected} total={money(total)} />
                <p className="text-xs text-stone-600">Reservar aparta tus números por {config.reservationTtlMinutes} minutos. Quedan vendidos cuando el administrador confirme tu pago.</p>
                {serverError && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800">{serverError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep("form")} className="btn-secondary" disabled={submitting}>Editar</button>
                  <button type="button" onClick={submit} disabled={submitting} className="btn-primary flex-1">{submitting ? "Reservando…" : "Guardar reserva"}</button>
                </div>
              </div>
            )}
            {step === "done" && result && (
              <div className="relative space-y-4">
                <h2 className="font-display text-2xl font-black text-pine">¡Reserva guardada! 🎁</h2>
                <p className="rounded-xl bg-pine/5 p-3 text-center">Tu código de reserva<br /><b className="text-3xl tracking-widest text-berry">{result.reservation.code}</b></p>
                <Summary nums={result.reservation.numbers} total={money(result.reservation.total)} />
                <p className="text-sm">El administrador te escribirá por <b>WhatsApp</b> al <b>{doneName.phone}</b> para coordinar el pago. Cuando lo confirme, recibirás tu boleta con tu número.</p>
                <p className="text-xs text-stone-600">Reserva válida hasta {new Date(result.reservation.expiresAt).toLocaleString("es-CO")}. Aún no es una venta: se confirma al verificar tu pago.</p>
                {result.paymentInstructions && <p className="rounded bg-amber-50 p-3 text-sm"><b>Pago:</b> {result.paymentInstructions}</p>}
                <button type="button" onClick={reset} className="btn-primary w-full">¡Listo!</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const Stat = ({ label, value }: { label: string; value: number | string }) => (
  <div className="rounded-xl border border-gold/40 bg-white/10 p-3 backdrop-blur"><div className="text-2xl font-black text-gold">{value}</div><div className="text-xs">{label}</div></div>
);
const Row = ({ k, v }: { k: string; v: string }) => <div className="flex justify-between gap-3"><dt className="text-stone-500">{k}</dt><dd className="text-right font-medium">{v}</dd></div>;
const Summary = ({ nums, total }: { nums: number[]; total: string }) => (
  <div className="rounded-xl bg-white p-3 text-sm ring-1 ring-gold/40">
    <Row k="Números" v={nums.map(pad).join(", ")} />
    <Row k="Cantidad de boletas" v={String(nums.length)} />
    <Row k="Valor total" v={total} />
  </div>
);
function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return <div><label htmlFor={id} className="mb-1 block text-sm font-bold">{label}</label>{children}{error && <p className="mt-1 text-sm text-berry">{error}</p>}</div>;
}
