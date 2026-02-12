-- ============================================================================
-- ADD SOURCE_OF_FUNDS TO PAYMENT_SPLITS TABLE
-- This allows tracking capital source for direct expense payments
-- ============================================================================

-- Step 1: Add source_of_funds column to payment_splits
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payment_splits' AND column_name = 'source_of_funds'
    ) THEN
        ALTER TABLE payment_splits 
        ADD COLUMN source_of_funds VARCHAR(50) DEFAULT 'personal_savings'
        CHECK (source_of_funds IN ('personal_savings', 'scrap_profit', 'equipment_sale', 'other'));
    END IF;
END $$;

-- Step 2: Set default for existing records
UPDATE payment_splits
SET source_of_funds = 'personal_savings'
WHERE source_of_funds IS NULL;

-- Step 3: Verify the update
SELECT 
    source_of_funds,
    COUNT(*) as record_count,
    SUM(amount_paid) as total_amount
FROM payment_splits
GROUP BY source_of_funds
ORDER BY source_of_funds;

-- ============================================================================
-- UPDATE OWNER_ACCOUNT_STATEMENT TO TRACK SOURCE IN PAYMENT_SPLITS
-- ============================================================================

DROP VIEW IF EXISTS owner_account_statement CASCADE;

CREATE OR REPLACE VIEW owner_account_statement AS
WITH 
    -- FORMAL capital contributions
    cap_contributions AS (
        SELECT owner_id, SUM(amount) as total 
        FROM capital_contributions 
        GROUP BY owner_id
    ),
    
    -- WITHDRAWALS
    cap_withdrawals AS (
        SELECT owner_id, SUM(amount) as total 
        FROM capital_withdrawals 
        GROUP BY owner_id
    ),
    
    -- INFORMAL contributions - NEW CAPITAL ONLY (personal_savings, other)
    informal_new AS (
        SELECT owner_id, SUM(amount) as total
        FROM informal_contributions
        WHERE source_of_funds IN ('personal_savings', 'other')
        GROUP BY owner_id
    ),
   -- INFORMAL contributions - RECYCLED FUNDS (scrap_profit, equipment_sale)
    informal_recycled AS (
        SELECT owner_id, SUM(amount) as total
        FROM informal_contributions
        WHERE source_of_funds IN ('scrap_profit', 'equipment_sale')
        GROUP BY owner_id
    ),
    
    -- PAYMENT SPLITS - NEW CAPITAL ONLY (personal_savings, other)
    pay_splits_new AS (
        SELECT owner_id, SUM(amount_paid) as total 
        FROM payment_splits 
        WHERE source_of_funds IN ('personal_savings', 'other')
        GROUP BY owner_id
    ),
    
    -- PAYMENT SPLITS - RECYCLED FUNDS (scrap_profit, equipment_sale)
    pay_splits_recycled AS (
        SELECT owner_id, SUM(amount_paid) as total 
        FROM payment_splits 
        WHERE source_of_funds IN ('scrap_profit', 'equipment_sale')
        GROUP BY owner_id
    ),
    
    -- DISTRIBUTIONS to owners (scrap sales, equipment sales, etc.)
    owner_distros AS (
        SELECT owner_id, SUM(amount) as total 
        FROM owner_distributions 
        GROUP BY owner_id
    ),
    
    -- PARTNER TRANSFERS (in/out)
    xfer_given AS (
        SELECT from_owner_id as owner_id, SUM(amount) as total 
        FROM partner_transfers 
        GROUP BY from_owner_id
    ),
    xfer_received AS (
        SELECT to_owner_id as owner_id, SUM(amount) as total 
        FROM partner_transfers 
        GROUP BY to_owner_id
    )

SELECT 
    o.id as owner_id,
    o.name as owner_name,
    
    -- TRADITIONAL COMPONENTS (for legal/tax purposes)
    o.initial_capital,
    COALESCE(cc.total, 0) as capital_contributed,
    COALESCE(cw.total, 0) as capital_withdrawn,
    COALESCE(inf_new.total, 0) + COALESCE(inf_rec.total, 0) as informal_contributions,
    COALESCE(ps_new.total, 0) + COALESCE(ps_rec.total, 0) as payment_splits_total,
    COALESCE(od.total, 0) as distributions_taken,
    COALESCE(xg.total, 0) as transfers_given,
    COALESCE(xr.total, 0) as transfers_received,
    
    -- CAPITAL SOURCE BREAKDOWN
    COALESCE(inf_new.total, 0) as informal_new_capital,
    COALESCE(inf_rec.total, 0) as informal_recycled,
    COALESCE(ps_new.total, 0) as payment_splits_new_capital,
    COALESCE(ps_rec.total, 0) as payment_splits_recycled,
    
    -- AGGREGATED NEW vs RECYCLED
    COALESCE(inf_new.total, 0) + COALESCE(ps_new.total, 0) as new_capital_contributed,
    COALESCE(inf_rec.total, 0) + COALESCE(ps_rec.total, 0) as recycled_funds_used,
    
    -- Legacy paid_by_owner_id aggregations
    COALESCE(lv.total, 0) as legacy_vessels,
    COALESCE(le.total, 0) as legacy_expenses,
    COALESCE(ls.total, 0) as legacy_salaries,
    COALESCE(lm.total, 0) as legacy_movements,
    COALESCE(ll.total, 0) as legacy_lands,
    
    -- TRADITIONAL EQUITY (legal/tax calculation - includes all money)
    o.initial_capital 
        + COALESCE(cc.total, 0) 
        + COALESCE(inf_new.total, 0) 
        + COALESCE(inf_rec.total, 0)
        + COALESCE(ps_new.total, 0)
        + COALESCE(ps_rec.total, 0)
        - COALESCE(cw.total, 0) 
        - COALESCE(od.total, 0)
        + COALESCE(xg.total, 0) 
        - COALESCE(xr.total, 0)
        + COALESCE(lv.total, 0)
        + COALESCE(le.total, 0)
        + COALESCE(ls.total, 0)
        + COALESCE(lm.total, 0)
        + COALESCE(ll.total, 0)
    as equity_balance,
    
    -- NET NEW CAPITAL (fair comparison - only TRUE new money from personal sources)
    o.initial_capital 
        + COALESCE(cc.total, 0) 
        + COALESCE(inf_new.total, 0) 
        + COALESCE(ps_new.total, 0)
        - COALESCE(cw.total, 0) 
        - COALESCE(od.total, 0)
        + COALESCE(xg.total, 0) 
        - COALESCE(xr.total, 0)
        + COALESCE(lv.total, 0)
        + COALESCE(le.total, 0)
        + COALESCE(ls.total, 0)
        + COALESCE(lm.total, 0)
        + COALESCE(ll.total, 0)
    as net_new_capital

FROM owners o

-- Formal transactions
LEFT JOIN cap_contributions cc ON o.id = cc.owner_id
LEFT JOIN cap_withdrawals cw ON o.id = cw.owner_id

-- Informal contributions (split by source)
LEFT JOIN informal_new inf_new ON o.id = inf_new.owner_id
LEFT JOIN informal_recycled inf_rec ON o.id = inf_rec.owner_id

-- Payment splits (split by source)
LEFT JOIN pay_splits_new ps_new ON o.id = ps_new.owner_id
LEFT JOIN pay_splits_recycled ps_rec ON o.id = ps_rec.owner_id

-- Distributions and transfers
LEFT JOIN owner_distros od ON o.id = od.owner_id
LEFT JOIN xfer_given xg ON o.id = xg.owner_id
LEFT JOIN xfer_received xr ON o.id = xr.owner_id

-- Legacy paid_by_owner_id aggregations
LEFT JOIN (SELECT paid_by_owner_id as owner_id, SUM(purchase_price) as total FROM vessels WHERE paid_by_owner_id IS NOT NULL GROUP BY paid_by_owner_id) lv 
  ON o.id = lv.owner_id
LEFT JOIN (SELECT paid_by_owner_id as owner_id, SUM(amount) as total FROM expenses WHERE paid_by_owner_id IS NOT NULL GROUP BY paid_by_owner_id) le 
  ON o.id = le.owner_id
LEFT JOIN (SELECT paid_by_owner_id as owner_id, SUM(total_amount) as total FROM salary_payments WHERE paid_by_owner_id IS NOT NULL GROUP BY paid_by_owner_id) ls 
  ON o.id = ls.owner_id
LEFT JOIN (SELECT paid_by_owner_id as owner_id, SUM(cost) as total FROM vessel_movements WHERE paid_by_owner_id IS NOT NULL GROUP BY paid_by_owner_id) lm 
  ON o.id = lm.owner_id
LEFT JOIN (SELECT paid_by_owner_id as owner_id, SUM(purchase_price) as total FROM land_purchases WHERE paid_by_owner_id IS NOT NULL GROUP BY paid_by_owner_id) ll 
  ON o.id = ll.owner_id

WHERE o.status = 'active';

-- Step 4: Verify the view returns correct breakdown
SELECT 
    owner_name,
    equity_balance as "Traditional Equity",
    new_capital_contributed as "New Capital",
    recycled_funds_used as "Recycled Funds",
    net_new_capital as "Net New Capital",
    payment_splits_new_capital as "Splits (New)",
    payment_splits_recycled as "Splits (Recycled)"
FROM owner_account_statement
ORDER BY owner_name;
