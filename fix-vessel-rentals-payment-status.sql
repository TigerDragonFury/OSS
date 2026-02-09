-- Fix vessel_rentals table to add payment_status column if missing
-- This fixes rental income showing as 0

-- 1. Check if payment_status column exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'vessel_rentals' 
        AND column_name = 'payment_status'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE vessel_rentals 
        ADD COLUMN payment_status VARCHAR(50) 
        CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue'))
        DEFAULT 'pending';
        
        RAISE NOTICE 'Added payment_status column to vessel_rentals';
    ELSE
        RAISE NOTICE 'payment_status column already exists';
    END IF;
END $$;

-- 2. Update existing rentals to set payment_status based on their status
-- If deposit_paid exists, use it; otherwise use status
UPDATE vessel_rentals
SET payment_status = CASE
    -- If they have deposit_paid column and it's true, mark as paid
    WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vessel_rentals' AND column_name = 'deposit_paid'
    ) AND deposit_paid = true THEN 'paid'
    
    -- If status is 'completed', assume paid
    WHEN status = 'completed' THEN 'paid'
    
    -- If status is 'active', assume paid (they're actively using the vessel)
    WHEN status = 'active' THEN 'paid'
    
    -- Otherwise pending
    ELSE 'pending'
END
WHERE payment_status IS NULL OR payment_status = 'pending';

-- 3. Verify the fix
SELECT 
    'Verification Results' as check_type,
    COUNT(*) as total_rentals,
    COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_rentals,
    SUM(total_amount) FILTER (WHERE payment_status = 'paid') as total_paid_income
FROM vessel_rentals;

-- 4. Show the rentals with their payment status
SELECT 
    id,
    vessel_id,
    start_date,
    end_date,
    total_amount,
    status,
    payment_status,
    created_at
FROM vessel_rentals
ORDER BY created_at DESC
LIMIT 10;
