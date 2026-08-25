-- Migration 010: Shop Settings Entity
-- Singleton configuration table for store parameters and terms

CREATE TABLE IF NOT EXISTS public.shop_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    shop_name TEXT NOT NULL DEFAULT 'Ramyas Jeweller',
    address TEXT,
    phone TEXT,
    gst_number TEXT,
    terms_and_conditions TEXT,
    grace_period_days INTEGER NOT NULL DEFAULT 5 CHECK (grace_period_days >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed single default configuration row
INSERT INTO public.shop_settings (id, shop_name, terms_and_conditions, grace_period_days)
VALUES (1, 'Ramyas Jeweller', 'Standard savings scheme terms apply.', 5)
ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER trg_shop_settings_updated_at
BEFORE UPDATE ON public.shop_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
