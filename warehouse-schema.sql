-- Additional Tables for Warehouse and Inventory Management
-- Run this AFTER the main supabase-schema.sql
-- This script is idempotent and can be run multiple times safely

-- Drop existing tables (in reverse dependency order)
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS purchase_requisitions CASCADE;
DROP TABLE IF EXISTS equipment_tracking CASCADE;
DROP TABLE IF EXISTS marine_inventory CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;

-- Warehouses Table
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL UNIQUE,
  warehouse_type VARCHAR(50) DEFAULT 'main', -- main, secondary, port, vessel
  location VARCHAR(200) NOT NULL,
  address TEXT,
  capacity DECIMAL(10,2), -- in square meters
  contact_person VARCHAR(200),
  contact_phone VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, maintenance
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Marine Inventory Table (for spare parts, consumables, and small items)
CREATE TABLE marine_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sl_no VARCHAR(50), -- Serial number for tracking
  equipment_name VARCHAR(200) NOT NULL, -- EQUIPMENT column
  item_code VARCHAR(100) UNIQUE, -- ITEM CODE column
  description TEXT, -- DESCRIPTION column
  category VARCHAR(100), -- spare_parts, equipment, tools, consumables, safety_equipment, etc.
  warehouse_id UUID REFERENCES warehouses(id),
  vessel_id UUID REFERENCES vessels(id), -- if item is on a vessel
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0, -- Updated QTY
  unit VARCHAR(50) DEFAULT 'pcs', -- UNIT column - pcs, kg, liters, etc.
  reorder_level DECIMAL(10,2), -- minimum quantity before reorder
  unit_price DECIMAL(12,2),
  status VARCHAR(50) DEFAULT 'in_stock', -- in_stock, low_stock, out_of_stock, in_maintenance, on_vessel
  location VARCHAR(100), -- LOCATION column - e.g., CB (Cutting Box), WB (Wooden Box)
  location_1 VARCHAR(100), -- LOCATION - 1 column - specific container/box identifier
  location_2 VARCHAR(200), -- LOCATION - 2 column - actual warehouse name
  ref_no VARCHAR(100), -- REF. No. column
  remarks TEXT, -- REMARKS column
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Equipment Tracking Table (for large equipment items like generators)
CREATE TABLE equipment_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_name VARCHAR(200) NOT NULL,
  equipment_code VARCHAR(100) UNIQUE,
  serial_number VARCHAR(200),
  category VARCHAR(100), -- generator, engine, pump, compressor, crane, etc.
  manufacturer VARCHAR(200),
  model VARCHAR(200),
  purchase_date DATE,
  purchase_price DECIMAL(12,2),
  warranty_expiry DATE,
  status VARCHAR(50) DEFAULT 'in_warehouse', -- in_use, in_warehouse, in_maintenance, retired, sold, scrapped
  warehouse_id UUID REFERENCES warehouses(id),
  vessel_id UUID REFERENCES vessels(id), -- if equipment is on a vessel
  location_details TEXT, -- where exactly in warehouse or vessel
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  sale_date DATE,
  sale_price DECIMAL(12,2),
  buyer_info TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Requisitions Table (crew ordering/requesting materials)
CREATE TABLE purchase_requisitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requested_by UUID REFERENCES employees(id) NOT NULL,
  vessel_id UUID REFERENCES vessels(id), -- which vessel needs it
  item_name VARCHAR(200) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) DEFAULT 'pcs',
  estimated_cost DECIMAL(12,2),
  purpose TEXT NOT NULL, -- why is it needed
  priority VARCHAR(50) DEFAULT 'normal', -- low, normal, high, urgent
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, ordered, received
  required_date DATE, -- when it's needed by
  approved_by UUID REFERENCES employees(id),
  approved_date DATE,
  supplier_suggestion VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Transactions Table (track stock movements)
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id UUID REFERENCES marine_inventory(id),
  equipment_id UUID REFERENCES equipment_tracking(id),
  transaction_type VARCHAR(50) NOT NULL, -- purchase, issue, return, transfer, adjustment, maintenance_in, maintenance_out
  quantity DECIMAL(10,2) NOT NULL,
  from_warehouse_id UUID REFERENCES warehouses(id),
  to_warehouse_id UUID REFERENCES warehouses(id),
  from_vessel_id UUID REFERENCES vessels(id),
  to_vessel_id UUID REFERENCES vessels(id),
  reference_number VARCHAR(100), -- PO number, requisition number, etc.
  performed_by UUID REFERENCES employees(id),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_warehouses_updated_at ON warehouses;
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_marine_inventory_updated_at ON marine_inventory;
CREATE TRIGGER update_marine_inventory_updated_at BEFORE UPDATE ON marine_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_equipment_tracking_updated_at ON equipment_tracking;
CREATE TRIGGER update_equipment_tracking_updated_at BEFORE UPDATE ON equipment_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchase_requisitions_updated_at ON purchase_requisitions;
CREATE TRIGGER update_purchase_requisitions_updated_at BEFORE UPDATE ON purchase_requisitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample Data
-- Add sample warehouses
INSERT INTO warehouses (name, warehouse_type, location, address, capacity, status) VALUES
('Warehouse A', 'main', 'Dubai', 'Industrial Area 1, Dubai', 5000.00, 'active'),
('Warehouse B', 'secondary', 'Sharjah', 'Port Area, Sharjah', 3000.00, 'active'),
('Port Storage 1', 'port', 'Abu Dhabi', 'Abu Dhabi Port', 2000.00, 'active')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS for new tables
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE marine_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all operations on warehouses" ON warehouses;
DROP POLICY IF EXISTS "Allow all operations on marine_inventory" ON marine_inventory;
DROP POLICY IF EXISTS "Allow all operations on equipment_tracking" ON equipment_tracking;
DROP POLICY IF EXISTS "Allow all operations on purchase_requisitions" ON purchase_requisitions;
DROP POLICY IF EXISTS "Allow all operations on inventory_movements" ON inventory_movements;

-- Create permissive policies for all operations
CREATE POLICY "Allow all operations on warehouses"
ON warehouses FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations on marine_inventory"
ON marine_inventory FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations on equipment_tracking"
ON equipment_tracking FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations on purchase_requisitions"
ON purchase_requisitions FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations on inventory_movements"
ON inventory_movements FOR ALL
USING (true)
WITH CHECK (true);

-- Note: Run this script AFTER supabase-schema.sql and fix-rls-policies.sql
