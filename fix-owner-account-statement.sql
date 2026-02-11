-- Fix owner_account_statement to include legacy paid_by_owner_id amounts
-- Breakdown fields show only what's actually counted in direct_payments total
-- payment_splits_total added to see what's in payment_splits table
-- Partner transfers treated as equity adjustments: giving increases equity, receiving decreases equity
-- This helps balance partner accounts when one partner contributes more than the other
-- Uses subqueries to properly sum without DISTINCT issues

DROP VIEW IF EXISTS owner_account_statement;

CREATE VIEW owner_account_statement AS
SELECT 
    o.id as owner_id,
    o.name as owner_name,
    o.ownership_percentage,
    o.initial_capital,
    
    -- Formal contributions and withdrawals
    COALESCE(contrib.total, 0) as formal_contributions,
    COALESCE(withdraw.total, 0) as formal_withdrawals,
    
    -- Distributions taken (money taken out)
    COALESCE(distrib.total, 0) as distributions_taken,
    
    -- Informal contributions (spent personal money on company)
    COALESCE(informal.total, 0) as informal_contributions,
    
    -- Partner transfers
    COALESCE(xfer_in.total, 0) as transfers_received,
    COALESCE(xfer_out.total, 0) as transfers_given,
    
    -- Direct payments: payment_splits + legacy paid_by_owner_id
    COALESCE(pay_splits.total, 0) + 
    COALESCE(legacy_vessels.total, 0) +
    COALESCE(legacy_expenses.total, 0) +
    COALESCE(legacy_salaries.total, 0) +
    COALESCE(legacy_movements.total, 0) +
    COALESCE(legacy_lands.total, 0) as direct_payments,
    
    -- Breakdown of direct payments by category (only shows what's actually in direct_payments total)
    COALESCE(legacy_vessels.total, 0) as vessels_paid,
    COALESCE(informal_expenses.total, 0) as expenses_paid,
    COALESCE(legacy_salaries.total, 0) as salaries_paid,
    COALESCE(legacy_movements.total, 0) as movements_paid,
    COALESCE(legacy_lands.total, 0) as lands_paid,
    COALESCE(pay_splits.total, 0) as payment_splits_total,
    
    -- Calculate equity position (includes partner transfers - giving increases equity, receiving decreases equity)
    o.initial_capital + 
    COALESCE(contrib.total, 0) +
    COALESCE(informal.total, 0) +
    COALESCE(pay_splits.total, 0) +
    COALESCE(legacy_vessels.total, 0) +
    COALESCE(legacy_expenses.total, 0) +
    COALESCE(legacy_salaries.total, 0) +
    COALESCE(legacy_movements.total, 0) +
    COALESCE(legacy_lands.total, 0) -
    COALESCE(withdraw.total, 0) -
    COALESCE(distrib.total, 0) +
    COALESCE(xfer_out.total, 0) -
    COALESCE(xfer_in.total, 0) as equity_balance,
    
    -- Calculate net position (transfers_given increases balance, transfers_received decreases balance)
    o.initial_capital + 
    COALESCE(contrib.total, 0) +
    COALESCE(informal.total, 0) +
    COALESCE(pay_splits.total, 0) +
    COALESCE(legacy_vessels.total, 0) +
    COALESCE(legacy_expenses.total, 0) +
    COALESCE(legacy_salaries.total, 0) +
    COALESCE(legacy_movements.total, 0) +
    COALESCE(legacy_lands.total, 0) -
    COALESCE(withdraw.total, 0) -
    COALESCE(distrib.total, 0) +
    COALESCE(xfer_out.total, 0) -
    COALESCE(xfer_in.total, 0) as net_account_balance,
    
    -- Total money in (excludes transfers - transfers affect money out only)
    COALESCE(contrib.total, 0) + 
    COALESCE(informal.total, 0) + 
    COALESCE(pay_splits.total, 0) +
    COALESCE(legacy_vessels.total, 0) +
    COALESCE(legacy_expenses.total, 0) +
    COALESCE(legacy_salaries.total, 0) +
    COALESCE(legacy_movements.total, 0) +
    COALESCE(legacy_lands.total, 0) as total_money_in,
    
    -- Total money out (transfers_given reduces it, transfers_received increases it - for equity balancing)
    COALESCE(withdraw.total, 0) + 
    COALESCE(distrib.total, 0) -
    COALESCE(xfer_out.total, 0) +
    COALESCE(xfer_in.total, 0) as total_money_out,
    
    -- Net partner transfers
    COALESCE(xfer_in.total, 0) - COALESCE(xfer_out.total, 0) as net_partner_transfers

FROM owners o

LEFT JOIN (SELECT owner_id, SUM(amount) as total FROM capital_contributions GROUP BY owner_id) contrib 
    ON o.id = contrib.owner_id
LEFT JOIN (SELECT owner_id, SUM(amount) as total FROM capital_withdrawals GROUP BY owner_id) withdraw 
    ON o.id = withdraw.owner_id
LEFT JOIN (SELECT owner_id, SUM(amount) as total FROM owner_distributions GROUP BY owner_id) distrib 
    ON o.id = distrib.owner_id
-- Exclude expense_payment type from informal_contributions since expenses are tracked via paid_by_owner_id (prevents double counting)
LEFT JOIN (
    SELECT owner_id, SUM(amount) as total 
    FROM informal_contributions 
    WHERE COALESCE(transaction_type, '') NOT IN ('expense_payment')
    GROUP BY owner_id
) informal 
    ON o.id = informal.owner_id
-- Include expense_payment types as part of expenses breakdown
LEFT JOIN (
    SELECT owner_id, SUM(amount) as total 
    FROM informal_contributions 
    WHERE transaction_type = 'expense_payment'
    GROUP BY owner_id
) informal_expenses 
    ON o.id = informal_expenses.owner_id
LEFT JOIN (SELECT to_owner_id as owner_id, SUM(amount) as total FROM partner_transfers WHERE status = 'completed' GROUP BY to_owner_id) xfer_in 
    ON o.id = xfer_in.owner_id
LEFT JOIN (SELECT from_owner_id as owner_id, SUM(amount) as total FROM partner_transfers WHERE status = 'completed' GROUP BY from_owner_id) xfer_out 
    ON o.id = xfer_out.owner_id
LEFT JOIN (SELECT owner_id, SUM(amount_paid) as total FROM payment_splits GROUP BY owner_id) pay_splits 
    ON o.id = pay_splits.owner_id

-- Legacy paid_by_owner_id aggregations
LEFT JOIN (SELECT paid_by_owner_id as owner_id, SUM(purchase_price) as total FROM vessels WHERE paid_by_owner_id IS NOT NULL GROUP BY paid_by_owner_id) legacy_vessels 
    ON o.id = legacy_vessels.owner_id
LEFT JOIN (SELECT paid_by_owner_id as owner_id, SUM(amount) as total FROM expenses WHERE paid_by_owner_id IS NOT NULL GROUP BY paid_by_owner_id) legacy_expenses 
    ON o.id = legacy_expenses.owner_id
LEFT JOIN (SELECT paid_by_owner_id as owner_id, SUM(total_amount) as total FROM salary_payments WHERE paid_by_owner_id IS NOT NULL GROUP BY paid_by_owner_id) legacy_salaries 
    ON o.id = legacy_salaries.owner_id
LEFT JOIN (SELECT paid_by_owner_id as owner_id, SUM(cost) as total FROM vessel_movements WHERE paid_by_owner_id IS NOT NULL GROUP BY paid_by_owner_id) legacy_movements 
    ON o.id = legacy_movements.owner_id
LEFT JOIN (SELECT paid_by_owner_id as owner_id, SUM(purchase_price) as total FROM land_purchases WHERE paid_by_owner_id IS NOT NULL GROUP BY paid_by_owner_id) legacy_lands 
    ON o.id = legacy_lands.owner_id

WHERE o.status = 'active';

-- Verify the fix
SELECT 
    owner_name,
    formal_contributions,
    direct_payments,
    payment_splits_total,
    vessels_paid,
    expenses_paid,
    lands_paid,
    informal_contributions,
    total_money_in,
    equity_balance,
    net_partner_transfers,
    net_account_balance
FROM owner_account_statement
ORDER BY owner_name;
