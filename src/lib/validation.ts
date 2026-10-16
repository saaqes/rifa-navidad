import { z } from "zod";

export function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-().+]/g, "");
}

export const reservationInput = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Escribe tu nombre completo.")
    .max(120, "El nombre es demasiado largo.")
    .regex(/^[\p{L}][\p{L}\s.'-]*$/u, "El nombre solo puede contener letras y espacios."),
  phone: z
    .string()
    .trim()
    .max(25)
    .regex(/^\+?[\d\s\-().]+$/, "Escribe un teléfono válido.")
    .transform(normalizePhone)
    .refine((p) => /^\d{7,15}$/.test(p), "El teléfono debe tener entre 7 y 15 dígitos."),
  numbers: z
    .array(z.number().int().min(0).max(99))
    .min(1, "Selecciona al menos un número.")
    .max(100)
    .refine((a) => new Set(a).size === a.length, "Hay números repetidos."),
  acceptedTerms: z.boolean().optional(),
});

export type ReservationInput = z.infer<typeof reservationInput>;

export const cancelInput = z.object({ reason: z.string().trim().max(300).optional() });
export const confirmInput = z.object({ reference: z.string().trim().max(120).optional() });
