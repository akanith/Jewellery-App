-- Migration: Grant SELECT on public.customers to authenticated role
-- Purpose: Restore missing SELECT permission on public.customers for authenticated admin users while preserving RLS and admin_select_customers policy.

GRANT SELECT ON TABLE public.customers TO authenticated;
