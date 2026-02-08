-- Add payment_method column to expenses table and company_id to overhaul_tasks
-- Run this in Supabase SQL Editor

-- Add payment_method column to expenses if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'expenses' 
    AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE expenses ADD COLUMN payment_method VARCHAR(50);
    
    -- Set default value for existing records
    UPDATE expenses
    SET payment_method = 'bank_transfer'
    WHERE payment_method IS NULL;
    
    RAISE NOTICE 'Added payment_method column to expenses table';
  ELSE
    RAISE NOTICE 'payment_method column already exists in expenses table';
  END IF;
END $$;

-- Add company_id column to overhaul_tasks if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'overhaul_tasks' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE overhaul_tasks ADD COLUMN company_id UUID REFERENCES companies(id);
    RAISE NOTICE 'Added company_id column to overhaul_tasks table';
  ELSE
    RAISE NOTICE 'company_id column already exists in overhaul_tasks table';
  END IF;
END $$;

-- Show results
SELECT 
  'Expenses' as table_name,
  COUNT(*) as total_records,
  COUNT(payment_method) as with_payment_method
FROM expenses

UNION ALL

SELECT 
  'Overhaul Tasks' as table_name,
  COUNT(*) as total_records,
  COUNT(company_id) as with_company_id
FROM overhaul_tasks;
