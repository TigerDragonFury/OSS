-- Add missing columns to invoice_items table
-- Run this in Supabase SQL Editor

-- Fix FK on quotations so deleting an invoice sets the reference to NULL
ALTER TABLE quotations
  DROP CONSTRAINT IF EXISTS quotations_converted_to_invoice_id_fkey;
ALTER TABLE quotations
  ADD CONSTRAINT quotations_converted_to_invoice_id_fkey
  FOREIGN KEY (converted_to_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

-- Add missing columns to invoices table
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_terms  TEXT,
  ADD COLUMN IF NOT EXISTS deposit_percent DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS item_type VARCHAR(50) DEFAULT 'service'
    CHECK (item_type IN ('equipment_sale','scrap_sale','vessel_rental','service','other')),
  ADD COLUMN IF NOT EXISTS quotation_item_id UUID REFERENCES quotation_items(id),
  ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'unit',
  ADD COLUMN IF NOT EXISTS unit_price DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_price DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id),
  ADD COLUMN IF NOT EXISTS land_equipment_id UUID REFERENCES land_equipment(id),
  ADD COLUMN IF NOT EXISTS land_id UUID REFERENCES land_purchases(id),
  ADD COLUMN IF NOT EXISTS material_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS vessel_id UUID REFERENCES vessels(id),
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_id UUID;

-- Rename 'total' to 'total_price' if it exists under the old name
-- (safe to run — does nothing if already renamed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_items' AND column_name = 'total'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_items' AND column_name = 'total_price'
  ) THEN
    ALTER TABLE invoice_items RENAME COLUMN "total" TO total_price;
  END IF;
END $$;

-- Make item_type NOT NULL after back-filling defaults
UPDATE invoice_items SET item_type = 'service' WHERE item_type IS NULL;
ALTER TABLE invoice_items ALTER COLUMN item_type SET NOT NULL;

-- Fix the invoice total trigger to use total_price instead of the old 'total' column
CREATE OR REPLACE FUNCTION calculate_invoice_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE invoices
    SET total = (
        SELECT COALESCE(SUM(COALESCE(total_price, total, 0)), 0)
        FROM invoice_items
        WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
    ) + COALESCE((SELECT tax FROM invoices WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id)), 0)
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_invoice_total ON invoice_items;
CREATE TRIGGER update_invoice_total
  AFTER INSERT OR UPDATE OR DELETE ON invoice_items
  FOR EACH ROW EXECUTE FUNCTION calculate_invoice_total();

-- Allow 'sold' status on land_equipment (items sold via paid invoices)
ALTER TABLE land_equipment DROP CONSTRAINT IF EXISTS land_equipment_status_check;
ALTER TABLE land_equipment ADD CONSTRAINT land_equipment_status_check
  CHECK (status IN ('available', 'in_warehouse', 'scrapped', 'reserved', 'sold'));

-- Track which account received the full invoice payment (used to pre-fill refund modal)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_bank_account_id UUID REFERENCES bank_accounts(id);

-- Deposit tracking columns on invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS deposit_paid            BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deposit_paid_amount     DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS deposit_paid_date       DATE,
  ADD COLUMN IF NOT EXISTS deposit_payment_method  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS deposit_destination     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS deposit_bank_account_id UUID REFERENCES bank_accounts(id),  -- actual account the deposit went into
  ADD COLUMN IF NOT EXISTS deposit_refunded        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deposit_refund_date     DATE,
  ADD COLUMN IF NOT EXISTS deposit_refund_method   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS deposit_refund_source   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS deposit_refund_bank_account_id UUID REFERENCES bank_accounts(id),  -- account money was taken from for refund
  ADD COLUMN IF NOT EXISTS deposit_refund_notes    TEXT,
  ADD COLUMN IF NOT EXISTS deposit_kept_as_income  BOOLEAN DEFAULT FALSE;

-- Allow new statuses: deposit_paid (deposit received, awaiting full payment),
--                     cancelled_deposit_kept (deal fell through, deposit kept as income),
--                     cancelled_refunded (deal fell through, deposit refunded)
-- Must drop the view that references invoices.status, widen the column, then recreate it.
DROP VIEW IF EXISTS profit_loss_summary;

ALTER TABLE invoices ALTER COLUMN status TYPE VARCHAR(50);
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft','sent','paid','overdue','cancelled','partial',
                    'deposit_paid','cancelled_deposit_kept','cancelled_refunded'));

-- Drop auto-income triggers — we now write income_records manually with bank_account_id
-- so the bank balance updates correctly and there are no duplicate entries
DROP TRIGGER IF EXISTS auto_income_warehouse_sale ON warehouse_sales;
DROP TRIGGER IF EXISTS auto_income_scrap_sale ON land_scrap_sales;

-- Add bank_account_id to income_records so deposits/income credit the correct account
-- Add reference_id to income_records so we can find and reverse invoice-related income on delete
ALTER TABLE income_records
  ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES bank_accounts(id),
  ADD COLUMN IF NOT EXISTS reference_id     UUID;

-- Expand income_type to include 'invoice' (deposits & invoice payments)
ALTER TABLE income_records DROP CONSTRAINT IF EXISTS income_records_income_type_check;
ALTER TABLE income_records ADD CONSTRAINT income_records_income_type_check
  CHECK (income_type IN ('scrap_sale','equipment_sale','vessel_rental','service','invoice','other'));

-- Add bank_account_id to expenses so deposit refunds debit the correct account
-- Add reference_id to expenses so we can find and reverse invoice-related expenses on delete
-- Add notes for additional context on refund expenses
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES bank_accounts(id),
  ADD COLUMN IF NOT EXISTS reference_id     UUID,
  ADD COLUMN IF NOT EXISTS notes            TEXT;

-- Recreate profit_loss_summary view (unchanged logic)
CREATE OR REPLACE VIEW profit_loss_summary AS
SELECT
    c.id   AS company_id,
    c.name AS company_name,
    COALESCE(SUM(CASE WHEN i.invoice_type = 'income' AND i.status = 'paid' THEN i.total ELSE 0 END), 0) AS total_income,
    COALESCE(SUM(CASE WHEN e.status = 'paid' THEN e.amount ELSE 0 END), 0) AS total_expenses,
    COALESCE(SUM(CASE WHEN i.invoice_type = 'income' AND i.status = 'paid' THEN i.total ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN e.status = 'paid' THEN e.amount ELSE 0 END), 0) AS net_profit
FROM companies c
LEFT JOIN invoices i ON c.id = i.company_id
LEFT JOIN expenses e ON c.id = e.company_id
GROUP BY c.id, c.name;
