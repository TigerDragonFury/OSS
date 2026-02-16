-- Find which table contains the UUID: e81b887b-b757-42ff-8d14-2f6ff2263baf
-- This query searches across all the main tables that use UUIDs

-- Check expenses
SELECT 'expenses' as table_name, id::text, company_id::text, project_id::text, project_type::text, amount::text, created_at::text
FROM expenses
WHERE id = 'e81b887b-b757-42ff-8d14-2f6ff2263baf'
   OR company_id = 'e81b887b-b757-42ff-8d14-2f6ff2263baf'
   OR project_id = 'e81b887b-b757-42ff-8d14-2f6ff2263baf'

UNION ALL

-- Check vessels
SELECT 'vessels' as table_name, id::text, name::text, null, null, null, created_at::text
FROM vessels
WHERE id = 'e81b887b-b757-42ff-8d14-2f6ff2263baf'

UNION ALL

-- Check land_equipment
SELECT 'land_equipment' as table_name, id::text, null, null, null, estimated_value::text, created_at::text
FROM land_equipment
WHERE id = 'e81b887b-b757-42ff-8d14-2f6ff2263baf'

UNION ALL

-- Check warehouse_sales
SELECT 'warehouse_sales' as table_name, id::text, warehouse_id::text, land_equipment_id::text, customer_company_id::text, sale_price::text, sale_date::text
FROM warehouse_sales
WHERE id = 'e81b887b-b757-42ff-8d14-2f6ff2263baf'
   OR warehouse_id = 'e81b887b-b757-42ff-8d14-2f6ff2263baf'
   OR land_equipment_id = 'e81b887b-b757-42ff-8d14-2f6ff2263baf'
   OR customer_company_id = 'e81b887b-b757-42ff-8d14-2f6ff2263baf';
