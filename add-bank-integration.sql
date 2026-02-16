-- Comprehensive Bank Account Integration
-- Adds bank_account_id and payment method tracking across all modules

-- 1. Create cash withdrawals/transfers table
CREATE TABLE IF NOT EXISTS bank_withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_account_id UUID REFERENCES bank_accounts(id) ON DELETE RESTRICT NOT NULL,
    to_account_id UUID REFERENCES bank_accounts(id) ON DELETE RESTRICT NOT NULL,
    withdrawal_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(15, 2) NOT NULL,
    description VARCHAR(500),
    withdrawal_type VARCHAR(50) CHECK (withdrawal_type IN ('transfer', 'cash_withdrawal', 'petty_cash', 'other')) DEFAULT 'cash_withdrawal',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Add bank_account_id to salary_payments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'salary_payments' AND column_name = 'bank_account_id'
    ) THEN
        ALTER TABLE salary_payments ADD COLUMN bank_account_id UUID REFERENCES bank_accounts(id);
        RAISE NOTICE 'Added bank_account_id to salary_payments';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'salary_payments' AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE salary_payments ADD COLUMN payment_method VARCHAR(50) DEFAULT 'bank_transfer';
        RAISE NOTICE 'Added payment_method to salary_payments';
    END IF;
END $$;

-- 3. Add bank_account_id to land_purchases
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'land_purchases' AND column_name = 'bank_account_id'
    ) THEN
        ALTER TABLE land_purchases ADD COLUMN bank_account_id UUID REFERENCES bank_accounts(id);
        RAISE NOTICE 'Added bank_account_id to land_purchases';
    END IF;
END $$;

-- 4. Add bank_account_id to vessel_rentals
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vessel_rentals' AND column_name = 'bank_account_id'
    ) THEN
        ALTER TABLE vessel_rentals ADD COLUMN bank_account_id UUID REFERENCES bank_accounts(id);
        RAISE NOTICE 'Added bank_account_id to vessel_rentals';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vessel_rentals' AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE vessel_rentals ADD COLUMN payment_method VARCHAR(50) DEFAULT 'bank_transfer';
        RAISE NOTICE 'Added payment_method to vessel_rentals';
    END IF;
END $$;

-- 5. Add scrap_tonnage_sold tracking to land_purchases (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'land_purchases' AND column_name = 'scrap_tonnage_sold'
    ) THEN
        ALTER TABLE land_purchases ADD COLUMN scrap_tonnage_sold DECIMAL(10, 2) DEFAULT 0;
        RAISE NOTICE 'Added scrap_tonnage_sold to land_purchases';
    END IF;
END $$;

-- 6. Update land_scrap_sales to include bank_account_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'land_scrap_sales' AND column_name = 'bank_account_id'
    ) THEN
        ALTER TABLE land_scrap_sales ADD COLUMN bank_account_id UUID REFERENCES bank_accounts(id);
        RAISE NOTICE 'Added bank_account_id to land_scrap_sales';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'land_scrap_sales' AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE land_scrap_sales ADD COLUMN payment_method VARCHAR(50) DEFAULT 'bank_transfer';
        RAISE NOTICE 'Added payment_method to land_scrap_sales';
    END IF;
END $$;

-- 7. Update land_scrap_sales to include payment_date tracking
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'land_scrap_sales' AND column_name = 'payment_received_date'
    ) THEN
        ALTER TABLE land_scrap_sales ADD COLUMN payment_received_date DATE;
        RAISE NOTICE 'Added payment_received_date to land_scrap_sales';
    END IF;
END $$;

-- 8. Update warehouse_sales to include bank_account_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'warehouse_sales' AND column_name = 'bank_account_id'
    ) THEN
        ALTER TABLE warehouse_sales ADD COLUMN bank_account_id UUID REFERENCES bank_accounts(id);
        RAISE NOTICE 'Added bank_account_id to warehouse_sales';
    END IF;
END $$;

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bank_withdrawals_from ON bank_withdrawals(from_account_id, withdrawal_date);
CREATE INDEX IF NOT EXISTS idx_bank_withdrawals_to ON bank_withdrawals(to_account_id, withdrawal_date);
CREATE INDEX IF NOT EXISTS idx_salary_payments_bank ON salary_payments(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_land_purchases_bank ON land_purchases(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_vessel_rentals_bank ON vessel_rentals(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_land_scrap_sales_bank ON land_scrap_sales(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_sales_bank ON warehouse_sales(bank_account_id);

-- 10. Update bank_account_reconciliation view to include withdrawals
DROP VIEW IF EXISTS bank_account_reconciliation CASCADE;
CREATE VIEW bank_account_reconciliation AS
SELECT 
    ba.id as account_id,
    ba.account_name,
    ba.bank_name,
    ba.account_number,
    ba.currency,
    ba.opening_balance,
    ba.opening_date,
    ba.status,
    -- Calculate total income to this account
    COALESCE(SUM(CASE 
        WHEN ir.bank_account_id = ba.id AND ir.income_date >= ba.opening_date
        THEN ir.amount 
        ELSE 0 
    END), 0) as total_income,
    -- Calculate total expenses from this account
    COALESCE(SUM(CASE 
        WHEN e.bank_account_id = ba.id AND e.date >= ba.opening_date
        THEN e.amount 
        ELSE 0 
    END), 0) as total_expenses,
    -- Calculate total withdrawals from this account
    COALESCE(SUM(CASE 
        WHEN bw_out.from_account_id = ba.id AND bw_out.withdrawal_date >= ba.opening_date
        THEN bw_out.amount 
        ELSE 0 
    END), 0) as total_withdrawals,
    -- Calculate total transfers received by this account
    COALESCE(SUM(CASE 
        WHEN bw_in.to_account_id = ba.id AND bw_in.withdrawal_date >= ba.opening_date
        THEN bw_in.amount 
        ELSE 0 
    END), 0) as total_transfers_in,
    -- Calculated balance = opening balance + income + transfers_in - expenses - withdrawals
    (ba.opening_balance + 
     COALESCE(SUM(CASE 
        WHEN ir.bank_account_id = ba.id AND ir.income_date >= ba.opening_date
        THEN ir.amount 
        ELSE 0 
     END), 0) +
     COALESCE(SUM(CASE 
        WHEN bw_in.to_account_id = ba.id AND bw_in.withdrawal_date >= ba.opening_date
        THEN bw_in.amount 
        ELSE 0 
     END), 0) -
     COALESCE(SUM(CASE 
        WHEN e.bank_account_id = ba.id AND e.date >= ba.opening_date
        THEN e.amount 
        ELSE 0 
     END), 0) -
     COALESCE(SUM(CASE 
        WHEN bw_out.from_account_id = ba.id AND bw_out.withdrawal_date >= ba.opening_date
        THEN bw_out.amount 
        ELSE 0 
     END), 0)) as calculated_balance,
    -- Latest manual balance record
    (SELECT manual_balance FROM bank_balance_records 
     WHERE bank_account_id = ba.id 
     ORDER BY recorded_date DESC LIMIT 1) as latest_manual_balance,
    (SELECT recorded_date FROM bank_balance_records 
     WHERE bank_account_id = ba.id 
     ORDER BY recorded_date DESC LIMIT 1) as last_reconciled_date,
    -- Variance
    ((ba.opening_balance + 
     COALESCE(SUM(CASE 
        WHEN ir.bank_account_id = ba.id AND ir.income_date >= ba.opening_date
        THEN ir.amount 
        ELSE 0 
     END), 0) +
     COALESCE(SUM(CASE 
        WHEN bw_in.to_account_id = ba.id AND bw_in.withdrawal_date >= ba.opening_date
        THEN bw_in.amount 
        ELSE 0 
     END), 0) -
     COALESCE(SUM(CASE 
        WHEN e.bank_account_id = ba.id AND e.date >= ba.opening_date
        THEN e.amount 
        ELSE 0 
     END), 0) -
     COALESCE(SUM(CASE 
        WHEN bw_out.from_account_id = ba.id AND bw_out.withdrawal_date >= ba.opening_date
        THEN bw_out.amount 
        ELSE 0 
     END), 0)) - 
     COALESCE((SELECT manual_balance FROM bank_balance_records 
     WHERE bank_account_id = ba.id 
     ORDER BY recorded_date DESC LIMIT 1), 0)) as variance
FROM bank_accounts ba
LEFT JOIN income_records ir ON ir.bank_account_id = ba.id
LEFT JOIN expenses e ON e.bank_account_id = ba.id
LEFT JOIN bank_withdrawals bw_out ON bw_out.from_account_id = ba.id
LEFT JOIN bank_withdrawals bw_in ON bw_in.to_account_id = ba.id
GROUP BY ba.id, ba.account_name, ba.bank_name, ba.account_number, ba.currency,
         ba.opening_balance, ba.opening_date, ba.status;

DO $$
BEGIN
  RAISE NOTICE 'Bank account integration schema created successfully';
END $$;
