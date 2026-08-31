-- Migration 016: Fix activate_customer_account parameter order overloads for RPC schema cache matching
-- Ensures both parameter order permutations match PostgREST schema cache matching

CREATE OR REPLACE FUNCTION public.activate_customer_account(
    p_auth_user_id UUID,
    p_full_name TEXT,
    p_mobile TEXT
)
RETURNS JSONB AS $$
BEGIN
    RETURN public.activate_customer_account(p_mobile, p_auth_user_id, p_full_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also create overload for (p_mobile, p_auth_user_id, p_full_name)
CREATE OR REPLACE FUNCTION public.activate_customer_account(
    p_mobile TEXT,
    p_auth_user_id UUID,
    p_full_name TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_clean_mobile TEXT;
    v_customer_id UUID;
    v_existing_profile_id UUID;
    v_customer_name TEXT;
BEGIN
    -- 1. Normalize 10-digit mobile number
    v_clean_mobile := regexp_replace(p_mobile, '\D', '', 'g');
    IF length(v_clean_mobile) > 10 AND v_clean_mobile LIKE '91%' THEN
        v_clean_mobile := substring(v_clean_mobile from 3);
    ELSIF length(v_clean_mobile) > 10 AND v_clean_mobile LIKE '0%' THEN
        v_clean_mobile := substring(v_clean_mobile from 2);
    END IF;

    IF v_clean_mobile !~ '^[6-9]\d{9}$' THEN
        RAISE EXCEPTION 'Invalid mobile number format.';
    END IF;

    -- 2. Lock customer row for update
    SELECT id, profile_id, full_name
    INTO v_customer_id, v_existing_profile_id, v_customer_name
    FROM public.customers
    WHERE mobile_number = v_clean_mobile
    FOR UPDATE;

    -- If customer row does not exist yet, create it automatically
    IF v_customer_id IS NULL THEN
        INSERT INTO public.customers (
            mobile_number,
            full_name,
            status
        ) VALUES (
            v_clean_mobile,
            COALESCE(p_full_name, 'Valued Customer'),
            'ACTIVE'
        ) RETURNING id, full_name INTO v_customer_id, v_customer_name;
    END IF;

    -- 3. Upsert public.profiles record for the auth user
    INSERT INTO public.profiles (
        id,
        full_name,
        mobile_number,
        role,
        is_active
    ) VALUES (
        p_auth_user_id,
        COALESCE(p_full_name, v_customer_name),
        v_clean_mobile,
        'CUSTOMER',
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        mobile_number = EXCLUDED.mobile_number,
        role = 'CUSTOMER',
        is_active = true,
        updated_at = NOW();

    -- 4. Update public.customers.profile_id to link auth user
    UPDATE public.customers
    SET profile_id = p_auth_user_id,
        updated_at = NOW()
    WHERE id = v_customer_id;

    RETURN jsonb_build_object(
        'success', true,
        'customer_id', v_customer_id,
        'profile_id', p_auth_user_id,
        'already_linked', false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
