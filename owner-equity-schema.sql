-- Owner Equity Tracking Schema
-- Tracks which owner paid for what expenses/purchases

-- Owners/Partners Table
CREATE TABLE IF NOT EXISTS owners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    ownership_percentage DECIMAL(5, 2), -- e.g., 50.00 for 50%
    initial_capital DECIMAL(15, 2) DEFAULT 0,
    join_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add paid_by_owner_id to vessels table
ALTER TABLE vessels 
ADD COLUMN IF NOT EXISTS paid_by_owner_id UUID REFERENCES owners(id);

-- Add paid_by_owner_id to expenses table
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS paid_by_owner_id UUID REFERENCES owners(id);

-- Add paid_by_owner_id to salary_payments table
ALTER TABLE salary_payments 
ADD COLUMN IF NOT EXISTS paid_by_owner_id UUID REFERENCES owners(id);

-- Add paid_by_owner_id to vessel_movements table
ALTER TABLE vessel_movements 
ADD COLUMN IF NOT EXISTS paid_by_owner_id UUID REFERENCES owners(id);

-- Add paid_by_owner_id to land_purchases table
ALTER TABLE land_purchases 
ADD COLUMN IF NOT EXISTS paid_by_owner_id UUID REFERENCES owners(id);

-- Capital Contributions tracking (for additional investments)
CREATE TABLE IF NOT EXISTS capital_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES owners(id) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
    contribution_type VARCHAR(50) CHECK (contribution_type IN ('cash', 'equipment', 'other')) DEFAULT 'cash',
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Capital Withdrawals tracking (for profit distributions)
CREATE TABLE IF NOT EXISTS capital_withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES owners(id) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    withdrawal_date DATE NOT NULL DEFAULT CURRENT_DATE,
    withdrawal_type VARCHAR(50) CHECK (withdrawal_type IN ('profit_distribution', 'loan_repayment', 'other')) DEFAULT 'profit_distribution',
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create view for owner equity summary
CREATE OR REPLACE VIEW owner_equity_summary AS
SELECT 
    o.id,
    o.name,
    o.ownership_percentage,
    o.initial_capital,
    
    -- Capital movements
    COALESCE(SUM(cc.amount), 0) as total_contributions,
    COALESCE(SUM(cw.amount), 0) as total_withdrawals,
    
    -- Vessel purchases paid by this owner
    COALESCE(SUM(v.purchase_price), 0) as vessel_purchases_paid,
    
    -- Expenses paid by this owner
    COALESCE(SUM(e.amount), 0) as expenses_paid,
    
    -- Salaries paid by this owner
    COALESCE(SUM(sp.total_amount), 0) as salaries_paid,
    
    -- Movement costs paid by this owner
    COALESCE(SUM(vm.cost), 0) as movement_costs_paid,
    
    -- Land purchases paid by this owner
    COALESCE(SUM(lp.total_amount), 0) as land_purchases_paid,
    
    -- Total paid by owner
    o.initial_capital + 
    COALESCE(SUM(cc.amount), 0) + 
    COALESCE(SUM(v.purchase_price), 0) + 
    COALESCE(SUM(e.amount), 0) + 
    COALESCE(SUM(sp.total_amount), 0) + 
    COALESCE(SUM(vm.cost), 0) +
    COALESCE(SUM(lp.total_amount), 0) as total_invested,
    
    -- Net withdrawals
    COALESCE(SUM(cw.amount), 0) as net_withdrawals,
    
    -- Current equity position
    o.initial_capital + 
    COALESCE(SUM(cc.amount), 0) + 
    COALESCE(SUM(v.purchase_price), 0) + 
    COALESCE(SUM(e.amount), 0) + 
    COALESCE(SUM(sp.total_amount), 0) + 
    COALESCE(SUM(vm.cost), 0) +
    COALESCE(SUM(lp.total_amount), 0) -
    COALESCE(SUM(cw.amount), 0) as current_equity

FROM owners o
LEFT JOIN capital_contributions cc ON o.id = cc.owner_id
LEFT JOIN capital_withdrawals cw ON o.id = cw.owner_id
LEFT JOIN vessels v ON o.id = v.paid_by_owner_id
LEFT JOIN expenses e ON o.id = e.paid_by_owner_id
LEFT JOIN salary_payments sp ON o.id = sp.paid_by_owner_id
LEFT JOIN vessel_movements vm ON o.id = vm.paid_by_owner_id
LEFT JOIN land_purchases lp ON o.id = lp.paid_by_owner_id
WHERE o.status = 'active'
GROUP BY o.id, o.name, o.ownership_percentage, o.initial_capital;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vessels_paid_by_owner ON vessels(paid_by_owner_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by_owner ON expenses(paid_by_owner_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_paid_by_owner ON salary_payments(paid_by_owner_id);
CREATE INDEX IF NOT EXISTS idx_vessel_movements_paid_by_owner ON vessel_movements(paid_by_owner_id);
CREATE INDEX IF NOT EXISTS idx_land_purchases_paid_by_owner ON land_purchases(paid_by_owner_id);
CREATE INDEX IF NOT EXISTS idx_capital_contributions_owner ON capital_contributions(owner_id);
CREATE INDEX IF NOT EXISTS idx_capital_withdrawals_owner ON capital_withdrawals(owner_id);

-- Insert sample owners (update with actual owner names)
INSERT INTO owners (name, email, ownership_percentage, initial_capital, status) VALUES
('Owner 1', 'owner1@example.com', 50.00, 0, 'active'),
('Owner 2', 'owner2@example.com', 50.00, 0, 'active')
ON CONFLICT DO NOTHING;
