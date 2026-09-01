-- Migration 019: Normalize Customer Mobile Numbers & Add Unique Constraint
-- Ensures all mobile numbers in public.customers are stored as 10 digits
-- and prevents duplicate active customer mobile numbers.

-- 1. Normalize existing customer mobile numbers in public.customers
UPDATE public.customers
SET mobile_number = regexp_replace(mobile_number, '[^0-9]', '', 'g')
WHERE mobile_number ~ '[^0-9]';

UPDATE public.customers
SET mobile_number = substring(mobile_number FROM 3)
WHERE length(mobile_number) > 10 AND mobile_number LIKE '91%';

UPDATE public.customers
SET mobile_number = substring(mobile_number FROM 2)
WHERE length(mobile_number) > 10 AND mobile_number LIKE '0%';

-- 2. Add trigger / check to automatically normalize mobile numbers on insert/update
CREATE OR REPLACE FUNCTION public._trigger_normalize_customer_mobile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.mobile_number IS NOT NULL THEN
    NEW.mobile_number := public._normalize_mobile(NEW.mobile_number);
    IF NEW.mobile_number IS NULL THEN
      RAISE EXCEPTION 'Invalid 10-digit Indian mobile number format for customer: %', NEW.mobile_number;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_normalize_customer_mobile ON public.customers;
CREATE TRIGGER trigger_normalize_customer_mobile
  BEFORE INSERT OR UPDATE OF mobile_number ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public._trigger_normalize_customer_mobile();

-- 3. Create unique index on mobile_number for active customers
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_mobile_number_unique
  ON public.customers (mobile_number)
  WHERE status = 'ACTIVE';

COMMENT ON INDEX idx_customers_mobile_number_unique IS 'Ensures unique 10-digit mobile numbers for active customers.';
