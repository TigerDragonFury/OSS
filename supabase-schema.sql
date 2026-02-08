-- OSS Group Complete HR & CRM System - Database Schema
-- For OSS Marine Services and OSS Scrap Services
-- Safe to run multiple times - will not delete existing data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- Companies
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) CHECK (type IN ('parent', 'marine', 'scrap')),
    parent_id UUID REFERENCES companies(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Users and Authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) CHECK (role IN ('admin', 'manager', 'accountant', 'operator', 'viewer')),
    company_id UUID REFERENCES companies(id),
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- HR MANAGEMENT
-- ============================================

-- Employees
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    company_id UUID REFERENCES companies(id),
    position VARCHAR(100),
    department VARCHAR(100),
    hire_date DATE,
    salary DECIMAL(15, 2),
    salary_type VARCHAR(20) CHECK (salary_type IN ('monthly', 'daily', 'hourly')),
    status VARCHAR(20) CHECK (status IN ('active', 'inactive', 'terminated')),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    emergency_contact VARCHAR(255),
    emergency_phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Salary Payments
CREATE TABLE IF NOT EXISTS salary_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id),
    payment_date DATE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    base_amount DECIMAL(15, 2),
    bonuses DECIMAL(15, 2) DEFAULT 0,
    deductions DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2),
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- External Labor (Daily/Contract Workers)
CREATE TABLE IF NOT EXISTS external_labor (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    company_id UUID REFERENCES companies(id),
    project_id UUID, -- References project/vessel/land
    project_type VARCHAR(20) CHECK (project_type IN ('vessel', 'land', 'other')),
    rate DECIMAL(15, 2),
    rate_type VARCHAR(20) CHECK (rate_type IN ('daily', 'hourly', 'fixed')),
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) CHECK (status IN ('active', 'completed', 'cancelled')),
    total_cost DECIMAL(15, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- MARINE SERVICES
-- ============================================

-- Vessels
CREATE TABLE IF NOT EXISTS vessels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    vessel_type VARCHAR(100),
    purchase_price DECIMAL(15, 2),
    purchase_date DATE,
    status VARCHAR(50) CHECK (status IN ('active', 'scrapping', 'scrapped', 'under_overhaul', 'sold')),
    current_location VARCHAR(255),
    tonnage DECIMAL(15, 2),
    year_built INTEGER,
    classification_status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Vessel Movement Costs
CREATE TABLE IF NOT EXISTS vessel_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vessel_id UUID REFERENCES vessels(id),
    from_location VARCHAR(255),
    to_location VARCHAR(255),
    movement_date DATE,
    cost DECIMAL(15, 2),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Vessel Equipment Sales
CREATE TABLE IF NOT EXISTS vessel_equipment_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vessel_id UUID REFERENCES vessels(id),
    equipment_name VARCHAR(255) NOT NULL,
    description TEXT,
    sale_date DATE,
    sale_price DECIMAL(15, 2),
    buyer_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Vessel Scrap Metal Sales
CREATE TABLE IF NOT EXISTS vessel_scrap_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vessel_id UUID REFERENCES vessels(id),
    sale_date DATE,
    tonnage DECIMAL(15, 2),
    price_per_ton DECIMAL(15, 2),
    total_amount DECIMAL(15, 2),
    buyer_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Drydock Records
CREATE TABLE IF NOT EXISTS drydock_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vessel_id UUID REFERENCES vessels(id),
    facility_name VARCHAR(255),
    entry_date DATE,
    exit_date DATE,
    fee_type VARCHAR(20) CHECK (fee_type IN ('daily', 'monthly', 'fixed')),
    fee_amount DECIMAL(15, 2),
    total_cost DECIMAL(15, 2),
    purpose TEXT,
    status VARCHAR(20) CHECK (status IN ('ongoing', 'completed')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Vessel Overhaul Projects
CREATE TABLE IF NOT EXISTS vessel_overhaul_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vessel_id UUID REFERENCES vessels(id),
    project_name VARCHAR(255),
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) CHECK (status IN ('planning', 'in_progress', 'completed', 'on_hold')),
    total_budget DECIMAL(15, 2),
    total_spent DECIMAL(15, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Overhaul Tasks
CREATE TABLE IF NOT EXISTS overhaul_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES vessel_overhaul_projects(id),
    component_type VARCHAR(100),
    repair_type VARCHAR(100),
    task_name VARCHAR(255),
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    year INTEGER,
    description TEXT,
    contractor_name VARCHAR(255),
    start_date DATE,
    end_date DATE,
    estimated_cost DECIMAL(15, 2),
    actual_cost DECIMAL(15, 2),
    status VARCHAR(50) CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns to overhaul_tasks if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'overhaul_tasks' AND column_name = 'component_type') THEN
        ALTER TABLE overhaul_tasks ADD COLUMN component_type VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'overhaul_tasks' AND column_name = 'repair_type') THEN
        ALTER TABLE overhaul_tasks ADD COLUMN repair_type VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'overhaul_tasks' AND column_name = 'manufacturer') THEN
        ALTER TABLE overhaul_tasks ADD COLUMN manufacturer VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'overhaul_tasks' AND column_name = 'model') THEN
        ALTER TABLE overhaul_tasks ADD COLUMN model VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'overhaul_tasks' AND column_name = 'year') THEN
        ALTER TABLE overhaul_tasks ADD COLUMN year INTEGER;
    END IF;
END $$;

-- ============================================
-- SCRAP SERVICES
-- ============================================

-- Land Purchases
CREATE TABLE IF NOT EXISTS land_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    land_name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    purchase_price DECIMAL(15, 2),
    purchase_date DATE,
    estimated_tonnage DECIMAL(15, 2),
    remaining_tonnage DECIMAL(15, 2),
    status VARCHAR(50) CHECK (status IN ('active', 'partially_cleared', 'completed')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Land Equipment Inventory
CREATE TABLE IF NOT EXISTS land_equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    land_id UUID REFERENCES land_purchases(id),
    equipment_name VARCHAR(255),
    description TEXT,
    condition VARCHAR(50) CHECK (condition IN ('good', 'fair', 'poor', 'scrap')),
    estimated_value DECIMAL(15, 2),
    status VARCHAR(50) CHECK (status IN ('available', 'sold_as_is', 'scrapped', 'reserved')),
    sale_price DECIMAL(15, 2),
    sale_date DATE,
    buyer_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Scrap Metal Sales (from land)
CREATE TABLE IF NOT EXISTS land_scrap_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    land_id UUID REFERENCES land_purchases(id),
    sale_date DATE,
    tonnage DECIMAL(15, 2),
    price_per_ton DECIMAL(15, 2),
    total_amount DECIMAL(15, 2),
    buyer_name VARCHAR(255),
    scrap_type VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- FINANCIAL MANAGEMENT
-- ============================================

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    company_id UUID REFERENCES companies(id),
    invoice_type VARCHAR(20) CHECK (invoice_type IN ('income', 'expense')),
    client_name VARCHAR(255),
    date DATE NOT NULL,
    due_date DATE,
    subtotal DECIMAL(15, 2),
    tax DECIMAL(15, 2) DEFAULT 0,
    total DECIMAL(15, 2),
    status VARCHAR(20) CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    payment_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT,
    quantity DECIMAL(15, 2),
    unit_price DECIMAL(15, 2),
    total DECIMAL(15, 2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    expense_type VARCHAR(100),
    category VARCHAR(100),
    amount DECIMAL(15, 2),
    date DATE NOT NULL,
    vendor_name VARCHAR(255),
    project_id UUID, -- Can reference vessel_id, land_id, etc
    project_type VARCHAR(20) CHECK (project_type IN ('vessel', 'land', 'general', 'other')),
    description TEXT,
    receipt_url VARCHAR(500),
    status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
    paid_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Inventory
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    quantity DECIMAL(15, 2),
    unit VARCHAR(50),
    unit_cost DECIMAL(15, 2),
    total_value DECIMAL(15, 2),
    location VARCHAR(255),
    reorder_level DECIMAL(15, 2),
    status VARCHAR(20) CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Inventory Transactions
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID REFERENCES inventory(id),
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('purchase', 'sale', 'use', 'adjustment')),
    quantity DECIMAL(15, 2),
    unit_cost DECIMAL(15, 2),
    total_amount DECIMAL(15, 2),
    date DATE NOT NULL,
    reference_id UUID, -- Can reference project, sale, etc
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- REPORTING & ANALYTICS
-- ============================================

-- Profit/Loss Summary View
CREATE OR REPLACE VIEW profit_loss_summary AS
SELECT 
    c.id as company_id,
    c.name as company_name,
    COALESCE(SUM(CASE WHEN i.invoice_type = 'income' AND i.status = 'paid' THEN i.total ELSE 0 END), 0) as total_income,
    COALESCE(SUM(CASE WHEN e.status = 'paid' THEN e.amount ELSE 0 END), 0) as total_expenses,
    COALESCE(SUM(CASE WHEN i.invoice_type = 'income' AND i.status = 'paid' THEN i.total ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN e.status = 'paid' THEN e.amount ELSE 0 END), 0) as net_profit
FROM companies c
LEFT JOIN invoices i ON c.id = i.company_id
LEFT JOIN expenses e ON c.id = e.company_id
GROUP BY c.id, c.name;

-- Vessel Financial Summary
CREATE OR REPLACE VIEW vessel_financial_summary AS
SELECT 
    v.id,
    v.name,
    v.purchase_price,
    COALESCE(SUM(vm.cost), 0) as movement_costs,
    COALESCE(SUM(ves.sale_price), 0) as equipment_sales,
    COALESCE(SUM(vss.total_amount), 0) as scrap_sales,
    COALESCE(SUM(dr.total_cost), 0) as drydock_costs,
    COALESCE(SUM(ot.actual_cost), 0) as overhaul_costs,
    COALESCE(SUM(e.amount), 0) as other_expenses,
    (COALESCE(SUM(ves.sale_price), 0) + COALESCE(SUM(vss.total_amount), 0)) - 
    (v.purchase_price + COALESCE(SUM(vm.cost), 0) + COALESCE(SUM(dr.total_cost), 0) + 
     COALESCE(SUM(ot.actual_cost), 0) + COALESCE(SUM(e.amount), 0)) as net_profit_loss
FROM vessels v
LEFT JOIN vessel_movements vm ON v.id = vm.vessel_id
LEFT JOIN vessel_equipment_sales ves ON v.id = ves.vessel_id
LEFT JOIN vessel_scrap_sales vss ON v.id = vss.vessel_id
LEFT JOIN drydock_records dr ON v.id = dr.vessel_id
LEFT JOIN vessel_overhaul_projects vop ON v.id = vop.vessel_id
LEFT JOIN overhaul_tasks ot ON vop.id = ot.project_id
LEFT JOIN expenses e ON v.id = e.project_id AND e.project_type = 'vessel'
GROUP BY v.id, v.name, v.purchase_price;

-- Land Financial Summary
CREATE OR REPLACE VIEW land_financial_summary AS
SELECT 
    lp.id,
    lp.land_name,
    lp.purchase_price,
    COALESCE(SUM(CASE WHEN le.status = 'sold_as_is' THEN le.sale_price ELSE 0 END), 0) as equipment_sales,
    COALESCE(SUM(lss.total_amount), 0) as scrap_sales,
    COALESCE(SUM(e.amount), 0) as expenses,
    (COALESCE(SUM(CASE WHEN le.status = 'sold_as_is' THEN le.sale_price ELSE 0 END), 0) + 
     COALESCE(SUM(lss.total_amount), 0)) - 
    (lp.purchase_price + COALESCE(SUM(e.amount), 0)) as net_profit_loss,
    lp.remaining_tonnage
FROM land_purchases lp
LEFT JOIN land_equipment le ON lp.id = le.land_id
LEFT JOIN land_scrap_sales lss ON lp.id = lss.land_id
LEFT JOIN expenses e ON lp.id = e.project_id AND e.project_type = 'land'
GROUP BY lp.id, lp.land_name, lp.purchase_price, lp.remaining_tonnage;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_vessels_status ON vessels(status);
CREATE INDEX IF NOT EXISTS idx_land_status ON land_purchases(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_project ON expenses(project_id, project_type);
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_employee ON salary_payments(employee_id);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update timestamp trigger to relevant tables
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vessels_updated_at ON vessels;
CREATE TRIGGER update_vessels_updated_at BEFORE UPDATE ON vessels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_land_updated_at ON land_purchases;
CREATE TRIGGER update_land_updated_at BEFORE UPDATE ON land_purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_updated_at ON inventory;
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Calculate invoice total
CREATE OR REPLACE FUNCTION calculate_invoice_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE invoices 
    SET total = (
        SELECT COALESCE(SUM(total), 0) FROM invoice_items WHERE invoice_id = NEW.invoice_id
    ) + COALESCE((SELECT tax FROM invoices WHERE id = NEW.invoice_id), 0)
    WHERE id = NEW.invoice_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_invoice_total ON invoice_items;
CREATE TRIGGER update_invoice_total AFTER INSERT OR UPDATE OR DELETE ON invoice_items 
FOR EACH ROW EXECUTE FUNCTION calculate_invoice_total();

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert Parent Company
INSERT INTO companies (name, type, parent_id) VALUES 
('OSS Group', 'parent', NULL)
ON CONFLICT (name) DO NOTHING;

-- Insert Sub Companies
INSERT INTO companies (name, type, parent_id) VALUES 
('OSS Marine Services', 'marine', (SELECT id FROM companies WHERE name = 'OSS Group')),
('OSS Scrap Services', 'scrap', (SELECT id FROM companies WHERE name = 'OSS Group'))
ON CONFLICT DO NOTHING;

-- Insert Sample Vessel (Regina 250)
INSERT INTO vessels (name, vessel_type, purchase_price, purchase_date, status, notes)
VALUES ('Regina 250', 'Cargo Vessel', 3200000, '2024-01-01', 'scrapping', 
'Purchased for 3.2M, unable to class, decided to scrap. Pipeline equipment sold for 5M, generators sold for 180K.')
ON CONFLICT DO NOTHING;

-- Insert Equipment Sales for Regina 250
DO $$
DECLARE
    v_vessel_id UUID;
BEGIN
    -- Get the first Regina 250 vessel ID
    SELECT id INTO v_vessel_id FROM vessels WHERE name = 'Regina 250' LIMIT 1;
    
    IF v_vessel_id IS NOT NULL THEN
        -- Insert equipment sales only if we have a vessel ID
        INSERT INTO vessel_equipment_sales (vessel_id, equipment_name, sale_date, sale_price, description)
        VALUES 
        (v_vessel_id, 'Pipeline Equipment', '2024-03-15', 5000000, 'Pipeline equipment from Regina 250'),
        (v_vessel_id, 'Generators', '2024-04-10', 180000, 'Generators from Regina 250')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Row Level Security (RLS) Policies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE vessels ENABLE ROW LEVEL SECURITY;
ALTER TABLE land_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read" ON companies;
DROP POLICY IF EXISTS "Allow authenticated users to read" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to read" ON employees;
DROP POLICY IF EXISTS "Allow authenticated users to read" ON vessels;
DROP POLICY IF EXISTS "Allow authenticated users to read" ON land_purchases;
DROP POLICY IF EXISTS "Allow authenticated users to read" ON invoices;
DROP POLICY IF EXISTS "Allow authenticated users to read" ON expenses;

DROP POLICY IF EXISTS "Allow admin/manager to modify" ON companies;
DROP POLICY IF EXISTS "Allow admin/manager to modify" ON users;
DROP POLICY IF EXISTS "Allow admin/manager to modify" ON employees;
DROP POLICY IF EXISTS "Allow admin/manager to modify" ON vessels;
DROP POLICY IF EXISTS "Allow admin/manager to modify" ON land_purchases;
DROP POLICY IF EXISTS "Allow admin/manager to modify" ON invoices;
DROP POLICY IF EXISTS "Allow admin/manager to modify" ON expenses;

-- Basic policy to allow authenticated users to read all data
CREATE POLICY "Allow authenticated users to read" ON companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read" ON employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read" ON vessels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read" ON land_purchases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read" ON invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read" ON expenses FOR SELECT TO authenticated USING (true);

-- Admin and manager can insert/update/delete
CREATE POLICY "Allow admin/manager to modify" ON companies FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin/manager to modify" ON users FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin/manager to modify" ON employees FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin/manager to modify" ON vessels FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin/manager to modify" ON land_purchases FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin/manager to modify" ON invoices FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin/manager to modify" ON expenses FOR ALL TO authenticated USING (true);

COMMENT ON DATABASE postgres IS 'OSS Group Complete HR & CRM System - Tracks Marine Services and Scrap Services operations including vessels, land purchases, equipment, employees, invoices, and expenses.';
