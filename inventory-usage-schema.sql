-- Inventory Usage and Equipment Replacement Schema
-- Run this in Supabase SQL Editor after running supabase-schema.sql

-- =====================================================
-- 1. INVENTORY USAGE TRACKING
-- =====================================================
-- Track when inventory items are used in maintenance or overhauls
CREATE TABLE IF NOT EXISTS inventory_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID REFERENCES marine_inventory(id) ON DELETE CASCADE,
    quantity_used DECIMAL(15, 2) NOT NULL,
    
    -- Link to either maintenance or overhaul
    maintenance_schedule_id UUID REFERENCES maintenance_schedules(id) ON DELETE SET NULL,
    overhaul_project_id UUID REFERENCES vessel_overhaul_projects(id) ON DELETE SET NULL,
    
    -- Usage details
    vessel_id UUID REFERENCES vessels(id) ON DELETE SET NULL,
    used_by_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    usage_date TIMESTAMP DEFAULT NOW(),
    
    -- Purpose and notes
    purpose VARCHAR(255), -- 'maintenance', 'overhaul', 'repair', 'replacement'
    notes TEXT,
    
    -- Cost tracking
    unit_cost DECIMAL(15, 2), -- Cost per unit at time of usage
    total_cost DECIMAL(15, 2), -- quantity_used * unit_cost
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger to automatically decrease inventory quantity when used
CREATE OR REPLACE FUNCTION decrease_inventory_on_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrease the quantity in marine_inventory
    UPDATE marine_inventory
    SET 
        quantity = quantity - NEW.quantity_used,
        updated_at = NOW()
    WHERE id = NEW.inventory_id;
    
    -- Check if quantity is below reorder level and update status
    UPDATE marine_inventory
    SET status = CASE
        WHEN quantity <= 0 THEN 'out_of_stock'
        WHEN quantity <= reorder_level THEN 'low_stock'
        ELSE 'in_stock'
    END
    WHERE id = NEW.inventory_id;
    
    -- Calculate total cost
    IF NEW.unit_cost IS NOT NULL THEN
        NEW.total_cost := NEW.quantity_used * NEW.unit_cost;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decrease_inventory_on_usage
    BEFORE INSERT ON inventory_usage
    FOR EACH ROW
    EXECUTE FUNCTION decrease_inventory_on_usage();

-- =====================================================
-- 2. VESSEL EQUIPMENT TRACKING
-- =====================================================
-- Track equipment installed on vessels
CREATE TABLE IF NOT EXISTS vessel_equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vessel_id UUID REFERENCES vessels(id) ON DELETE CASCADE,
    equipment_name VARCHAR(255) NOT NULL,
    equipment_type VARCHAR(100), -- 'engine', 'generator', 'pump', 'crane', 'navigation', etc.
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    
    -- Installation details
    installation_date DATE,
    installed_by_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    installation_cost DECIMAL(15, 2),
    
    -- Current status
    status VARCHAR(50) CHECK (status IN ('operational', 'needs_maintenance', 'broken', 'replaced', 'removed')),
    condition VARCHAR(50) CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'critical')),
    last_maintenance_date DATE,
    next_maintenance_due DATE,
    
    -- Location on vessel
    location_on_vessel VARCHAR(255), -- 'engine room', 'deck', 'bridge', etc.
    
    -- Specifications
    specifications JSONB, -- Store detailed specs as JSON
    warranty_expiry DATE,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 3. EQUIPMENT REPLACEMENT TRACKING
-- =====================================================
-- Track when equipment is replaced
CREATE TABLE IF NOT EXISTS equipment_replacements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vessel_id UUID REFERENCES vessels(id) ON DELETE CASCADE,
    
    -- Old equipment (being replaced)
    old_equipment_id UUID REFERENCES vessel_equipment(id) ON DELETE SET NULL,
    old_equipment_name VARCHAR(255),
    failure_reason TEXT,
    failure_date DATE,
    
    -- New equipment (replacement)
    new_equipment_id UUID REFERENCES vessel_equipment(id) ON DELETE SET NULL,
    new_equipment_source VARCHAR(50) CHECK (new_equipment_source IN ('inventory', 'purchase', 'repair')),
    inventory_id UUID REFERENCES marine_inventory(id) ON DELETE SET NULL, -- If sourced from inventory
    
    -- Replacement details
    replacement_date DATE DEFAULT CURRENT_DATE,
    replaced_by_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    replacement_cost DECIMAL(15, 2),
    labor_cost DECIMAL(15, 2),
    total_cost DECIMAL(15, 2),
    
    -- What happened to old equipment
    old_equipment_disposition VARCHAR(50) CHECK (old_equipment_disposition IN ('scrapped', 'sent_to_warehouse', 'repaired', 'sold', 'disposed')),
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL, -- If sent to warehouse
    
    -- Link to maintenance/overhaul
    maintenance_schedule_id UUID REFERENCES maintenance_schedules(id) ON DELETE SET NULL,
    overhaul_project_id UUID REFERENCES vessel_overhaul_projects(id) ON DELETE SET NULL,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger to update vessel equipment status on replacement
CREATE OR REPLACE FUNCTION update_equipment_on_replacement()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark old equipment as replaced
    IF NEW.old_equipment_id IS NOT NULL THEN
        UPDATE vessel_equipment
        SET 
            status = 'replaced',
            updated_at = NOW()
        WHERE id = NEW.old_equipment_id;
    END IF;
    
    -- If new equipment is from inventory, decrease inventory quantity
    IF NEW.new_equipment_source = 'inventory' AND NEW.inventory_id IS NOT NULL THEN
        UPDATE marine_inventory
        SET 
            quantity = quantity - 1,
            updated_at = NOW()
        WHERE id = NEW.inventory_id;
        
        -- Update inventory status based on new quantity
        UPDATE marine_inventory
        SET status = CASE
            WHEN quantity <= 0 THEN 'out_of_stock'
            WHEN quantity <= reorder_level THEN 'low_stock'
            ELSE 'in_stock'
        END
        WHERE id = NEW.inventory_id;
    END IF;
    
    -- Calculate total cost
    NEW.total_cost := COALESCE(NEW.replacement_cost, 0) + COALESCE(NEW.labor_cost, 0);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_equipment_on_replacement
    BEFORE INSERT ON equipment_replacements
    FOR EACH ROW
    EXECUTE FUNCTION update_equipment_on_replacement();

-- =====================================================
-- 4. ADD REORDER LEVEL TO MARINE INVENTORY
-- =====================================================
-- Add reorder_level column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'marine_inventory' AND column_name = 'reorder_level'
    ) THEN
        ALTER TABLE marine_inventory 
        ADD COLUMN reorder_level DECIMAL(15, 2) DEFAULT 10;
    END IF;
END $$;

-- =====================================================
-- 5. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_inventory_usage_inventory_id ON inventory_usage(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_usage_vessel_id ON inventory_usage(vessel_id);
CREATE INDEX IF NOT EXISTS idx_inventory_usage_maintenance ON inventory_usage(maintenance_schedule_id);
CREATE INDEX IF NOT EXISTS idx_inventory_usage_overhaul ON inventory_usage(overhaul_project_id);
CREATE INDEX IF NOT EXISTS idx_inventory_usage_date ON inventory_usage(usage_date);

CREATE INDEX IF NOT EXISTS idx_vessel_equipment_vessel_id ON vessel_equipment(vessel_id);
CREATE INDEX IF NOT EXISTS idx_vessel_equipment_status ON vessel_equipment(status);
CREATE INDEX IF NOT EXISTS idx_vessel_equipment_type ON vessel_equipment(equipment_type);

CREATE INDEX IF NOT EXISTS idx_equipment_replacements_vessel_id ON equipment_replacements(vessel_id);
CREATE INDEX IF NOT EXISTS idx_equipment_replacements_old_equip ON equipment_replacements(old_equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_replacements_new_equip ON equipment_replacements(new_equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_replacements_date ON equipment_replacements(replacement_date);

-- =====================================================
-- 6. VIEWS FOR REPORTING
-- =====================================================

-- Inventory usage summary by vessel
CREATE OR REPLACE VIEW inventory_usage_by_vessel AS
SELECT 
    v.id as vessel_id,
    v.name as vessel_name,
    COUNT(iu.id) as total_usages,
    SUM(iu.quantity_used) as total_quantity_used,
    SUM(iu.total_cost) as total_cost,
    MAX(iu.usage_date) as last_usage_date
FROM vessels v
LEFT JOIN inventory_usage iu ON iu.vessel_id = v.id
GROUP BY v.id, v.name;

-- Equipment replacement history
CREATE OR REPLACE VIEW equipment_replacement_history AS
SELECT 
    er.id,
    v.name as vessel_name,
    er.old_equipment_name,
    er.failure_reason,
    er.replacement_date,
    er.total_cost,
    er.old_equipment_disposition,
    w.name as warehouse_name,
    e.name as replaced_by_employee
FROM equipment_replacements er
LEFT JOIN vessels v ON v.id = er.vessel_id
LEFT JOIN warehouses w ON w.id = er.warehouse_id
LEFT JOIN employees e ON e.id = er.replaced_by_employee_id
ORDER BY er.replacement_date DESC;

-- Low stock inventory alert
CREATE OR REPLACE VIEW low_stock_inventory AS
SELECT 
    mi.id,
    mi.equipment_name,
    mi.category,
    mi.quantity,
    mi.reorder_level,
    mi.status,
    w.name as warehouse_name,
    w.location as warehouse_location
FROM marine_inventory mi
LEFT JOIN warehouses w ON w.id = mi.warehouse_id
WHERE mi.status IN ('low_stock', 'out_of_stock')
ORDER BY 
    CASE mi.status 
        WHEN 'out_of_stock' THEN 1
        WHEN 'low_stock' THEN 2
        ELSE 3
    END,
    mi.equipment_name;

-- Comments for documentation
COMMENT ON TABLE inventory_usage IS 'Tracks usage of inventory items in maintenance and overhaul activities';
COMMENT ON TABLE vessel_equipment IS 'Tracks equipment installed on vessels';
COMMENT ON TABLE equipment_replacements IS 'Tracks replacement of equipment on vessels';
COMMENT ON VIEW inventory_usage_by_vessel IS 'Summary of inventory usage grouped by vessel';
COMMENT ON VIEW equipment_replacement_history IS 'Complete history of equipment replacements';
COMMENT ON VIEW low_stock_inventory IS 'Inventory items that are low or out of stock';
