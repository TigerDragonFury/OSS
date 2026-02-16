-- Remove owner equity and partner tracking
-- Run after other schemas if you want to fully drop owner/partner tracking

-- Drop views first
DROP VIEW IF EXISTS owner_equity_summary;
DROP VIEW IF EXISTS owner_account_statement;

-- Drop helper functions if present
DROP FUNCTION IF EXISTS get_vessel_payments(UUID);
DROP FUNCTION IF EXISTS get_expense_payments(UUID);
DROP FUNCTION IF EXISTS get_overhaul_project_payments(UUID);
DROP FUNCTION IF EXISTS get_owner_transaction_history(UUID);

-- Remove legacy paid_by_owner_id columns (drops FK constraints to owners)
ALTER TABLE IF EXISTS vessels DROP COLUMN IF EXISTS paid_by_owner_id;
ALTER TABLE IF EXISTS expenses DROP COLUMN IF EXISTS paid_by_owner_id;
ALTER TABLE IF EXISTS salary_payments DROP COLUMN IF EXISTS paid_by_owner_id;
ALTER TABLE IF EXISTS vessel_movements DROP COLUMN IF EXISTS paid_by_owner_id;
ALTER TABLE IF EXISTS land_purchases DROP COLUMN IF EXISTS paid_by_owner_id;
ALTER TABLE IF EXISTS vessel_overhaul_projects DROP COLUMN IF EXISTS paid_by_owner_id;

-- Drop owner/partner tables
DROP TABLE IF EXISTS payment_splits;
DROP TABLE IF EXISTS owner_distributions;
DROP TABLE IF EXISTS partner_transfers;
DROP TABLE IF EXISTS informal_contributions;
DROP TABLE IF EXISTS capital_contributions;
DROP TABLE IF EXISTS capital_withdrawals;
DROP TABLE IF EXISTS owners;
