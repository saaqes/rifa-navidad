"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatMoney, pad } from "@/lib/format";
import type { RaffleConfig } from "@/lib/config";
import { Logo } from "./Logo";

type Status = "available" | "reserved" | "sold";
type Result = {
  reservation: { code: string; name: string; numbers: number[]; quantity: number; total: number; expiresAt: string };
  whatsappUrl: string | null;
  paymentInstructions: string | null;
};

const POLL_MS = 8000;
const PENDING = "PENDIENTE DE DEFINIR";

const cellStyle: Record<Status | "selected", string> = {
  available: "bg-white text-pine border-pine/30 hover:border-pine hover:bg-pine/5",
  selected: "bg-berry text-white border-berry-dark shadow-md scale-105",
  reserved: "bg-gold/25 text-amber-900 border-gold/60 cursor-not-allowed line-through decoration-1",
  sold: "bg-stone-300 text-stone-500 border-stone-400 cursor-not-allowed",
};

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
  const total = price ? price * selected.length : 0;
  const counts = useMemo(() => {
    const c = { available: 0, reserved: 0, sold: 0 };
    Object.values(statuses).forEach((s) => c[s]++);
    return c;
  }, [statuses]);
  const money = (n: number) => formatMoney(n, config.currency);
  const reservationsOpen = price !== null;

  function toggle(n: number) {
    if (statuses[n] !== "available") return;
    setNotice("");
    setSelected((s) => (s.includes(n) ? s.filter((x) => x !== n) : s.length >= config.maxNumbersPerReservation ? (setNotice(`Máximo ${config.maxNumbersPerReservation} números por reserva.`), s) : [...s, n].sort((a, b) => a - b)));
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
    <div className="min-h-screen pb-40 sm:pb-28">
      <header className="bg-pine snow text-cream">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Logo />
          <a href="#participar" className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-pine-dark hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Elegir números</a>
        </div>
        <div className="mx-auto max-w-5xl px-4 pb-14 pt-8 text-center fade-up">
          <p className="text-sm uppercase tracking-[0.25em] text-gold">🎄 Constructora Painting 2 S.A.S.</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight sm:text-6xl">Gran Rifa Navideña</h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/85 sm:text-lg">Elige tus números de la suerte del <b>00</b> al <b>99</b> y reserva en línea. Confirmamos tu participación por WhatsApp.</p>
          <div className="mx-auto mt-6 grid max-w-xl grid-cols-3 gap-2 text-sm">
            <Stat label="Disponibles" value={loaded ? counts.available : "–"} />
            <Stat label="Reservados" value={loaded ? counts.reserved : "–"} />
            <Stat label="Vendidos" value={loaded ? counts.sold : "–"} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-4 py-8">
        <section className="grid gap-4 md:grid-cols-3" aria-label="Información de la rifa">
          <Card title="Valor por número">{price ? <p className="text-3xl font-bold text-berry">{money(price)}</p> : <Pending />}</Card>
          <Card title="Fecha del sorteo">{config.drawDate ? <p className="text-xl font-semibold">{config.drawDate}</p> : <Pending />}</Card>
          <Card title="Premios">
            {config.prizes.length ? <ul className="list-disc space-y-1 pl-5">{config.prizes.map((p) => <li key={p}>{p}</li>)}</ul> : <Pending />}
          </Card>
        </section>

        <section id="participar" aria-labelledby="t-grid" className="scroll-mt-4">
          <h2 id="t-grid" className="font-display text-3xl font-bold text-pine">Elige tus números</h2>
          {!reservationsOpen && <p role="status" className="mt-3 rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">Las reservas se habilitarán cuando se defina el valor de la boleta. Puedes consultar la disponibilidad mientras tanto.</p>}
          {loadError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{loadError}</p>}
          {notice && <p role="alert" className="mt-3 rounded-lg border border-berry/40 bg-red-50 p-3 text-sm text-berry-dark">{notice}</p>}

          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Leyenda">
            {(["available", "selected", "reserved", "sold"] as const).map((k) => (
              <li key={k} className="flex items-center gap-2"><span className={`inline-block h-5 w-5 rounded border ${cellStyle[k].split(" ").slice(0, 3).join(" ")}`} />{{ available: "Disponible", selected: "Seleccionado", reserved: "Reservado", sold: "Vendido" }[k]}</li>
            ))}
          </ul>

          <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10 sm:gap-2.5" role="group" aria-label="Números del 00 al 99">
            {Array.from({ length: 100 }, (_, n) => {
              const st: Status = statuses[n] ?? "available";
              const isSel = selected.includes(n);
              const label = !loaded ? "available" : isSel ? "selected" : st;
              const disabled = !loaded || st !== "available";
              const text = { available: "disponible", selected: "seleccionado", reserved: "reservado", sold: "vendido" }[label];
              return (
                <button key={n} type="button" disabled={disabled || !reservationsOpen} aria-pressed={isSel} aria-label={`Número ${pad(n)}, ${text}`}
                  onClick={() => toggle(n)}
                  className={`aspect-square min-h-11 rounded-lg border-2 text-lg font-bold tabular-nums transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine ${loaded ? cellStyle[label] : "bg-white/60 text-stone-400 border-stone-200 animate-pulse"} ${!reservationsOpen && st === "available" ? "cursor-not-allowed opacity-70" : ""}`}>
                  {pad(n)}
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="t-how" className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-pine/10">
          <h2 id="t-how" className="font-display text-2xl font-bold text-pine">¿Cómo participar?</h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-4">
            {["Elige uno o varios números disponibles.", "Pulsa «Continuar con la reserva» y completa tus datos.", "Recibe tu código de reserva y escríbenos por WhatsApp.", "Realiza el pago indicado; al confirmarlo, tus números quedan vendidos."].map((t, i) => (
              <li key={i} className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-berry font-bold text-white">{i + 1}</span><span className="text-sm">{t}</span></li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-stone-600">Tu reserva se mantiene {config.reservationTtlMinutes} minutos; si no se confirma el pago, los números vuelven a estar disponibles.</p>
        </section>

        <section aria-labelledby="t-terms" className="text-sm">
          <h2 id="t-terms" className="font-display text-xl font-bold text-pine">Condiciones de participación</h2>
          {config.terms.length ? <ul className="mt-2 list-disc space-y-1 pl-5">{config.terms.map((t) => <li key={t}>{t}</li>)}</ul> : <p className="mt-2"><Pending /></p>}
        </section>
      </main>

      <footer className="bg-pine-dark px-4 py-8 text-center text-sm text-cream/80">
        <p className="font-semibold text-cream">Constructora Painting 2 S.A.S.</p>
        <p className="mt-1">{config.legalInfo ?? "Datos legales: pendientes de definir"}</p>
        <a href="/admin" className="mt-3 inline-block text-xs text-cream/50 hover:text-cream">Administración</a>
      </footer>

      {step === "grid" && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-pine/20 bg-white/95 p-3 shadow-[0_-4px_16px_rgba(0,0,0,.08)] backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="min-w-0 flex-1" aria-live="polite">
              <p className="text-sm font-semibold text-pine">{selected.length} {selected.length === 1 ? "número" : "números"} · {price ? money(total) : "precio pendiente"}</p>
              <p className="truncate text-sm text-stone-600">{selected.length ? selected.map(pad).join(", ") : "Aún no has elegido números"}</p>
            </div>
            {selected.length > 0 && <button type="button" onClick={() => setSelected([])} className="text-sm text-berry underline">Limpiar</button>}
            <button type="button" disabled={!selected.length || !reservationsOpen} onClick={() => setStep("form")} className="w-full rounded-full bg-berry px-6 py-3 font-semibold text-white shadow hover:bg-berry-dark disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto">Continuar con la reserva</button>
          </div>
        </div>
      )}

      {step !== "grid" && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Reserva">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl fade-up">
            {step === "form" && (
              <form noValidate onSubmit={(e) => { e.preventDefault(); if (validate()) setStep("review"); }} className="space-y-4">
                <h2 className="font-display text-2xl font-bold text-pine">Tus datos</h2>
                <Field id="name" label="Nombre completo" error={errors.name}>
                  <input id="name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
                </Field>
                <Field id="phone" label="Teléfono o WhatsApp" error={errors.phone}>
                  <input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
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
                <h2 className="font-display text-2xl font-bold text-pine">Confirma tu reserva</h2>
                <dl className="space-y-1 text-sm"><Row k="Nombre" v={form.name.trim()} /><Row k="Teléfono" v={form.phone.trim()} /></dl>
                <Summary nums={selected} total={money(total)} />
                <p className="text-xs text-stone-600">Reservar aparta tus números por {config.reservationTtlMinutes} minutos. Quedan vendidos solo cuando se confirme tu pago.</p>
                {serverError && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800">{serverError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep("form")} className="btn-secondary" disabled={submitting}>Editar</button>
                  <button type="button" onClick={submit} disabled={submitting} className="btn-primary flex-1">{submitting ? "Reservando…" : "Confirmar reserva"}</button>
                </div>
              </div>
            )}
            {step === "done" && result && (
              <div className="space-y-4">
                <h2 className="font-display text-2xl font-bold text-pine">¡Reserva registrada! 🎄</h2>
                <p className="rounded-lg bg-pine/5 p-3 text-center">Tu código de reserva<br /><b className="text-2xl tracking-widest text-berry">{result.reservation.code}</b></p>
                <Summary nums={result.reservation.numbers} total={money(result.reservation.total)} />
                <p className="text-sm">Reserva válida hasta {new Date(result.reservation.expiresAt).toLocaleString("es-CO")}. <b>Aún no es una venta:</b> se confirma cuando verifiquemos tu pago.</p>
                {result.paymentInstructions && <p className="rounded bg-amber-50 p-3 text-sm"><b>Pago:</b> {result.paymentInstructions}</p>}
                {result.whatsappUrl ? (
                  <a href={result.whatsappUrl} target="_blank" rel="noopener noreferrer" className="block rounded-full bg-[#1f9d55] px-6 py-3 text-center font-semibold text-white hover:brightness-110">Continuar por WhatsApp</a>
                ) : (
                  <p className="rounded bg-amber-50 p-3 text-sm">El número oficial de WhatsApp aún no está configurado. Guarda tu código <b>{result.reservation.code}</b> y contacta a la empresa.</p>
                )}
                <button type="button" onClick={reset} className="btn-secondary w-full">Cerrar</button>
              </div>
            )}
          </div>
        </div>
      )}

      {config.whatsappNumber && step === "grid" && (
        <a href={`https://wa.me/${config.whatsappNumber}`} target="_blank" rel="noopener noreferrer" aria-label="Escribir por WhatsApp" className="fixed bottom-36 right-4 sm:bottom-24 z-10 flex h-12 items-center rounded-full bg-[#1f9d55] px-4 text-sm font-semibold text-white shadow-lg hover:brightness-110">WhatsApp</a>
      )}
      <style>{`.input{width:100%;border:2px solid #cbd5d0;border-radius:.5rem;padding:.65rem .75rem;font-size:1rem}.input:focus{outline:2px solid #0f3d2e;border-color:#0f3d2e}.btn-primary{background:#b3202a;color:#fff;border-radius:9999px;padding:.75rem 1.25rem;font-weight:600}.btn-primary:hover{background:#8c1820}.btn-primary:disabled{opacity:.5}.btn-secondary{border:2px solid #0f3d2e;color:#0f3d2e;border-radius:9999px;padding:.75rem 1.25rem;font-weight:600}`}</style>
    </div>
  );
}

const Stat = ({ label, value }: { label: string; value: number | string }) => (
  <div className="rounded-xl bg-white/10 p-3"><div className="text-2xl font-bold">{value}</div><div className="text-xs text-cream/80">{label}</div></div>
);
const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-pine/10"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">{title}</h3>{children}</div>
);
const Pending = () => <span className="inline-block rounded bg-amber-100 px-2 py-1 text-sm font-semibold text-amber-900">{PENDING}</span>;
const Row = ({ k, v }: { k: string; v: string }) => <div className="flex justify-between gap-3"><dt className="text-stone-500">{k}</dt><dd className="text-right font-medium">{v}</dd></div>;
const Summary = ({ nums, total }: { nums: number[]; total: string }) => (
  <div className="rounded-lg bg-pine/5 p-3 text-sm">
    <Row k="Números" v={nums.map(pad).join(", ")} />
    <Row k="Cantidad de boletas" v={String(nums.length)} />
    <Row k="Valor total" v={total} />
  </div>
);
function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return <div><label htmlFor={id} className="mb-1 block text-sm font-semibold">{label}</label>{children}{error && <p className="mt-1 text-sm text-berry">{error}</p>}</div>;
}
