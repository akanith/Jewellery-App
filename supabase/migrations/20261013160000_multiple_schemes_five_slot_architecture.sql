-- =============================================================================
-- Migration: Five-Slot Multi-Scheme Architecture for Schemes
-- Target File: supabase/migrations/20261013160000_multiple_schemes_five_slot_architecture.sql
-- Description:
--   1. Adds persistent slot_number (1..5) for all schemes (open and historical closed).
--   2. Enforces partial unique index on open statuses (ACTIVE, COMPLETED, MATURED, PARTIALLY_REDEEMED).
--   3. Historical closed schemes (FULLY_REDEEMED, EMERGENCY_REFUNDED, CANCELLED) retain valid slot 1..5
--      without blocking new open schemes in that slot.
--   4. Installs database trigger preventing slot_number mutation once assigned.
--   5. Upgrades enroll_customer_scheme with row lock on customers, lowest free slot allocation, and 6th-enrollment rejection.
--   6. Upgrades create_customer_with_scheme to explicitly assign slot 1 to initial scheme.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- STEP 1: Strict Migration Lock and Statement Timeouts
-- -----------------------------------------------------------------------------
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';

-- -----------------------------------------------------------------------------
-- STEP 2: Hardened Preflight Assertions
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_violators TEXT;
    v_null_status_count INTEGER;
    v_invalid_status_count INTEGER;
    v_orphan_count INTEGER;
    v_corrupt_count INTEGER;
    v_bad_existing_slots INTEGER;
    v_existing_open_dups INTEGER;
    v_existing_idx RECORD;
BEGIN
    -- Check 1: Explicitly detect NULL status values
    SELECT count(*) INTO v_null_status_count
    FROM public.schemes
    WHERE status IS NULL;

    IF v_null_status_count > 0 THEN
        RAISE EXCEPTION 'MIGRATION PRECONDITION FAILED: Found % scheme(s) with NULL status.', v_null_status_count;
    END IF;

    -- Check 2: Explicitly detect unrecognized status values
    SELECT count(*) INTO v_invalid_status_count
    FROM public.schemes
    WHERE status NOT IN (
        'ACTIVE', 'COMPLETED', 'MATURED', 'PARTIALLY_REDEEMED',
        'FULLY_REDEEMED', 'EMERGENCY_REFUNDED', 'CANCELLED'
    );

    IF v_invalid_status_count > 0 THEN
        RAISE EXCEPTION 'MIGRATION PRECONDITION FAILED: Found % scheme(s) with invalid status values.', v_invalid_status_count;
    END IF;

    -- Check 3: Explicitly detect schemes without valid customer references
    SELECT count(*) INTO v_orphan_count
    FROM public.schemes s
    LEFT JOIN public.customers c ON s.customer_id = c.id
    WHERE s.customer_id IS NULL OR c.id IS NULL;

    IF v_orphan_count > 0 THEN
        RAISE EXCEPTION 'MIGRATION PRECONDITION FAILED: Found % scheme(s) with missing or invalid customer references.', v_orphan_count;
    END IF;

    -- Check 4: Explicitly detect customers holding > 5 open schemes
    SELECT string_agg(customer_id::text || ' (' || cnt::text || ' open schemes)', ', ')
    INTO v_violators
    FROM (
        SELECT customer_id, count(*) AS cnt
        FROM public.schemes
        WHERE status IN ('ACTIVE', 'COMPLETED', 'MATURED', 'PARTIALLY_REDEEMED')
        GROUP BY customer_id
        HAVING count(*) > 5
    ) sub;

    IF v_violators IS NOT NULL THEN
        RAISE EXCEPTION 'MIGRATION PRECONDITION FAILED: Customer(s) exceed 5 open schemes: %', v_violators;
    END IF;

    -- Check 5: Explicitly detect corrupt timestamps or missing IDs
    SELECT count(*) INTO v_corrupt_count
    FROM public.schemes
    WHERE id IS NULL OR created_at IS NULL;

    IF v_corrupt_count > 0 THEN
        RAISE EXCEPTION 'MIGRATION PRECONDITION FAILED: Found % scheme(s) with NULL id or created_at.', v_corrupt_count;
    END IF;

    -- Check 6: If slot_number column already exists, validate pre-existing values
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'schemes' AND column_name = 'slot_number'
    ) THEN
        SELECT count(*) INTO v_bad_existing_slots
        FROM public.schemes
        WHERE slot_number IS NOT NULL AND (slot_number < 1 OR slot_number > 5);

        IF v_bad_existing_slots > 0 THEN
            RAISE EXCEPTION 'MIGRATION PRECONDITION FAILED: schemes.slot_number already contains % out-of-range value(s) (<1 or >5). Aborting without modifying data.', v_bad_existing_slots;
        END IF;

        SELECT count(*) INTO v_existing_open_dups
        FROM (
            SELECT customer_id, slot_number
            FROM public.schemes
            WHERE status IN ('ACTIVE', 'COMPLETED', 'MATURED', 'PARTIALLY_REDEEMED')
              AND slot_number IS NOT NULL
            GROUP BY customer_id, slot_number
            HAVING count(*) > 1
        ) dup;

        IF v_existing_open_dups > 0 THEN
            RAISE EXCEPTION 'MIGRATION PRECONDITION FAILED: schemes.slot_number already contains % duplicate open slot assignment(s). Aborting.', v_existing_open_dups;
        END IF;
    END IF;

    -- Check 7: Safe catalog validation for uq_schemes_customer_open_slot
    SELECT indexname, indexdef INTO v_existing_idx
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'schemes' AND indexname = 'uq_schemes_customer_open_slot';

    IF FOUND THEN
        IF v_existing_idx.indexdef NOT ILIKE 'CREATE UNIQUE INDEX%' OR
           v_existing_idx.indexdef NOT ILIKE '%(customer_id, slot_number) WHERE%' OR
           v_existing_idx.indexdef NOT ILIKE '%ACTIVE%' OR
           v_existing_idx.indexdef NOT ILIKE '%COMPLETED%' OR
           v_existing_idx.indexdef NOT ILIKE '%MATURED%' OR
           v_existing_idx.indexdef NOT ILIKE '%PARTIALLY_REDEEMED%' THEN
            RAISE EXCEPTION 'MIGRATION PRECONDITION FAILED: Index uq_schemes_customer_open_slot already exists with an incompatible definition: %', v_existing_idx.indexdef;
        END IF;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- STEP 3: Add slot_number Column (Nullable Initially)
-- -----------------------------------------------------------------------------
ALTER TABLE public.schemes
  ADD COLUMN IF NOT EXISTS slot_number SMALLINT;

-- -----------------------------------------------------------------------------
-- STEP 4: Deterministic Backfill (Preserves Existing Slots, Fills Lowest Free Slots)
-- -----------------------------------------------------------------------------
-- 4a. Backfill unallocated open schemes to the lowest available free slots (1..5)
WITH customers_with_unallocated AS (
    SELECT DISTINCT customer_id
    FROM public.schemes
    WHERE status IN ('ACTIVE', 'COMPLETED', 'MATURED', 'PARTIALLY_REDEEMED')
      AND slot_number IS NULL
),
available_slots_per_customer AS (
    SELECT
        c.customer_id,
        s.slot,
        ROW_NUMBER() OVER (
            PARTITION BY c.customer_id
            ORDER BY s.slot ASC
        ) AS slot_rank
    FROM customers_with_unallocated c
    CROSS JOIN pg_catalog.generate_series(1, 5) AS s(slot)
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.schemes existing
        WHERE existing.customer_id = c.customer_id
          AND existing.status IN ('ACTIVE', 'COMPLETED', 'MATURED', 'PARTIALLY_REDEEMED')
          AND existing.slot_number = s.slot
    )
),
unallocated_open_schemes AS (
    SELECT
        id,
        customer_id,
        ROW_NUMBER() OVER (
            PARTITION BY customer_id
            ORDER BY created_at ASC, id ASC
        ) AS unallocated_rank
    FROM public.schemes
    WHERE status IN ('ACTIVE', 'COMPLETED', 'MATURED', 'PARTIALLY_REDEEMED')
      AND slot_number IS NULL
),
allocations AS (
    SELECT
        u.id,
        a.slot AS assigned_slot
    FROM unallocated_open_schemes u
    JOIN available_slots_per_customer a
      ON u.customer_id = a.customer_id
     AND u.unallocated_rank = a.slot_rank
)
UPDATE public.schemes s
SET slot_number = al.assigned_slot
FROM allocations al
WHERE s.id = al.id;

-- 4b. Backfill unallocated closed schemes explicitly recognized as closed
UPDATE public.schemes
SET slot_number = 1
WHERE status IN ('FULLY_REDEEMED', 'EMERGENCY_REFUNDED', 'CANCELLED')
  AND slot_number IS NULL;

-- -----------------------------------------------------------------------------
-- STEP 5: Post-Backfill Integrity Assertions (Safe Transaction Abort on Failure)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_unallocated_count INTEGER;
    v_bad_slots INTEGER;
    v_open_duplicates INTEGER;
BEGIN
    -- Explicitly assert that NO scheme has a NULL slot_number
    SELECT count(*) INTO v_unallocated_count
    FROM public.schemes
    WHERE slot_number IS NULL;

    IF v_unallocated_count > 0 THEN
        RAISE EXCEPTION 'BACKFILL INTEGRITY FAILED: Found % scheme(s) remaining with NULL slot_number after backfill. Transaction aborted.', v_unallocated_count;
    END IF;

    -- Assert that every scheme in the database holds a valid slot between 1 and 5
    SELECT count(*) INTO v_bad_slots
    FROM public.schemes
    WHERE slot_number NOT BETWEEN 1 AND 5;

    IF v_bad_slots > 0 THEN
        RAISE EXCEPTION 'BACKFILL INTEGRITY FAILED: Found % scheme(s) with out-of-range slot_number (<1 or >5). Transaction aborted.', v_bad_slots;
    END IF;

    -- Assert zero duplicate slot assignments among open schemes per customer
    SELECT count(*) INTO v_open_duplicates
    FROM (
        SELECT customer_id, slot_number
        FROM public.schemes
        WHERE status IN ('ACTIVE', 'COMPLETED', 'MATURED', 'PARTIALLY_REDEEMED')
        GROUP BY customer_id, slot_number
        HAVING count(*) > 1
    ) dup;

    IF v_open_duplicates > 0 THEN
        RAISE EXCEPTION 'BACKFILL INTEGRITY FAILED: Found % duplicate open slot assignment(s). Transaction aborted.', v_open_duplicates;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- STEP 6: Apply NOT NULL & Range CHECK Constraint
-- -----------------------------------------------------------------------------
ALTER TABLE public.schemes
  ALTER COLUMN slot_number SET NOT NULL;

ALTER TABLE public.schemes
  DROP CONSTRAINT IF EXISTS chk_schemes_slot_range,
  ADD CONSTRAINT chk_schemes_slot_range
    CHECK (slot_number BETWEEN 1 AND 5);

-- -----------------------------------------------------------------------------
-- STEP 7: Catalog-Validated Partial Unique Index & Lookup Index
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_schemes_customer_open_slot
  ON public.schemes (customer_id, slot_number)
  WHERE status IN ('ACTIVE', 'COMPLETED', 'MATURED', 'PARTIALLY_REDEEMED');

CREATE INDEX IF NOT EXISTS idx_schemes_customer_slot
  ON public.schemes (customer_id, slot_number);

-- -----------------------------------------------------------------------------
-- STEP 8: Database-Level Slot Immutability Trigger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.prevent_scheme_slot_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF OLD.slot_number IS NOT NULL AND NEW.slot_number IS DISTINCT FROM OLD.slot_number THEN
        RAISE EXCEPTION 'ILLEGAL MUTATION: schemes.slot_number is immutable once assigned (scheme_id: %, current: %, attempted: %)',
            OLD.id, OLD.slot_number, NEW.slot_number;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_scheme_slot_mutation ON public.schemes;
CREATE TRIGGER trg_prevent_scheme_slot_mutation
    BEFORE UPDATE OF slot_number ON public.schemes
    FOR EACH ROW
    EXECUTE FUNCTION private.prevent_scheme_slot_mutation();

-- -----------------------------------------------------------------------------
-- STEP 9: Replacement enroll_customer_scheme RPC (Hardened Validation & Locking)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enroll_customer_scheme(
    p_customer_id UUID,
    p_start_month DATE,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_customer RECORD;
    v_scheme_id UUID;
    v_scheme_code VARCHAR(30);
    v_start_date DATE;
    v_end_date DATE;
    v_curr_month DATE;
    v_due_date DATE;
    v_i INTEGER;
    v_slot SMALLINT;
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
    v_year VARCHAR(4) := pg_catalog.to_char(v_now, 'YYYY');
BEGIN
    -- 1. Authorization check
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    -- 2. Validate p_start_month strictly
    IF p_start_month IS NULL THEN
        RAISE EXCEPTION 'Start month is required for scheme enrollment.';
    END IF;

    v_start_date := pg_catalog.date_trunc('month', p_start_month)::DATE;

    IF v_start_date < (pg_catalog.date_trunc('month', v_now)::DATE - INTERVAL '12 months')::DATE OR
       v_start_date > (pg_catalog.date_trunc('month', v_now)::DATE + INTERVAL '12 months')::DATE THEN
        RAISE EXCEPTION 'Invalid start month %: must be within 12 months of current date.', p_start_month;
    END IF;

    v_end_date := (v_start_date + INTERVAL '11 months')::DATE;

    -- 3. Lock customer row to serialize concurrent enrollments for this customer
    SELECT * INTO v_customer
    FROM public.customers
    WHERE id = p_customer_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer with ID % not found.', p_customer_id;
    END IF;

    -- 4. Dynamic slot allocation: Find lowest available slot (1..5) among open schemes
    SELECT s.slot INTO v_slot
    FROM pg_catalog.generate_series(1, 5) AS s(slot)
    WHERE NOT EXISTS (
        SELECT 1 FROM public.schemes
        WHERE customer_id = p_customer_id
          AND slot_number = s.slot
          AND status IN ('ACTIVE', 'COMPLETED', 'MATURED', 'PARTIALLY_REDEEMED')
    )
    ORDER BY s.slot
    LIMIT 1;

    IF v_slot IS NULL THEN
        RAISE EXCEPTION 'Customer already has maximum 5 active schemes.';
    END IF;

    -- 5. Generate unique scheme code (RJ-SCH-YYYY-XXXXXX)
    v_scheme_code := 'RJ-SCH-' || v_year || '-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.md5(pg_catalog.gen_random_uuid()::text), 1, 6));

    -- 6. Insert scheme enrollment with assigned slot_number
    INSERT INTO public.schemes (
        customer_id,
        scheme_code,
        slot_number,
        monthly_installment_amount,
        total_installments,
        target_contribution,
        bonus_amount,
        maturity_amount,
        start_month,
        end_month,
        status,
        enrolled_by,
        notes,
        created_at,
        updated_at
    ) VALUES (
        p_customer_id,
        v_scheme_code,
        v_slot,
        1000.00,
        12,
        12000.00,
        1000.00,
        13000.00,
        v_start_date,
        v_end_date,
        'ACTIVE',
        v_admin_id,
        p_notes,
        v_now,
        v_now
    ) RETURNING id INTO v_scheme_id;

    -- 7. Pre-generate all 12 monthly installment slots
    FOR v_i IN 1..12 LOOP
        v_curr_month := (v_start_date + ((v_i - 1) || ' months')::INTERVAL)::DATE;
        v_due_date := (pg_catalog.date_trunc('month', v_curr_month) + INTERVAL '1 month - 1 day')::DATE;

        INSERT INTO public.scheme_installments (
            scheme_id,
            customer_id,
            installment_number,
            calendar_month,
            due_date,
            installment_amount,
            status,
            paid_amount,
            paid_date,
            created_at,
            updated_at
        ) VALUES (
            v_scheme_id,
            p_customer_id,
            v_i,
            v_curr_month,
            v_due_date,
            1000.00,
            'PENDING',
            0.00,
            NULL,
            v_now,
            v_now
        );
    END LOOP;

    -- 8. Initialize scheme bonus record in PENDING state
    INSERT INTO public.scheme_bonuses (
        scheme_id,
        customer_id,
        bonus_amount,
        is_eligible,
        status,
        created_at,
        updated_at
    ) VALUES (
        v_scheme_id,
        p_customer_id,
        1000.00,
        FALSE,
        'PENDING',
        v_now,
        v_now
    );

    -- 9. Send welcome notification
    INSERT INTO public.notifications (
        customer_id,
        scheme_id,
        title,
        message,
        notification_type,
        created_at
    ) VALUES (
        p_customer_id,
        v_scheme_id,
        'Savings Scheme Enrolled',
        'Welcome to Ramyas Jeweller Savings Scheme! Scheme code: ' || v_scheme_code || ' (Slot #' || v_slot || '). 12 monthly installments of ₹1,000.',
        'GENERAL',
        v_now
    );

    -- 10. Append audit log
    PERFORM private.log_audit(
        v_admin_id,
        'SCHEME_ENROLLED',
        'schemes',
        v_scheme_id,
        NULL,
        pg_catalog.json_build_object(
            'scheme_code', v_scheme_code,
            'customer_id', p_customer_id,
            'slot_number', v_slot,
            'start_month', v_start_date,
            'end_month', v_end_date,
            'monthly_amount', 1000.00,
            'total_installments', 12
        )::jsonb,
        pg_catalog.json_build_object('customer_name', v_customer.full_name)::jsonb
    );

    -- 11. Return exact JSON contract
    RETURN pg_catalog.json_build_object(
        'success', true,
        'scheme_id', v_scheme_id,
        'scheme_code', v_scheme_code,
        'slot_number', v_slot,
        'start_month', v_start_date,
        'end_month', v_end_date
    );
END;
$$;

REVOKE ALL ON FUNCTION public.enroll_customer_scheme(UUID, DATE, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enroll_customer_scheme(UUID, DATE, TEXT) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- STEP 10: Replacement create_customer_with_scheme RPC (Explicit Slot 1)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_customer_with_scheme(
    p_full_name VARCHAR(100),
    p_phone_number VARCHAR(15),
    p_address TEXT DEFAULT NULL,
    p_city VARCHAR(50) DEFAULT 'Dindigul',
    p_pincode VARCHAR(10) DEFAULT NULL,
    p_alternate_phone VARCHAR(15) DEFAULT NULL,
    p_nominee_name VARCHAR(100) DEFAULT NULL,
    p_nominee_relationship VARCHAR(50) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_enroll_scheme BOOLEAN DEFAULT TRUE,
    p_start_month DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_clean_phone VARCHAR(15);
    v_clean_alt_phone VARCHAR(15);
    v_customer_id UUID;
    v_customer_code VARCHAR(30);
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
    v_year VARCHAR(4) := pg_catalog.to_char(v_now, 'YYYY');
    v_init_hash TEXT;

    -- Scheme Variables
    v_scheme_id UUID := NULL;
    v_scheme_code VARCHAR(30) := NULL;
    v_start_date DATE;
    v_end_date DATE;
    v_curr_month DATE;
    v_due_date DATE;
    v_i INTEGER;
BEGIN
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only registered administrators can create customers.';
    END IF;

    v_clean_phone := pg_catalog.regexp_replace(p_phone_number, '\D', '', 'g');
    IF pg_catalog.length(v_clean_phone) != 10 THEN
        RAISE EXCEPTION 'Invalid mobile number: must be exactly 10 digits.';
    END IF;

    IF pg_catalog.length(pg_catalog.btrim(p_full_name)) < 2 THEN
        RAISE EXCEPTION 'Full name is required (minimum 2 characters).';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE pg_catalog.regexp_replace(phone_number, '\D', '', 'g') = v_clean_phone
          AND role = 'ADMIN'
    ) THEN
        RAISE EXCEPTION 'This mobile number is already registered to an administrator.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.customers
        WHERE pg_catalog.regexp_replace(phone_number, '\D', '', 'g') = v_clean_phone
    ) THEN
        RAISE EXCEPTION 'A customer with this mobile number already exists.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE pg_catalog.regexp_replace(phone_number, '\D', '', 'g') = v_clean_phone
          AND role = 'CUSTOMER'
          AND NOT EXISTS (SELECT 1 FROM public.customers WHERE id = public.profiles.id)
    ) THEN
        DELETE FROM public.profiles
        WHERE pg_catalog.regexp_replace(phone_number, '\D', '', 'g') = v_clean_phone
          AND role = 'CUSTOMER'
          AND NOT EXISTS (SELECT 1 FROM public.customers WHERE id = public.profiles.id);
    END IF;

    IF p_alternate_phone IS NOT NULL THEN
        v_clean_alt_phone := NULLIF(pg_catalog.regexp_replace(p_alternate_phone, '\D', '', 'g'), '');
    ELSE
        v_clean_alt_phone := NULL;
    END IF;

    v_customer_id := pg_catalog.gen_random_uuid();
    v_customer_code := 'RJ' || v_year || '-' || lpad(nextval('public.customer_code_seq')::text, 3, '0');

    INSERT INTO public.profiles (
        id, role, phone_number, full_name, is_active, created_at, updated_at
    ) VALUES (
        v_customer_id, 'CUSTOMER', v_clean_phone, pg_catalog.btrim(p_full_name), TRUE, v_now, v_now
    );

    INSERT INTO public.customers (
        id, customer_code, phone_number, full_name, address, city, pincode,
        alternate_phone, nominee_name, nominee_relationship, notes, created_by, created_at, updated_at
    ) VALUES (
        v_customer_id, v_customer_code, v_clean_phone, pg_catalog.btrim(p_full_name),
        NULLIF(pg_catalog.btrim(p_address), ''), COALESCE(NULLIF(pg_catalog.btrim(p_city), ''), 'Dindigul'),
        NULLIF(pg_catalog.btrim(p_pincode), ''), v_clean_alt_phone, NULLIF(pg_catalog.btrim(p_nominee_name), ''),
        NULLIF(pg_catalog.btrim(p_nominee_relationship), ''), NULLIF(pg_catalog.btrim(p_notes), ''), v_admin_id, v_now, v_now
    );

    v_init_hash := extensions.crypt(pg_catalog.right(v_clean_phone, 4), extensions.gen_salt('bf', 10));
    INSERT INTO public.customer_auth (
        customer_id, password_hash, password_status, failed_login_attempts, locked_until, created_at, updated_at
    ) VALUES (
        v_customer_id, v_init_hash, 'RESET_REQUIRED', 0, NULL, v_now, v_now
    ) ON CONFLICT (customer_id) DO NOTHING;

    PERFORM private.log_audit(
        v_admin_id, 'CREATE', 'customers', v_customer_id, NULL,
        pg_catalog.jsonb_build_object('customer_id', v_customer_id, 'customer_code', v_customer_code, 'phone_number', v_clean_phone, 'full_name', pg_catalog.btrim(p_full_name)),
        pg_catalog.jsonb_build_object('source', 'admin_web_registration')
    );

    IF p_enroll_scheme IS TRUE THEN
        v_start_date := pg_catalog.date_trunc('month', COALESCE(p_start_month, v_now::date))::DATE;
        v_end_date := (v_start_date + INTERVAL '11 months')::DATE;
        v_scheme_code := 'RJ-SCH-' || v_year || '-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.md5(pg_catalog.gen_random_uuid()::text), 1, 6));

        -- Assign Slot 1 explicitly to the customer's initial scheme
        INSERT INTO public.schemes (
            customer_id, scheme_code, slot_number, monthly_installment_amount, total_installments, target_contribution,
            bonus_amount, maturity_amount, start_month, end_month, status, enrolled_by, notes, created_at, updated_at
        ) VALUES (
            v_customer_id, v_scheme_code, 1, 1000.00, 12, 12000.00, 1000.00, 13000.00, v_start_date, v_end_date, 'ACTIVE', v_admin_id, NULLIF(pg_catalog.btrim(p_notes), ''), v_now, v_now
        ) RETURNING id INTO v_scheme_id;

        FOR v_i IN 1..12 LOOP
            v_curr_month := (v_start_date + ((v_i - 1) || ' months')::INTERVAL)::DATE;
            v_due_date := (pg_catalog.date_trunc('month', v_curr_month) + INTERVAL '1 month - 1 day')::DATE;

            INSERT INTO public.scheme_installments (
                scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status, paid_amount, paid_date, created_at, updated_at
            ) VALUES (
                v_scheme_id, v_customer_id, v_i, v_curr_month, v_due_date, 1000.00, 'PENDING', 0.00, NULL, v_now, v_now
            );
        END LOOP;

        INSERT INTO public.scheme_bonuses (
            scheme_id, customer_id, bonus_amount, is_eligible, status, created_at, updated_at
        ) VALUES (
            v_scheme_id, v_customer_id, 1000.00, FALSE, 'PENDING', v_now, v_now
        );

        INSERT INTO public.notifications (
            customer_id, scheme_id, title, message, notification_type, created_at
        ) VALUES (
            v_customer_id, v_scheme_id, 'Welcome to Diwali Savings Scheme!', 'You have successfully enrolled in the 12-Month Diwali Savings Scheme (' || v_scheme_code || ', Slot #1). Deposit ₹1,000/month to earn your 100% 1-month bonus!', 'GENERAL', v_now
        );

        PERFORM private.log_audit(
            v_admin_id, 'ENROLL_SCHEME', 'schemes', v_scheme_id, NULL,
            pg_catalog.jsonb_build_object('scheme_id', v_scheme_id, 'scheme_code', v_scheme_code, 'customer_id', v_customer_id, 'slot_number', 1, 'monthly_installment_amount', 1000.00, 'total_installments', 12),
            pg_catalog.jsonb_build_object('source', 'admin_web_customer_registration')
        );
    END IF;

    RETURN pg_catalog.jsonb_build_object(
        'success', TRUE,
        'customer_id', v_customer_id,
        'customer_code', v_customer_code,
        'full_name', pg_catalog.btrim(p_full_name),
        'phone_number', v_clean_phone,
        'scheme_id', v_scheme_id,
        'scheme_code', v_scheme_code,
        'slot_number', CASE WHEN p_enroll_scheme IS TRUE THEN 1 ELSE NULL END
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_customer_with_scheme(VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, BOOLEAN, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_customer_with_scheme(VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, BOOLEAN, DATE) TO authenticated, service_role;

COMMIT;
