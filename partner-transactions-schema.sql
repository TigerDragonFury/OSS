-- Partner Transactions Schema
-- Tracks informal cash flows between partners outside company accounts

-- Partner Distributions: When a partner takes company money (scrap profits, equipment sales, etc)
CREATE TABLE IF NOT EXISTS owner_distributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES owners(id) NOT NULL,
    distribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(15, 2) NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- 'scrap_sale', 'equipment_sale', 'rental_income', 'other'
    source_id UUID, -- Reference to the sale/transaction
    description TEXT,
    status VARCHAR(20) DEFAULT 'taken' CHECK (status IN ('taken', 'reinvested')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Partner to Partner Transfers: When one partner gives money to another
CREATE TABLE IF NOT EXISTS partner_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_owner_id UUID REFERENCES owners(id) NOT NULL,
    to_owner_id UUID REFERENCES owners(id) NOT NULL,
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(15, 2) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'reversed')),
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT different_owners CHECK (from_owner_id != to_owner_id)
);

-- Informal Contributions: When partner spends personal money on company expenses
-- (This links to existing expenses but marks them as paid from personal funds)
CREATE TABLE IF NOT EXISTS informal_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES owners(id) NOT NULL,
    contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(15, 2) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'expense_payment', 'land_purchase', 'vessel_purchase', 'other'
    transaction_id UUID, -- Links to expense_id, land_id, vessel_id, etc.
    description TEXT,
    source_of_funds VARCHAR(50), -- 'scrap_profit', 'equipment_sale', 'personal_savings', 'other'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Comprehensive Owner Account Statement View
DROP VIEW IF EXISTS owner_account_statement;

CREATE VIEW owner_account_statement AS
SELECT 
    o.id as owner_id,
    o.name as owner_name,
    o.ownership_percentage,
    
    -- Initial position
    o.initial_capital,
    
    -- Formal contributions and withdrawals
    COALESCE(SUM(DISTINCT cc.amount), 0) as formal_contributions,
    COALESCE(SUM(DISTINCT cw.amount), 0) as formal_withdrawals,
    
    -- Distributions taken (money taken out)
    COALESCE(SUM(DISTINCT od.amount), 0) as distributions_taken,
    
    -- Informal contributions (spent personal money on company)
    COALESCE(SUM(DISTINCT ic.amount), 0) as informal_contributions,
    
    -- Partner transfers received
    COALESCE(SUM(DISTINCT pt_in.amount), 0) as transfers_received,
    
    -- Partner transfers given
    COALESCE(SUM(DISTINCT pt_out.amount), 0) as transfers_given,
    
    -- Payment splits (from payment_splits table)
    COALESCE(SUM(DISTINCT ps.amount_paid), 0) as direct_payments,
    
    -- Calculate net position
    o.initial_capital + 
    COALESCE(SUM(DISTINCT cc.amount), 0) +  -- Add formal contributions
    COALESCE(SUM(DISTINCT ic.amount), 0) +  -- Add informal contributions
    COALESCE(SUM(DISTINCT ps.amount_paid), 0) +  -- Add direct payments
    COALESCE(SUM(DISTINCT pt_in.amount), 0) -  -- Add transfers received
    COALESCE(SUM(DISTINCT cw.amount), 0) -  -- Subtract formal withdrawals
    COALESCE(SUM(DISTINCT od.amount), 0) -  -- Subtract distributions taken
    COALESCE(SUM(DISTINCT pt_out.amount), 0) as net_account_balance,
    
    -- Running totals for clarity
    (COALESCE(SUM(DISTINCT cc.amount), 0) + COALESCE(SUM(DISTINCT ic.amount), 0) + 
     COALESCE(SUM(DISTINCT ps.amount_paid), 0)) as total_money_in,
    (COALESCE(SUM(DISTINCT cw.amount), 0) + COALESCE(SUM(DISTINCT od.amount), 0)) as total_money_out,
    (COALESCE(SUM(DISTINCT pt_in.amount), 0) - COALESCE(SUM(DISTINCT pt_out.amount), 0)) as net_partner_transfers

FROM owners o
LEFT JOIN capital_contributions cc ON o.id = cc.owner_id
LEFT JOIN capital_withdrawals cw ON o.id = cw.owner_id
LEFT JOIN owner_distributions od ON o.id = od.owner_id
LEFT JOIN informal_contributions ic ON o.id = ic.owner_id
LEFT JOIN partner_transfers pt_in ON o.id = pt_in.to_owner_id AND pt_in.status = 'completed'
LEFT JOIN partner_transfers pt_out ON o.id = pt_out.from_owner_id AND pt_out.status = 'completed'
LEFT JOIN payment_splits ps ON o.id = ps.owner_id
WHERE o.status = 'active'
GROUP BY o.id, o.name, o.ownership_percentage, o.initial_capital;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_owner_distributions_owner ON owner_distributions(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_distributions_date ON owner_distributions(distribution_date);
CREATE INDEX IF NOT EXISTS idx_partner_transfers_from ON partner_transfers(from_owner_id);
CREATE INDEX IF NOT EXISTS idx_partner_transfers_to ON partner_transfers(to_owner_id);
CREATE INDEX IF NOT EXISTS idx_informal_contributions_owner ON informal_contributions(owner_id);

-- Disable RLS for easier access
ALTER TABLE owner_distributions DISABLE ROW LEVEL SECURITY;
ALTER TABLE partner_transfers DISABLE ROW LEVEL SECURITY;
ALTER TABLE informal_contributions DISABLE ROW LEVEL SECURITY;

-- Helper function to get partner account history
CREATE OR REPLACE FUNCTION get_owner_transaction_history(owner_uuid UUID)
RETURNS TABLE(
    transaction_date DATE,
    transaction_type TEXT,
    amount NUMERIC,
    balance_change NUMERIC,
    description TEXT,
    counterparty TEXT
) AS $$
BEGIN
    RETURN QUERY
    
    -- Formal contributions
    SELECT 
        cc.contribution_date as transaction_date,
        'Formal Contribution' as transaction_type,
        cc.amount,
        cc.amount as balance_change,
        COALESCE(cc.notes, 'Capital contribution') as description,
        'Company' as counterparty
    FROM capital_contributions cc
    WHERE cc.owner_id = owner_uuid
    
    UNION ALL
    
    -- Formal withdrawals
    SELECT 
        cw.withdrawal_date as transaction_date,
        'Formal Withdrawal' as transaction_type,
        cw.amount,
        -cw.amount as balance_change,
        COALESCE(cw.notes, 'Capital withdrawal') as description,
        'Company' as counterparty
    FROM capital_withdrawals cw
    WHERE cw.owner_id = owner_uuid
    
    UNION ALL
    
    -- Distributions taken
    SELECT 
        od.distribution_date as transaction_date,
        'Distribution Taken' as transaction_type,
        od.amount,
        -od.amount as balance_change,
        od.description as description,
        od.source_type as counterparty
    FROM owner_distributions od
    WHERE od.owner_id = owner_uuid
    
    UNION ALL
    
    -- Informal contributions
    SELECT 
        ic.contribution_date as transaction_date,
        'Informal Contribution' as transaction_type,
        ic.amount,
        ic.amount as balance_change,
        ic.description as description,
        ic.transaction_type as counterparty
    FROM informal_contributions ic
    WHERE ic.owner_id = owner_uuid
    
    UNION ALL
    
    -- Transfers received
    SELECT 
        pt.transfer_date as transaction_date,
        'Transfer Received' as transaction_type,
        pt.amount,
        pt.amount as balance_change,
        COALESCE(pt.reason, 'Partner transfer') as description,
        o.name as counterparty
    FROM partner_transfers pt
    JOIN owners o ON pt.from_owner_id = o.id
    WHERE pt.to_owner_id = owner_uuid AND pt.status = 'completed'
    
    UNION ALL
    
    -- Transfers given
    SELECT 
        pt.transfer_date as transaction_date,
        'Transfer Given' as transaction_type,
        pt.amount,
        -pt.amount as balance_change,
        COALESCE(pt.reason, 'Partner transfer') as description,
        o.name as counterparty
    FROM partner_transfers pt
    JOIN owners o ON pt.to_owner_id = o.id
    WHERE pt.from_owner_id = owner_uuid AND pt.status = 'completed'
    
    ORDER BY transaction_date DESC, transaction_type;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE owner_distributions IS 'Tracks when partners take money from company operations (scrap sales, equipment sales, etc) without going through formal company accounts';
COMMENT ON TABLE partner_transfers IS 'Tracks direct money transfers between partners outside company accounts';
COMMENT ON TABLE informal_contributions IS 'Tracks when partners spend personal money (including distributed profits) on company expenses';
