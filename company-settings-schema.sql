-- ============================================================
-- Company Settings & Document Configuration
-- Run in Supabase SQL editor
-- ============================================================

-- Single-row company settings table
CREATE TABLE IF NOT EXISTS company_settings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name          VARCHAR(255) NOT NULL DEFAULT 'OSS Group',
  company_tagline       VARCHAR(255) DEFAULT 'Operations Support Systems',
  logo_url              TEXT,                          -- public URL of uploaded logo
  address_line1         VARCHAR(255),
  address_line2         VARCHAR(255),
  city                  VARCHAR(100),
  country               VARCHAR(100) DEFAULT 'UAE',
  phone                 VARCHAR(50),
  email                 VARCHAR(255),
  website               VARCHAR(255),
  trn                   VARCHAR(50),                   -- Tax Registration Number
  currency              VARCHAR(10) DEFAULT 'AED',
  date_format           VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  -- Quotation defaults
  quotation_prefix      VARCHAR(20) DEFAULT 'QUO',
  quotation_terms       TEXT DEFAULT E'This quotation is valid for 30 days from the date of issue.\nPrices are in AED and exclude VAT unless stated otherwise.\nPayment terms: 50% advance, 50% upon delivery/completion.\nDelivery timelines will be confirmed upon order confirmation.',
  -- Invoice defaults
  invoice_prefix        VARCHAR(20) DEFAULT 'INV',
  invoice_terms         TEXT DEFAULT E'Payment is due within the agreed payment period.\nLate payments may be subject to interest charges.\nAll amounts are in AED unless otherwise stated.',
  default_payment_terms VARCHAR(100) DEFAULT 'Net 30',
  default_tax_rate      DECIMAL(5,2) DEFAULT 0,
  bank_details          TEXT,                          -- printed on invoices
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

-- Insert default row if not exists
INSERT INTO company_settings (company_name)
SELECT 'OSS Group'
WHERE NOT EXISTS (SELECT 1 FROM company_settings);

-- Auto-update trigger
DROP TRIGGER IF EXISTS trg_company_settings_updated_at ON company_settings;
CREATE OR REPLACE FUNCTION update_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW EXECUTE FUNCTION update_company_settings_updated_at();

-- RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_settings_all" ON company_settings;
CREATE POLICY "company_settings_all" ON company_settings
  FOR ALL USING (auth.role() = 'authenticated');

-- Storage bucket for company assets (run separately in Supabase Storage)
-- CREATE BUCKET company-assets (public: true)
