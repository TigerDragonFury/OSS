-- Add Bank Account Integration to Invoices Table
-- This enables tracking which bank account income/expense invoices are connected to

-- Add bank_account_id and payment_method columns to invoices
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'bank_account_id'
    ) THEN
        ALTER TABLE invoices ADD COLUMN bank_account_id UUID REFERENCES bank_accounts(id);
        RAISE NOTICE 'Added bank_account_id to invoices';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE invoices ADD COLUMN payment_method VARCHAR(50) DEFAULT 'bank_transfer';
        RAISE NOTICE 'Added payment_method to invoices';
    END IF;
END $$;

-- Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'invoices'
ORDER BY ordinal_position;
