-- ============================================================================
-- SYNC PAYMENT SPLITS TO INFORMAL CONTRIBUTIONS (HISTORICAL DATA)
-- Run this to create missing informal_contributions for existing payment_splits
-- ============================================================================

-- Step 1: Check current state - how many payment_splits exist vs informal_contributions
SELECT 
    'Payment Splits Total' as source,
    COUNT(*) as record_count,
    SUM(amount_paid) as total_amount
FROM payment_splits
UNION ALL
SELECT 
    'Informal Contributions (expense_payment)' as source,
    COUNT(*) as record_count,
    SUM(amount) as total_amount
FROM informal_contributions
WHERE transaction_type = 'expense_payment'
ORDER BY source;

-- ============================================================================
-- Step 2: Find payment_splits that DON'T have matching informal_contributions
-- ============================================================================
SELECT 
    ps.id as split_id,
    ps.expense_id,
    o.name as owner_name,
    e.description as expense_description,
    ps.amount_paid,
    ps.payment_date,
    ps.source_of_funds,
    'MISSING informal_contribution' as status
FROM payment_splits ps
JOIN owners o ON o.id = ps.owner_id
LEFT JOIN expenses e ON e.id = ps.expense_id
WHERE NOT EXISTS (
    SELECT 1 
    FROM informal_contributions ic 
    WHERE ic.transaction_id = ps.expense_id 
      AND ic.owner_id = ps.owner_id
      AND ic.amount = ps.amount_paid
      AND ic.transaction_type = 'expense_payment'
)
ORDER BY ps.payment_date DESC;

-- ============================================================================
-- Step 3: Summary of missing records by owner
-- ============================================================================
SELECT 
    o.name as owner_name,
    COUNT(*) as missing_records,
    SUM(ps.amount_paid) as total_missing_amount
FROM payment_splits ps
JOIN owners o ON o.id = ps.owner_id
WHERE NOT EXISTS (
    SELECT 1 
    FROM informal_contributions ic 
    WHERE ic.transaction_id = ps.expense_id 
      AND ic.owner_id = ps.owner_id
      AND ic.amount = ps.amount_paid
      AND ic.transaction_type = 'expense_payment'
)
GROUP BY o.name
ORDER BY total_missing_amount DESC;

-- ============================================================================
-- Step 4: INSERT MISSING INFORMAL CONTRIBUTIONS (MAIN SYNC)
-- ============================================================================
-- This creates informal_contributions for all payment_splits that don't have them
INSERT INTO informal_contributions (
    owner_id,
    contribution_date,
    amount,
    transaction_type,
    transaction_id,
    source_of_funds,
    description
)
SELECT 
    ps.owner_id,
    COALESCE(ps.payment_date, e.date) as contribution_date,
    ps.amount_paid as amount,
    'expense_payment' as transaction_type,
    ps.expense_id as transaction_id,
    COALESCE(ps.source_of_funds, 'personal_savings') as source_of_funds,
    CONCAT('Payment split for: ', COALESCE(e.description, e.expense_type, 'expense')) as description
FROM payment_splits ps
LEFT JOIN expenses e ON e.id = ps.expense_id
WHERE ps.expense_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM informal_contributions ic 
    WHERE ic.transaction_id = ps.expense_id 
      AND ic.owner_id = ps.owner_id
      AND ic.amount = ps.amount_paid
      AND ic.transaction_type = 'expense_payment'
  );

-- ============================================================================
-- Step 5: Verification - Check the sync worked
-- ============================================================================
SELECT 
    'After Sync - Payment Splits' as source,
    COUNT(*) as record_count,
    SUM(amount_paid) as total_amount
FROM payment_splits
WHERE expense_id IS NOT NULL
UNION ALL
SELECT 
    'After Sync - Informal Contributions' as source,
    COUNT(*) as record_count,
    SUM(amount) as total_amount
FROM informal_contributions
WHERE transaction_type = 'expense_payment'
ORDER BY source;

-- ============================================================================
-- Step 6: Check for any remaining mismatches
-- ============================================================================
SELECT 
    CASE 
        WHEN ps.id IS NOT NULL AND ic.id IS NULL THEN 'Payment split WITHOUT informal contribution'
        WHEN ps.id IS NULL AND ic.id IS NOT NULL THEN 'Informal contribution WITHOUT payment split'
    END as mismatch_type,
    COUNT(*) as count
FROM payment_splits ps
FULL OUTER JOIN informal_contributions ic 
    ON ic.transaction_id = ps.expense_id 
    AND ic.owner_id = ps.owner_id
    AND ic.amount = ps.amount_paid
    AND ic.transaction_type = 'expense_payment'
WHERE (ps.id IS NULL AND ic.transaction_type = 'expense_payment')
   OR (ic.id IS NULL AND ps.expense_id IS NOT NULL)
GROUP BY mismatch_type;

-- ============================================================================
-- Step 7: Detailed comparison by owner (after sync)
-- ============================================================================
SELECT 
    o.name as owner_name,
    COALESCE(ps_sum.total_paid, 0) as payment_splits_total,
    COALESCE(ic_sum.total_contributed, 0) as informal_contributions_total,
    COALESCE(ps_sum.total_paid, 0) - COALESCE(ic_sum.total_contributed, 0) as difference,
    CASE 
        WHEN ABS(COALESCE(ps_sum.total_paid, 0) - COALESCE(ic_sum.total_contributed, 0)) < 0.01 THEN '✓ SYNCED'
        ELSE '✗ MISMATCH'
    END as sync_status
FROM owners o
LEFT JOIN (
    SELECT owner_id, SUM(amount_paid) as total_paid 
    FROM payment_splits 
    WHERE expense_id IS NOT NULL
    GROUP BY owner_id
) ps_sum ON o.id = ps_sum.owner_id
LEFT JOIN (
    SELECT owner_id, SUM(amount) as total_contributed 
    FROM informal_contributions 
    WHERE transaction_type = 'expense_payment'
    GROUP BY owner_id
) ic_sum ON o.id = ic_sum.owner_id
WHERE o.status = 'active'
ORDER BY o.name;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- After running Step 4 (INSERT), the verification queries should show:
-- - Payment splits count = Informal contributions count
-- - Payment splits total = Informal contributions total
-- - No remaining mismatches
-- - All owners show "✓ SYNCED" status
-- ============================================================================

-- ============================================================================
-- CLEANUP OPTION: Remove duplicate informal_contributions (if any exist)
-- ============================================================================
-- Only run this if you have duplicate informal_contributions for the same expense
-- UNCOMMENT BELOW TO EXECUTE:

/*
WITH duplicates AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY transaction_id, owner_id, amount, transaction_type
            ORDER BY created_at
        ) as rn
    FROM informal_contributions
    WHERE transaction_type = 'expense_payment'
)
DELETE FROM informal_contributions
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);
*/
