-- Migration 006: Installments Entity
-- Monthly scheduled installment records

CREATE TABLE IF NOT EXISTS public.installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_scheme_id UUID NOT NULL REFERENCES public.customer_schemes(id) ON DELETE RESTRICT,
    installment_number INTEGER NOT NULL CHECK (installment_number > 0),
    due_date DATE NOT NULL,
    expected_amount NUMERIC(12,2) NOT NULL CHECK (expected_amount > 0),
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    payment_date TIMESTAMPTZ,
    payment_method TEXT CHECK (payment_method IS NULL OR payment_method IN ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'ONLINE_GATEWAY')),
    payment_reference TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'OVERDUE', 'FAILED')),
    received_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_scheme_installment_number UNIQUE (customer_scheme_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_installments_scheme ON public.installments(customer_scheme_id);
CREATE INDEX IF NOT EXISTS idx_installments_status ON public.installments(status);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON public.installments(due_date);

CREATE TRIGGER trg_installments_updated_at
BEFORE UPDATE ON public.installments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
