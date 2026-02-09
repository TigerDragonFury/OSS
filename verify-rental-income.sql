-- Verify rental income calculation
-- This helps debug why rental income shows 53,880 instead of expected 10,766

-- 1. Show all rentals with their amounts, status, and payment status
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
ORDER BY created_at DESC;

-- 2. Calculate rental income by status
SELECT 
    status,
    payment_status,
    COUNT(*) as rental_count,
    SUM(total_amount) as total_amount
FROM vessel_rentals
GROUP BY status, payment_status
ORDER BY status, payment_status;

-- 3. Calculate the way the dashboard does it (active/completed + paid only)
SELECT 
    'Dashboard Calculation' as source,
    COUNT(*) as rental_count,
    SUM(total_amount) as total_income
FROM vessel_rentals
WHERE payment_status = 'paid'
AND status IN ('active', 'completed');

-- 4. Check if there are duplicate income_records created by trigger
SELECT 
    income_type,
    source_type,
    COUNT(*) as record_count,
    SUM(amount) as total_amount
FROM income_records
WHERE income_type = 'vessel_rental'
GROUP BY income_type, source_type;

-- 5. Show all vessel rental income records with their reference
SELECT 
    ir.id,
    ir.income_date,
    ir.amount,
    ir.reference_id,
    vr.vessel_id,
    vr.status,
    vr.payment_status,
    vr.total_amount as rental_total
FROM income_records ir
LEFT JOIN vessel_rentals vr ON ir.reference_id = vr.id
WHERE ir.income_type = 'vessel_rental'
ORDER BY ir.income_date DESC;

-- 6. Expected calculation - only count what should be counted
-- If you expect 10,766, check which rentals should be included:
SELECT 
    id,
    vessel_id,
    total_amount,
    status,
    payment_status,
    start_date,
    end_date
FROM vessel_rentals
WHERE total_amount IS NOT NULL
ORDER BY total_amount DESC;
