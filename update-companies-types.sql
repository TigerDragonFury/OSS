-- Update Companies Table Types
-- Adds new company types: contractor, vendor, scrap_buyer, equipment_dealer
-- And adds company reference columns to related tables
-- Run this in Supabase SQL Editor after running supabase-schema.sql

DO $$
BEGIN
  -- Drop the existing CHECK constraint
  ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_type_check;
  
  -- Add new CHECK constraint with expanded types
  ALTER TABLE companies ADD CONSTRAINT companies_type_check 
    CHECK (type IN ('parent', 'contractor', 'vendor', 'scrap_buyer', 'equipment_dealer', 'marine', 'scrap'));

  -- Add buyer_company_id to land_scrap_sales
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'land_scrap_sales' AND column_name = 'buyer_company_id'
  ) THEN
    ALTER TABLE land_scrap_sales ADD COLUMN buyer_company_id UUID REFERENCES companies(id);
  END IF;

  -- Add dealer_company_id to land_equipment
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'land_equipment' AND column_name = 'dealer_company_id'
  ) THEN
    ALTER TABLE land_equipment ADD COLUMN dealer_company_id UUID REFERENCES companies(id);
  END IF;
END $$;

-- Show current companies and their types
SELECT id, name, type, parent_id
FROM companies
ORDER BY type, name;
