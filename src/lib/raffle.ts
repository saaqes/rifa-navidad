import { randomInt } from "node:crypto";
import type { PoolClient } from "pg";
import { query, withTx } from "./db";
import { AppError } from "./errors";
import { getRaffleConfig } from "./config";
import { normalizePhone } from "./validation";

export type NumberStatus = "available" | "reserved" | "sold";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin caracteres ambiguos
const newCode = () =>
  "RN-" + Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");

async function audit(
  c: PoolClient,
  actor: string,
  action: string,
  reservationId: string | null,
  details: Record<string, unknown> = {},
) {
  await c.query(
    "INSERT INTO audit_log (actor, action, reservation_id, details) VALUES ($1,$2,$3,$4)",
    [actor, action, reservationId, JSON.stringify(details)],
  );
}

/**
 * Libera las reservas activas vencidas. Operación del servidor que vuelve a
 * comprobar el estado dentro de la misma transacción (FOR UPDATE SKIP LOCKED),
 * por lo que nunca libera una reserva ya confirmada o cancelada.
 */
export async function expireStale(c: PoolClient, actor = "system"): Promise<number> {
  const { rows } = await c.query<{ id: string }>(
    `UPDATE reservations SET status='expired', updated_at=now()
      WHERE id IN (SELECT id FROM reservations
                    WHERE status='active' AND expires_at < now()
                    FOR UPDATE SKIP LOCKED)
      RETURNING id`,
  );
  if (rows.length === 0) return 0;
  const ids = rows.map((r) => r.id);
  await releaseNumbers(c, ids);
  for (const id of ids) await audit(c, actor, "reservation.expired", id);
  return ids.length;
}

async function releaseNumbers(c: PoolClient, reservationIds: string[]) {
  await c.query(
    `UPDATE raffle_numbers SET status='available', reservation_id=NULL, updated_at=now()
      WHERE reservation_id = ANY($1::uuid[])`,
    [reservationIds],
  );
  await c.query(
    "UPDATE reservation_numbers SET released_at=now() WHERE reservation_id = ANY($1::uuid[]) AND released_at IS NULL",
    [reservationIds],
  );
}

/** Estado público de los 100 números (sin datos personales). */
export async function listPublicNumbers() {
  await withTx((c) => expireStale(c));
  const { rows } = await query<{ number: number; status: NumberStatus }>(
    "SELECT number, status FROM raffle_numbers ORDER BY number",
  );
  return rows;
}

export interface ReserveInput {
  name: string;
  phone: string;
  numbers: number[];
}

export async function createReservation(input: ReserveInput) {
  const cfg = getRaffleConfig();
  if (!cfg.ticketPrice) {
    throw new AppError(503, "Las reservas aún no están habilitadas: falta definir el precio de la boleta.");
  }
  const price = cfg.ticketPrice;
  const nums = [...new Set(input.numbers)].sort((a, b) => a - b);
  if (nums.length === 0 || nums.some((n) => !Number.isInteger(n) || n < 0 || n > 99)) {
    throw new AppError(400, "Los números deben estar entre 00 y 99.");
  }
  if (nums.length > cfg.maxNumbersPerReservation) {
    throw new AppError(400, `Puedes reservar máximo ${cfg.maxNumbersPerReservation} números por vez.`);
  }
  const phone = normalizePhone(input.phone);

  return withTx(async (c) => {
    await expireStale(c);

    // Bloqueo en orden ascendente: evita interbloqueos entre solicitudes simultáneas.
    const { rows: locked } = await c.query<{ number: number; status: NumberStatus }>(
      "SELECT number, status FROM raffle_numbers WHERE number = ANY($1::int[]) ORDER BY number FOR UPDATE",
      [nums],
    );
    const unavailable = locked.filter((r) => r.status !== "available").map((r) => r.number);
    if (locked.length !== nums.length || unavailable.length > 0) {
      throw new AppError(409, "Algunos números ya no están disponibles.", { unavailable });
    }

    const { rows: p } = await c.query<{ id: string }>(
      `INSERT INTO participants (name, phone) VALUES ($1,$2)
       ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [input.name, phone],
    );

    let reservation: { id: string; code: string; created_at: Date; expires_at: Date } | undefined;
    for (let attempt = 0; attempt < 5 && !reservation; attempt++) {
      const r = await c.query(
        `INSERT INTO reservations (code, participant_id, quantity, unit_price, total, expires_at)
         VALUES ($1,$2,$3,$4,$5, now() + make_interval(mins => $6))
         ON CONFLICT (code) DO NOTHING
         RETURNING id, code, created_at, expires_at`,
        [newCode(), p[0].id, nums.length, price, nums.length * price, cfg.reservationTtlMinutes],
      );
      reservation = r.rows[0];
    }
    if (!reservation) throw new AppError(500, "No se pudo generar el código de reserva. Intenta de nuevo.");

    await c.query(
      "INSERT INTO reservation_numbers (reservation_id, number) SELECT $1, unnest($2::int[])",
      [reservation.id, nums],
    );
    const upd = await c.query(
      `UPDATE raffle_numbers SET status='reserved', reservation_id=$1, updated_at=now()
        WHERE number = ANY($2::int[]) AND status='available'`,
      [reservation.id, nums],
    );
    if (upd.rowCount !== nums.length) throw new AppError(409, "Algunos números ya no están disponibles.");

    await audit(c, "participant", "reservation.created", reservation.id, { numbers: nums, total: nums.length * price });
    return {
      id: reservation.id,
      code: reservation.code,
      name: input.name,
      numbers: nums,
      quantity: nums.length,
      total: nums.length * price,
      createdAt: reservation.created_at.toISOString(),
      expiresAt: reservation.expires_at.toISOString(),
    };
  });
}

async function lockReservation(c: PoolClient, id: string) {
  const { rows } = await c.query<{ id: string; status: string; code: string }>(
    "SELECT id, status, code FROM reservations WHERE id=$1 FOR UPDATE",
    [id],
  );
  if (!rows[0]) throw new AppError(404, "La reserva no existe.");
  return rows[0];
}

/** Confirma el pago: solo desde 'active' y no vencida. Marca los números como vendidos. */
export async function confirmPayment(id: string, actor: string, reference?: string) {
  return withTx(async (c) => {
    const r = await lockReservation(c, id);
    if (r.status !== "active") {
      throw new AppError(409, `No se puede confirmar una reserva en estado "${r.status}".`);
    }
    const { rows } = await c.query("SELECT expires_at < now() AS expired FROM reservations WHERE id=$1", [id]);
    if (rows[0].expired) {
      await expireStale(c, actor);
      await c.query("COMMIT"); // conserva la liberación de la reserva vencida
      await c.query("BEGIN");
      throw new AppError(409, "La reserva venció y sus números fueron liberados.");
    }
    await c.query(
      `UPDATE reservations SET status='confirmed', payment_status='paid', confirmed_at=now(),
              payment_reference=$2, updated_at=now() WHERE id=$1`,
      [id, reference ?? null],
    );
    await c.query(
      "UPDATE raffle_numbers SET status='sold', updated_at=now() WHERE reservation_id=$1 AND status='reserved'",
      [id],
    );
    await audit(c, actor, "payment.confirmed", id, { reference: reference ?? null });
    return { id, code: r.code, status: "confirmed" };
  });
}

/** Cancela una reserva. Si ya estaba pagada exige un motivo y la marca como reembolsada. */
export async function cancelReservation(id: string, actor: string, reason?: string) {
  return withTx(async (c) => {
    const r = await lockReservation(c, id);
    if (r.status === "cancelled" || r.status === "expired") {
      throw new AppError(409, `La reserva ya está en estado "${r.status}".`);
    }
    if (r.status === "confirmed" && !reason) {
      throw new AppError(400, "Para cancelar una venta confirmada debes indicar el motivo.");
    }
    await c.query(
      `UPDATE reservations SET status='cancelled',
              payment_status = CASE WHEN status='confirmed' THEN 'refunded' ELSE payment_status END,
              cancel_reason=$2, updated_at=now() WHERE id=$1`,
      [id, reason ?? null],
    );
    await releaseNumbers(c, [id]);
    await audit(c, actor, "reservation.cancelled", id, { reason: reason ?? null, previous: r.status });
    return { id, code: r.code, status: "cancelled" };
  });
}

export async function releaseExpired(actor: string) {
  return withTx((c) => expireStale(c, actor));
}

export async function adminOverview() {
  await releaseExpired("system");
  const numbers = await query(
    `SELECT n.number, n.status, r.code, p.name
       FROM raffle_numbers n
       LEFT JOIN reservations r ON r.id = n.reservation_id
       LEFT JOIN participants p ON p.id = r.participant_id
      ORDER BY n.number`,
  );
  const stats = await query<{ available: number; reserved: number; sold: number; sales_total: string }>(
    `SELECT count(*) FILTER (WHERE status='available')::int AS available,
            count(*) FILTER (WHERE status='reserved')::int  AS reserved,
            count(*) FILTER (WHERE status='sold')::int      AS sold,
            COALESCE((SELECT sum(total) FROM reservations WHERE status='confirmed'),0)::text AS sales_total
       FROM raffle_numbers`,
  );
  const s = stats.rows[0];
  return {
    numbers: numbers.rows,
    stats: { available: s.available, reserved: s.reserved, sold: s.sold, salesTotal: Number(s.sales_total) },
  };
}

export async function searchReservations(q: string, status?: string) {
  const term = `%${q.trim()}%`;
  const digits = q.replace(/\D/g, "");
  const { rows } = await query(
    `SELECT r.id, r.code, r.status, r.payment_status, r.quantity, r.total, r.created_at, r.expires_at,
            r.confirmed_at, r.payment_reference, r.cancel_reason, p.name, p.phone,
            COALESCE((SELECT array_agg(rn.number ORDER BY rn.number) FROM reservation_numbers rn
                       WHERE rn.reservation_id = r.id), '{}') AS numbers
       FROM reservations r JOIN participants p ON p.id = r.participant_id
      WHERE ($1 = '%%' OR r.code ILIKE $1 OR p.name ILIKE $1 OR ($2 <> '' AND p.phone LIKE '%' || $2 || '%'))
        AND ($3::text IS NULL OR r.status = $3)
      ORDER BY r.created_at DESC LIMIT 200`,
    [term, digits, status || null],
  );
  return rows;
}

export async function listAudit(limit = 100) {
  const { rows } = await query(
    `SELECT a.id, a.actor, a.action, a.details, a.created_at, COALESCE(r.code, a.details->>'code') AS code
       FROM audit_log a LEFT JOIN reservations r ON r.id = a.reservation_id
      ORDER BY a.id DESC LIMIT $1`,
    [limit],
  );
  return rows;
}

/** Una boleta solo existe para números de reservas con pago confirmado. */
export async function findConfirmedTicket(code: string, number: number): Promise<boolean> {
  const { rows } = await query(
    `SELECT 1 FROM reservations r
       JOIN raffle_numbers n ON n.reservation_id = r.id
      WHERE r.code = $1 AND r.status = 'confirmed' AND n.status = 'sold' AND n.number = $2`,
    [code, number],
  );
  return rows.length > 0;
}

/**
 * Elimina definitivamente reservas canceladas o vencidas (sus números ya están libres).
 * Las confirmadas/activas nunca se eliminan: primero hay que cancelarlas.
 * El historial se conserva: se guarda el código en cada registro antes de desvincularlo.
 */
export async function deleteReservations(actor: string, ids?: string[]) {
  return withTx(async (c) => {
    const { rows } = await c.query<{ id: string; code: string; participant_id: string }>(
      `SELECT id, code, participant_id FROM reservations
        WHERE status IN ('cancelled','expired') AND ($1::uuid[] IS NULL OR id = ANY($1::uuid[]))
        ORDER BY created_at FOR UPDATE`,
      [ids ?? null],
    );
    if (ids && rows.length !== ids.length) {
      throw new AppError(409, "Solo se pueden eliminar reservas canceladas o vencidas.");
    }
    if (rows.length === 0) return { deleted: 0 };
    const rids = rows.map((r) => r.id);
    for (const r of rows) {
      await c.query("UPDATE audit_log SET details = details || jsonb_build_object('code', $2::text) WHERE reservation_id = $1", [r.id, r.code]);
    }
    await c.query("UPDATE audit_log SET reservation_id = NULL WHERE reservation_id = ANY($1::uuid[])", [rids]);
    await c.query("DELETE FROM reservation_numbers WHERE reservation_id = ANY($1::uuid[])", [rids]);
    await c.query("DELETE FROM reservations WHERE id = ANY($1::uuid[])", [rids]);
    await c.query(
      `DELETE FROM participants p WHERE p.id = ANY($1::uuid[])
          AND NOT EXISTS (SELECT 1 FROM reservations r WHERE r.participant_id = p.id)`,
      [rows.map((r) => r.participant_id)],
    );
    await audit(c, actor, "reservations.deleted", null, { count: rows.length, codes: rows.map((r) => r.code) });
    return { deleted: rows.length };
  });
}
