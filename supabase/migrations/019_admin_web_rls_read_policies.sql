-- Migration 019: Enable SELECT policies for Admin Web read operations
-- Allows Admin Web to query live customers, schemes, installments, and payments directly from Supabase Cloud

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin Web customers read policy" ON public.customers;
CREATE POLICY "Admin Web customers read policy" ON public.customers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Web schemes read policy" ON public.customer_schemes;
CREATE POLICY "Admin Web schemes read policy" ON public.customer_schemes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Web installments read policy" ON public.installments;
CREATE POLICY "Admin Web installments read policy" ON public.installments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Web payments read policy" ON public.payments;
CREATE POLICY "Admin Web payments read policy" ON public.payments FOR SELECT USING (true);
