-- ============================================================================
-- UPDATE CAPITAL SOURCES FOR MAJED & ALI
-- Execute this AFTER running add-capital-source-tracking.sql
-- ============================================================================

-- Step 1: First, let's see what we have
-- This shows all informal_contributions and their current source_of_funds
SELECT 
  o.name as owner_name,
  ic.description,
  ic.amount,
  ic.source_of_funds,
  ic.created_at
FROM informal_contributions ic
JOIN owners o ON o.id = ic.owner_id
WHERE o.name IN ('Ali Al Dalou', 'Majed Al Najjar')
ORDER BY o.name, ic.created_at;

-- ============================================================================
-- Step 2: Update Valentine 1 to be tagged as equipment_sale (recycled funds)
-- ============================================================================
UPDATE informal_contributions
SET source_of_funds = 'equipment_sale'
WHERE description ILIKE '%valentine%1%'
  AND amount = 701000
  AND owner_id = (SELECT id FROM owners WHERE name = 'Majed Al Najjar');

-- Verify Valentine 1 update
SELECT 
  o.name,
  ic.description,
  ic.amount,
  ic.source_of_funds
FROM informal_contributions ic
JOIN owners o ON o.id = ic.owner_id
WHERE ic.description ILIKE '%valentine%1%';

-- ============================================================================
-- Step 3: Update Regina scrap payment ($1.25M from Ali to Majed)
-- Political decision: Keep as 'personal_savings' to avoid conflict
-- ============================================================================
-- If it exists as informal_contribution (Ali's payment to Majed):
UPDATE informal_contributions
SET source_of_funds = 'personal_savings'
WHERE owner_id = (SELECT id FROM owners WHERE name = 'Ali Al Dalou')
  AND amount = 1250000
  AND source_of_funds IS NULL OR source_of_funds = 'scrap_profit';

-- Note: If this is recorded as partner_transfer instead, no update needed
-- Partner transfers don't affect informal_contributions

-- ============================================================================
-- Step 4: Set all NULL source_of_funds to 'personal_savings' (default)
-- ============================================================================
UPDATE informal_contributions
SET source_of_funds = 'personal_savings'
WHERE source_of_funds IS NULL;

-- ============================================================================
-- Step 5: Verification - Compare old equity vs new fair comparison
-- ============================================================================
SELECT 
  o.name as owner_name,
  oas.equity_balance as "Traditional Equity",
  oas.new_capital_contributed as "New Capital (Personal)",
  oas.recycled_funds_used as "Recycled Funds (Company)",
  oas.net_new_capital as "Net New Capital (Fair Comparison)",
  oas.equity_balance - oas.net_new_capital as "Difference"
FROM owner_account_statement oas
JOIN owners o ON o.id = oas.owner_id
WHERE o.name IN ('Ali Al Dalou', 'Majed Al Najjar')
ORDER BY o.name;

-- ============================================================================
-- Step 6: Detailed breakdown by owner
-- ============================================================================
SELECT 
  o.name as owner_name,
  ic.description,
  ic.amount,
  ic.source_of_funds,
  CASE 
    WHEN ic.source_of_funds IN ('personal_savings', 'other') THEN 'NEW CAPITAL'
    WHEN ic.source_of_funds IN ('scrap_profit', 'equipment_sale') THEN 'RECYCLED FUNDS'
    ELSE 'UNKNOWN'
  END as classification
FROM informal_contributions ic
JOIN owners o ON o.id = ic.owner_id
WHERE o.name IN ('Ali Al Dalou', 'Majed Al Najjar')
ORDER BY o.name, ic.created_at;

-- ============================================================================
-- EXPECTED RESULTS AFTER UPDATES:
-- ============================================================================
-- Majed:
--   - Valentine 1 ($701K) = equipment_sale (recycled)
--   - All other vessels = personal_savings (new capital)
--   - Net New Capital should exclude the $701K
--
-- Ali:
--   - Regina payment ($1.25M if exists) = personal_savings (political decision)
--   - All other expenses/vessels = personal_savings (new capital)
--   - Net New Capital reflects all as true contribution
-- ============================================================================
