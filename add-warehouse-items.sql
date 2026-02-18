-- ============================================================
-- Warehouse Item Management: Allow standalone items
-- (equipment/parts not tied to a scrap land purchase)
-- Run in Supabase SQL editor
-- ============================================================

-- 1. Make land_id optional (it already is NOT NULL? let's verify and fix)
--    The original schema used CREATE TABLE IF NOT EXISTS without NOT NULL on land_id,
--    so it should already be nullable. This is a safety guarantee:
ALTER TABLE land_equipment
  ALTER COLUMN land_id DROP NOT NULL;

-- 2. Add acquisition_source so we know where the item came from
ALTER TABLE land_equipment
  ADD COLUMN IF NOT EXISTS acquisition_source VARCHAR(50)
    CHECK (acquisition_source IN ('land_purchase', 'direct_purchase', 'transfer', 'existing', 'other'))
    DEFAULT 'land_purchase';

-- 3. Add item_type so we can distinguish equipment vs spare parts vs raw materials
ALTER TABLE land_equipment
  ADD COLUMN IF NOT EXISTS item_type VARCHAR(50)
    CHECK (item_type IN ('equipment', 'spare_part', 'tool', 'material', 'vehicle', 'other'))
    DEFAULT 'equipment';

-- 4. Add purchase fields for items bought directly (not from scrap)
ALTER TABLE land_equipment
  ADD COLUMN IF NOT EXISTS purchase_date   DATE;
ALTER TABLE land_equipment
  ADD COLUMN IF NOT EXISTS purchase_price  DECIMAL(15,2);
ALTER TABLE land_equipment
  ADD COLUMN IF NOT EXISTS supplier_name   VARCHAR(255);

-- 5. Add quantity for parts/materials (default 1 for single equipment pieces)
ALTER TABLE land_equipment
  ADD COLUMN IF NOT EXISTS quantity        DECIMAL(10,3) DEFAULT 1;
ALTER TABLE land_equipment
  ADD COLUMN IF NOT EXISTS unit            VARCHAR(50)   DEFAULT 'unit';

-- 6. Back-fill existing records
UPDATE land_equipment
SET acquisition_source = 'land_purchase'
WHERE land_id IS NOT NULL
  AND (acquisition_source IS NULL OR acquisition_source = 'land_purchase');

UPDATE land_equipment
SET acquisition_source = 'existing'
WHERE land_id IS NULL
  AND acquisition_source IS NULL;

-- 7. Index for faster warehouse + type lookups
CREATE INDEX IF NOT EXISTS idx_land_equipment_type   ON land_equipment(item_type);
CREATE INDEX IF NOT EXISTS idx_land_equipment_source ON land_equipment(acquisition_source);
