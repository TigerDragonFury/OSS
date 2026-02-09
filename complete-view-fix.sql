-- COMPREHENSIVE FIX for vessel_financial_summary VIEW
-- This addresses the 53,880 vs 10,766 rental income discrepancy

-- Step 1: Check current VIEW definition
SELECT pg_get_viewdef('vessel_financial_summary', true);

-- Step 2: Check what columns the VIEW currently has
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vessel_financial_summary'
ORDER BY ordinal_position;

-- Step 3: SKIPPED - VIEW may already be updated with new column names
-- If you want to see current data, uncomment and adjust column names as needed:
/*
SELECT 
    id,
    name,
    purchase_price,
    movement_costs,
    total_equipment_sales,  -- Use new column name
    total_scrap_sales,      -- Use new column name
    total_rental_income,
    drydock_costs,
    overhaul_costs,
    other_expenses,
    net_profit_loss
FROM vessel_financial_summary
WHERE id = '2721c7b2-c715-4f0a-9369-bcf0e4816e2b';
*/

-- Step 4: Check actual rental data for this vessel
SELECT 
    id,
    total_amount,
    status,
    payment_status,
    start_date,
    end_date
FROM vessel_rentals
WHERE vessel_id = '2721c7b2-c715-4f0a-9369-bcf0e4816e2b'
ORDER BY start_date DESC;

-- Step 5: Calculate what rental income SHOULD be (active/completed + paid only)
SELECT 
    'Expected Rental Income' as calculation,
    COUNT(*) as rental_count,
    SUM(total_amount) as total
FROM vessel_rentals
WHERE vessel_id = '2721c7b2-c715-4f0a-9369-bcf0e4816e2b'
AND payment_status = 'paid'
AND status IN ('active', 'completed');

-- Step 6: Calculate what VIEW is currently showing (might be summing ALL rentals)
SELECT 
    'Current VIEW Calculation' as calculation,
    COUNT(*) as rental_count,
    SUM(total_amount) as total
FROM vessel_rentals
WHERE vessel_id = '2721c7b2-c715-4f0a-9369-bcf0e4816e2b';

-- Step 7: DROP and RECREATE the VIEW with correct logic AND correct column names
-- CRITICAL FIX: Prevent duplicate row counting from JOINs by using DISTINCT or subqueries
DROP VIEW IF EXISTS vessel_financial_summary CASCADE;

CREATE OR REPLACE VIEW vessel_financial_summary AS
SELECT 
    v.id,
    v.name,
    v.purchase_price,
    COALESCE(movements.total_cost, 0) as movement_costs,
    COALESCE(equipment.total_sales, 0) as total_equipment_sales,
    COALESCE(scrap.total_sales, 0) as total_scrap_sales,
    COALESCE(rentals.total_income, 0) as total_rental_income,
    COALESCE(drydock.total_cost, 0) as drydock_costs,
    COALESCE(overhauls.total_cost, 0) as overhaul_costs,
    COALESCE(expenses.total_amount, 0) as other_expenses,
    COALESCE(expenses.total_amount, 0) as total_expenses,
    COALESCE(overhauls.total_cost, 0) as total_overhaul_expenses,
    (COALESCE(equipment.total_sales, 0) + 
     COALESCE(scrap.total_sales, 0) + 
     COALESCE(rentals.total_income, 0)) - 
    (v.purchase_price + 
     COALESCE(movements.total_cost, 0) + 
     COALESCE(drydock.total_cost, 0) + 
     COALESCE(overhauls.total_cost, 0) + 
     COALESCE(expenses.total_amount, 0)) as net_profit_loss
FROM vessels v
LEFT JOIN (
    SELECT vessel_id, SUM(cost) as total_cost
    FROM vessel_movements
    GROUP BY vessel_id
) movements ON v.id = movements.vessel_id
LEFT JOIN (
    SELECT vessel_id, SUM(sale_price) as total_sales
    FROM vessel_equipment_sales
    GROUP BY vessel_id
) equipment ON v.id = equipment.vessel_id
LEFT JOIN (
    SELECT vessel_id, SUM(total_amount) as total_sales
    FROM vessel_scrap_sales
    GROUP BY vessel_id
) scrap ON v.id = scrap.vessel_id
LEFT JOIN (
    SELECT vessel_id, 
           SUM(CASE 
               WHEN payment_status = 'paid' AND status IN ('active', 'completed') 
               THEN total_amount 
               ELSE 0 
           END) as total_income
    FROM vessel_rentals
    GROUP BY vessel_id
) rentals ON v.id = rentals.vessel_id
LEFT JOIN (
    SELECT vessel_id, SUM(total_cost) as total_cost
    FROM drydock_records
    GROUP BY vessel_id
) drydock ON v.id = drydock.vessel_id
LEFT JOIN (
    SELECT vop.vessel_id, SUM(ot.actual_cost) as total_cost
    FROM vessel_overhaul_projects vop
    LEFT JOIN overhaul_tasks ot ON vop.id = ot.project_id
    GROUP BY vop.vessel_id
) overhauls ON v.id = overhauls.vessel_id
LEFT JOIN (
    SELECT project_id, SUM(amount) as total_amount
    FROM expenses
    WHERE project_type = 'vessel'
    GROUP BY project_id
) expenses ON v.id = expenses.project_id;

-- Step 8: Verify the fix worked
SELECT 
    id,
    name,
    total_equipment_sales,
    total_scrap_sales,
    total_rental_income,
    total_expenses,
    total_overhaul_expenses,
    net_profit_loss
FROM vessel_financial_summary
WHERE id = '2721c7b2-c715-4f0a-9369-bcf0e4816e2b';

-- Step 9: Compare before and after
SELECT 
    'After VIEW Update' as source,
    total_rental_income
FROM vessel_financial_summary
WHERE id = '2721c7b2-c715-4f0a-9369-bcf0e4816e2b';
