-- Sync Expenses for Completed Work
-- Run this in Supabase SQL Editor to create expenses for all completed overhaul tasks that don't have one yet

-- Insert expenses for all completed tasks that don't have a corresponding expense
INSERT INTO expenses (
  project_id,
  project_type,
  date,
  category,
  description,
  amount,
  vendor_name,
  status,
  created_at
)
SELECT 
  ot.project_id,
  'vessel' as project_type,
  COALESCE(ot.end_date, ot.updated_at::date, CURRENT_DATE) as date,
  COALESCE(ot.repair_type, 'maintenance') as category,
  CONCAT(
    REPLACE(ot.component_type, '_', ' '),
    ' - ',
    ot.task_name,
    CASE 
      WHEN ot.actual_cost IS NOT NULL THEN ' (Completed)'
      ELSE ' (Auto-generated)'
    END
  ) as description,
  COALESCE(ot.actual_cost, ot.estimated_cost, 0) as amount,
  ot.contractor_name as vendor_name,
  'paid' as status,
  COALESCE(ot.updated_at, ot.created_at, NOW()) as created_at
FROM overhaul_tasks ot
WHERE ot.status = 'completed'
  AND COALESCE(ot.actual_cost, ot.estimated_cost) > 0
  AND NOT EXISTS (
    -- Check if expense already exists with matching description
    SELECT 1 
    FROM expenses e 
    WHERE e.project_id = ot.project_id
      AND e.description LIKE CONCAT('%', ot.task_name, '%')
  );

-- Show results
SELECT 
  COUNT(*) as expenses_created,
  SUM(amount) as total_amount
FROM expenses 
WHERE description LIKE '%(Completed)%' OR description LIKE '%(Auto-generated)%';
