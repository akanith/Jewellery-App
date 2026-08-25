-- Migration 007: Payments Financial Ledger Entity

CREATE SEQUENCE IF NOT EXISTS public.payment_number_seq START 90001;

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    payment_number TEXT NOT NULL UNIQUE DEFAULT ('RJ-PAY-' || lpad(nextval('public.payment_number_seq')::text, 8, '0')),
    customer_scheme_id UUID NOT NULL REFERENCES public.customer_schemes(id) ON DELETE RESTRICT,
    installment_id UUID REFERENCES public.installments(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'ONLINE_GATEWAY')),
    payment_reference TEXT,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'REFUNDED', 'FAILED')),
    received_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_scheme ON public.payments(customer_scheme_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_installment ON public.payments(installment_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);

CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
