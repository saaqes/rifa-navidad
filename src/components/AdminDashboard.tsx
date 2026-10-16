"use client";
import { useCallback, useEffect, useState } from "react";
import { formatMoney, pad } from "@/lib/format";
import { CornerDecor, Lights, Snowfall } from "./Decor";

type NumRow = { number: number; status: "available" | "reserved" | "sold"; code: string | null; name: string | null };
type Res = {
  id: string; code: string; status: string; payment_status: string; quantity: number; total: number;
  created_at: string; expires_at: string; confirmed_at: string | null; name: string; phone: string; numbers: number[];
  payment_reference: string | null; cancel_reason: string | null; whatsappUrl: string | null;
};
type AuditRow = { id: number; actor: string; action: string; code: string | null; details: Record<string, unknown>; created_at: string };
type Dialog = { kind: "confirm" | "cancel"; r: Res } | null;

const statusLabel: Record<string, string> = { active: "Reservada", confirmed: "Pagada", cancelled: "Cancelada", expired: "Vencida" };
const statusStyle: Record<string, string> = { active: "bg-amber-100 text-amber-900", confirmed: "bg-emerald-100 text-emerald-900", cancelled: "bg-red-100 text-red-900", expired: "bg-stone-200 text-stone-700" };
const numColor = { available: "ball-available", reserved: "ball-reserved", sold: "ball-selected" };
const actionLabel: Record<string, string> = {
  "reservation.created": "Reserva creada", "payment.confirmed": "Pago confirmado", "reservation.cancelled": "Reserva cancelada",
  "reservation.expired": "Reserva vencida", "admin.login": "Inicio de sesión", "admin.login_failed": "Intento de acceso fallido",
};

export function AdminDashboard({ username, currency }: { username: string; currency: string }) {
  const [overview, setOverview] = useState<{ numbers: NumRow[]; stats: { available: number; reserved: number; sold: number; salesTotal: number } } | null>(null);
  const [reservations, setReservations] = useState<Res[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [tab, setTab] = useState<"res" | "nums" | "audit">("res");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const api = useCallback(async (url: string, init?: RequestInit) => {
    const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" }, cache: "no-store" });
    if (res.status === 401) { window.location.href = "/admin/login"; throw new Error("auth"); }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error");
    return data;
  }, []);

  const load = useCallback(async () => {
    try {
      const [o, r, a] = await Promise.all([
        api("/api/admin/overview"),
        api(`/api/admin/reservations?q=${encodeURIComponent(q)}&status=${status}`),
        api("/api/admin/audit"),
      ]);
      setOverview(o); setReservations(r.reservations); setAudit(a.entries);
    } catch (e) { if ((e as Error).message !== "auth") setMsg({ text: (e as Error).message, ok: false }); }
  }, [api, q, status]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  async function act(url: string, body: object, ok: string) {
    setMsg(null); setBusy(true);
    try { await api(url, { method: "POST", body: JSON.stringify(body) }); setMsg({ text: ok, ok: true }); setDialog(null); setText(""); await load(); }
    catch (e) { setMsg({ text: (e as Error).message, ok: false }); }
    finally { setBusy(false); }
  }

  const money = (n: number) => formatMoney(n, currency);
  const fmt = (d: string) => new Date(d).toLocaleString("es-CO");

  return (
    <div className="relative min-h-screen overflow-x-clip pb-12">
      <Snowfall count={70} />
      <Lights />
      <CornerDecor gifts={false} />

      <div className="relative z-10 mx-auto max-w-6xl space-y-5 px-4 pt-16">
        <header className="flex flex-wrap items-center justify-between gap-2 text-cream">
          <h1 className="font-display text-2xl font-black text-gold sm:text-3xl">🎅 Panel de administración</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-full bg-white/10 px-3 py-1">👤 {username}</span>
            <button className="rounded-full border-2 border-gold px-4 py-1 font-semibold text-gold hover:bg-gold hover:text-pine-dark" onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); window.location.href = "/admin/login"; }}>Salir</button>
          </div>
        </header>

        {overview && (
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Resumen">
            {([["🎁 Disponibles", overview.stats.available], ["⏳ Reservados", overview.stats.reserved], ["✅ Vendidos", overview.stats.sold], ["💰 Ventas confirmadas", money(overview.stats.salesTotal)]] as const).map(([k, v]) => (
              <div key={k} className="panel fade-up p-4"><div className="text-xs font-bold uppercase text-stone-500">{k}</div><div className="font-display text-2xl font-black text-pine">{v}</div></div>
            ))}
          </section>
        )}
        {msg && <p role="status" className={`rounded-xl p-3 text-sm font-semibold ${msg.ok ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}>{msg.text}</p>}

        <nav className="flex flex-wrap gap-2 text-sm" aria-label="Secciones">
          {([["res", "🎟️ Reservas"], ["nums", "🔢 Números"], ["audit", "📜 Historial"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k} className={`rounded-full px-4 py-2 font-bold transition ${tab === k ? "bg-gold text-pine-dark shadow" : "bg-white/15 text-cream hover:bg-white/25"}`}>{l}</button>
          ))}
          <button className="ml-auto rounded-full bg-white/15 px-4 py-2 font-bold text-cream hover:bg-white/25" onClick={() => act("/api/admin/expire", {}, "Reservas vencidas liberadas.")}>♻️ Liberar vencidas</button>
        </nav>

        {tab === "res" && (
          <section className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 Buscar por código, nombre o teléfono" aria-label="Buscar reservas" className="input min-w-0 flex-1" />
              <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Estado" className="input !w-auto">
                <option value="">Todos</option>{Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {reservations.length === 0 && <p className="rounded-xl bg-white/10 p-4 text-sm text-cream">Sin reservas todavía.</p>}
            {reservations.map((r) => (
              <article key={r.id} className="panel fade-up p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2"><b className="text-lg tracking-wider text-berry">{r.code}</b><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusStyle[r.status]}`}>{statusLabel[r.status]}</span></div>
                  <div className="font-display text-lg font-black text-pine">{money(r.total)}</div>
                </div>
                <p className="mt-1 text-sm"><b>{r.name}</b> · 📱 {r.phone}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1 text-sm">Números: {r.numbers.map((n) => <span key={n} className="rounded-full bg-pine px-2 py-0.5 text-xs font-bold text-white">{pad(n)}</span>)} <span className="text-stone-500">({r.quantity})</span></p>
                <p className="mt-1 text-xs text-stone-500">Creada {fmt(r.created_at)} · Vence {fmt(r.expires_at)}{r.confirmed_at && ` · Pagada ${fmt(r.confirmed_at)}`}{r.payment_reference && ` · Ref. ${r.payment_reference}`}{r.cancel_reason && ` · Motivo: ${r.cancel_reason}`}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  {r.status === "active" && <button className="btn-primary !py-2" onClick={() => { setText(""); setDialog({ kind: "confirm", r }); }}>✅ Confirmar</button>}
                  {r.status === "confirmed" && (r.whatsappUrl
                    ? <a href={r.whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-whatsapp">💬 Escribir a este número</a>
                    : <span className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-900">El teléfono no es válido para WhatsApp.</span>)}
                  {r.status === "confirmed" && r.numbers.map((n) => (
                    <a key={n} href={`/boleta/${r.code}/${pad(n)}`} target="_blank" rel="noopener noreferrer" className="rounded-full border-2 border-pine px-3 py-1.5 text-xs font-bold text-pine hover:bg-pine hover:text-white">🎟️ Ver boleta {pad(n)}</a>
                  ))}
                  {(r.status === "active" || r.status === "confirmed") && (
                    <button className="rounded-full border-2 border-berry px-4 py-2 font-bold text-berry hover:bg-berry hover:text-white" onClick={() => { setText(""); setDialog({ kind: "cancel", r }); }}>Cancelar y liberar</button>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}

        {tab === "nums" && overview && (
          <section className="panel grid grid-cols-5 gap-2.5 p-4 sm:grid-cols-10">
            {overview.numbers.map((n) => (
              <div key={n.number} title={n.code ? `${n.code} · ${n.name}` : "Disponible"} className={`ball flex flex-col items-center justify-center ${numColor[n.status]}`} style={n.status === "sold" ? { animation: "none" } : undefined}>
                <div className="text-base leading-none">{pad(n.number)}</div><div className="mt-0.5 max-w-full truncate px-1 text-[9px] font-semibold leading-none">{n.code ?? ""}</div>
              </div>
            ))}
          </section>
        )}

        {tab === "audit" && (
          <section className="panel overflow-x-auto">
            <table className="w-full text-left text-sm"><thead className="bg-pine/10"><tr><th className="p-3">Fecha</th><th className="p-3">Actor</th><th className="p-3">Acción</th><th className="p-3">Reserva</th></tr></thead>
              <tbody>{audit.map((a) => <tr key={a.id} className="border-t border-gold/30"><td className="whitespace-nowrap p-3">{fmt(a.created_at)}</td><td className="p-3">{a.actor}</td><td className="p-3">{actionLabel[a.action] ?? a.action}</td><td className="p-3">{a.code ?? "—"}</td></tr>)}</tbody></table>
          </section>
        )}
      </div>

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" role="dialog" aria-modal="true">
          <div className="panel fade-up w-full max-w-md space-y-3 p-5">
            {dialog.kind === "confirm" ? (
              <>
                <h2 className="font-display text-2xl font-black text-pine">Confirmar pago</h2>
                <p className="text-sm">Reserva <b>{dialog.r.code}</b> de <b>{dialog.r.name}</b>: {money(dialog.r.total)}. Los números <b>{dialog.r.numbers.map(pad).join(", ")}</b> quedarán como vendidos y podrás enviarle su boleta por WhatsApp.</p>
                <label className="block text-sm font-bold">Referencia del pago (opcional)<input value={text} onChange={(e) => setText(e.target.value)} maxLength={120} className="input mt-1" /></label>
              </>
            ) : (
              <>
                <h2 className="font-display text-2xl font-black text-berry">Cancelar reserva</h2>
                <p className="text-sm">Se liberarán los números <b>{dialog.r.numbers.map(pad).join(", ")}</b> de <b>{dialog.r.name}</b>.{dialog.r.status === "confirmed" && " Como la venta ya estaba pagada, el motivo es obligatorio y se marcará como reembolsada."}</p>
                <label className="block text-sm font-bold">Motivo{dialog.r.status === "confirmed" ? " (obligatorio)" : " (opcional)"}<input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} className="input mt-1" /></label>
              </>
            )}
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => setDialog(null)} disabled={busy}>Volver</button>
              <button className="btn-primary flex-1" disabled={busy || (dialog.kind === "cancel" && dialog.r.status === "confirmed" && !text.trim())}
                onClick={() => dialog.kind === "confirm"
                  ? act(`/api/admin/reservations/${dialog.r.id}/confirm`, { reference: text }, `Pago confirmado: ${dialog.r.code}. Ya puedes escribirle por WhatsApp.`)
                  : act(`/api/admin/reservations/${dialog.r.id}/cancel`, { reason: text }, `Reserva cancelada: ${dialog.r.code}`)}>
                {busy ? "Procesando…" : dialog.kind === "confirm" ? "Confirmar pago" : "Cancelar reserva"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
