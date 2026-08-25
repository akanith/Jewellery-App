-- Migration 008: Redemptions Entity
-- Scheme completion & maturity redemption records

CREATE SEQUENCE IF NOT EXISTS public.redemption_number_seq START 70001;

CREATE TABLE IF NOT EXISTS public.redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    redemption_number TEXT NOT NULL UNIQUE DEFAULT ('RJ-RED-' || lpad(nextval('public.redemption_number_seq')::text, 7, '0')),
    customer_scheme_id UUID NOT NULL UNIQUE REFERENCES public.customer_schemes(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    total_paid_amount NUMERIC(12,2) NOT NULL CHECK (total_paid_amount >= 0),
    bonus_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (bonus_amount >= 0),
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    final_redeemed_value NUMERIC(12,2) NOT NULL CHECK (final_redeemed_value > 0),
    redemption_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'COMPLETED', 'REJECTED')),
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redemptions_scheme ON public.redemptions(customer_scheme_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_customer ON public.redemptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_status ON public.redemptions(status);

CREATE TRIGGER trg_redemptions_updated_at
BEFORE UPDATE ON public.redemptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
