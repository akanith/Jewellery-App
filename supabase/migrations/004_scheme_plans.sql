-- Migration 004: Scheme Plans Entity
-- Reusable savings plan configurations

CREATE TABLE IF NOT EXISTS public.scheme_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    monthly_amount NUMERIC(12,2) NOT NULL CHECK (monthly_amount > 0),
    total_installments INTEGER NOT NULL CHECK (total_installments > 0),
    bonus_months NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (bonus_months >= 0),
    discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    gold_weight_based BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheme_plans_code ON public.scheme_plans(code);
CREATE INDEX IF NOT EXISTS idx_scheme_plans_active ON public.scheme_plans(is_active);

CREATE TRIGGER trg_scheme_plans_updated_at
BEFORE UPDATE ON public.scheme_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
