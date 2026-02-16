-- Bank Account Management & Reconciliation Schema
-- Tracks bank accounts and enables balance reconciliation

-- Create bank accounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50) UNIQUE,
    bank_name VARCHAR(255),
    account_type VARCHAR(50) CHECK (account_type IN ('checking', 'savings', 'business', 'other')) DEFAULT 'business',
    currency VARCHAR(10) DEFAULT 'AED',
    opening_balance DECIMAL(15, 2) DEFAULT 0,
    opening_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) CHECK (status IN ('active', 'inactive', 'closed')) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Update income_records to link to bank account
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'income_records' AND column_name = 'bank_account_id'
    ) THEN
        ALTER TABLE income_records ADD COLUMN bank_account_id UUID REFERENCES bank_accounts(id);
        RAISE NOTICE 'Added bank_account_id to income_records';
    END IF;
END $$;

-- Update expenses to link to bank account
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'bank_account_id'
    ) THEN
        ALTER TABLE expenses ADD COLUMN bank_account_id UUID REFERENCES bank_accounts(id);
        RAISE NOTICE 'Added bank_account_id to expenses';
    END IF;
END $$;

-- Create manual balance records for reconciliation
CREATE TABLE IF NOT EXISTS bank_balance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE NOT NULL,
    recorded_date DATE NOT NULL,
    manual_balance DECIMAL(15, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(bank_account_id, recorded_date)
);

-- Create view for account balance reconciliation
CREATE OR REPLACE VIEW bank_account_reconciliation AS
SELECT 
    ba.id as account_id,
    ba.account_name,
    ba.bank_name,
    ba.account_number,
    ba.currency,
    ba.opening_balance,
    ba.opening_date,
    ba.status,
    -- Calculate total income to this account (from opening date)
    COALESCE(SUM(CASE 
        WHEN ir.bank_account_id = ba.id AND ir.income_date >= ba.opening_date
        THEN ir.amount 
        ELSE 0 
    END), 0) as total_income,
    -- Calculate total expenses from this account (from opening date)
    COALESCE(SUM(CASE 
        WHEN e.bank_account_id = ba.id AND e.date >= ba.opening_date
        THEN e.amount 
        ELSE 0 
    END), 0) as total_expenses,
    -- Calculated balance = opening balance + income - expenses
    (ba.opening_balance + 
     COALESCE(SUM(CASE 
        WHEN ir.bank_account_id = ba.id AND ir.income_date >= ba.opening_date
        THEN ir.amount 
        ELSE 0 
     END), 0) - 
     COALESCE(SUM(CASE 
        WHEN e.bank_account_id = ba.id AND e.date >= ba.opening_date
        THEN e.amount 
        ELSE 0 
     END), 0)) as calculated_balance,
    -- Latest manual balance record
    (SELECT manual_balance FROM bank_balance_records 
     WHERE bank_account_id = ba.id 
     ORDER BY recorded_date DESC LIMIT 1) as latest_manual_balance,
    (SELECT recorded_date FROM bank_balance_records 
     WHERE bank_account_id = ba.id 
     ORDER BY recorded_date DESC LIMIT 1) as last_reconciled_date,
    -- Variance (difference between calculated and manual)
    ((ba.opening_balance + 
     COALESCE(SUM(CASE 
        WHEN ir.bank_account_id = ba.id AND ir.income_date >= ba.opening_date
        THEN ir.amount 
        ELSE 0 
     END), 0) - 
     COALESCE(SUM(CASE 
        WHEN e.bank_account_id = ba.id AND e.date >= ba.opening_date
        THEN e.amount 
        ELSE 0 
     END), 0)) - 
     COALESCE((SELECT manual_balance FROM bank_balance_records 
     WHERE bank_account_id = ba.id 
     ORDER BY recorded_date DESC LIMIT 1), 0)) as variance
FROM bank_accounts ba
LEFT JOIN income_records ir ON ir.bank_account_id = ba.id
LEFT JOIN expenses e ON e.bank_account_id = ba.id
GROUP BY ba.id, ba.account_name, ba.bank_name, ba.account_number, ba.currency,
         ba.opening_balance, ba.opening_date, ba.status;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bank_accounts_status ON bank_accounts(status);
CREATE INDEX IF NOT EXISTS idx_bank_balance_records_account ON bank_balance_records(bank_account_id, recorded_date);
CREATE INDEX IF NOT EXISTS idx_income_records_bank ON income_records(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_expenses_bank ON expenses(bank_account_id);

-- Insert default bank account(s)
INSERT INTO bank_accounts (account_name, bank_name, account_type, opening_balance, account_number)
VALUES 
    ('Main Operating Account', 'Emirates NBD', 'business', 0, 'ACC-001'),
    ('Cash Reserve', 'Petty Cash', 'checking', 0, 'CASH-001')
ON CONFLICT (account_number) DO NOTHING;

RAISE NOTICE 'Bank accounts schema created successfully';
