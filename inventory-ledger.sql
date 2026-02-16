-- Inventory Ledger (Item-Level)
-- Run this after warehouse-schema.sql and inventory-usage-schema.sql

-- =====================================================
-- 1. LEDGER TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID REFERENCES marine_inventory(id) ON DELETE CASCADE,
    movement_type VARCHAR(50) NOT NULL,
    quantity_in DECIMAL(15, 2) NOT NULL DEFAULT 0,
    quantity_out DECIMAL(15, 2) NOT NULL DEFAULT 0,
    unit_cost DECIMAL(15, 2),
    total_cost DECIMAL(15, 2),
    warehouse_id UUID REFERENCES warehouses(id),
    vessel_id UUID REFERENCES vessels(id),
    reference_table VARCHAR(100),
    reference_id UUID,
    notes TEXT,
    occurred_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_ledger_inventory_id ON inventory_ledger(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_occurred_at ON inventory_ledger(occurred_at);
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_movement_type ON inventory_ledger(movement_type);

-- =====================================================
-- 2. LEDGER TRIGGERS
-- =====================================================

-- Log inventory usage
CREATE OR REPLACE FUNCTION log_inventory_usage_ledger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO inventory_ledger (
        inventory_id,
        movement_type,
        quantity_out,
        unit_cost,
        total_cost,
        vessel_id,
        reference_table,
        reference_id,
        notes,
        occurred_at
    )
    VALUES (
        NEW.inventory_id,
        'usage',
        NEW.quantity_used,
        NEW.unit_cost,
        NEW.total_cost,
        NEW.vessel_id,
        'inventory_usage',
        NEW.id,
        NEW.purpose,
        COALESCE(NEW.usage_date, NOW())
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF to_regclass('public.inventory_usage') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trigger_log_inventory_usage_ledger ON inventory_usage;
        CREATE TRIGGER trigger_log_inventory_usage_ledger
            AFTER INSERT ON inventory_usage
            FOR EACH ROW
            EXECUTE FUNCTION log_inventory_usage_ledger();
    END IF;
END $$;

-- Log equipment replacement usage (when sourced from inventory)
CREATE OR REPLACE FUNCTION log_inventory_replacement_ledger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.new_equipment_source = 'inventory' AND NEW.inventory_id IS NOT NULL THEN
        INSERT INTO inventory_ledger (
            inventory_id,
            movement_type,
            quantity_out,
            vessel_id,
            reference_table,
            reference_id,
            notes,
            occurred_at
        )
        VALUES (
            NEW.inventory_id,
            'replacement',
            1,
            NEW.vessel_id,
            'equipment_replacements',
            NEW.id,
            NEW.old_equipment_name,
            COALESCE(NEW.replacement_date, CURRENT_DATE)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF to_regclass('public.equipment_replacements') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trigger_log_inventory_replacement_ledger ON equipment_replacements;
        CREATE TRIGGER trigger_log_inventory_replacement_ledger
            AFTER INSERT ON equipment_replacements
            FOR EACH ROW
            EXECUTE FUNCTION log_inventory_replacement_ledger();
    END IF;
END $$;

-- Log inventory movements
CREATE OR REPLACE FUNCTION log_inventory_movement_ledger()
RETURNS TRIGGER AS $$
DECLARE
    quantity_abs DECIMAL(15, 2);
BEGIN
    IF NEW.inventory_id IS NULL THEN
        RETURN NEW;
    END IF;

    quantity_abs := ABS(NEW.quantity);

    IF NEW.transaction_type IN ('purchase', 'return', 'maintenance_in') THEN
        INSERT INTO inventory_ledger (
            inventory_id,
            movement_type,
            quantity_in,
            warehouse_id,
            vessel_id,
            reference_table,
            reference_id,
            notes,
            occurred_at
        )
        VALUES (
            NEW.inventory_id,
            NEW.transaction_type,
            quantity_abs,
            NEW.to_warehouse_id,
            NEW.to_vessel_id,
            'inventory_movements',
            NEW.id,
            NEW.notes,
            NEW.transaction_date
        );
    ELSIF NEW.transaction_type IN ('issue', 'maintenance_out') THEN
        INSERT INTO inventory_ledger (
            inventory_id,
            movement_type,
            quantity_out,
            warehouse_id,
            vessel_id,
            reference_table,
            reference_id,
            notes,
            occurred_at
        )
        VALUES (
            NEW.inventory_id,
            NEW.transaction_type,
            quantity_abs,
            NEW.from_warehouse_id,
            NEW.from_vessel_id,
            'inventory_movements',
            NEW.id,
            NEW.notes,
            NEW.transaction_date
        );
    ELSIF NEW.transaction_type = 'adjustment' THEN
        IF NEW.quantity >= 0 THEN
            INSERT INTO inventory_ledger (
                inventory_id,
                movement_type,
                quantity_in,
                warehouse_id,
                vessel_id,
                reference_table,
                reference_id,
                notes,
                occurred_at
            )
            VALUES (
                NEW.inventory_id,
                'adjustment',
                quantity_abs,
                NEW.to_warehouse_id,
                NEW.to_vessel_id,
                'inventory_movements',
                NEW.id,
                NEW.notes,
                NEW.transaction_date
            );
        ELSE
            INSERT INTO inventory_ledger (
                inventory_id,
                movement_type,
                quantity_out,
                warehouse_id,
                vessel_id,
                reference_table,
                reference_id,
                notes,
                occurred_at
            )
            VALUES (
                NEW.inventory_id,
                'adjustment',
                quantity_abs,
                NEW.from_warehouse_id,
                NEW.from_vessel_id,
                'inventory_movements',
                NEW.id,
                NEW.notes,
                NEW.transaction_date
            );
        END IF;
    ELSIF NEW.transaction_type = 'transfer' THEN
        IF NEW.from_warehouse_id IS NOT NULL OR NEW.from_vessel_id IS NOT NULL THEN
            INSERT INTO inventory_ledger (
                inventory_id,
                movement_type,
                quantity_out,
                warehouse_id,
                vessel_id,
                reference_table,
                reference_id,
                notes,
                occurred_at
            )
            VALUES (
                NEW.inventory_id,
                'transfer_out',
                quantity_abs,
                NEW.from_warehouse_id,
                NEW.from_vessel_id,
                'inventory_movements',
                NEW.id,
                NEW.notes,
                NEW.transaction_date
            );
        END IF;

        IF NEW.to_warehouse_id IS NOT NULL OR NEW.to_vessel_id IS NOT NULL THEN
            INSERT INTO inventory_ledger (
                inventory_id,
                movement_type,
                quantity_in,
                warehouse_id,
                vessel_id,
                reference_table,
                reference_id,
                notes,
                occurred_at
            )
            VALUES (
                NEW.inventory_id,
                'transfer_in',
                quantity_abs,
                NEW.to_warehouse_id,
                NEW.to_vessel_id,
                'inventory_movements',
                NEW.id,
                NEW.notes,
                NEW.transaction_date
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF to_regclass('public.inventory_movements') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trigger_log_inventory_movement_ledger ON inventory_movements;
        CREATE TRIGGER trigger_log_inventory_movement_ledger
            AFTER INSERT ON inventory_movements
            FOR EACH ROW
            EXECUTE FUNCTION log_inventory_movement_ledger();
    END IF;
END $$;

-- Log direct inventory quantity changes
CREATE OR REPLACE FUNCTION log_inventory_quantity_change()
RETURNS TRIGGER AS $$
DECLARE
    delta DECIMAL(15, 2);
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.quantity <> 0 THEN
            INSERT INTO inventory_ledger (
                inventory_id,
                movement_type,
                quantity_in,
                quantity_out,
                warehouse_id,
                vessel_id,
                reference_table,
                reference_id,
                notes,
                occurred_at
            )
            VALUES (
                NEW.id,
                'opening_balance',
                GREATEST(NEW.quantity, 0),
                GREATEST(-NEW.quantity, 0),
                NEW.warehouse_id,
                NEW.vessel_id,
                'marine_inventory',
                NEW.id,
                'Initial stock level',
                NOW()
            );
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        delta := NEW.quantity - COALESCE(OLD.quantity, 0);
        IF delta <> 0 THEN
            INSERT INTO inventory_ledger (
                inventory_id,
                movement_type,
                quantity_in,
                quantity_out,
                warehouse_id,
                vessel_id,
                reference_table,
                reference_id,
                notes,
                occurred_at
            )
            VALUES (
                NEW.id,
                'adjustment',
                GREATEST(delta, 0),
                GREATEST(-delta, 0),
                NEW.warehouse_id,
                NEW.vessel_id,
                'marine_inventory',
                NEW.id,
                'Manual quantity adjustment',
                NOW()
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_inventory_quantity_change ON marine_inventory;
CREATE TRIGGER trigger_log_inventory_quantity_change
    AFTER INSERT OR UPDATE OF quantity ON marine_inventory
    FOR EACH ROW
    EXECUTE FUNCTION log_inventory_quantity_change();

-- =====================================================
-- 3. REPORTING VIEW
-- =====================================================
CREATE OR REPLACE VIEW inventory_ledger_view AS
SELECT
    il.*,
    mi.equipment_name,
    mi.item_code,
    mi.unit,
    w.name AS warehouse_name,
    v.name AS vessel_name,
    (il.quantity_in - il.quantity_out) AS net_quantity,
    SUM(il.quantity_in - il.quantity_out) OVER (
        PARTITION BY il.inventory_id
        ORDER BY il.occurred_at, il.created_at, il.id
    ) AS running_balance
FROM inventory_ledger il
LEFT JOIN marine_inventory mi ON mi.id = il.inventory_id
LEFT JOIN warehouses w ON w.id = il.warehouse_id
LEFT JOIN vessels v ON v.id = il.vessel_id;

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================
ALTER TABLE inventory_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on inventory_ledger" ON inventory_ledger;
CREATE POLICY "Allow all operations on inventory_ledger"
ON inventory_ledger FOR ALL
USING (true)
WITH CHECK (true);
