-- Migration 005: Customer Schemes Entity
-- Customer enrollment instances in scheme plans

CREATE SEQUENCE IF NOT EXISTS public.scheme_account_number_seq START 50001;

CREATE TABLE IF NOT EXISTS public.customer_schemes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheme_account_number TEXT NOT NULL UNIQUE DEFAULT ('RJ-SCH-' || lpad(nextval('public.scheme_account_number_seq')::text, 7, '0')),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    scheme_plan_id UUID NOT NULL REFERENCES public.scheme_plans(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    maturity_date DATE,
    monthly_amount NUMERIC(12,2) NOT NULL CHECK (monthly_amount > 0),
    total_installments INTEGER NOT NULL CHECK (total_installments > 0),
    paid_installments_count INTEGER NOT NULL DEFAULT 0 CHECK (paid_installments_count >= 0),
    total_amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_amount_paid >= 0),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'REDEEMED', 'CLOSED_EARLY', 'DEFAULTED')),
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_schemes_customer ON public.customer_schemes(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_schemes_status ON public.customer_schemes(status);
CREATE INDEX IF NOT EXISTS idx_customer_schemes_account ON public.customer_schemes(scheme_account_number);

CREATE TRIGGER trg_customer_schemes_updated_at
BEFORE UPDATE ON public.customer_schemes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
