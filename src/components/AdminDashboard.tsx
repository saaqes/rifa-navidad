"use client";
import { useCallback, useEffect, useState } from "react";
import { formatMoney, pad } from "@/lib/format";

type NumRow = { number: number; status: "available" | "reserved" | "sold"; code: string | null; name: string | null };
type Res = {
  id: string; code: string; status: string; payment_status: string; quantity: number; total: number;
  created_at: string; expires_at: string; confirmed_at: string | null; name: string; phone: string; numbers: number[];
  payment_reference: string | null; cancel_reason: string | null;
};
type AuditRow = { id: number; actor: string; action: string; code: string | null; details: Record<string, unknown>; created_at: string };

const statusLabel: Record<string, string> = { active: "Reservada", confirmed: "Pagada", cancelled: "Cancelada", expired: "Vencida" };
const numColor = { available: "bg-white border-pine/30", reserved: "bg-gold/30 border-gold", sold: "bg-berry text-white border-berry-dark" };

export function AdminDashboard({ email, currency }: { email: string; currency: string }) {
  const [overview, setOverview] = useState<{ numbers: NumRow[]; stats: { available: number; reserved: number; sold: number; salesTotal: number } } | null>(null);
  const [reservations, setReservations] = useState<Res[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<"res" | "nums" | "audit">("res");

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
    } catch (e) { if ((e as Error).message !== "auth") setMsg((e as Error).message); }
  }, [api, q, status]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  async function act(url: string, body: object, ok: string) {
    setMsg("");
    try { await api(url, { method: "POST", body: JSON.stringify(body) }); setMsg(ok); await load(); }
    catch (e) { setMsg((e as Error).message); }
  }
  const money = (n: number) => formatMoney(n, currency);
  const fmt = (d: string) => new Date(d).toLocaleString("es-CO");

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold text-pine">Administración · Gran Rifa Navideña</h1>
        <div className="flex items-center gap-3 text-sm"><span className="text-stone-600">{email}</span>
          <button className="rounded-full border-2 border-pine px-3 py-1" onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); window.location.href = "/admin/login"; }}>Salir</button></div>
      </header>

      {overview && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Resumen">
          {[["Disponibles", overview.stats.available], ["Reservados", overview.stats.reserved], ["Vendidos", overview.stats.sold], ["Ventas confirmadas", money(overview.stats.salesTotal)]].map(([k, v]) => (
            <div key={String(k)} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-pine/10"><div className="text-xs uppercase text-stone-500">{k}</div><div className="text-2xl font-bold text-pine">{v}</div></div>
          ))}
        </section>
      )}
      {msg && <p role="status" className="rounded bg-amber-50 p-3 text-sm">{msg}</p>}

      <nav className="flex gap-2 text-sm" aria-label="Secciones">
        {([["res", "Reservas"], ["nums", "Números"], ["audit", "Historial"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k} className={`rounded-full px-4 py-2 font-semibold ${tab === k ? "bg-pine text-white" : "bg-white ring-1 ring-pine/20"}`}>{l}</button>
        ))}
        <button className="ml-auto rounded-full bg-white px-4 py-2 ring-1 ring-pine/20" onClick={() => act("/api/admin/expire", {}, "Reservas vencidas liberadas.")}>Liberar vencidas</button>
      </nav>

      {tab === "res" && (
        <section className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código, nombre o teléfono" aria-label="Buscar reservas" className="min-w-0 flex-1 rounded-lg border-2 border-stone-300 p-2" />
            <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Estado" className="rounded-lg border-2 border-stone-300 p-2">
              <option value="">Todos</option>{Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {reservations.length === 0 && <p className="text-sm text-stone-500">Sin resultados.</p>}
          {reservations.map((r) => (
            <article key={r.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-pine/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><b className="tracking-wider text-berry">{r.code}</b> <span className="ml-2 rounded bg-pine/10 px-2 py-0.5 text-xs font-semibold">{statusLabel[r.status]}</span></div>
                <div className="text-sm font-semibold">{money(r.total)}</div>
              </div>
              <p className="mt-1 text-sm">{r.name} · {r.phone}</p>
              <p className="text-sm">Números: <b>{r.numbers.map(pad).join(", ")}</b> ({r.quantity})</p>
              <p className="text-xs text-stone-500">Creada {fmt(r.created_at)} · Vence {fmt(r.expires_at)}{r.confirmed_at && ` · Pagada ${fmt(r.confirmed_at)}`}{r.payment_reference && ` · Ref. ${r.payment_reference}`}{r.cancel_reason && ` · Motivo: ${r.cancel_reason}`}</p>
              {(r.status === "active" || r.status === "confirmed") && (
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  {r.status === "active" && <button className="rounded-full bg-pine px-4 py-2 font-semibold text-white" onClick={() => { const ref = prompt("Referencia del pago (opcional):") ; if (ref !== null && confirm(`¿Confirmar pago de ${money(r.total)} y marcar ${r.numbers.map(pad).join(", ")} como vendidos?`)) act(`/api/admin/reservations/${r.id}/confirm`, { reference: ref }, `Pago confirmado: ${r.code}`); }}>Confirmar pago</button>}
                  <button className="rounded-full border-2 border-berry px-4 py-2 font-semibold text-berry" onClick={() => {
                    const reason = prompt(r.status === "confirmed" ? "Motivo de la cancelación (obligatorio, la venta está pagada):" : "Motivo (opcional):");
                    if (reason === null) return;
                    act(`/api/admin/reservations/${r.id}/cancel`, { reason }, `Reserva cancelada: ${r.code}`);
                  }}>Cancelar y liberar</button>
                </div>
              )}
            </article>
          ))}
        </section>
      )}

      {tab === "nums" && overview && (
        <section className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {overview.numbers.map((n) => (
            <div key={n.number} title={n.code ? `${n.code} · ${n.name}` : "Disponible"} className={`rounded-lg border-2 p-2 text-center ${numColor[n.status]}`}>
              <div className="text-lg font-bold">{pad(n.number)}</div><div className="truncate text-[10px]">{n.code ?? "—"}</div>
            </div>
          ))}
        </section>
      )}

      {tab === "audit" && (
        <section className="overflow-x-auto rounded-xl bg-white ring-1 ring-pine/10">
          <table className="w-full text-left text-sm"><thead className="bg-pine/5"><tr><th className="p-2">Fecha</th><th className="p-2">Actor</th><th className="p-2">Acción</th><th className="p-2">Reserva</th></tr></thead>
            <tbody>{audit.map((a) => <tr key={a.id} className="border-t"><td className="p-2 whitespace-nowrap">{fmt(a.created_at)}</td><td className="p-2">{a.actor}</td><td className="p-2">{a.action}</td><td className="p-2">{a.code ?? "—"}</td></tr>)}</tbody></table>
        </section>
      )}
    </div>
  );
}
