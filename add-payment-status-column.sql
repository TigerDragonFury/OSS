-- Add payment_status column to vessel_rentals table
-- This aligns auth-schema.sql with supabase-schema.sql

ALTER TABLE vessel_rentals 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) 
CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue'))
DEFAULT 'pending';

-- Update existing records to have a payment_status based on deposit_paid
UPDATE vessel_rentals
SET payment_status = CASE 
  WHEN deposit_paid = true AND status = 'completed' THEN 'paid'
  WHEN deposit_paid = true THEN 'partial'
  ELSE 'pending'
END
WHERE payment_status IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN vessel_rentals.payment_status IS 'Payment status: pending (not paid), partial (deposit paid), paid (fully paid), overdue (past due date)';
