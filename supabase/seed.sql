-- =============================================================================
-- RAMYAS JEWELLER - Local E2E Seed Configuration
-- Seed test admin user for isolated Playwright E2E test executions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  v_admin_id UUID := 'a1111111-1111-1111-1111-111111111111';
BEGIN
  -- 1. Seed public.profiles
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
