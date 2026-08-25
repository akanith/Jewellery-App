-- Migration 003: Customers Entity
-- Stores customer domain details

CREATE SEQUENCE IF NOT EXISTS public.customer_number_seq START 1001;

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    customer_number TEXT NOT NULL UNIQUE DEFAULT ('RJ-CUST-' || lpad(nextval('public.customer_number_seq')::text, 6, '0')),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    mobile_number TEXT NOT NULL UNIQUE CHECK (mobile_number ~ '^[6-9]\d{9}$'),
    email TEXT,
    address TEXT,
    city TEXT,
    pincode TEXT,
    nominee_name TEXT,
    nominee_relationship TEXT,
    nominee_mobile TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_mobile ON public.customers(mobile_number);
CREATE INDEX IF NOT EXISTS idx_customers_profile_id ON public.customers(profile_id);
CREATE INDEX IF NOT EXISTS idx_customers_number ON public.customers(customer_number);

CREATE TRIGGER trg_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function to get current logged in customer's ID
CREATE OR REPLACE FUNCTION public.get_current_customer_id()
RETURNS UUID AS $$
    SELECT id FROM public.customers WHERE profile_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
