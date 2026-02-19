-- Equipment Replacement: Return / Mismatch Support
-- Run this in Supabase SQL Editor
-- Adds status tracking for when a replacement part is returned because it didn't fit

-- 1. Add status column to equipment_replacements
ALTER TABLE equipment_replacements
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'returned', 'voided'));

-- 2. Add return tracking columns
ALTER TABLE equipment_replacements
ADD COLUMN IF NOT EXISTS return_reason TEXT;

ALTER TABLE equipment_replacements
ADD COLUMN IF NOT EXISTS returned_at TIMESTAMP;

-- 3. Add soft reference to the auto-created expense record
ALTER TABLE equipment_replacements
ADD COLUMN IF NOT EXISTS expense_ref UUID;

-- 4. Add soft reference to expense for inventory_usage table (for voiding)
ALTER TABLE inventory_usage
ADD COLUMN IF NOT EXISTS expense_ref UUID;

-- 5. Update the existing replacement trigger to handle status field
CREATE OR REPLACE FUNCTION update_equipment_on_replacement()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run full logic on confirmed replacements
    IF NEW.status IS NULL OR NEW.status = 'confirmed' THEN
        -- Mark old equipment as replaced
        IF NEW.old_equipment_id IS NOT NULL THEN
            UPDATE vessel_equipment
            SET status = 'replaced', updated_at = NOW()
            WHERE id = NEW.old_equipment_id;
        END IF;

        -- If new equipment is from inventory, decrease inventory quantity
        IF NEW.new_equipment_source = 'inventory' AND NEW.inventory_id IS NOT NULL THEN
            UPDATE marine_inventory
            SET quantity = quantity - 1, updated_at = NOW()
            WHERE id = NEW.inventory_id;

            UPDATE marine_inventory
            SET status = CASE
                WHEN quantity <= 0 THEN 'out_of_stock'
                WHEN quantity <= reorder_level THEN 'low_stock'
                ELSE 'in_stock'
            END
            WHERE id = NEW.inventory_id;
        END IF;
    END IF;

    -- Always calculate total cost
    NEW.total_cost := COALESCE(NEW.replacement_cost, 0) + COALESCE(NEW.labor_cost, 0);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Confirm indexes
CREATE INDEX IF NOT EXISTS idx_equipment_replacements_status ON equipment_replacements(status);
CREATE INDEX IF NOT EXISTS idx_equipment_replacements_vessel ON equipment_replacements(vessel_id);
CREATE INDEX IF NOT EXISTS idx_inventory_usage_expense_ref ON inventory_usage(expense_ref);
CREATE INDEX IF NOT EXISTS idx_equipment_replacements_expense_ref ON equipment_replacements(expense_ref);
