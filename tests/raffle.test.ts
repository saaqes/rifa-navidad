import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getPool, query } from "@/lib/db";
import { resetDb, setupEnv } from "./helpers";
import {
  adminOverview, cancelReservation, confirmPayment, createReservation, listPublicNumbers, releaseExpired, searchReservations,
} from "@/lib/raffle";

const person = (i = 1) => ({ name: `Persona Prueba ${"ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i % 26]}`, phone: `30000000${String(i).padStart(2, "0")}` });

beforeAll(async () => { setupEnv(); });
beforeEach(async () => { await resetDb(); });
afterAll(async () => { await getPool().end(); });

describe("números", () => {
  it("existen exactamente 100 números, 0 a 99, todos disponibles al inicio", async () => {
    const rows = await listPublicNumbers();
    expect(rows).toHaveLength(100);
    expect(rows.map((r) => r.number)).toEqual(Array.from({ length: 100 }, (_, i) => i));
    expect(rows.every((r) => r.status === "available")).toBe(true);
  });
});

describe("reservas", () => {
  it("calcula el total y marca los números como reservados", async () => {
    const r = await createReservation({ ...person(), numbers: [7, 0, 99] });
    expect(r.numbers).toEqual([0, 7, 99]);
    expect(r.total).toBe(15000);
    expect(r.code).toMatch(/^RN-[A-Z0-9]{6}$/);
    const st = Object.fromEntries((await listPublicNumbers()).map((n) => [n.number, n.status]));
    expect(st[0]).toBe("reserved");
    expect(st[1]).toBe("available");
  });

  it("rechaza números ya reservados o vendidos y no deja reservas parciales", async () => {
    const a = await createReservation({ ...person(1), numbers: [5] });
    await confirmPayment(a.id, "admin@test", "ref-1");
    await createReservation({ ...person(2), numbers: [6] });
    await expect(createReservation({ ...person(3), numbers: [4, 5] })).rejects.toMatchObject({ status: 409, extra: { unavailable: [5] } });
    await expect(createReservation({ ...person(3), numbers: [6, 8] })).rejects.toMatchObject({ status: 409 });
    const st = Object.fromEntries((await listPublicNumbers()).map((n) => [n.number, n.status]));
    expect(st[4]).toBe("available");
    expect(st[8]).toBe("available");
    expect(st[5]).toBe("sold");
  });

  it("solicitudes simultáneas por el mismo número: solo una gana", async () => {
    const attempts = Array.from({ length: 25 }, (_, i) => createReservation({ ...person(i), numbers: [42, 43] }).then(() => "ok", (e) => e.status));
    const results = await Promise.all(attempts);
    expect(results.filter((r) => r === "ok")).toHaveLength(1);
    expect(results.filter((r) => r === 409)).toHaveLength(24);
    const { rows } = await query("SELECT count(*)::int AS n FROM reservation_numbers WHERE released_at IS NULL");
    expect(rows[0].n).toBe(2);
  });

  it("solicitudes simultáneas con números cruzados no generan interbloqueos ni duplicados", async () => {
    const sets = [[1, 2, 3], [3, 2, 1], [2, 3, 4], [4, 1, 2], [3, 4, 5], [5, 4, 3]];
    const results = await Promise.all(sets.map((s, i) => createReservation({ ...person(i), numbers: s }).then(() => "ok", (e) => e.status)));
    expect(results.every((r) => r === "ok" || r === 409)).toBe(true);
    const { rows } = await query("SELECT number, count(*)::int AS n FROM reservation_numbers WHERE released_at IS NULL GROUP BY number HAVING count(*) > 1");
    expect(rows).toHaveLength(0);
  });

  it("el índice único impide asignar un número a dos reservas vigentes aunque se salte la lógica", async () => {
    const a = await createReservation({ ...person(1), numbers: [10] });
    const b = await createReservation({ ...person(2), numbers: [11] });
    await expect(query("INSERT INTO reservation_numbers (reservation_id, number) VALUES ($1, 10)", [b.id])).rejects.toThrow();
    expect(a.id).not.toBe(b.id);
  });

  it("valida entradas en el servidor", async () => {
    await expect(createReservation({ ...person(), numbers: [] })).rejects.toMatchObject({ status: 400 });
    await expect(createReservation({ ...person(), numbers: [100] })).rejects.toMatchObject({ status: 400 });
    await expect(createReservation({ ...person(), numbers: Array.from({ length: 21 }, (_, i) => i) })).rejects.toMatchObject({ status: 400 });
  });

  it("sin precio configurado no se permite reservar", async () => {
    const old = process.env.RAFFLE_TICKET_PRICE;
    delete process.env.RAFFLE_TICKET_PRICE;
    await expect(createReservation({ ...person(), numbers: [1] })).rejects.toMatchObject({ status: 503 });
    process.env.RAFFLE_TICKET_PRICE = old;
  });
});

describe("transiciones de estado", () => {
  it("confirmar pago: reservada -> pagada, números vendidos, ventas sumadas", async () => {
    const r = await createReservation({ ...person(), numbers: [1, 2] });
    await confirmPayment(r.id, "admin@test", "ref");
    const o = await adminOverview();
    expect(o.stats).toMatchObject({ sold: 2, reserved: 0, salesTotal: 10000 });
    await expect(confirmPayment(r.id, "admin@test")).rejects.toMatchObject({ status: 409 });
  });

  it("cancelar libera los números y no se puede confirmar después", async () => {
    const r = await createReservation({ ...person(), numbers: [20] });
    await cancelReservation(r.id, "admin@test");
    expect((await adminOverview()).stats.available).toBe(100);
    await expect(confirmPayment(r.id, "admin@test")).rejects.toMatchObject({ status: 409 });
    await createReservation({ ...person(2), numbers: [20] }); // vuelve a ser comprable
  });

  it("cancelar una venta confirmada exige motivo y marca reembolso", async () => {
    const r = await createReservation({ ...person(), numbers: [30] });
    await confirmPayment(r.id, "admin@test");
    await expect(cancelReservation(r.id, "admin@test")).rejects.toMatchObject({ status: 400 });
    await cancelReservation(r.id, "admin@test", "Pago devuelto");
    const [row] = await searchReservations(r.code);
    expect(row).toMatchObject({ status: "cancelled", payment_status: "refunded" });
    expect((await adminOverview()).stats.sold).toBe(0);
  });

  it("las reservas vencidas se liberan; las confirmadas nunca", async () => {
    const a = await createReservation({ ...person(1), numbers: [50] });
    const b = await createReservation({ ...person(2), numbers: [51] });
    await confirmPayment(b.id, "admin@test");
    await query("UPDATE reservations SET expires_at = now() - interval '1 minute'");
    expect(await releaseExpired("admin@test")).toBe(1);
    const st = Object.fromEntries((await listPublicNumbers()).map((n) => [n.number, n.status]));
    expect(st[50]).toBe("available");
    expect(st[51]).toBe("sold");
    await expect(confirmPayment(a.id, "admin@test")).rejects.toMatchObject({ status: 409 });
  });

  it("confirmar una reserva vencida la libera y falla", async () => {
    const a = await createReservation({ ...person(1), numbers: [60] });
    await query("UPDATE reservations SET expires_at = now() - interval '1 minute'");
    await expect(confirmPayment(a.id, "admin@test")).rejects.toMatchObject({ status: 409 });
    expect((await adminOverview()).stats.available).toBe(100);
  });

  it("registra las operaciones en el historial y permite buscar", async () => {
    const r = await createReservation({ ...person(7), numbers: [70] });
    await confirmPayment(r.id, "admin@test");
    const { rows } = await query("SELECT action FROM audit_log ORDER BY id");
    expect(rows.map((x) => x.action)).toEqual(["reservation.created", "payment.confirmed"]);
    expect(await searchReservations(r.code.toLowerCase())).toHaveLength(1);
    expect(await searchReservations("persona prueba")).toHaveLength(1);
    expect(await searchReservations("3000000007")).toHaveLength(1);
    expect(await searchReservations("zzz")).toHaveLength(0);
  });
});
