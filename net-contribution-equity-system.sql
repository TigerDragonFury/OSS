-- ============================================================================
-- NET CONTRIBUTION EQUITY SYSTEM
-- Implements the fair formula: Net = Personal Out-of-Pocket - Benefits Received
-- ============================================================================

-- Phase 1: Personal Out-of-Pocket (True New Money)
-- Phase 2: Benefits Received (Cash + Assets Taken)
-- Phase 3: Net Contribution Calculation
-- Phase 4: Equalization Formula

-- ============================================================================
-- CREATE/UPDATE OWNER_ACCOUNT_STATEMENT VIEW
-- ============================================================================

DROP VIEW IF EXISTS owner_account_statement CASCADE;

CREATE OR REPLACE VIEW owner_account_statement AS
WITH 
    -- FORMAL capital contributions (Phase 1: Personal Money)
    cap_contributions AS (
        SELECT owner_id, SUM(amount) as total 
        FROM capital_contributions 
        GROUP BY owner_id
    ),
    
    -- WITHDRAWALS (Phase 2: Benefits Received - Cash Taken)
    cap_withdrawals AS (
        SELECT owner_id, SUM(amount) as total 
        FROM capital_withdrawals 
        GROUP BY owner_id
    ),
    
    -- INFORMAL contributions - TRUE PERSONAL MONEY ONLY
    -- (personal_savings, other) = Phase 1
    informal_new AS (
        SELECT owner_id, SUM(amount) as total
        FROM informal_contributions
        WHERE source_of_funds IN ('personal_savings', 'other')
        GROUP BY owner_id
    ),
    
    -- INFORMAL contributions - COMPANY MONEY USED = $0 for personal spend
    -- (scrap_profit, equipment_sale) = Phase 1: Counted as $0
    informal_recycled AS (
        SELECT owner_id, SUM(amount) as total
        FROM informal_contributions
        WHERE source_of_funds IN ('scrap_profit', 'equipment_sale')
        GROUP BY owner_id
    ),
    
    -- PAYMENT SPLITS - TRUE PERSONAL MONEY ONLY
    pay_splits_new AS (
        SELECT owner_id, SUM(amount_paid) as total 
        FROM payment_splits 
        WHERE source_of_funds IN ('personal_savings', 'other')
        GROUP BY owner_id
    ),
    
    -- PAYMENT SPLITS - COMPANY MONEY = $0 for personal spend
    pay_splits_recycled AS (
        SELECT owner_id, SUM(amount_paid) as total 
        FROM payment_splits 
        WHERE source_of_funds IN ('scrap_profit', 'equipment_sale')
        GROUP BY owner_id
    ),
    
    -- DISTRIBUTIONS (Phase 2: Benefits Received - Cash Distributions)
    owner_distros AS (
        SELECT owner_id, SUM(amount) as total 
        FROM owner_distributions 
        GROUP BY owner_id
    ),
    
    -- PARTNER TRANSFERS (Phase 2: Internal Rebalancing)
    -- Given = Credit (you gave it up, reduces benefits received)
    -- Received = Debit (you received it, increases benefits received)
    xfer_given AS (
        SELECT from_owner_id as owner_id, SUM(amount) as total 
        FROM partner_transfers 
        GROUP BY from_owner_id
    ),
    xfer_received AS (
        SELECT to_owner_id as owner_id, SUM(amount) as total 
        FROM partner_transfers 
        GROUP BY to_owner_id
    ),
    
    -- Legacy paid_by_owner_id (backward compatibility)
    legacy_vessels AS (
        SELECT paid_by_owner_id as owner_id, SUM(purchase_price) as total 
        FROM vessels 
        WHERE paid_by_owner_id IS NOT NULL 
        GROUP BY paid_by_owner_id
    ),
    legacy_expenses AS (
        SELECT paid_by_owner_id as owner_id, SUM(amount) as total 
        FROM expenses 
        WHERE paid_by_owner_id IS NOT NULL 
        GROUP BY paid_by_owner_id
    ),
    legacy_salaries AS (
        SELECT paid_by_owner_id as owner_id, SUM(total_amount) as total 
        FROM salary_payments 
        WHERE paid_by_owner_id IS NOT NULL 
        GROUP BY paid_by_owner_id
    ),
    legacy_movements AS (
        SELECT paid_by_owner_id as owner_id, SUM(cost) as total 
        FROM vessel_movements 
        WHERE paid_by_owner_id IS NOT NULL 
        GROUP BY paid_by_owner_id
    ),
    legacy_lands AS (
        SELECT paid_by_owner_id as owner_id, SUM(purchase_price) as total 
        FROM land_purchases 
        WHERE paid_by_owner_id IS NOT NULL 
        GROUP BY paid_by_owner_id
    )

SELECT 
    o.id as owner_id,
    o.name as owner_name,
    o.ownership_percentage,
    
    -- ========================================================================
    -- PHASE 1: PERSONAL OUT-OF-POCKET (What Did They Put In?)
    -- ========================================================================
    o.initial_capital as initial_capital,
    COALESCE(cc.total, 0) as capital_contributed,
    COALESCE(inf_new.total, 0) as informal_new_capital,
    COALESCE(ps_new.total, 0) as payment_splits_new_capital,
    COALESCE(lv.total, 0) as legacy_vessels,
    COALESCE(le.total, 0) as legacy_expenses,
    COALESCE(ls.total, 0) as legacy_salaries,
    COALESCE(lm.total, 0) as legacy_movements,
    COALESCE(ll.total, 0) as legacy_lands,
    
    -- TOTAL PERSONAL OUT-OF-POCKET (Phase 1 Total)
    (
        o.initial_capital 
        + COALESCE(cc.total, 0) 
        + COALESCE(inf_new.total, 0) 
        + COALESCE(ps_new.total, 0)
        + COALESCE(lv.total, 0)
        + COALESCE(le.total, 0)
        + COALESCE(ls.total, 0)
        + COALESCE(lm.total, 0)
        + COALESCE(ll.total, 0)
    ) as total_personal_outofpocket,
    
    -- ========================================================================
    -- PHASE 2: BENEFITS RECEIVED (What Did They Take Out?)
    -- ========================================================================
    COALESCE(cw.total, 0) as capital_withdrawn,
    COALESCE(od.total, 0) as distributions_taken,
    COALESCE(xr.total, 0) as transfers_received,
    COALESCE(xg.total, 0) as transfers_given,
    
    -- TOTAL BENEFITS RECEIVED (Phase 2 Total)
    -- Cash Distributions + Withdrawals + Transfers Received - Transfers Given
    (
        COALESCE(cw.total, 0) 
        + COALESCE(od.total, 0)
        + COALESCE(xr.total, 0)
        - COALESCE(xg.total, 0)
    ) as total_benefits_received,
    
    -- ========================================================================
    -- COMPANY MONEY USED (Tracked but $0 for Personal Spend)
    -- ========================================================================
    COALESCE(inf_rec.total, 0) as informal_recycled,
    COALESCE(ps_rec.total, 0) as payment_splits_recycled,
    COALESCE(inf_rec.total, 0) + COALESCE(ps_rec.total, 0) as recycled_funds_used,
    
    -- ========================================================================
    -- PHASE 3: NET CONTRIBUTION CALCULATION
    -- ========================================================================
    -- Formula: Personal Out-of-Pocket - Benefits Received
    (
        -- Personal Out-of-Pocket
        o.initial_capital 
        + COALESCE(cc.total, 0) 
        + COALESCE(inf_new.total, 0) 
        + COALESCE(ps_new.total, 0)
        + COALESCE(lv.total, 0)
        + COALESCE(le.total, 0)
        + COALESCE(ls.total, 0)
        + COALESCE(lm.total, 0)
        + COALESCE(ll.total, 0)
    ) - (
        -- Benefits Received
        COALESCE(cw.total, 0) 
        + COALESCE(od.total, 0)
        + COALESCE(xr.total, 0)
        - COALESCE(xg.total, 0)
    ) as net_contribution,
    
    -- ========================================================================
    -- TRADITIONAL EQUITY (For Tax/Legal - Includes All Money Movements)
    -- ========================================================================
    (
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
    ) as equity_balance

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

-- Legacy paid_by_owner_id
LEFT JOIN legacy_vessels lv ON o.id = lv.owner_id
LEFT JOIN legacy_expenses le ON o.id = le.owner_id
LEFT JOIN legacy_salaries ls ON o.id = ls.owner_id
LEFT JOIN legacy_movements lm ON o.id = lm.owner_id
LEFT JOIN legacy_lands ll ON o.id = ll.owner_id

WHERE o.status = 'active';

-- ============================================================================
-- VERIFICATION: Show Net Contribution Summary
-- ============================================================================
SELECT 
    owner_name,
    total_personal_outofpocket as "Phase 1: Personal Out-of-Pocket",
    total_benefits_received as "Phase 2: Benefits Received",
    net_contribution as "Phase 3: Net Contribution",
    recycled_funds_used as "Company Money Used ($0 for personal)",
    equity_balance as "Traditional Equity (Tax/Legal)"
FROM owner_account_statement
ORDER BY owner_name;

-- ============================================================================
-- PHASE 4: EQUALIZATION FORMULA
-- ============================================================================
-- Calculate who owes whom and how much
WITH partner_positions AS (
    SELECT 
        owner_id,
        owner_name,
        net_contribution,
        ownership_percentage
    FROM owner_account_statement
),
two_partners AS (
    SELECT 
        MAX(CASE WHEN rn = 1 THEN owner_name END) as partner_a_name,
        MAX(CASE WHEN rn = 1 THEN net_contribution END) as partner_a_net,
        MAX(CASE WHEN rn = 2 THEN owner_name END) as partner_b_name,
        MAX(CASE WHEN rn = 2 THEN net_contribution END) as partner_b_net
    FROM (
        SELECT 
            owner_name,
            net_contribution,
            ROW_NUMBER() OVER (ORDER BY owner_name) as rn
        FROM partner_positions
    ) numbered
)
SELECT 
    partner_a_name,
    partner_a_net,
    partner_b_name,
    partner_b_net,
    partner_a_net - partner_b_net as difference,
    (partner_a_net - partner_b_net) / 2.0 as settlement_amount,
    CASE 
        WHEN partner_a_net > partner_b_net THEN 
            partner_b_name || ' owes ' || partner_a_name || ' ' || ROUND((partner_a_net - partner_b_net) / 2.0, 2)::text
        WHEN partner_b_net > partner_a_net THEN 
            partner_a_name || ' owes ' || partner_b_name || ' ' || ROUND((partner_b_net - partner_a_net) / 2.0, 2)::text
        ELSE 'Partners are balanced'
    END as settlement_instruction
FROM two_partners;

-- ============================================================================
-- NOTES FOR HANDLING PHYSICAL ASSETS & INVENTORY
-- ============================================================================
/*
To properly implement this system, you need to track:

1. Physical Assets Kept (e.g., Pipelay Equipment = 4.7M Majed kept)
   - Create table: asset_allocations
   - Columns: owner_id, asset_type, asset_description, fair_market_value, date_allocated
   - This adds to "Benefits Received"

2. Inventory Held (e.g., 600 tons scrap Ali is holding)
   - Add to owner_distributions or create inventory_held table
   - Treat as "Benefits Received" even if not yet sold
   - Update value when eventually sold (adjusts settlement automatically)

3. Implementation:
   - Add these to the total_benefits_received calculation
   - The net_contribution formula automatically adjusts
   - Settlement amount recalculates based on true net positions

Example additions to view:

-- Asset allocations
LEFT JOIN (
    SELECT owner_id, SUM(fair_market_value) as total 
    FROM asset_allocations 
    GROUP BY owner_id
) assets_kept ON o.id = assets_kept.owner_id

-- Inventory held
LEFT JOIN (
    SELECT owner_id, SUM(estimated_value) as total 
    FROM inventory_held 
    GROUP BY owner_id
) inventory ON o.id = inventory.owner_id

-- Then add to Benefits Received:
total_benefits_received + COALESCE(assets_kept.total, 0) + COALESCE(inventory.total, 0)
*/

-- ============================================================================
-- EXAMPLE: Majed vs Ali Scenario
-- ============================================================================
/*
Majed:
- Personal Spend: 7.8M (Katherina, Regina, Sasha, Inspection, Scrap Metal)
- Valentine 1: 0 (paid with Pipelay Equipment proceeds = company money)
- Asset Kept: -4.7M (Pipelay Equipment)
- Transfer Received: -500K (from Ali)
- Net: 7.8M - 4.7M - 500K = 2.6M

Ali:
- Personal Spend: 4.82M (Regina, Katherina, Scrap Bought, Expenses)
- Distributions Taken: -1.25M (Scrap Sale #1) - 680.45K (Scrap Sale #2)
- Transfer Given: +500K (gave to Majed)
- Inventory Held: -X (600 tons value)
- Net: 4.82M - 1.93M + 500K - X = 3.39M - X

Settlement: (2.6M - (3.39M - X)) / 2
If X = 0: Ali owes Majed 395K
If X = 1M: Majed owes Ali 105K
*/
