-- COMPREHENSIVE FIX for vessel_financial_summary VIEW
-- This addresses the 53,880 vs 10,766 rental income discrepancy

-- Step 1: Check current VIEW definition
SELECT pg_get_viewdef('vessel_financial_summary', true);

-- Step 2: Check what columns the VIEW currently has
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vessel_financial_summary'
ORDER BY ordinal_position;

-- Step 3: See what the VIEW is currently returning for your vessel
SELECT 
    id,
    name,
    purchase_price,
    total_rental_income,
    movement_costs,
    equipment_sales,
    scrap_sales,
    drydock_costs,
    overhaul_costs,
    other_expenses,
    net_profit_loss
FROM vessel_financial_summary
WHERE id = '2721c7b2-c715-4f0a-9369-bcf0e4816e2b';

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
DROP VIEW IF EXISTS vessel_financial_summary CASCADE;

CREATE OR REPLACE VIEW vessel_financial_summary AS
SELECT 
    v.id,
    v.name,
    v.purchase_price,
    COALESCE(SUM(vm.cost), 0) as movement_costs,
    COALESCE(SUM(ves.sale_price), 0) as total_equipment_sales,  -- FIXED: was equipment_sales
    COALESCE(SUM(vss.total_amount), 0) as total_scrap_sales,    -- FIXED: was scrap_sales
    -- CRITICAL FIX: Only sum rentals that are paid AND (active OR completed)
    COALESCE(SUM(CASE 
        WHEN vr.payment_status = 'paid' AND vr.status IN ('active', 'completed') 
        THEN vr.total_amount 
        ELSE 0 
    END), 0) as total_rental_income,
    COALESCE(SUM(dr.total_cost), 0) as drydock_costs,
    COALESCE(SUM(ot.actual_cost), 0) as overhaul_costs,
    COALESCE(SUM(e.amount), 0) as other_expenses,
    COALESCE(SUM(e.amount), 0) as total_expenses,               -- ADDED: TypeScript expects this
    COALESCE(SUM(ot.actual_cost), 0) as total_overhaul_expenses, -- ADDED: TypeScript expects this
    (COALESCE(SUM(ves.sale_price), 0) + 
     COALESCE(SUM(vss.total_amount), 0) + 
     COALESCE(SUM(CASE 
        WHEN vr.payment_status = 'paid' AND vr.status IN ('active', 'completed') 
        THEN vr.total_amount 
        ELSE 0 
     END), 0)) - 
    (v.purchase_price + 
     COALESCE(SUM(vm.cost), 0) + 
     COALESCE(SUM(dr.total_cost), 0) + 
     COALESCE(SUM(ot.actual_cost), 0) + 
     COALESCE(SUM(e.amount), 0)) as net_profit_loss
FROM vessels v
LEFT JOIN vessel_movements vm ON v.id = vm.vessel_id
LEFT JOIN vessel_equipment_sales ves ON v.id = ves.vessel_id
LEFT JOIN vessel_scrap_sales vss ON v.id = vss.vessel_id
LEFT JOIN vessel_rentals vr ON v.id = vr.vessel_id
LEFT JOIN drydock_records dr ON v.id = dr.vessel_id
LEFT JOIN vessel_overhaul_projects vop ON v.id = vop.vessel_id
LEFT JOIN overhaul_tasks ot ON vop.id = ot.project_id
LEFT JOIN expenses e ON v.id = e.project_id AND e.project_type = 'vessel'
GROUP BY v.id, v.name, v.purchase_price;

-- Step 8: Verify the fix worked
SELECT 
    id,
    name,
    total_rental_income,
    equipment_sales,
    scrap_sales,
    net_profit_loss
FROM vessel_financial_summary
WHERE id = '2721c7b2-c715-4f0a-9369-bcf0e4816e2b';

-- Step 9: Compare before and after
SELECT 
    'After VIEW Update' as source,
    total_rental_income
FROM vessel_financial_summary
WHERE id = '2721c7b2-c715-4f0a-9369-bcf0e4816e2b';
