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
    COALESCE(SUM(vm.cost), 0) as movement_costs,
    COALESCE(SUM(ves.sale_price), 0) as equipment_sales,
    COALESCE(SUM(vss.total_amount), 0) as scrap_sales,
    COALESCE(SUM(vr.total_amount), 0) as total_rental_income,
    COALESCE(SUM(dr.total_cost), 0) as drydock_costs,
    COALESCE(SUM(ot.actual_cost), 0) as overhaul_costs,
    COALESCE(SUM(e.amount), 0) as other_expenses,
    (COALESCE(SUM(ves.sale_price), 0) + COALESCE(SUM(vss.total_amount), 0) + COALESCE(SUM(vr.total_amount), 0)) - 
    (v.purchase_price + COALESCE(SUM(vm.cost), 0) + COALESCE(SUM(dr.total_cost), 0) + 
     COALESCE(SUM(ot.actual_cost), 0) + COALESCE(SUM(e.amount), 0)) as net_profit_loss
FROM vessels v
LEFT JOIN vessel_movements vm ON v.id = vm.vessel_id
LEFT JOIN vessel_equipment_sales ves ON v.id = ves.vessel_id
LEFT JOIN vessel_scrap_sales vss ON v.id = vss.vessel_id
LEFT JOIN vessel_rentals vr ON v.id = vr.vessel_id AND vr.total_amount IS NOT NULL
LEFT JOIN drydock_records dr ON v.id = dr.vessel_id
LEFT JOIN vessel_overhaul_projects vop ON v.id = vop.vessel_id
LEFT JOIN overhaul_tasks ot ON vop.id = ot.project_id
LEFT JOIN expenses e ON v.id = e.project_id AND e.project_type = 'vessel'
GROUP BY v.id, v.name, v.purchase_price;

-- After running the above, test it with:
-- SELECT id, name, total_rental_income FROM vessel_financial_summary WHERE id IN (SELECT DISTINCT vessel_id FROM vessel_rentals);

-- If still showing 0, check your rental data:
-- SELECT vessel_id, COUNT(*) as rental_count, SUM(total_amount) as total_income FROM vessel_rentals GROUP BY vessel_id;
