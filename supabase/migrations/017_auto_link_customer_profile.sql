-- Migration 017: Auto Link Customer Profile & Robust get_current_customer_id()
-- Resolves customer ID by profile_id OR mobile_number and automatically links public.customers.profile_id

CREATE OR REPLACE FUNCTION public.get_current_customer_id()
RETURNS UUID AS $$
DECLARE
    v_customer_id UUID;
    v_user_mobile TEXT;
BEGIN
    -- 1. Resolve via direct profile_id link
    SELECT id INTO v_customer_id 
    FROM public.customers 
    WHERE profile_id = auth.uid()   
    LIMIT 1;

    IF v_customer_id IS NOT NULL THEN
        RETURN v_customer_id;
    END IF;

    -- 2. Fallback: Lookup via authenticated profile mobile_number and auto-link profile_id
    SELECT mobile_number INTO v_user_mobile 
    FROM public.profiles 
    WHERE id = auth.uid() 
    LIMIT 1;

    IF v_user_mobile IS NOT NULL AND v_user_mobile <> '' THEN
        SELECT id INTO v_customer_id 
        FROM public.customers 
        WHERE mobile_number = v_user_mobile 
        LIMIT 1;

        IF v_customer_id IS NOT NULL THEN
            -- Safely auto-link profile_id
            UPDATE public.customers 
            SET profile_id = auth.uid(),
                updated_at = NOW()
            WHERE id = v_customer_id 
              AND profile_id IS NULL;

            RETURN v_customer_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
