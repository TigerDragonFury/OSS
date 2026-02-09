-- Fix the vessel rental income trigger to match actual table structure
-- The trigger was referencing customer_company_id but the table has customer_id

-- Drop and recreate the trigger function with correct column names
CREATE OR REPLACE FUNCTION create_income_from_vessel_rental()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_amount > 0 AND NEW.payment_status = 'paid' THEN
    INSERT INTO income_records (
      income_date,
      income_type,
      source_type,
      source_id,
      reference_id,
      amount,
      customer_company_id,  -- income_records uses customer_company_id
      description
    ) VALUES (
      COALESCE(NEW.end_date, CURRENT_DATE),
      'vessel_rental',
      'vessel',
      NEW.vessel_id,
      NEW.id,
      NEW.total_amount,
      NEW.customer_id,  -- vessel_rentals uses customer_id
      CONCAT('Vessel Rental: ', NEW.start_date, ' to ', NEW.end_date)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS auto_income_vessel_rental ON vessel_rentals;
CREATE TRIGGER auto_income_vessel_rental
AFTER INSERT OR UPDATE ON vessel_rentals
FOR EACH ROW
EXECUTE FUNCTION create_income_from_vessel_rental();

-- Now retry adding the payment_status column and updating rentals
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'vessel_rentals' 
        AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE vessel_rentals 
        ADD COLUMN payment_status VARCHAR(50) 
        CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue'))
        DEFAULT 'pending';
        
        RAISE NOTICE 'Added payment_status column';
    END IF;
END $$;

-- Update existing rentals to mark them as paid
UPDATE vessel_rentals
SET payment_status = CASE
    WHEN status = 'completed' OR status = 'active' THEN 'paid'
    ELSE 'pending'
END
WHERE payment_status IS NULL OR payment_status = 'pending';

-- Verify the results
SELECT 
    COUNT(*) as total_rentals,
    COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_rentals,
    SUM(total_amount) FILTER (WHERE payment_status = 'paid') as total_paid_income
FROM vessel_rentals;
