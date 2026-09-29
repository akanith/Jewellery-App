-- =============================================================================
-- RAMYAS JEWELLER - Jewellery Savings Scheme Management System
-- Database Migration: 20260929215000_admin_cleanup_pre_production_audit_logs_rpc.sql
-- Description: Controlled SECURITY DEFINER RPC to safely remove pre-production
--              development/E2E audit log records prior to the creation of
--              first real production customer RJ2026-001 while preserving all
--              production audit records and application data.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_cleanup_pre_production_audit_logs(
    p_cutoff timestamptz DEFAULT '2026-09-29 14:24:01.921929+00:00'::timestamptz,
    p_execute boolean DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_total_before bigint;
    v_pre_prod_before bigint;
    v_prod_before bigint;
    v_deleted_count bigint := 0;
    v_total_after bigint;
    v_customers_count bigint;
    v_payments_count bigint;
    v_total_installments bigint;
    v_paid_installments bigint;
    v_pending_installments bigint;
    v_bonuses_count bigint;
    v_redemptions_count bigint;
    v_admin_users_count bigint;
    v_rj2026_001_code text;
BEGIN
    -- 1. Security Check
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only registered administrators can execute audit log cleanup.';
    END IF;

    -- 2. Pre-delete Counts
    SELECT COUNT(*) INTO v_total_before FROM public.audit_logs;
    SELECT COUNT(*) INTO v_pre_prod_before FROM public.audit_logs WHERE created_at < p_cutoff;
    SELECT COUNT(*) INTO v_prod_before FROM public.audit_logs WHERE created_at >= p_cutoff;

    -- 3. Strict Pre-delete Verification
    IF v_prod_before <> 8 THEN
        RAISE EXCEPTION 'Aborted: Expected exactly 8 production audit records at or after cutoff %, found %', p_cutoff, v_prod_before;
    END IF;

    IF v_pre_prod_before < 3859 THEN
        RAISE EXCEPTION 'Aborted: Expected at least 3859 pre-production audit records before cutoff %, found %', p_cutoff, v_pre_prod_before;
    END IF;

    -- 4. Execution Phase
    IF p_execute THEN
        DELETE FROM public.audit_logs WHERE created_at < p_cutoff;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    END IF;

    -- 5. Post-delete Verification
    SELECT COUNT(*) INTO v_total_after FROM public.audit_logs;
    SELECT COUNT(*) INTO v_customers_count FROM public.customers;
    SELECT COUNT(*) INTO v_payments_count FROM public.payments;
    SELECT COUNT(*) INTO v_total_installments FROM public.scheme_installments;
    SELECT COUNT(*) INTO v_paid_installments FROM public.scheme_installments WHERE status = 'PAID';
    SELECT COUNT(*) INTO v_pending_installments FROM public.scheme_installments WHERE status = 'PENDING';
    SELECT COUNT(*) INTO v_bonuses_count FROM public.scheme_bonuses;
    SELECT COUNT(*) INTO v_redemptions_count FROM public.redemptions;
    SELECT COUNT(*) INTO v_admin_users_count FROM public.admin_users;

    SELECT customer_code INTO v_rj2026_001_code FROM public.customers WHERE customer_code = 'RJ2026-001';

    RETURN pg_catalog.json_build_object(
        'success', true,
        'executed', p_execute,
        'cutoff_timestamp', p_cutoff,
        'total_audit_logs_before', v_total_before,
        'pre_production_audit_logs_before', v_pre_prod_before,
        'production_audit_logs_before', v_prod_before,
        'records_deleted', v_deleted_count,
        'total_audit_logs_after', v_total_after,
        'production_counts', pg_catalog.json_build_object(
            'customers', v_customers_count,
            'customer_code', v_rj2026_001_code,
            'payments', v_payments_count,
            'total_installments', v_total_installments,
            'paid_installments', v_paid_installments,
            'pending_installments', v_pending_installments,
            'bonuses', v_bonuses_count,
            'redemptions', v_redemptions_count,
            'admin_users', v_admin_users_count
        )
    );
END;
$$;

-- Function Security Lockdown
REVOKE ALL ON FUNCTION public.admin_cleanup_pre_production_audit_logs(timestamptz, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_cleanup_pre_production_audit_logs(timestamptz, boolean) TO authenticated;
