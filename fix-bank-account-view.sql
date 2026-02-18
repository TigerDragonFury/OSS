-- FIX: Bank Account Reconciliation View - Prevent Cartesian Product
-- This fixes the critical bug where LEFT JOINs were multiplying amounts

DROP VIEW IF EXISTS bank_account_reconciliation CASCADE;

CREATE VIEW bank_account_reconciliation AS
SELECT 
    ba.id as account_id,
    ba.account_name,
    ba.bank_name,
    ba.account_number,
    ba.currency,
    ba.opening_balance,
    ba.opening_date,
    ba.status,
    
    -- Calculate total income to this account (using subquery to prevent Cartesian product)
    COALESCE((
        SELECT SUM(ir.amount)
        FROM income_records ir
        WHERE ir.bank_account_id = ba.id 
          AND ir.income_date >= ba.opening_date
    ), 0) as total_income,
    
    -- Calculate total expenses from this account (using subquery)
    COALESCE((
        SELECT SUM(e.amount)
        FROM expenses e
        WHERE e.bank_account_id = ba.id 
          AND e.date >= ba.opening_date
    ), 0) as total_expenses,
    
    -- Calculate total withdrawals from this account (using subquery)
    COALESCE((
        SELECT SUM(bw.amount)
        FROM bank_withdrawals bw
        WHERE bw.from_account_id = ba.id 
          AND bw.withdrawal_date >= ba.opening_date
    ), 0) as total_withdrawals,
    
    -- Calculate total transfers received by this account (using subquery)
    COALESCE((
        SELECT SUM(bw.amount)
        FROM bank_withdrawals bw
        WHERE bw.to_account_id = ba.id 
          AND bw.withdrawal_date >= ba.opening_date
    ), 0) as total_transfers_in,
    
    -- Calculated balance = opening balance + income + transfers_in - expenses - withdrawals
    (ba.opening_balance + 
     COALESCE((SELECT SUM(ir.amount) FROM income_records ir 
               WHERE ir.bank_account_id = ba.id AND ir.income_date >= ba.opening_date), 0) +
     COALESCE((SELECT SUM(bw.amount) FROM bank_withdrawals bw 
               WHERE bw.to_account_id = ba.id AND bw.withdrawal_date >= ba.opening_date), 0) -
     COALESCE((SELECT SUM(e.amount) FROM expenses e 
               WHERE e.bank_account_id = ba.id AND e.date >= ba.opening_date), 0) -
     COALESCE((SELECT SUM(bw.amount) FROM bank_withdrawals bw 
               WHERE bw.from_account_id = ba.id AND bw.withdrawal_date >= ba.opening_date), 0)
    ) as calculated_balance,
    
    -- Latest manual balance record
    (SELECT manual_balance 
     FROM bank_balance_records 
     WHERE bank_account_id = ba.id 
     ORDER BY recorded_date DESC 
     LIMIT 1) as latest_manual_balance,
     
    (SELECT recorded_date 
     FROM bank_balance_records 
     WHERE bank_account_id = ba.id 
     ORDER BY recorded_date DESC 
     LIMIT 1) as last_reconciled_date,
    
    -- Variance between calculated and manual balance
    ((ba.opening_balance + 
     COALESCE((SELECT SUM(ir.amount) FROM income_records ir 
               WHERE ir.bank_account_id = ba.id AND ir.income_date >= ba.opening_date), 0) +
     COALESCE((SELECT SUM(bw.amount) FROM bank_withdrawals bw 
               WHERE bw.to_account_id = ba.id AND bw.withdrawal_date >= ba.opening_date), 0) -
     COALESCE((SELECT SUM(e.amount) FROM expenses e 
               WHERE e.bank_account_id = ba.id AND e.date >= ba.opening_date), 0) -
     COALESCE((SELECT SUM(bw.amount) FROM bank_withdrawals bw 
               WHERE bw.from_account_id = ba.id AND bw.withdrawal_date >= ba.opening_date), 0)
    ) - 
     COALESCE((SELECT manual_balance FROM bank_balance_records 
               WHERE bank_account_id = ba.id 
               ORDER BY recorded_date DESC LIMIT 1), 0)
    ) as variance
    
FROM bank_accounts ba
WHERE ba.status = 'active';

-- Verify the fix by showing current balances
SELECT 
    account_name,
    opening_balance,
    total_income,
    total_expenses,
    total_withdrawals,
    total_transfers_in,
    calculated_balance
FROM bank_account_reconciliation
ORDER BY account_name;

-- Show details for petty cash specifically
SELECT 
    account_name,
    'Opening' as source,
    opening_balance as amount
FROM bank_account_reconciliation
WHERE account_name LIKE '%Petty%'

UNION ALL

SELECT 
    ba.account_name,
    'Transfer IN: ' || bw.description as source,
    bw.amount
FROM bank_withdrawals bw
JOIN bank_accounts ba ON ba.id = bw.to_account_id
WHERE ba.account_name LIKE '%Petty%'

UNION ALL

SELECT 
    ba.account_name,
    'Expense: ' || e.description as source,
    -e.amount
FROM expenses e
JOIN bank_accounts ba ON ba.id = e.bank_account_id
WHERE ba.account_name LIKE '%Petty%'

ORDER BY source;
