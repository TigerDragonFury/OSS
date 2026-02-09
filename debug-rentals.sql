-- Debug rental income showing as 0
-- Run these queries in Supabase SQL Editor to diagnose the issue

-- 1. Check if vessel_rentals table exists and has data
SELECT COUNT(*) as total_rentals FROM vessel_rentals;

-- 2. Check what columns exist in vessel_rentals
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vessel_rentals'
ORDER BY ordinal_position;

-- 3. Check all rentals with their payment status
SELECT 
  id,
  vessel_id,
  total_amount,
  payment_status,
  status,
  start_date,
  end_date
FROM vessel_rentals
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check sum by payment_status
SELECT 
  payment_status,
  COUNT(*) as count,
  SUM(total_amount) as total
FROM vessel_rentals
GROUP BY payment_status;

-- 5. Check if payment_status column exists (might be causing the issue)
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.columns 
  WHERE table_name = 'vessel_rentals' 
  AND column_name = 'payment_status'
) as payment_status_column_exists;

-- If payment_status doesn't exist, you need to add it:
-- ALTER TABLE vessel_rentals ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
-- UPDATE vessel_rentals SET payment_status = 'paid' WHERE status = 'active';
