-- Fix Equipment and Income Architecture
-- Run this to properly connect land equipment to warehouse and track all income

-- Step 0: Drop dependent views first
DROP VIEW IF EXISTS land_financial_summary CASCADE;

-- Step 1: Remove buyer fields from land_equipment (equipment goes to warehouse, not sold immediately)
DO $$
BEGIN
  -- Remove dealer_company_id (not needed - equipment stored in warehouse)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'land_equipment' AND column_name = 'dealer_company_id'
  ) THEN
    ALTER TABLE land_equipment DROP COLUMN dealer_company_id CASCADE;
    RAISE NOTICE 'Removed dealer_company_id from land_equipment';
  END IF;

  -- Remove buyer_name (not needed)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'land_equipment' AND column_name = 'buyer_name'
  ) THEN
    ALTER TABLE land_equipment DROP COLUMN buyer_name CASCADE;
    RAISE NOTICE 'Removed buyer_name from land_equipment';
  END IF;

  -- Remove sale_price and sale_date (will track in warehouse_sales when actually sold)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'land_equipment' AND column_name = 'sale_price'
  ) THEN
    ALTER TABLE land_equipment DROP COLUMN sale_price CASCADE;
    RAISE NOTICE 'Removed sale_price from land_equipment';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'land_equipment' AND column_name = 'sale_date'
  ) THEN
    ALTER TABLE land_equipment DROP COLUMN sale_date CASCADE;
    RAISE NOTICE 'Removed sale_date from land_equipment';
  END IF;
END $$;

-- Step 2: Add warehouse_id to land_equipment (link equipment to warehouse storage)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'land_equipment' AND column_name = 'warehouse_id'
  ) THEN
    ALTER TABLE land_equipment ADD COLUMN warehouse_id UUID REFERENCES warehouses(id);
    RAISE NOTICE 'Added warehouse_id to land_equipment';
  END IF;
END $$;

-- Update status values for land_equipment (remove 'sold_as_is', add 'in_warehouse')
DO $$
BEGIN
  -- Update any 'sold_as_is' status to 'in_warehouse'
  UPDATE land_equipment SET status = 'in_warehouse' WHERE status = 'sold_as_is';
  
  RAISE NOTICE 'Updated land_equipment statuses';
END $$;

-- Step 3: Link vessel overhauls to specific vessels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_overhaul_projects' AND column_name = 'vessel_id'
  ) THEN
    ALTER TABLE vessel_overhaul_projects ADD COLUMN vessel_id UUID REFERENCES vessels(id);
    RAISE NOTICE 'Added vessel_id to vessel_overhaul_projects';
  END IF;
END $$;

-- Step 4: Create income tracking table (all revenue sources)
CREATE TABLE IF NOT EXISTS income_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    income_date DATE NOT NULL,
    income_type VARCHAR(50) CHECK (income_type IN ('scrap_sale', 'equipment_sale', 'vessel_rental', 'service', 'other')),
    source_type VARCHAR(50) CHECK (source_type IN ('land', 'vessel', 'warehouse', 'other')),
    source_id UUID, -- ID of the land, vessel, or warehouse
    reference_id UUID, -- ID of the specific sale/rental record
    amount DECIMAL(15, 2) NOT NULL,
    customer_company_id UUID REFERENCES companies(id),
    description TEXT,
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 5: Create vessel rental tracking table
CREATE TABLE IF NOT EXISTS vessel_rentals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vessel_id UUID REFERENCES vessels(id) NOT NULL,
    customer_company_id UUID REFERENCES companies(id),
    customer_name VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE,
    daily_rate DECIMAL(15, 2),
    total_amount DECIMAL(15, 2),
    payment_status VARCHAR(50) CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue')),
    status VARCHAR(50) CHECK (status IN ('active', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 6: Create warehouse sales table (when equipment is actually sold)
CREATE TABLE IF NOT EXISTS warehouse_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID REFERENCES warehouses(id),
    land_equipment_id UUID REFERENCES land_equipment(id), -- Link back to original equipment
    item_name VARCHAR(255) NOT NULL,
    sale_date DATE NOT NULL,
    sale_price DECIMAL(15, 2) NOT NULL,
    customer_company_id UUID REFERENCES companies(id),
    customer_name VARCHAR(255),
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Step 7: Create trigger to auto-create income record when scrap is sold
CREATE OR REPLACE FUNCTION create_income_from_scrap_sale()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO income_records (
    income_date,
    income_type,
    source_type,
    source_id,
    reference_id,
    amount,
    customer_company_id,
    description
  ) VALUES (
    NEW.sale_date,
    'scrap_sale',
    'land',
    NEW.land_id,
    NEW.id,
    NEW.total_amount,
    NEW.buyer_company_id,
    CONCAT('Scrap Sale: ', NEW.material_type, ' - ', NEW.quantity_tons, ' tons')
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_income_scrap_sale ON land_scrap_sales;
CREATE TRIGGER auto_income_scrap_sale
AFTER INSERT ON land_scrap_sales
FOR EACH ROW
EXECUTE FUNCTION create_income_from_scrap_sale();

-- Step 8: Create trigger to auto-create income record when vessel rented
CREATE OR REPLACE FUNCTION create_income_from_vessel_rental()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_amount > 0 AND NEW.payment_status = 'paid' THEN
    INSERT INTO income_records (
      income_date,
      income_type,
      source_type,
      source_id,
      reference_id,
      amount,
      customer_company_id,
      description
    ) VALUES (
      COALESCE(NEW.end_date, CURRENT_DATE),
      'vessel_rental',
      'vessel',
      NEW.vessel_id,
      NEW.id,
      NEW.total_amount,
      NEW.customer_id,  -- FIXED: vessel_rentals uses customer_id, not customer_company_id
      CONCAT('Vessel Rental: ', NEW.start_date, ' to ', NEW.end_date)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_income_vessel_rental ON vessel_rentals;
CREATE TRIGGER auto_income_vessel_rental
AFTER INSERT OR UPDATE ON vessel_rentals
FOR EACH ROW
EXECUTE FUNCTION create_income_from_vessel_rental();

-- Step 9: Create trigger to auto-create income record when warehouse equipment sold
CREATE OR REPLACE FUNCTION create_income_from_warehouse_sale()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO income_records (
    income_date,
    income_type,
    source_type,
    source_id,
    reference_id,
    amount,
    customer_company_id,
    description
  ) VALUES (
    NEW.sale_date,
    'equipment_sale',
    'warehouse',
    NEW.warehouse_id,
    NEW.id,
    NEW.sale_price,
    NEW.customer_company_id,
    CONCAT('Equipment Sale: ', NEW.item_name)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_income_warehouse_sale ON warehouse_sales;
CREATE TRIGGER auto_income_warehouse_sale
AFTER INSERT ON warehouse_sales
FOR EACH ROW
EXECUTE FUNCTION create_income_from_warehouse_sale();

-- Step 10: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_income_date ON income_records(income_date);
CREATE INDEX IF NOT EXISTS idx_income_type ON income_records(income_type);
CREATE INDEX IF NOT EXISTS idx_income_source ON income_records(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_vessel_rentals_vessel ON vessel_rentals(vessel_id);
CREATE INDEX IF NOT EXISTS idx_vessel_rentals_status ON vessel_rentals(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_sales_warehouse ON warehouse_sales(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_land_equipment_warehouse ON land_equipment(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_overhaul_vessel ON vessel_overhaul_projects(vessel_id);

-- Step 11: Recreate land_financial_summary view (updated for new structure)
CREATE OR REPLACE VIEW land_financial_summary AS
SELECT 
  lp.id,
  lp.land_name,
  lp.purchase_price,
  COALESCE(SUM(le.estimated_value), 0) as total_equipment_value,
  COALESCE(SUM(lss.total_amount), 0) as total_scrap_sales,
  COALESCE(SUM(ws.sale_price), 0) as total_equipment_sales,
  COALESCE(SUM(e.amount), 0) as total_expenses,
  -- Income calculation
  (COALESCE(SUM(lss.total_amount), 0) + COALESCE(SUM(ws.sale_price), 0)) as total_income,
  -- Profit calculation (no longer includes estimated equipment value, only actual sales)
  (COALESCE(SUM(lss.total_amount), 0) + COALESCE(SUM(ws.sale_price), 0) - lp.purchase_price - COALESCE(SUM(e.amount), 0)) as net_profit
FROM land_purchases lp
LEFT JOIN land_equipment le ON lp.id = le.land_id
LEFT JOIN land_scrap_sales lss ON lp.id = lss.land_id
LEFT JOIN warehouse_sales ws ON le.id = ws.land_equipment_id
LEFT JOIN expenses e ON lp.id = e.project_id AND e.project_type = 'land'
GROUP BY lp.id, lp.land_name, lp.purchase_price;

-- Verify the changes
SELECT 
  'income_records created' as status,
  COUNT(*) as count
FROM income_records

UNION ALL

SELECT 
  'vessel_rentals created' as status,
  COUNT(*) as count
FROM vessel_rentals

UNION ALL

SELECT 
  'warehouse_sales created' as status,
  COUNT(*) as count
FROM warehouse_sales;
