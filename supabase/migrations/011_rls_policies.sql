-- Migration 011: Row Level Security (RLS) Policies

-- Enable RLS across all domain tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheme_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Users can read own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id OR public.get_current_user_role() IN ('OWNER', 'ADMIN'));

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id OR public.get_current_user_role() IN ('OWNER', 'ADMIN'));

-- 2. Customers Policies
CREATE POLICY "Customers can read own record" ON public.customers
FOR SELECT USING (profile_id = auth.uid() OR public.get_current_user_role() IN ('OWNER', 'ADMIN', 'STAFF'));

CREATE POLICY "Staff and Admins can insert customers" ON public.customers
FOR INSERT WITH CHECK (public.get_current_user_role() IN ('OWNER', 'ADMIN', 'STAFF'));

CREATE POLICY "Staff and Admins can update customers" ON public.customers
FOR UPDATE USING (public.get_current_user_role() IN ('OWNER', 'ADMIN', 'STAFF'));

-- 3. Scheme Plans Policies
CREATE POLICY "Everyone can read active scheme plans" ON public.scheme_plans
FOR SELECT USING (is_active = true OR public.get_current_user_role() IN ('OWNER', 'ADMIN', 'STAFF'));

CREATE POLICY "Admins can manage scheme plans" ON public.scheme_plans
FOR ALL USING (public.get_current_user_role() IN ('OWNER', 'ADMIN'));

-- 4. Customer Schemes Policies
CREATE POLICY "Customers can view own enrolled schemes" ON public.customer_schemes
FOR SELECT USING (customer_id = public.get_current_customer_id() OR public.get_current_user_role() IN ('OWNER', 'ADMIN', 'STAFF'));

CREATE POLICY "Staff and Admins can manage customer schemes" ON public.customer_schemes
FOR ALL USING (public.get_current_user_role() IN ('OWNER', 'ADMIN', 'STAFF'));

-- 5. Installments Policies
CREATE POLICY "Customers can view own scheme installments" ON public.installments
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.customer_schemes cs
        WHERE cs.id = installments.customer_scheme_id
        AND cs.customer_id = public.get_current_customer_id()
    ) OR public.get_current_user_role() IN ('OWNER', 'ADMIN', 'STAFF')
);

CREATE POLICY "Staff and Admins can manage installments" ON public.installments
FOR ALL USING (public.get_current_user_role() IN ('OWNER', 'ADMIN', 'STAFF'));

-- 6. Payments Policies
CREATE POLICY "Customers can view own payments" ON public.payments
FOR SELECT USING (
    customer_id = public.get_current_customer_id() OR public.get_current_user_role() IN ('OWNER', 'ADMIN', 'STAFF')
);

CREATE POLICY "Staff and Admins can insert payments" ON public.payments
FOR INSERT WITH CHECK (public.get_current_user_role() IN ('OWNER', 'ADMIN', 'STAFF'));

-- 7. Redemptions Policies
CREATE POLICY "Customers can view own redemptions" ON public.redemptions
FOR SELECT USING (
    customer_id = public.get_current_customer_id() OR public.get_current_user_role() IN ('OWNER', 'ADMIN', 'STAFF')
);

CREATE POLICY "Admins can manage redemptions" ON public.redemptions
FOR ALL USING (public.get_current_user_role() IN ('OWNER', 'ADMIN'));

-- 8. Audit Logs Policies (Read-Only for Admins)
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT USING (public.get_current_user_role() IN ('OWNER', 'ADMIN'));

-- 9. Shop Settings Policies
CREATE POLICY "Everyone can read shop settings" ON public.shop_settings
FOR SELECT USING (true);

CREATE POLICY "Admins can update shop settings" ON public.shop_settings
FOR UPDATE USING (public.get_current_user_role() IN ('OWNER', 'ADMIN'));
