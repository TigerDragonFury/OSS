-- ============================================================
-- Quotations & Income Pages Schema
-- Run this in Supabase SQL editor
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. QUOTATIONS
-- A quotation is a formal offer sent to a customer.
-- It can be converted to an invoice on approval.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_number VARCHAR(50) NOT NULL UNIQUE,
  company_id       UUID REFERENCES companies(id),
  client_name      VARCHAR(255),
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until      DATE,
  status           VARCHAR(30) CHECK (status IN ('draft','sent','approved','rejected','converted','expired'))
                   DEFAULT 'draft',
  subtotal         DECIMAL(15,2) DEFAULT 0,
  tax              DECIMAL(15,2) DEFAULT 0,
  total            DECIMAL(15,2) DEFAULT 0,
  notes            TEXT,
  converted_to_invoice_id UUID REFERENCES invoices(id),
  created_by       UUID,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- 2. QUOTATION LINE ITEMS
-- Each line is tied to the source record so the system
-- knows exactly what was sold.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotation_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id        UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,

  -- What kind of item/service?
  item_type           VARCHAR(50) CHECK (item_type IN (
                        'equipment_sale',
                        'scrap_sale',
                        'vessel_rental',
                        'service',
                        'other'
                      )) NOT NULL,

  -- Optional FK back to the source record (filled when converting to invoice/actual sale)
  source_id           UUID,       -- warehouse_sales.id / land_scrap_sales.id / vessel_rentals.id

  -- Display fields (denormalised for quick rendering)
  description         TEXT NOT NULL,
  quantity            DECIMAL(15,4) DEFAULT 1,
  unit               VARCHAR(50)  DEFAULT 'unit',  -- 'ton', 'unit', 'day', etc.
  unit_price          DECIMAL(15,2) DEFAULT 0,
  total_price         DECIMAL(15,2) DEFAULT 0,

  -- For equipment items: link to warehouse + equipment
  warehouse_id         UUID REFERENCES warehouses(id),
  land_equipment_id    UUID REFERENCES land_equipment(id),

  -- For scrap items: link to land
  land_id              UUID REFERENCES land_purchases(id),
  material_type        VARCHAR(100),

  -- For rental items
  vessel_id            UUID REFERENCES vessels(id),

  sort_order           INTEGER DEFAULT 0,
  created_at           TIMESTAMP DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- 3. INVOICE LINE ITEMS (extend invoices with line-item detail)
-- Mirrors quotation_items; created when quotation is converted.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id          UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  quotation_item_id   UUID REFERENCES quotation_items(id),  -- traceability

  item_type           VARCHAR(50) CHECK (item_type IN (
                        'equipment_sale',
                        'scrap_sale',
                        'vessel_rental',
                        'service',
                        'other'
                      )) NOT NULL,

  source_id           UUID,
  description         TEXT NOT NULL,
  quantity            DECIMAL(15,4) DEFAULT 1,
  unit               VARCHAR(50)  DEFAULT 'unit',
  unit_price          DECIMAL(15,2) DEFAULT 0,
  total_price         DECIMAL(15,2) DEFAULT 0,

  warehouse_id         UUID REFERENCES warehouses(id),
  land_equipment_id    UUID REFERENCES land_equipment(id),
  land_id              UUID REFERENCES land_purchases(id),
  material_type        VARCHAR(100),
  vessel_id            UUID REFERENCES vessels(id),

  sort_order           INTEGER DEFAULT 0,
  created_at           TIMESTAMP DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- 4. INDEXES for performance
-- ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_quotations_status       ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_company      ON quotations(company_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quote   ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice   ON invoice_items(invoice_id);

-- ──────────────────────────────────────────────────────────
-- 5. AUTO-UPDATE updated_at on quotations
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_quotation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quotation_updated_at ON quotations;
CREATE TRIGGER trg_quotation_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION update_quotation_updated_at();

-- ──────────────────────────────────────────────────────────
-- 6. RLS – allow authenticated users to read/write
-- ──────────────────────────────────────────────────────────
ALTER TABLE quotations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items  ENABLE ROW LEVEL SECURITY;

-- Quotations
DROP POLICY IF EXISTS "quotations_all"      ON quotations;
CREATE POLICY "quotations_all" ON quotations
  FOR ALL USING (auth.role() = 'authenticated');

-- Quotation items
DROP POLICY IF EXISTS "quotation_items_all" ON quotation_items;
CREATE POLICY "quotation_items_all" ON quotation_items
  FOR ALL USING (auth.role() = 'authenticated');

-- Invoice items
DROP POLICY IF EXISTS "invoice_items_all"   ON invoice_items;
CREATE POLICY "invoice_items_all" ON invoice_items
  FOR ALL USING (auth.role() = 'authenticated');
