-- Fix Land Scrap Sales Schema
-- Changes column names to match the form: tonnage → quantity_kg, price_per_ton → price_per_kg, scrap_type → material_type
-- Run this in Supabase SQL Editor after running supabase-schema.sql

DO $$
BEGIN
  -- Rename scrap_type to material_type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'land_scrap_sales' AND column_name = 'scrap_type'
  ) THEN
    ALTER TABLE land_scrap_sales RENAME COLUMN scrap_type TO material_type;
  END IF;

  -- Rename tonnage to quantity_kg
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'land_scrap_sales' AND column_name = 'tonnage'
  ) THEN
    ALTER TABLE land_scrap_sales RENAME COLUMN tonnage TO quantity_kg;
  END IF;

  -- Rename price_per_ton to price_per_kg
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'land_scrap_sales' AND column_name = 'price_per_ton'
  ) THEN
    ALTER TABLE land_scrap_sales RENAME COLUMN price_per_ton TO price_per_kg;
  END IF;
END $$;

-- Verify the changes
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'land_scrap_sales'
ORDER BY ordinal_position;
