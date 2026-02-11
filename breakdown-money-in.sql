-- Breakdown of where Money IN comes from for each owner
-- This shows all individual components that make up total_money_in

SELECT 
    o.name as owner_name,
    
    -- Individual components
    o.initial_capital as initial_capital,
    COALESCE(contrib.total, 0) as formal_contributions,
    COALESCE(informal.total, 0) as informal_contributions,
    COALESCE(pay_splits.total, 0) as payment_splits,
    COALESCE(legacy_vessels.total, 0) as vessels_paid,
    COALESCE(legacy_expenses.total, 0) as expenses_legacy,
    COALESCE(informal_expenses.total, 0) as expenses_informal,
    COALESCE(legacy_salaries.total, 0) as salaries_paid,
    COALESCE(legacy_movements.total, 0) as movements_paid,
    COALESCE(legacy_lands.total, 0) as lands_paid,
    
    -- Total Money In calculation
    COALESCE(contrib.total, 0) + 
    COALESCE(informal.total, 0) + 
    COALESCE(pay_splits.total, 0) +
    COALESCE(legacy_vessels.total, 0) +
    COALESCE(legacy_expenses.total, 0) +
    COALESCE(legacy_salaries.total, 0) +
    COALESCE(legacy_movements.total, 0) +
    COALESCE(legacy_lands.total, 0) as total_money_in,
    
    -- For reference: Money Out
    COALESCE(withdraw.total, 0) as formal_withdrawals,
    COALESCE(distrib.total, 0) as distributions_taken,
    COALESCE(xfer_out.total, 0) as transfers_given,
    COALESCE(xfer_in.total, 0) as transfers_received,
    
    COALESCE(withdraw.total, 0) + 
    COALESCE(distrib.total, 0) -
    COALESCE(xfer_out.total, 0) +
    COALESCE(xfer_in.total, 0) as total_money_out,
    
    -- Net Position
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
    COALESCE(xfer_in.total, 0) as equity_balance

FROM owners o

LEFT JOIN (SELECT owner_id, SUM(amount) as total FROM capital_contributions GROUP BY owner_id) contrib 
    ON o.id = contrib.owner_id
LEFT JOIN (SELECT owner_id, SUM(amount) as total FROM capital_withdrawals GROUP BY owner_id) withdraw 
    ON o.id = withdraw.owner_id
LEFT JOIN (SELECT owner_id, SUM(amount) as total FROM owner_distributions GROUP BY owner_id) distrib 
    ON o.id = distrib.owner_id
LEFT JOIN (
    SELECT owner_id, SUM(amount) as total 
    FROM informal_contributions 
    WHERE COALESCE(transaction_type, '') NOT IN ('expense_payment')
    GROUP BY owner_id
) informal 
    ON o.id = informal.owner_id
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

WHERE o.status = 'active'
ORDER BY o.name;
