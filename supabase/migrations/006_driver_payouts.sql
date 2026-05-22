-- Driver payouts: one record per payout period per driver
CREATE TABLE driver_payouts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_name  TEXT NOT NULL,
  period_label TEXT NOT NULL,        -- e.g. "Nov-Dec 2025"
  notes        TEXT,
  finalized    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Individual trips within a payout
CREATE TABLE driver_payout_trips (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id        UUID NOT NULL REFERENCES driver_payouts(id) ON DELETE CASCADE,
  trip_date        DATE,
  description      TEXT NOT NULL,     -- destination / clinic name
  transport_amount NUMERIC(10,2) NOT NULL DEFAULT 70,
  bill_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order       INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON driver_payout_trips (payout_id, sort_order);

-- RLS
ALTER TABLE driver_payouts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_payout_trips  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_payouts"       ON driver_payouts      FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_payout_trips"  ON driver_payout_trips FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_write_payouts" ON driver_payouts
  FOR ALL TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "admin_write_payout_trips" ON driver_payout_trips
  FOR ALL TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');
