-- Add 'sold' to land_equipment status check constraint
ALTER TABLE land_equipment DROP CONSTRAINT IF EXISTS land_equipment_status_check;
ALTER TABLE land_equipment ADD CONSTRAINT land_equipment_status_check
  CHECK (status IN ('available', 'in_warehouse', 'scrapped', 'reserved', 'sold'));
