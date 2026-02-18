-- Add 'sold' status to land_equipment
-- The existing CHECK constraint only allows: 'available', 'in_warehouse', 'scrapped', 'reserved'
-- We need to add 'sold' to properly track sold equipment

ALTER TABLE land_equipment
  DROP CONSTRAINT IF EXISTS land_equipment_status_check;

ALTER TABLE land_equipment
  ADD CONSTRAINT land_equipment_status_check
  CHECK (status IN ('available', 'in_warehouse', 'scrapped', 'reserved', 'sold'));

-- ─────────────────────────────────────────────────────────────────
-- STEP 1: Preview equipment that was sold but still shows as available
-- Run this first to see what will be affected
-- ─────────────────────────────────────────────────────────────────
SELECT
  le.id,
  le.equipment_name,
  le.status AS current_status,
  ws.id AS warehouse_sale_id,
  ws.sale_date,
  ws.sale_price,
  ws.customer_name
FROM land_equipment le
JOIN warehouse_sales ws ON ws.land_equipment_id = le.id
WHERE le.status IN ('available', 'in_warehouse', 'reserved')
ORDER BY ws.sale_date DESC;

-- ─────────────────────────────────────────────────────────────────
-- STEP 2: Fix status for all equipment that has a warehouse_sale record
-- but is still showing as available/in_warehouse
-- ─────────────────────────────────────────────────────────────────
UPDATE land_equipment
SET status = 'sold'
WHERE id IN (
  SELECT DISTINCT land_equipment_id
  FROM warehouse_sales
  WHERE land_equipment_id IS NOT NULL
)
AND status IN ('available', 'in_warehouse', 'reserved');

-- ─────────────────────────────────────────────────────────────────
-- STEP 3 (OPTIONAL): Delete a specific equipment sale and restore equipment
-- Replace <INCOME_RECORD_ID> with the actual income_records.id
-- (find it from the reports page or query below)
-- ─────────────────────────────────────────────────────────────────

-- Find income records for equipment sales to get the IDs:
SELECT
  ir.id AS income_record_id,
  ir.income_date,
  ir.amount,
  ir.description,
  ws.id AS warehouse_sale_id,
  le.equipment_name,
  le.status AS equipment_status
FROM income_records ir
LEFT JOIN warehouse_sales ws ON ws.id = ir.reference_id
LEFT JOIN land_equipment le ON le.id = ws.land_equipment_id
WHERE ir.income_type = 'equipment_sale'
ORDER BY ir.income_date DESC;

-- To delete one specific sale (replace the IDs):
-- BEGIN;
--   UPDATE land_equipment SET status = 'in_warehouse' WHERE id = '<EQUIPMENT_ID>';
--   DELETE FROM warehouse_sales WHERE id = '<WAREHOUSE_SALE_ID>';
--   DELETE FROM income_records WHERE id = '<INCOME_RECORD_ID>';
-- COMMIT;
