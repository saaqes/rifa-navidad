-- Esquema de la Gran Rifa Navideña. Idempotente: se puede ejecutar varias veces.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS participants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL CHECK (char_length(name) BETWEEN 3 AND 120),
  phone       text NOT NULL UNIQUE CHECK (phone ~ '^[0-9]{7,15}$'),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reservations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL UNIQUE,
  participant_id  uuid NOT NULL REFERENCES participants(id),
  quantity        integer NOT NULL CHECK (quantity > 0),
  unit_price      integer NOT NULL CHECK (unit_price > 0),
  total           integer NOT NULL CHECK (total = quantity * unit_price),
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','confirmed','cancelled','expired')),
  payment_status  text NOT NULL DEFAULT 'pending'
                  CHECK (payment_status IN ('pending','paid','refunded')),
  payment_reference text,
  cancel_reason   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL,
  confirmed_at    timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'confirmed') = (payment_status = 'paid') OR status IN ('cancelled','expired'))
);
CREATE INDEX IF NOT EXISTS reservations_status_expires_idx ON reservations(status, expires_at);

CREATE TABLE IF NOT EXISTS raffle_numbers (
  number          smallint PRIMARY KEY CHECK (number BETWEEN 0 AND 99),
  status          text NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available','reserved','sold')),
  reservation_id  uuid REFERENCES reservations(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'available') = (reservation_id IS NULL))
);

-- Los 100 números, del 00 al 99.
INSERT INTO raffle_numbers (number)
SELECT g FROM generate_series(0, 99) AS g
ON CONFLICT (number) DO NOTHING;

-- Historial de asignaciones; el índice parcial impide que un número
-- pertenezca a dos reservas vigentes a la vez.
CREATE TABLE IF NOT EXISTS reservation_numbers (
  reservation_id uuid NOT NULL REFERENCES reservations(id),
  number         smallint NOT NULL REFERENCES raffle_numbers(number),
  released_at    timestamptz,
  PRIMARY KEY (reservation_id, number)
);
CREATE UNIQUE INDEX IF NOT EXISTS reservation_numbers_one_holder
  ON reservation_numbers(number) WHERE released_at IS NULL;

CREATE TABLE IF NOT EXISTS audit_log (
  id              bigserial PRIMARY KEY,
  actor           text NOT NULL,
  action          text NOT NULL,
  reservation_id  uuid REFERENCES reservations(id),
  details         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Seguridad: RLS activado y SIN políticas => los roles anon/authenticated de
-- Supabase no pueden leer ni escribir. Solo el servidor (conexión directa con
-- el rol propietario de la base de datos) accede a los datos.
ALTER TABLE participants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE raffle_numbers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log           ENABLE ROW LEVEL SECURITY;
