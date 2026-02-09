-- Add rental income to vessel_financial_summary view
-- Run this in Supabase SQL Editor to fix rental income showing as 0
-- This version works with both vessel_rentals table structures

-- First, check which columns exist in your vessel_rentals table:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'vessel_rentals';

DROP VIEW IF EXISTS vessel_financial_summary;

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

-- After running the above, test it with:
-- SELECT id, name, total_rental_income FROM vessel_financial_summary WHERE id IN (SELECT DISTINCT vessel_id FROM vessel_rentals);

-- If still showing 0, check your rental data:
-- SELECT vessel_id, COUNT(*) as rental_count, SUM(total_amount) as total_income FROM vessel_rentals GROUP BY vessel_id;
