-- =============================================================================
-- RAMYAS JEWELLER - Jewellery Savings Scheme Management System
-- Database Migration: 002_rls_security.sql
-- Description: Production Row Level Security (RLS), security schema,
--              controlled financial RPC mutations, and strict permission lockdown.
-- =============================================================================

-- =============================================================================
-- 1. DATA INTEGRITY CONSTRAINTS
-- =============================================================================

-- Ensure customer mobile numbers are strictly unique across customers
-- (Note: profiles.phone_number is already UNIQUE in 001_initial_schema.sql)
ALTER TABLE public.customers
    ADD CONSTRAINT uq_customers_phone_number UNIQUE (phone_number);

-- =============================================================================
-- 2. PRIVATE SECURITY SCHEMA & HELPER FUNCTIONS
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

-- Function: private.is_admin()
-- Verifies whether the calling user has an active admin record
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE id = auth.uid()
    );
$$;

-- Function: private.is_super_admin()
-- Verifies whether the calling user has super-admin status (Store Owner)
CREATE OR REPLACE FUNCTION private.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE id = auth.uid() AND is_super_admin = TRUE
    );
$$;

-- Function: private.log_audit()
-- Internal helper to record structured audit trails from security-definer procedures
CREATE OR REPLACE FUNCTION private.log_audit(
    p_actor_id UUID,
    p_action VARCHAR(50),
    p_entity_table VARCHAR(50),
    p_entity_id UUID,
    p_old_values JSONB,
    p_new_values JSONB,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_table,
        entity_id,
        old_values,
        new_values,
        metadata,
        created_at
    ) VALUES (
        p_actor_id,
        p_action,
        p_entity_table,
        p_entity_id,
        p_old_values,
        p_new_values,
        p_metadata,
        pg_catalog.clock_timestamp()
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

-- Access Control on Private Functions:
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.log_audit(UUID, VARCHAR, VARCHAR, UUID, JSONB, JSONB, JSONB) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_super_admin() TO authenticated;
-- Note: private.log_audit is strictly internal to SECURITY DEFINER functions; NO grant to authenticated.

-- =============================================================================
-- 3. RLS PERFORMANCE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_schemes_customer_rls ON public.schemes (customer_id);
CREATE INDEX IF NOT EXISTS idx_installments_customer_rls ON public.scheme_installments (customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_rls ON public.payments (customer_id);
CREATE INDEX IF NOT EXISTS idx_bonuses_customer_rls ON public.scheme_bonuses (customer_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_customer_rls ON public.redemptions (customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_customer_read ON public.notifications (customer_id, is_read);
CREATE INDEX IF NOT EXISTS idx_redemption_items_parent ON public.redemption_items (redemption_id);

-- =============================================================================
-- 4. ENABLE ROW LEVEL SECURITY ON ALL 11 TABLES
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheme_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheme_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemption_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 5. COLUMN-LEVEL PRIVILEGE LOCKDOWN & POLICIES
-- =============================================================================

-- Revoke default table-level direct mutations on financial/state-sensitive tables
REVOKE INSERT, UPDATE, DELETE ON public.schemes FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.scheme_installments FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.scheme_bonuses FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.redemptions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.redemption_items FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM authenticated;

-- Schemes: Direct INSERT is revoked completely (schemes must be enrolled via enroll_customer_scheme).
-- Direct UPDATE is allowed ONLY on the non-financial 'notes' column.
GRANT UPDATE (notes) ON public.schemes TO authenticated;

-- Profiles: Restrict UPDATE to safe display/contact columns (disallow id, role, and is_active modification)
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (phone_number, full_name) ON public.profiles TO authenticated;

-- Customers: Restrict UPDATE to safe contact/nominee metadata (disallow id, customer_code, created_by)
REVOKE UPDATE ON public.customers FROM authenticated;
GRANT UPDATE (phone_number, full_name, address, city, pincode, alternate_phone, nominee_name, nominee_relationship, notes) ON public.customers TO authenticated;

-- -----------------------------------------------------------------------------
-- 5.1. PROFILES POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY admin_select_profiles ON public.profiles
    FOR SELECT TO authenticated
    USING (private.is_admin());

CREATE POLICY admin_insert_profiles ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        private.is_admin() AND (
            role = 'CUSTOMER' OR (role = 'ADMIN' AND private.is_super_admin())
        )
    );

CREATE POLICY admin_update_profiles ON public.profiles
    FOR UPDATE TO authenticated
    USING (private.is_admin())
    WITH CHECK (private.is_admin());

-- -----------------------------------------------------------------------------
-- 5.2. ADMIN_USERS POLICIES (Privilege Escalation Protection)
-- -----------------------------------------------------------------------------
CREATE POLICY admin_select_admin_users ON public.admin_users
    FOR SELECT TO authenticated
    USING (private.is_admin());

CREATE POLICY super_admin_insert_admin_users ON public.admin_users
    FOR INSERT TO authenticated
    WITH CHECK (private.is_super_admin());

CREATE POLICY super_admin_update_admin_users ON public.admin_users
    FOR UPDATE TO authenticated
    USING (private.is_super_admin())
    WITH CHECK (private.is_super_admin());

-- -----------------------------------------------------------------------------
-- 5.3. CUSTOMERS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY admin_select_customers ON public.customers
    FOR SELECT TO authenticated
    USING (private.is_admin());

CREATE POLICY admin_insert_customers ON public.customers
    FOR INSERT TO authenticated
    WITH CHECK (private.is_admin());

CREATE POLICY admin_update_customers ON public.customers
    FOR UPDATE TO authenticated
    USING (private.is_admin())
    WITH CHECK (private.is_admin());

-- -----------------------------------------------------------------------------
-- 5.4. SCHEMES POLICIES (SELECT Allowed; UPDATE on 'notes' Only; INSERT Blocked)
-- -----------------------------------------------------------------------------
CREATE POLICY admin_select_schemes ON public.schemes
    FOR SELECT TO authenticated
    USING (private.is_admin());

CREATE POLICY admin_update_schemes ON public.schemes
    FOR UPDATE TO authenticated
    USING (private.is_admin())
    WITH CHECK (private.is_admin());

-- -----------------------------------------------------------------------------
-- 5.5. FINANCIAL TABLES (Direct PostgREST Writes Blocked; SELECT Allowed for Admins)
-- -----------------------------------------------------------------------------
CREATE POLICY admin_select_scheme_installments ON public.scheme_installments
    FOR SELECT TO authenticated
    USING (private.is_admin());

CREATE POLICY admin_select_payments ON public.payments
    FOR SELECT TO authenticated
    USING (private.is_admin());

CREATE POLICY admin_select_scheme_bonuses ON public.scheme_bonuses
    FOR SELECT TO authenticated
    USING (private.is_admin());

CREATE POLICY admin_select_redemptions ON public.redemptions
    FOR SELECT TO authenticated
    USING (private.is_admin());

CREATE POLICY admin_select_redemption_items ON public.redemption_items
    FOR SELECT TO authenticated
    USING (private.is_admin());

-- -----------------------------------------------------------------------------
-- 5.6. NOTIFICATIONS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY admin_select_notifications ON public.notifications
    FOR SELECT TO authenticated
    USING (private.is_admin());

CREATE POLICY admin_insert_notifications ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (private.is_admin());

CREATE POLICY admin_update_notifications ON public.notifications
    FOR UPDATE TO authenticated
    USING (private.is_admin())
    WITH CHECK (private.is_admin());

CREATE POLICY admin_delete_notifications ON public.notifications
    FOR DELETE TO authenticated
    USING (private.is_admin());

-- -----------------------------------------------------------------------------
-- 5.7. AUDIT LOGS POLICIES (Immutable; SELECT for Admins only)
-- -----------------------------------------------------------------------------
CREATE POLICY admin_select_audit_logs ON public.audit_logs
    FOR SELECT TO authenticated
    USING (private.is_admin());

-- =============================================================================
-- 6. CONTROLLED SECURITY DEFINER RPC MUTATIONS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 6.1. ENROLL CUSTOMER IN SCHEME (Atomic Setup of Scheme, 12 Installments & Bonus)
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
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
    v_year VARCHAR(4) := pg_catalog.to_char(v_now, 'YYYY');
BEGIN
    -- 1. Authorization check
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only registered administrators can enroll schemes.';
    END IF;

    -- 2. Verify customer exists
    SELECT * INTO v_customer
    FROM public.customers
    WHERE id = p_customer_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer with ID % not found.', p_customer_id;
    END IF;

    -- 3. Normalize calendar boundary
    v_start_date := pg_catalog.date_trunc('month', p_start_month)::DATE;
    v_end_date := (v_start_date + INTERVAL '11 months')::DATE;

    -- 4. Generate unique scheme code (RJ-SCH-YYYY-XXXXX)
    v_scheme_code := 'RJ-SCH-' || v_year || '-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.md5(pg_catalog.gen_random_uuid()::text), 1, 6));

    -- 5. Insert scheme enrollment
    INSERT INTO public.schemes (
        customer_id,
        scheme_code,
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

    -- 6. Pre-generate all 12 monthly installment slots
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

    -- 7. Initialize scheme bonus record in PENDING state
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

    -- 8. Send welcome notification
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
        'Welcome to Ramyas Jeweller Savings Scheme! Scheme code: ' || v_scheme_code || '. 12 monthly installments of ₹1,000.',
        'GENERAL',
        v_now
    );

    -- 9. Append audit log
    PERFORM private.log_audit(
        v_admin_id,
        'SCHEME_ENROLLED',
        'schemes',
        v_scheme_id,
        NULL,
        pg_catalog.json_build_object(
            'scheme_code', v_scheme_code,
            'customer_id', p_customer_id,
            'start_month', v_start_date,
            'end_month', v_end_date,
            'monthly_amount', 1000.00,
            'total_installments', 12
        )::jsonb,
        pg_catalog.json_build_object('customer_name', v_customer.full_name)::jsonb
    );

    RETURN pg_catalog.json_build_object(
        'success', true,
        'scheme_id', v_scheme_id,
        'scheme_code', v_scheme_code,
        'start_month', v_start_date,
        'end_month', v_end_date
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 6.2. RECORD INSTALLMENT PAYMENT (Bonus Verification & Concurrency Protected)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_installment_payment(
    p_scheme_id UUID,
    p_installment_number INTEGER,
    p_payment_method VARCHAR(30),
    p_transaction_reference VARCHAR(100) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_scheme RECORD;
    v_installment RECORD;
    v_bonus RECORD;
    v_payment_id UUID;
    v_receipt_number VARCHAR(50);
    v_paid_count INTEGER;
    v_bonus_credited BOOLEAN := FALSE;
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
    v_year VARCHAR(4) := pg_catalog.to_char(v_now, 'YYYY');
BEGIN
    -- 1. Verify caller authorization
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only registered administrators can record payments.';
    END IF;

    -- 2. Validate installment number boundary
    IF p_installment_number < 1 OR p_installment_number > 12 THEN
        RAISE EXCEPTION 'Invalid installment number %. Must be between 1 and 12.', p_installment_number;
    END IF;

    -- 3. Validate payment method
    IF p_payment_method NOT IN ('CASH', 'GPAY', 'PHONEPE', 'BANK_TRANSFER', 'UPI', 'CARD', 'OTHER') THEN
        RAISE EXCEPTION 'Invalid payment method %. Supported methods: CASH, GPAY, PHONEPE, BANK_TRANSFER, UPI, CARD, OTHER.', p_payment_method;
    END IF;

    -- 4. Lock scheme record for concurrency protection
    SELECT * INTO v_scheme
    FROM public.schemes
    WHERE id = p_scheme_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Scheme enrollment with ID % not found.', p_scheme_id;
    END IF;

    IF v_scheme.status NOT IN ('ACTIVE', 'COMPLETED') THEN
        RAISE EXCEPTION 'Cannot record payment for scheme with status %.', v_scheme.status;
    END IF;

    -- 5. Lock and verify installment slot
    SELECT * INTO v_installment
    FROM public.scheme_installments
    WHERE scheme_id = p_scheme_id AND installment_number = p_installment_number
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Installment number % not found for scheme %.', p_installment_number, p_scheme_id;
    END IF;

    IF v_installment.status = 'PAID' THEN
        RAISE EXCEPTION 'Installment number % has already been paid on %.', p_installment_number, v_installment.paid_date;
    END IF;

    IF v_installment.calendar_month > pg_catalog.date_trunc('month', v_now)::DATE THEN
        RAISE EXCEPTION 'Installment % for calendar month % cannot be paid before that month begins.', p_installment_number, v_installment.calendar_month;
    END IF;

    -- 6. Generate unique receipt number (RJ-RCP-YYYY-XXXXX)
    v_receipt_number := 'RJ-RCP-' || v_year || '-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.md5(pg_catalog.gen_random_uuid()::text), 1, 6));

    -- 7. Insert payment record (strictly ₹1,000.00)
    INSERT INTO public.payments (
        receipt_number,
        customer_id,
        scheme_id,
        installment_id,
        installment_number,
        amount,
        payment_date,
        payment_method,
        transaction_reference,
        payment_status,
        recorded_by,
        notes,
        created_at,
        updated_at
    ) VALUES (
        v_receipt_number,
        v_scheme.customer_id,
        p_scheme_id,
        v_installment.id,
        p_installment_number,
        1000.00,
        v_now,
        p_payment_method,
        p_transaction_reference,
        'SUCCESS',
        v_admin_id,
        p_notes,
        v_now,
        v_now
    ) RETURNING id INTO v_payment_id;

    -- 8. Update installment status
    UPDATE public.scheme_installments
    SET status = 'PAID',
        paid_amount = 1000.00,
        paid_date = v_now,
        updated_at = v_now
    WHERE id = v_installment.id;

    -- 9. Audit total paid installments for completion & bonus triggering
    SELECT pg_catalog.count(*) INTO v_paid_count
    FROM public.scheme_installments
    WHERE scheme_id = p_scheme_id AND status = 'PAID';

    -- 10. Bonus Guarantee on 12th completed installment
    IF v_paid_count = 12 THEN
        -- Atomic UPSERT ensures exactly one credited bonus row exists
        INSERT INTO public.scheme_bonuses (
            scheme_id,
            customer_id,
            bonus_amount,
            is_eligible,
            status,
            credited_date,
            credited_by,
            created_at,
            updated_at
        ) VALUES (
            p_scheme_id,
            v_scheme.customer_id,
            1000.00,
            TRUE,
            'CREDITED',
            v_now,
            v_admin_id,
            v_now,
            v_now
        )
        ON CONFLICT (scheme_id) DO UPDATE
        SET is_eligible = TRUE,
            status = 'CREDITED',
            bonus_amount = 1000.00,
            credited_date = v_now,
            credited_by = v_admin_id,
            updated_at = v_now
        WHERE public.scheme_bonuses.status = 'PENDING';

        -- Verify bonus row state explicitly
        SELECT * INTO v_bonus
        FROM public.scheme_bonuses
        WHERE scheme_id = p_scheme_id;

        IF FOUND AND v_bonus.status = 'CREDITED' AND v_bonus.bonus_amount = 1000.00 AND v_bonus.is_eligible = TRUE THEN
            v_bonus_credited := TRUE;

            -- Transition scheme status to MATURED
            UPDATE public.schemes
            SET status = 'MATURED',
                updated_at = v_now
            WHERE id = p_scheme_id;

            -- Create maturity notification
            INSERT INTO public.notifications (
                customer_id,
                scheme_id,
                title,
                message,
                notification_type,
                created_at
            ) VALUES (
                v_scheme.customer_id,
                p_scheme_id,
                'Scheme Matured with Bonus!',
                'Congratulations! All 12 monthly installments are completed. Your ₹1,000 bonus has been credited. Total eligible maturity balance: ₹13,000.',
                'BONUS_CREDITED',
                v_now
            );
        END IF;
    END IF;

    -- 11. Create standard payment notification
    INSERT INTO public.notifications (
        customer_id,
        scheme_id,
        title,
        message,
        notification_type,
        created_at
    ) VALUES (
        v_scheme.customer_id,
        p_scheme_id,
        'Installment Payment Received',
        'Payment of ₹1,000 for installment #' || p_installment_number || ' has been recorded. Receipt: ' || v_receipt_number,
        'PAYMENT_RECORDED',
        v_now
    );

    -- 12. Append audit log
    PERFORM private.log_audit(
        v_admin_id,
        'PAYMENT_RECORDED',
        'payments',
        v_payment_id,
        NULL,
        pg_catalog.json_build_object(
            'receipt_number', v_receipt_number,
            'scheme_id', p_scheme_id,
            'installment_number', p_installment_number,
            'amount', 1000.00,
            'bonus_credited', v_bonus_credited,
            'paid_count', v_paid_count
        )::jsonb,
        pg_catalog.json_build_object('method', p_payment_method)::jsonb
    );

    RETURN pg_catalog.json_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'receipt_number', v_receipt_number,
        'paid_count', v_paid_count,
        'bonus_credited', v_bonus_credited,
        'status', CASE WHEN v_paid_count = 12 AND v_bonus_credited THEN 'MATURED' ELSE 'ACTIVE' END
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 6.3. RECORD SCHEME REDEMPTION (Strict Item Reconciliation & Math Validation)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_scheme_redemption(
    p_scheme_id UUID,
    p_scheme_amount_used NUMERIC(12, 2),
    p_purchase_total NUMERIC(12, 2),
    p_invoice_number VARCHAR(50),
    p_items JSONB,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_scheme RECORD;
    v_bonus RECORD;
    v_total_paid NUMERIC(12, 2) := 0.00;
    v_bonus_amount NUMERIC(12, 2) := 0.00;
    v_total_redeemed NUMERIC(12, 2) := 0.00;
    v_available_balance NUMERIC(12, 2) := 0.00;
    v_new_balance NUMERIC(12, 2) := 0.00;
    v_customer_paid_balance NUMERIC(12, 2) := 0.00;
    v_redemption_id UUID;
    v_redemption_code VARCHAR(30);
    v_item RECORD;
    v_items_sum NUMERIC(12, 2) := 0.00;
    v_item_final NUMERIC(12, 2) := 0.00;
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
    v_year VARCHAR(4) := pg_catalog.to_char(v_now, 'YYYY');
    v_new_scheme_status VARCHAR(25);
BEGIN
    -- 1. Verify caller authorization
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only registered administrators can process redemptions.';
    END IF;

    -- 2. Validate basic input parameters
    IF p_scheme_amount_used IS NULL OR p_scheme_amount_used <= 0 THEN
        RAISE EXCEPTION 'Scheme amount used must be strictly positive.';
    END IF;

    IF p_purchase_total IS NULL OR p_purchase_total < p_scheme_amount_used THEN
        RAISE EXCEPTION 'Purchase total (₹%) cannot be less than scheme amount used (₹%).', p_purchase_total, p_scheme_amount_used;
    END IF;

    IF p_items IS NULL OR pg_catalog.jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Redemption must contain at least one item breakdown.';
    END IF;

    -- 3. Reconcile Itemized Breakdown Against Purchase Total
    FOR v_item IN SELECT * FROM pg_catalog.jsonb_to_recordset(p_items) AS (
        item_description VARCHAR(255),
        category VARCHAR(30),
        quantity NUMERIC(8, 3),
        product_amount NUMERIC(12, 2),
        making_charges NUMERIC(12, 2),
        wastage_charges NUMERIC(12, 2),
        stone_charges NUMERIC(12, 2),
        other_charges NUMERIC(12, 2)
    )
    LOOP
        -- Validate item fields
        IF v_item.item_description IS NULL OR pg_catalog.trim(v_item.item_description) = '' THEN
            RAISE EXCEPTION 'Item description cannot be empty.';
        END IF;

        IF v_item.category NOT IN ('GOLD', 'SILVER', 'OTHER') THEN
            RAISE EXCEPTION 'Invalid item category %. Must be GOLD, SILVER, or OTHER.', v_item.category;
        END IF;

        IF v_item.quantity IS NOT NULL AND v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be strictly positive.';
        END IF;

        IF pg_catalog.coalesce(v_item.product_amount, 0) < 0 OR
           pg_catalog.coalesce(v_item.making_charges, 0) < 0 OR
           pg_catalog.coalesce(v_item.wastage_charges, 0) < 0 OR
           pg_catalog.coalesce(v_item.stone_charges, 0) < 0 OR
           pg_catalog.coalesce(v_item.other_charges, 0) < 0 THEN
            RAISE EXCEPTION 'Item charges and product amounts cannot be negative.';
        END IF;

        v_item_final := pg_catalog.coalesce(v_item.product_amount, 0.00) +
                        pg_catalog.coalesce(v_item.making_charges, 0.00) +
                        pg_catalog.coalesce(v_item.wastage_charges, 0.00) +
                        pg_catalog.coalesce(v_item.stone_charges, 0.00) +
                        pg_catalog.coalesce(v_item.other_charges, 0.00);

        v_items_sum := v_items_sum + v_item_final;
    END LOOP;

    -- Strict reconciliation check: Sum of item lines MUST match p_purchase_total
    IF v_items_sum <> p_purchase_total THEN
        RAISE EXCEPTION 'Itemized total (₹%) does not match purchase total (₹%).', v_items_sum, p_purchase_total;
    END IF;

    -- 4. Lock scheme record for concurrency protection
    SELECT * INTO v_scheme
    FROM public.schemes
    WHERE id = p_scheme_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Scheme enrollment with ID % not found.', p_scheme_id;
    END IF;

    IF v_scheme.status NOT IN ('MATURED', 'PARTIALLY_REDEEMED') THEN
        RAISE EXCEPTION 'Scheme status is %. Redemptions are only permitted on MATURED or PARTIALLY_REDEEMED schemes.', v_scheme.status;
    END IF;

    -- 5. Calculate total contributions paid
    SELECT pg_catalog.coalesce(pg_catalog.sum(paid_amount), 0.00) INTO v_total_paid
    FROM public.scheme_installments
    WHERE scheme_id = p_scheme_id AND status = 'PAID';

    -- 6. Calculate credited bonus
    SELECT * INTO v_bonus
    FROM public.scheme_bonuses
    WHERE scheme_id = p_scheme_id;

    IF FOUND AND v_bonus.status = 'CREDITED' THEN
        v_bonus_amount := v_bonus.bonus_amount;
    END IF;

    -- 7. Calculate total scheme amounts already redeemed
    SELECT pg_catalog.coalesce(pg_catalog.sum(scheme_amount_used), 0.00) INTO v_total_redeemed
    FROM public.redemptions
    WHERE scheme_id = p_scheme_id AND status = 'COMPLETED';

    -- 8. Compute available balance & verify sufficiency
    v_available_balance := (v_total_paid + v_bonus_amount) - v_total_redeemed;

    IF p_scheme_amount_used > v_available_balance THEN
        RAISE EXCEPTION 'Redemption amount ₹% exceeds available scheme balance of ₹%.', p_scheme_amount_used, v_available_balance;
    END IF;

    v_new_balance := v_available_balance - p_scheme_amount_used;
    v_customer_paid_balance := p_purchase_total - p_scheme_amount_used;

    -- 9. Generate unique redemption code (RJ-RED-YYYY-XXXXX)
    v_redemption_code := 'RJ-RED-' || v_year || '-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.md5(pg_catalog.gen_random_uuid()::text), 1, 6));

    -- 10. Insert redemption transaction
    INSERT INTO public.redemptions (
        redemption_code,
        customer_id,
        scheme_id,
        redemption_date,
        scheme_balance_before,
        scheme_amount_used,
        scheme_balance_after,
        purchase_total,
        customer_paid_balance,
        invoice_number,
        status,
        recorded_by,
        notes,
        created_at,
        updated_at
    ) VALUES (
        v_redemption_code,
        v_scheme.customer_id,
        p_scheme_id,
        v_now,
        v_available_balance,
        p_scheme_amount_used,
        v_new_balance,
        p_purchase_total,
        v_customer_paid_balance,
        p_invoice_number,
        'COMPLETED',
        v_admin_id,
        p_notes,
        v_now,
        v_now
    ) RETURNING id INTO v_redemption_id;

    -- 11. Insert itemized purchase lines
    FOR v_item IN SELECT * FROM pg_catalog.jsonb_to_recordset(p_items) AS (
        item_description VARCHAR(255),
        category VARCHAR(30),
        quantity NUMERIC(8, 3),
        product_amount NUMERIC(12, 2),
        making_charges NUMERIC(12, 2),
        wastage_charges NUMERIC(12, 2),
        stone_charges NUMERIC(12, 2),
        other_charges NUMERIC(12, 2)
    )
    LOOP
        INSERT INTO public.redemption_items (
            redemption_id,
            item_description,
            category,
            quantity,
            product_amount,
            making_charges,
            wastage_charges,
            stone_charges,
            other_charges,
            final_item_amount,
            created_at
        ) VALUES (
            v_redemption_id,
            v_item.item_description,
            v_item.category,
            pg_catalog.coalesce(v_item.quantity, 1.000),
            pg_catalog.coalesce(v_item.product_amount, 0.00),
            pg_catalog.coalesce(v_item.making_charges, 0.00),
            pg_catalog.coalesce(v_item.wastage_charges, 0.00),
            pg_catalog.coalesce(v_item.stone_charges, 0.00),
            pg_catalog.coalesce(v_item.other_charges, 0.00),
            (
                pg_catalog.coalesce(v_item.product_amount, 0.00) +
                pg_catalog.coalesce(v_item.making_charges, 0.00) +
                pg_catalog.coalesce(v_item.wastage_charges, 0.00) +
                pg_catalog.coalesce(v_item.stone_charges, 0.00) +
                pg_catalog.coalesce(v_item.other_charges, 0.00)
            ),
            v_now
        );
    END LOOP;

    -- 12. Update scheme status (PARTIALLY_REDEEMED vs FULLY_REDEEMED)
    IF v_new_balance = 0.00 THEN
        v_new_scheme_status := 'FULLY_REDEEMED';
    ELSE
        v_new_scheme_status := 'PARTIALLY_REDEEMED';
    END IF;

    UPDATE public.schemes
    SET status = v_new_scheme_status,
        updated_at = v_now
    WHERE id = p_scheme_id;

    -- 13. Create customer notification
    INSERT INTO public.notifications (
        customer_id,
        scheme_id,
        title,
        message,
        notification_type,
        created_at
    ) VALUES (
        v_scheme.customer_id,
        p_scheme_id,
        'Scheme Redemption Processed',
        'Redemption of ₹' || p_scheme_amount_used || ' applied against invoice #' || pg_catalog.coalesce(p_invoice_number, 'N/A') || '. Remaining scheme balance: ₹' || v_new_balance || ' (Lifetime Validity).',
        'REDEMPTION_UPDATE',
        v_now
    );

    -- 14. Append audit log
    PERFORM private.log_audit(
        v_admin_id,
        'REDEMPTION_PROCESSED',
        'redemptions',
        v_redemption_id,
        NULL,
        pg_catalog.json_build_object(
            'redemption_code', v_redemption_code,
            'scheme_id', p_scheme_id,
            'scheme_amount_used', p_scheme_amount_used,
            'purchase_total', p_purchase_total,
            'customer_paid_balance', v_customer_paid_balance,
            'scheme_balance_after', v_new_balance,
            'status', v_new_scheme_status
        )::jsonb,
        pg_catalog.json_build_object('invoice_number', p_invoice_number)::jsonb
    );

    RETURN pg_catalog.json_build_object(
        'success', true,
        'redemption_id', v_redemption_id,
        'redemption_code', v_redemption_code,
        'scheme_amount_used', p_scheme_amount_used,
        'customer_paid_balance', v_customer_paid_balance,
        'remaining_scheme_balance', v_new_balance,
        'scheme_status', v_new_scheme_status
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 6.4. PROCESS EMERGENCY REFUND (Super-Admin Restricted & Balance Capped)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_emergency_refund(
    p_scheme_id UUID,
    p_refund_amount NUMERIC(12, 2),
    p_refund_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_scheme RECORD;
    v_total_paid NUMERIC(12, 2) := 0.00;
    v_total_redeemed NUMERIC(12, 2) := 0.00;
    v_refundable_balance NUMERIC(12, 2) := 0.00;
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
BEGIN
    -- 1. Verify super-admin authorization
    IF NOT private.is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only Super Administrators (Store Owner) can execute emergency refunds.';
    END IF;

    -- 2. Validate refund amount
    IF p_refund_amount IS NULL OR p_refund_amount <= 0 THEN
        RAISE EXCEPTION 'Refund amount must be strictly positive.';
    END IF;

    -- 3. Lock scheme record for concurrency protection
    SELECT * INTO v_scheme
    FROM public.schemes
    WHERE id = p_scheme_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Scheme enrollment with ID % not found.', p_scheme_id;
    END IF;

    IF v_scheme.status IN ('EMERGENCY_REFUNDED', 'CANCELLED', 'FULLY_REDEEMED') THEN
        RAISE EXCEPTION 'Scheme cannot be refunded in current status (%).', v_scheme.status;
    END IF;

    -- 4. Calculate total contributions paid
    SELECT pg_catalog.coalesce(pg_catalog.sum(paid_amount), 0.00) INTO v_total_paid
    FROM public.scheme_installments
    WHERE scheme_id = p_scheme_id AND status = 'PAID';

    SELECT pg_catalog.coalesce(pg_catalog.sum(scheme_amount_used), 0.00) INTO v_total_redeemed
    FROM public.redemptions
    WHERE scheme_id = p_scheme_id AND status = 'COMPLETED';

    v_refundable_balance := v_total_paid - v_total_redeemed;

    IF p_refund_amount > v_refundable_balance THEN
        RAISE EXCEPTION 'Refund amount (₹%) cannot exceed net unredeemed paid contribution (₹%).', p_refund_amount, v_refundable_balance;
    END IF;

    -- 5. Update scheme record
    UPDATE public.schemes
    SET status = 'EMERGENCY_REFUNDED',
        emergency_refund_amount = p_refund_amount,
        emergency_refund_date = v_now,
        emergency_refund_by = v_admin_id,
        emergency_refund_notes = p_refund_notes,
        updated_at = v_now
    WHERE id = p_scheme_id;

    -- 6. Forfeit any pending bonus
    UPDATE public.scheme_bonuses
    SET status = 'FORFEITED',
        is_eligible = FALSE,
        notes = 'Forfeited due to emergency refund authorization.',
        updated_at = v_now
    WHERE scheme_id = p_scheme_id AND status = 'PENDING';

    -- 7. Insert notification
    INSERT INTO public.notifications (
        customer_id,
        scheme_id,
        title,
        message,
        notification_type,
        created_at
    ) VALUES (
        v_scheme.customer_id,
        p_scheme_id,
        'Emergency Refund Processed',
        'An emergency manual refund of ₹' || p_refund_amount || ' has been processed by store administration.',
        'SHOP_UPDATE',
        v_now
    );

    -- 8. Append audit log
    PERFORM private.log_audit(
        v_admin_id,
        'EMERGENCY_REFUND_EXECUTED',
        'schemes',
        p_scheme_id,
        pg_catalog.json_build_object('status', v_scheme.status)::jsonb,
        pg_catalog.json_build_object(
            'status', 'EMERGENCY_REFUNDED',
            'refund_amount', p_refund_amount,
            'refund_notes', p_refund_notes
        )::jsonb,
        pg_catalog.json_build_object('total_paid', v_total_paid, 'total_redeemed', v_total_redeemed)::jsonb
    );

    RETURN pg_catalog.json_build_object(
        'success', true,
        'scheme_id', p_scheme_id,
        'refund_amount', p_refund_amount,
        'status', 'EMERGENCY_REFUNDED'
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 6.5. EXECUTION PERMISSIONS ON RPC FUNCTIONS
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.enroll_customer_scheme(UUID, DATE, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_installment_payment(UUID, INTEGER, VARCHAR, VARCHAR, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_scheme_redemption(UUID, NUMERIC, NUMERIC, VARCHAR, JSONB, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_emergency_refund(UUID, NUMERIC, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.enroll_customer_scheme(UUID, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_installment_payment(UUID, INTEGER, VARCHAR, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_scheme_redemption(UUID, NUMERIC, NUMERIC, VARCHAR, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_emergency_refund(UUID, NUMERIC, TEXT) TO authenticated;

-- =============================================================================
-- End of Migration: 002_rls_security.sql
-- =============================================================================
