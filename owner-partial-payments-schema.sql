-- Owner Partial Payments Schema
-- Allows splitting payments between multiple owners for the same expense/purchase

-- Add paid_by_owner_id to expenses table (for backward compatibility)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'paid_by_owner_id'
    ) THEN
        ALTER TABLE expenses ADD COLUMN paid_by_owner_id UUID REFERENCES owners(id);
    END IF;
END $$;

-- Add paid_by_owner_id to vessel_overhaul_projects table (for backward compatibility)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vessel_overhaul_projects' AND column_name = 'paid_by_owner_id'
    ) THEN
        ALTER TABLE vessel_overhaul_projects ADD COLUMN paid_by_owner_id UUID REFERENCES owners(id);
    END IF;
END $$;

-- Add paid_by_owner_id to other tables if they don't exist
DO $$ 
BEGIN
    -- Vessels
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vessels' AND column_name = 'paid_by_owner_id'
    ) THEN
        ALTER TABLE vessels ADD COLUMN paid_by_owner_id UUID REFERENCES owners(id);
    END IF;
    
    -- Land Purchases
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'land_purchases' AND column_name = 'paid_by_owner_id'
    ) THEN
        ALTER TABLE land_purchases ADD COLUMN paid_by_owner_id UUID REFERENCES owners(id);
    END IF;
    
    -- Vessel Movements
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vessel_movements' AND column_name = 'paid_by_owner_id'
    ) THEN
        ALTER TABLE vessel_movements ADD COLUMN paid_by_owner_id UUID REFERENCES owners(id);
    END IF;
    
    -- Salary Payments
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'salary_payments' AND column_name = 'paid_by_owner_id'
    ) THEN
        ALTER TABLE salary_payments ADD COLUMN paid_by_owner_id UUID REFERENCES owners(id);
    END IF;
END $$;

-- Payment Splits Table - tracks partial payments by each owner
CREATE TABLE IF NOT EXISTS payment_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES owners(id) NOT NULL,
    
    -- Reference to the item being paid for (only one should be set)
    vessel_id UUID REFERENCES vessels(id),
    expense_id UUID REFERENCES expenses(id),
    salary_payment_id UUID REFERENCES salary_payments(id),
    vessel_movement_id UUID REFERENCES vessel_movements(id),
    land_purchase_id UUID REFERENCES land_purchases(id),
    
    amount_paid DECIMAL(15, 2) NOT NULL,
    payment_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add overhaul_project_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payment_splits' AND column_name = 'overhaul_project_id'
    ) THEN
        ALTER TABLE payment_splits ADD COLUMN overhaul_project_id UUID REFERENCES vessel_overhaul_projects(id);
    END IF;
END $$;

-- Drop and recreate the constraint to include overhaul_project_id
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_single_reference' AND table_name = 'payment_splits'
    ) THEN
        ALTER TABLE payment_splits DROP CONSTRAINT check_single_reference;
    END IF;
    
    -- Add updated constraint
    ALTER TABLE payment_splits ADD CONSTRAINT check_single_reference CHECK (
        (vessel_id IS NOT NULL)::int +
        (expense_id IS NOT NULL)::int +
        (salary_payment_id IS NOT NULL)::int +
        (vessel_movement_id IS NOT NULL)::int +
        (land_purchase_id IS NOT NULL)::int +
        (overhaul_project_id IS NOT NULL)::int = 1
    );
END $$;

-- Update owner_equity_summary VIEW to include payment_splits
DROP VIEW IF EXISTS owner_equity_summary;

CREATE VIEW owner_equity_summary AS
SELECT 
    o.id,
    o.name,
    o.ownership_percentage,
    o.initial_capital,
    
    -- Capital movements
    COALESCE(SUM(DISTINCT cc.amount), 0) as total_contributions,
    COALESCE(SUM(DISTINCT cw.amount), 0) as total_withdrawals,
    
    -- Split payments by category
    COALESCE(SUM(CASE WHEN ps.vessel_id IS NOT NULL THEN ps.amount_paid ELSE 0 END), 0) as vessel_purchases_paid,
    COALESCE(SUM(CASE WHEN ps.expense_id IS NOT NULL THEN ps.amount_paid ELSE 0 END), 0) as expenses_paid,
    COALESCE(SUM(CASE WHEN ps.salary_payment_id IS NOT NULL THEN ps.amount_paid ELSE 0 END), 0) as salaries_paid,
    COALESCE(SUM(CASE WHEN ps.vessel_movement_id IS NOT NULL THEN ps.amount_paid ELSE 0 END), 0) as movement_costs_paid,
    COALESCE(SUM(CASE WHEN ps.land_purchase_id IS NOT NULL THEN ps.amount_paid ELSE 0 END), 0) as land_purchases_paid,
    COALESCE(SUM(CASE WHEN ps.overhaul_project_id IS NOT NULL THEN ps.amount_paid ELSE 0 END), 0) as overhaul_projects_paid,
    
    -- Legacy single-owner payments (for backward compatibility with paid_by_owner_id)
    COALESCE(SUM(v.purchase_price), 0) as legacy_vessel_purchases,
    COALESCE(SUM(e.amount), 0) as legacy_expenses,
    COALESCE(SUM(sp.total_amount), 0) as legacy_salaries,
    COALESCE(SUM(vm.cost), 0) as legacy_movements,
    COALESCE(SUM(lp.purchase_price), 0) as legacy_lands,
    COALESCE(SUM(op.total_budget), 0) as legacy_overhaul_projects,
    
    -- Total invested (including both split payments and legacy single-owner)
    o.initial_capital + 
    COALESCE(SUM(DISTINCT cc.amount), 0) + 
    COALESCE(SUM(ps.amount_paid), 0) +
    COALESCE(SUM(v.purchase_price), 0) +
    COALESCE(SUM(e.amount), 0) +
    COALESCE(SUM(sp.total_amount), 0) +
    COALESCE(SUM(vm.cost), 0) +
    COALESCE(SUM(lp.purchase_price), 0) +
    COALESCE(SUM(op.total_budget), 0) as total_invested,
    
    -- Net withdrawals
    COALESCE(SUM(DISTINCT cw.amount), 0) as net_withdrawals,
    
    -- Current equity position
    o.initial_capital + 
    COALESCE(SUM(DISTINCT cc.amount), 0) + 
    COALESCE(SUM(ps.amount_paid), 0) +
    COALESCE(SUM(v.purchase_price), 0) +
    COALESCE(SUM(e.amount), 0) +
    COALESCE(SUM(sp.total_amount), 0) +
    COALESCE(SUM(vm.cost), 0) +
    COALESCE(SUM(lp.purchase_price), 0) +
    COALESCE(SUM(op.total_budget), 0) -
    COALESCE(SUM(DISTINCT cw.amount), 0) as current_equity

FROM owners o
LEFT JOIN capital_contributions cc ON o.id = cc.owner_id
LEFT JOIN capital_withdrawals cw ON o.id = cw.owner_id
LEFT JOIN payment_splits ps ON o.id = ps.owner_id
LEFT JOIN vessels v ON o.id = v.paid_by_owner_id
LEFT JOIN expenses e ON o.id = e.paid_by_owner_id
LEFT JOIN salary_payments sp ON o.id = sp.paid_by_owner_id
LEFT JOIN vessel_movements vm ON o.id = vm.paid_by_owner_id
LEFT JOIN land_purchases lp ON o.id = lp.paid_by_owner_id
LEFT JOIN vessel_overhaul_projects op ON o.id = op.paid_by_owner_id
WHERE o.status = 'active'
GROUP BY o.id, o.name, o.ownership_percentage, o.initial_capital;

-- Disable RLS on payment_splits table for easier access
ALTER TABLE payment_splits DISABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_splits_owner ON payment_splits(owner_id);
CREATE INDEX IF NOT EXISTS idx_payment_splits_vessel ON payment_splits(vessel_id);
CREATE INDEX IF NOT EXISTS idx_payment_splits_expense ON payment_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_payment_splits_salary ON payment_splits(salary_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_splits_movement ON payment_splits(vessel_movement_id);
CREATE INDEX IF NOT EXISTS idx_payment_splits_land ON payment_splits(land_purchase_id);
CREATE INDEX IF NOT EXISTS idx_payment_splits_overhaul ON payment_splits(overhaul_project_id);

-- Function to get total paid by owners for a vessel
CREATE OR REPLACE FUNCTION get_vessel_payments(vessel_uuid UUID)
RETURNS TABLE(owner_name TEXT, amount_paid NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT o.name, ps.amount_paid
    FROM payment_splits ps
    JOIN owners o ON ps.owner_id = o.id
    WHERE ps.vessel_id = vessel_uuid
    ORDER BY ps.amount_paid DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get total paid by owners for an expense
CREATE OR REPLACE FUNCTION get_expense_payments(expense_uuid UUID)
RETURNS TABLE(owner_name TEXT, amount_paid NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT o.name, ps.amount_paid
    FROM payment_splits ps
    JOIN owners o ON ps.owner_id = o.id
    WHERE ps.expense_id = expense_uuid
    ORDER BY ps.amount_paid DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get total paid by owners for an overhaul project
CREATE OR REPLACE FUNCTION get_overhaul_payments(overhaul_uuid UUID)
RETURNS TABLE(owner_name TEXT, amount_paid NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT o.name, ps.amount_paid
    FROM payment_splits ps
    JOIN owners o ON ps.owner_id = o.id
    WHERE ps.overhaul_project_id = overhaul_uuid
    ORDER BY ps.amount_paid DESC;
END;
$$ LANGUAGE plpgsql;
