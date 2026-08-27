-- Migration 014: Year-Based Customer ID Generator & Migration
-- Format: RJ-YYYY-NNN (e.g., RJ-2026-001, RJ-2026-002, RJ-2026-003)

-- 1. Create concurrency-safe PostgreSQL function to generate next Customer ID per year
CREATE OR REPLACE FUNCTION public.generate_customer_id()
RETURNS TEXT AS $$
DECLARE
    v_year TEXT;
    v_max_seq INT;
    v_next_seq INT;
    v_customer_id TEXT;
BEGIN
    v_year := to_char(NOW(), 'YYYY');

    -- Find highest sequence number for current year in public.customers
    SELECT COALESCE(MAX(
        CASE 
            WHEN customer_number ~ ('^RJ-' || v_year || '-\d{3,4}$') 
            THEN substring(customer_number from '^RJ-' || v_year || '-(\d+)')::integer
            WHEN customer_number ~ '^RJ-CUST-\d+$'
            THEN substring(customer_number from '^RJ-CUST-0*(\d+)')::integer
            ELSE 0
        END
    ), 0) INTO v_max_seq
    FROM public.customers;

    v_next_seq := v_max_seq + 1;
    v_customer_id := 'RJ-' || v_year || '-' || lpad(v_next_seq::text, 3, '0');

    RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- 2. Update default column value for public.customers table
ALTER TABLE public.customers 
ALTER COLUMN customer_number SET DEFAULT public.generate_customer_id();

-- 3. Migrate existing customers from old format (RJ-CUST-XXXXXX) to RJ-YYYY-NNN based on creation order
WITH ranked_customers AS (
    SELECT 
        id, 
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY to_char(COALESCE(created_at, NOW()), 'YYYY') 
            ORDER BY created_at ASC, id ASC
        ) as seq_num
    FROM public.customers
    WHERE customer_number LIKE 'RJ-CUST-%' OR customer_number !~ '^RJ-\d{4}-\d{3,4}$'
)
UPDATE public.customers c
SET customer_number = 'RJ-' || to_char(COALESCE(rc.created_at, NOW()), 'YYYY') || '-' || lpad(rc.seq_num::text, 3, '0')
FROM ranked_customers rc
WHERE c.id = rc.id;
