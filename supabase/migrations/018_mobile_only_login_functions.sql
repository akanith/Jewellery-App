-- Migration 018: Mobile-Only Customer Login — Server-Side RPC Functions
-- These SECURITY DEFINER functions allow the Expo app to:
--   1. Look up a customer by mobile number (no auth required)
--   2. Fetch a customer's own data (scheme, installments, notifications)
--      cross-validated: BOTH customer_id AND mobile must match same row
--
-- NO Supabase Auth session required.
-- NO password.
-- NO OTP.
-- NO synthetic email.
-- NO profile_id.

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER: normalize Indian mobile to 10 digits
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._normalize_mobile(p_raw TEXT)
RETURNS TEXT AS $$
DECLARE
  v_clean TEXT;
BEGIN
  v_clean := regexp_replace(COALESCE(p_raw, ''), '[^0-9]', '', 'g');
  IF length(v_clean) > 10 AND v_clean LIKE '91%' THEN
    v_clean := substring(v_clean FROM 3);
  ELSIF length(v_clean) > 10 AND v_clean LIKE '0%' THEN
    v_clean := substring(v_clean FROM 2);
  END IF;
  IF v_clean !~ '^[6-9][0-9]{9}$' THEN
    v_clean := right(regexp_replace(COALESCE(p_raw, ''), '[^0-9]', '', 'g'), 10);
  END IF;
  IF length(v_clean) < 10 THEN
    RETURN NULL;
  END IF;
  RETURN v_clean;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- LOGIN: Look up a customer by mobile number
-- Called by the Expo app on LOGIN press.
-- Returns the matching customer row. Empty array = customer not found.
-- Does NOT require Supabase Auth session.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_customer_by_mobile(p_mobile TEXT)
RETURNS TABLE (
  id            UUID,
  full_name     TEXT,
  mobile_number TEXT,
  customer_number TEXT,
  status        TEXT
) AS $$
DECLARE
  v_mobile TEXT;
BEGIN
  v_mobile := public._normalize_mobile(p_mobile);
  IF v_mobile IS NULL THEN
    RETURN; -- invalid format → empty result
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.full_name,
    c.mobile_number,
    c.customer_number,
    c.status::TEXT
  FROM public.customers c
  WHERE c.mobile_number = v_mobile
     OR right(regexp_replace(c.mobile_number, '[^0-9]', '', 'g'), 10) = v_mobile
  ORDER BY c.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- DASHBOARD DATA: Fetch scheme + installments for a verified customer
-- Security: validates BOTH p_customer_id AND p_mobile match the same customers row.
-- Customer A cannot use Customer B's customer_id to fetch Customer B's data.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_customer_scheme_data(
  p_customer_id UUID,
  p_mobile      TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_mobile    TEXT;
  v_customer  RECORD;
  v_scheme    RECORD;
  v_installs  JSONB;
BEGIN
  v_mobile := public._normalize_mobile(p_mobile);
  IF v_mobile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_MOBILE');
  END IF;

  -- CROSS-VALIDATION: both p_customer_id AND p_mobile must match same row
  SELECT *
  INTO v_customer
  FROM public.customers
  WHERE id = p_customer_id
    AND (mobile_number = v_mobile OR right(regexp_replace(mobile_number, '[^0-9]', '', 'g'), 10) = v_mobile);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'ACCESS_DENIED');
  END IF;

  -- Active scheme
  SELECT *
  INTO v_scheme
  FROM public.customer_schemes
  WHERE customer_id = p_customer_id
    AND status = 'ACTIVE'
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'customer', row_to_json(v_customer),
      'scheme', NULL,
      'installments', '[]'::jsonb
    );
  END IF;

  -- Installments for that scheme
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',                   i.id,
        'installment_number',   i.installment_number,
        'due_date',             i.due_date,
        'due_amount',           i.expected_amount,
        'expected_amount',      i.expected_amount,
        'paid_amount',          i.paid_amount,
        'payment_date',         i.payment_date,
        'payment_method',       i.payment_method,
        'payment_reference',    i.payment_reference,
        'status',               i.status
      ) ORDER BY i.installment_number
    ),
    '[]'::jsonb
  )
  INTO v_installs
  FROM public.installments i
  WHERE i.customer_scheme_id = v_scheme.id;

  RETURN jsonb_build_object(
    'success', true,
    'customer', row_to_json(v_customer),
    'scheme', row_to_json(v_scheme),
    'installments', v_installs
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTIFICATIONS: Fetch notifications for a verified customer
-- Security: same cross-validation as above.
-- Returns customer-specific + global (customer_id IS NULL) notifications.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_customer_notifs_data(
  p_customer_id UUID,
  p_mobile      TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_mobile   TEXT;
  v_valid    BOOLEAN;
  v_notifs   JSONB;
BEGIN
  v_mobile := public._normalize_mobile(p_mobile);
  IF v_mobile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_MOBILE');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.customers
    WHERE id = p_customer_id
      AND (mobile_number = v_mobile OR right(regexp_replace(mobile_number, '[^0-9]', '', 'g'), 10) = v_mobile)
  ) INTO v_valid;

  IF NOT v_valid THEN
    RETURN jsonb_build_object('success', false, 'code', 'ACCESS_DENIED');
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',         n.id,
        'title',      n.title,
        'message',    n.message,
        'type',       n.type,
        'is_read',    n.is_read,
        'created_at', n.created_at
      ) ORDER BY n.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_notifs
  FROM public.notifications n
  WHERE n.customer_id = p_customer_id
     OR n.customer_id IS NULL;

  RETURN jsonb_build_object(
    'success', true,
    'notifications', v_notifs
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Explicit RPC execution permissions for anon and authenticated clients
GRANT EXECUTE ON FUNCTION public._normalize_mobile(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_customer_by_mobile(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_customer_scheme_data(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_customer_notifs_data(UUID, TEXT) TO anon, authenticated, service_role;
