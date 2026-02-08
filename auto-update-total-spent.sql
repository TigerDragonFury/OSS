-- Auto-Update Total Spent Trigger
-- Run this in Supabase SQL Editor to automatically update total_spent whenever expenses change

-- Function to recalculate total_spent for a project
CREATE OR REPLACE FUNCTION update_project_total_spent()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT and UPDATE cases
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    UPDATE vessel_overhaul_projects
    SET total_spent = COALESCE((
      SELECT SUM(amount)
      FROM expenses
      WHERE project_id = NEW.project_id
        AND project_type IN ('vessel', 'overhaul')
    ), 0),
    updated_at = NOW()
    WHERE id = NEW.project_id;
    
    RETURN NEW;
  
  -- Handle DELETE case
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE vessel_overhaul_projects
    SET total_spent = COALESCE((
      SELECT SUM(amount)
      FROM expenses
      WHERE project_id = OLD.project_id
        AND project_type IN ('vessel', 'overhaul')
    ), 0),
    updated_at = NOW()
    WHERE id = OLD.project_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_project_total_spent ON expenses;

-- Create trigger that fires after INSERT, UPDATE, or DELETE on expenses
CREATE TRIGGER trigger_update_project_total_spent
AFTER INSERT OR UPDATE OR DELETE ON expenses
FOR EACH ROW
EXECUTE FUNCTION update_project_total_spent();

-- Test: Show current state of projects
SELECT 
  vop.project_name,
  vop.total_budget as budget,
  vop.total_spent as current_total_spent,
  COALESCE((
    SELECT SUM(e.amount)
    FROM expenses e
    WHERE e.project_id = vop.id
      AND e.project_type IN ('vessel', 'overhaul')
  ), 0) as calculated_total_spent
FROM vessel_overhaul_projects vop
ORDER BY vop.created_at DESC;
