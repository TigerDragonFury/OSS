-- Migrate expense tracking from informal_contributions to expenses.paid_by_owner_id
-- This consolidates expense tracking into one place to prevent confusion

-- First, let's see what we have
SELECT 'Expenses with paid_by_owner_id' as source, COUNT(*) as count, SUM(amount) as total
FROM expenses 
WHERE paid_by_owner_id IS NOT NULL

UNION ALL

SELECT 'Informal contributions (expense_payment)' as source, COUNT(*) as count, SUM(amount) as total
FROM informal_contributions 
WHERE transaction_type = 'expense_payment';

-- Now update expenses to have paid_by_owner_id based on informal_contributions
-- Match by owner_id, date, and amount
UPDATE expenses e
SET paid_by_owner_id = ic.owner_id,
    updated_at = NOW()
FROM informal_contributions ic
WHERE ic.transaction_type = 'expense_payment'
  AND e.paid_by_owner_id IS NULL
  AND ic.owner_id IS NOT NULL
  AND ABS(e.amount - ic.amount) < 0.01  -- Match amounts (within 1 cent for floating point)
  AND DATE(e.date) = DATE(ic.contribution_date);  -- Match dates

-- Show what was updated
SELECT 
    owner_id,
    COUNT(*) as expenses_updated,
    SUM(amount) as total_amount
FROM expenses
WHERE paid_by_owner_id IS NOT NULL
  AND updated_at > NOW() - INTERVAL '5 minutes'
GROUP BY owner_id;

-- Now delete the informal_contributions entries for expense_payment since they're tracked in expenses now
-- DELETE FROM informal_contributions 
-- WHERE transaction_type = 'expense_payment';

-- Uncomment the DELETE line above after verifying the migration worked correctly

-- Verify the fix
SELECT 
    owner_name,
    vessels_paid,
    expenses_paid,
    lands_paid,
    direct_payments,
    informal_contributions,
    net_account_balance
FROM owner_account_statement
ORDER BY owner_name;
