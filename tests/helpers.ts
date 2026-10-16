import { readFileSync } from "node:fs";
import { getPool, query } from "@/lib/db";

export function setupEnv() {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres@localhost:5432/rifa_test";
  process.env.RAFFLE_TICKET_PRICE = "5000"; // valor de prueba, no oficial
  process.env.RESERVATION_TTL_MINUTES = "60";
  process.env.MAX_NUMBERS_PER_RESERVATION = "20";
}

export async function resetDb() {
  await getPool().query(readFileSync("db/schema.sql", "utf8"));
  await query("UPDATE raffle_numbers SET status='available', reservation_id=NULL");
  await query("DELETE FROM audit_log");
  await query("DELETE FROM reservation_numbers");
  await query("DELETE FROM reservations");
  await query("DELETE FROM participants");
}
