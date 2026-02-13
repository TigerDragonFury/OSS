-- ============================================================================
-- UPDATE SOURCE OF FUNDS FROM PERSONAL SAVINGS TO SCRAP PROFIT
-- Owner ID: 6fb38926-4c73-435d-bc85-ed3e78259dc9
-- ============================================================================

-- Step 1: Check which owner this is
SELECT 
    id,
    name,
    email,
    ownership_percentage
FROM owners
WHERE id = '6fb38926-4c73-435d-bc85-ed3e78259dc9';

-- ============================================================================
-- Step 2: Show current payment_splits with personal_savings
-- ============================================================================
SELECT 
    ps.id,
    ps.expense_id,
    e.description as expense_description,
    e.date as expense_date,
    ps.amount_paid,
    ps.source_of_funds as current_source,
    ps.payment_date
FROM payment_splits ps
LEFT JOIN expenses e ON e.id = ps.expense_id
WHERE ps.owner_id = '6fb38926-4c73-435d-bc85-ed3e78259dc9'
  AND ps.source_of_funds = 'personal_savings'
ORDER BY ps.payment_date DESC;

-- Step 3: Count and total for payment_splits
SELECT 
    'Payment Splits (personal_savings)' as type,
    COUNT(*) as record_count,
    SUM(amount_paid) as total_amount
FROM payment_splits
WHERE owner_id = '6fb38926-4c73-435d-bc85-ed3e78259dc9'
  AND source_of_funds = 'personal_savings';

-- ============================================================================
-- Step 4: Show current informal_contributions with personal_savings
-- ============================================================================
SELECT 
    ic.id,
    ic.transaction_id,
    ic.contribution_date,
    ic.amount,
    ic.source_of_funds as current_source,
    ic.transaction_type,
    ic.description
FROM informal_contributions ic
WHERE ic.owner_id = '6fb38926-4c73-435d-bc85-ed3e78259dc9'
  AND ic.source_of_funds = 'personal_savings'
ORDER BY ic.contribution_date DESC;

-- Step 5: Count and total for informal_contributions
SELECT 
    'Informal Contributions (personal_savings)' as type,
    COUNT(*) as record_count,
    SUM(amount) as total_amount
FROM informal_contributions
WHERE owner_id = '6fb38926-4c73-435d-bc85-ed3e78259dc9'
  AND source_of_funds = 'personal_savings';

-- ============================================================================
-- Step 6: UPDATE PAYMENT_SPLITS (MAIN UPDATE)
-- ============================================================================
-- Change all personal_savings to scrap_profit for this owner
UPDATE payment_splits
SET source_of_funds = 'scrap_profit'
WHERE owner_id = '6fb38926-4c73-435d-bc85-ed3e78259dc9'
  AND source_of_funds = 'personal_savings';

-- ============================================================================
-- Step 7: UPDATE INFORMAL_CONTRIBUTIONS (MAIN UPDATE)
-- ============================================================================
-- Change all personal_savings to scrap_profit for this owner
UPDATE informal_contributions
SET source_of_funds = 'scrap_profit'
WHERE owner_id = '6fb38926-4c73-435d-bc85-ed3e78259dc9'
  AND source_of_funds = 'personal_savings';

-- ============================================================================
-- Step 8: VERIFICATION - Show updated payment_splits
-- ============================================================================
SELECT 
    ps.id,
    ps.expense_id,
    e.description as expense_description,
    ps.amount_paid,
    ps.source_of_funds as new_source,
    ps.payment_date
FROM payment_splits ps
LEFT JOIN expenses e ON e.id = ps.expense_id
WHERE ps.owner_id = '6fb38926-4c73-435d-bc85-ed3e78259dc9'
  AND ps.source_of_funds = 'scrap_profit'
ORDER BY ps.payment_date DESC;

-- Step 9: Count and total after update (payment_splits)
SELECT 
    'After Update - Payment Splits (scrap_profit)' as type,
    COUNT(*) as record_count,
    SUM(amount_paid) as total_amount
FROM payment_splits
WHERE owner_id = '6fb38926-4c73-435d-bc85-ed3e78259dc9'
  AND source_of_funds = 'scrap_profit';

-- ============================================================================
-- Step 10: VERIFICATION - Show updated informal_contributions
-- ============================================================================
SELECT 
    ic.id,
    ic.transaction_id,
    ic.contribution_date,
    ic.amount,
    ic.source_of_funds as new_source,
    ic.transaction_type,
    ic.description
FROM informal_contributions ic
WHERE ic.owner_id = '6fb38926-4c73-435d-bc85-ed3e78259dc9'
  AND ic.source_of_funds = 'scrap_profit'
ORDER BY ic.contribution_date DESC;

-- Step 11: Count and total after update (informal_contributions)
SELECT 
    'After Update - Informal Contributions (scrap_profit)' as type,
    COUNT(*) as record_count,
    SUM(amount) as total_amount
FROM informal_contributions
WHERE owner_id = '6fb38926-4c73-435d-bc85-ed3e78259dc9'
  AND source_of_funds = 'scrap_profit';

-- ============================================================================
-- Step 12: Final Summary - Compare before and after
-- ============================================================================
SELECT 
    source_of_funds,
    COUNT(*) as payment_splits_count,
    SUM(amount_paid) as payment_splits_total
FROM payment_splits
WHERE owner_id = '6fb38926-4c73-435d-bc85-ed3e78259dc9'
GROUP BY source_of_funds
ORDER BY source_of_funds;

SELECT 
    source_of_funds,
    COUNT(*) as informal_contributions_count,
    SUM(amount) as informal_contributions_total
FROM informal_contributions
WHERE owner_id = '6fb38926-4c73-435d-bc85-ed3e78259dc9'
GROUP BY source_of_funds
ORDER BY source_of_funds;

-- ============================================================================
-- Step 13: Check owner equity impact
-- ============================================================================
SELECT 
    owner_name,
    equity_balance as "Traditional Equity",
    new_capital_contributed as "New Capital (Personal)",
    recycled_funds_used as "Recycled Funds (Company)",
    net_new_capital as "Net New Capital",
    equity_balance - net_new_capital as "Difference (Recycled Amount)"
FROM owner_account_statement
WHERE owner_id = '6fb38926-4c73-435d-bc85-ed3e78259dc9';

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- After running Steps 6 & 7 (UPDATE commands):
-- - All personal_savings records for this owner → scrap_profit
-- - Payment splits total should move from "new_capital" to "recycled_funds"
-- - Net New Capital will decrease (because scrap profit is recycled, not new)
-- - Traditional Equity stays the same (total money spent doesn't change)
-- ============================================================================

-- ============================================================================
-- ROLLBACK OPTION: Revert back to personal_savings (if needed)
-- ============================================================================
-- UNCOMMENT BELOW TO UNDO THE CHANGES:

/*
UPDATE payment_splits
SET source_of_funds = 'personal_savings'
WHERE owner_id = '6fb38926-4c73-435d-bc85-ed3e78259dc9'
  AND source_of_funds = 'scrap_profit';

UPDATE informal_contributions
SET source_of_funds = 'personal_savings'
WHERE owner_id = '6fb38926-4c73-435d-bc85-ed3e78259dc9'
  AND source_of_funds = 'scrap_profit';
*/
