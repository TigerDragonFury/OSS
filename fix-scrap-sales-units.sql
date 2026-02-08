-- Fix Land Scrap Sales Units - Change from KG to TONS to match land purchases
-- Run this in Supabase SQL Editor to sync units between purchases and sales

DO $$
BEGIN
  -- Rename quantity_kg to quantity_tons (convert existing data from kg to tons)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'land_scrap_sales' AND column_name = 'quantity_kg'
  ) THEN
    -- First convert existing data from kg to tons (divide by 1000)
    UPDATE land_scrap_sales 
    SET quantity_kg = quantity_kg / 1000 
    WHERE quantity_kg IS NOT NULL;
    
    -- Rename the column
    ALTER TABLE land_scrap_sales RENAME COLUMN quantity_kg TO quantity_tons;
    
    RAISE NOTICE 'Converted quantity_kg to quantity_tons (divided by 1000)';
  END IF;

  -- Rename price_per_kg to price_per_ton (convert existing data from per kg to per ton)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'land_scrap_sales' AND column_name = 'price_per_kg'
  ) THEN
    -- Convert existing data from price per kg to price per ton (multiply by 1000)
    UPDATE land_scrap_sales 
    SET price_per_kg = price_per_kg * 1000 
    WHERE price_per_kg IS NOT NULL;
    
    -- Rename the column
    ALTER TABLE land_scrap_sales RENAME COLUMN price_per_kg TO price_per_ton;
    
    RAISE NOTICE 'Converted price_per_kg to price_per_ton (multiplied by 1000)';
  END IF;
END $$;

-- Update total_amount to reflect the new units (should remain the same)
-- total_amount = quantity_tons * price_per_ton
UPDATE land_scrap_sales
SET total_amount = quantity_tons * price_per_ton
WHERE quantity_tons IS NOT NULL AND price_per_ton IS NOT NULL;

-- Create or replace function to update remaining tonnage automatically
CREATE OR REPLACE FUNCTION update_land_remaining_tonnage()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total sold tonnage
  UPDATE land_purchases
  SET remaining_tonnage = COALESCE(estimated_tonnage, 0) - COALESCE((
    SELECT SUM(quantity_tons)
    FROM land_scrap_sales
    WHERE land_id = NEW.land_id
  ), 0)
  WHERE id = NEW.land_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update remaining tonnage after insert/update/delete on scrap sales
DROP TRIGGER IF EXISTS update_remaining_tonnage_on_sale ON land_scrap_sales;
CREATE TRIGGER update_remaining_tonnage_on_sale
AFTER INSERT OR UPDATE OR DELETE ON land_scrap_sales
FOR EACH ROW
EXECUTE FUNCTION update_land_remaining_tonnage();

-- Recalculate all remaining tonnages based on current sales
UPDATE land_purchases lp
SET remaining_tonnage = COALESCE(lp.estimated_tonnage, 0) - COALESCE((
  SELECT SUM(lss.quantity_tons)
  FROM land_scrap_sales lss
  WHERE lss.land_id = lp.id
), 0);

-- Verify the changes
SELECT 
  lp.land_name,
  lp.estimated_tonnage,
  COALESCE(SUM(lss.quantity_tons), 0) as total_sold_tons,
  lp.remaining_tonnage,
  (lp.estimated_tonnage - lp.remaining_tonnage) as calculated_sold
FROM land_purchases lp
LEFT JOIN land_scrap_sales lss ON lp.id = lss.land_id
GROUP BY lp.id, lp.land_name, lp.estimated_tonnage, lp.remaining_tonnage
ORDER BY lp.land_name;
