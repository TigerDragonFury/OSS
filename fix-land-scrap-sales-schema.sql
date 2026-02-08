-- Fix Land Scrap Sales Schema
-- Changes column names to use tons to match land purchases: quantity_kg → quantity_tons, price_per_kg → price_per_ton
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

  -- Rename tonnage to quantity_tons (keep as tons, don't convert)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'land_scrap_sales' AND column_name = 'tonnage'
  ) THEN
    ALTER TABLE land_scrap_sales RENAME COLUMN tonnage TO quantity_tons;
  END IF;

  -- Rename price_per_ton to price_per_ton (already in tons)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'land_scrap_sales' AND column_name = 'price_per_ton'
  ) THEN
    -- Column already named correctly, do nothing
    NULL;
  END IF;
  
  -- If still have kg columns from older version, convert them
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'land_scrap_sales' AND column_name = 'quantity_kg'
  ) THEN
    -- Convert from kg to tons (divide by 1000)
    UPDATE land_scrap_sales SET quantity_kg = quantity_kg / 1000 WHERE quantity_kg IS NOT NULL;
    ALTER TABLE land_scrap_sales RENAME COLUMN quantity_kg TO quantity_tons;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'land_scrap_sales' AND column_name = 'price_per_kg'
  ) THEN
    -- Convert from price per kg to price per ton (multiply by 1000)
    UPDATE land_scrap_sales SET price_per_kg = price_per_kg * 1000 WHERE price_per_kg IS NOT NULL;
    ALTER TABLE land_scrap_sales RENAME COLUMN price_per_kg TO price_per_ton;
  END IF;
END $$;

-- Verify the changes
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'land_scrap_sales'
ORDER BY ordinal_position;
