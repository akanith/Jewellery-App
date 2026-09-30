-- =============================================================================
-- RAMYAS JEWELLER - Local E2E Seed Configuration
-- Seed test admin user for isolated Playwright E2E test executions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  v_admin_id UUID := 'a1111111-1111-1111-1111-111111111111';
  v_encrypted_pw TEXT;
BEGIN
  -- Generate bcrypt password hash for 'admin1'
  v_encrypted_pw := extensions.crypt('admin1', extensions.gen_salt('bf', 10));

  -- 1. Seed auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin1@gmail.com') THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change,
      email_change, email_change_token_new, recovery_token
    ) VALUES (
      v_admin_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'admin1@gmail.com',
      v_encrypted_pw,
      NOW(),
      NULL,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Test Admin 1"}'::jsonb,
      FALSE,
      NOW(),
      NOW(),
      '9999999999',
      NOW(),
      '',
      '',
      '',
      ''
    );

    -- 2. Seed auth.identities
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id
    ) VALUES (
      v_admin_id,
      v_admin_id,
      jsonb_build_object('sub', v_admin_id::text, 'email', 'admin1@gmail.com'),
      'email',
      NOW(),
      NOW(),
      NOW(),
      'admin1@gmail.com'
    );
  END IF;

  -- 3. Seed public.profiles
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_admin_id) THEN
    INSERT INTO public.profiles (id, role, phone_number, full_name, is_active, created_at, updated_at)
    VALUES (v_admin_id, 'ADMIN', '9999999999', 'Test Admin 1', TRUE, NOW(), NOW());
  END IF;

  -- 4. Seed public.admin_users
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE id = v_admin_id) THEN
    INSERT INTO public.admin_users (id, employee_code, role_title, permissions, is_super_admin, created_at, updated_at)
    VALUES (v_admin_id, 'EMP-001', 'Store Owner', '{"all": true}'::jsonb, TRUE, NOW(), NOW());
  END IF;
END $$;
