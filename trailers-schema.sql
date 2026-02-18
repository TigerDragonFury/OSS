-- ============================================================
-- Trailers / Logistics Module Schema
-- ============================================================

-- Own trailers fleet
CREATE TABLE IF NOT EXISTS trailers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100) NOT NULL,           -- e.g. "Trailer 1"
  plate_number    VARCHAR(50),
  trailer_type    VARCHAR(50),                     -- flatbed, enclosed, refrigerated, tanker, etc.
  capacity_tons   DECIMAL(10,2),
  year_purchased  INTEGER,
  purchase_price  DECIMAL(15,2),
  status          VARCHAR(20) DEFAULT 'active',    -- active, maintenance, sold
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Haulage jobs: trips done with own trailer (income)
-- Covers both client shipments (charged) and personal/own-goods runs
CREATE TABLE IF NOT EXISTS haulage_jobs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trailer_id          UUID REFERENCES trailers(id) ON DELETE SET NULL,
  job_date            DATE NOT NULL,
  client_name         VARCHAR(150),
  origin              VARCHAR(200) NOT NULL,
  destination         VARCHAR(200) NOT NULL,
  cargo_description   TEXT,
  cargo_weight_tons   DECIMAL(10,2),
  distance_km         DECIMAL(10,2),
  charge_amount       DECIMAL(15,2) NOT NULL DEFAULT 0,  -- amount charged to client (0 = own use)
  is_own_goods        BOOLEAN DEFAULT FALSE,             -- true = personal/own-goods run
  payment_status      VARCHAR(20) DEFAULT 'pending',    -- pending, paid, cancelled
  payment_date        DATE,
  bank_account_id     UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Trailer rentals: renting external trailers (expense)
CREATE TABLE IF NOT EXISTS trailer_rentals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_date           DATE NOT NULL,
  trailer_description   VARCHAR(200),
  rental_company        VARCHAR(150),
  origin                VARCHAR(200),
  destination           VARCHAR(200),
  cargo_description     TEXT,
  rental_cost           DECIMAL(15,2) NOT NULL,
  payment_status        VARCHAR(20) DEFAULT 'paid',
  bank_account_id       UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Trailer operating expenses: diesel, maintenance, insurance, tolls, etc.
CREATE TABLE IF NOT EXISTS trailer_expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trailer_id      UUID REFERENCES trailers(id) ON DELETE SET NULL,
  expense_date    DATE NOT NULL,
  category        VARCHAR(50) NOT NULL,   -- diesel, maintenance, insurance, tolls, tires, registration, other
  description     VARCHAR(200) NOT NULL,
  amount          DECIMAL(15,2) NOT NULL,
  vendor          VARCHAR(150),
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies (disable for simplicity, enable row-level if needed)
ALTER TABLE trailers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE haulage_jobs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE trailer_rentals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE trailer_expenses  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON trailers         FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON haulage_jobs     FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON trailer_rentals  FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON trailer_expenses FOR ALL USING (true);
