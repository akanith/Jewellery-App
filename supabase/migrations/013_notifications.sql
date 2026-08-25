-- Migration 013: Notifications Entity & Security Policies

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('PAYMENT', 'SCHEME', 'REMINDER', 'REDEMPTION', 'ANNOUNCEMENT')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_customer_id ON public.notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_cust_read ON public.notifications(customer_id, is_read);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 1. Read Policy: Customers can read their own notifications, Admins/Staff can read all
CREATE POLICY "Users can read relevant notifications" ON public.notifications
FOR SELECT USING (
    public.get_current_user_role() IN ('OWNER', 'ADMIN', 'STAFF')
    OR customer_id = public.get_current_customer_id()
    OR customer_id IS NULL
);

-- 2. Update Policy: Customers can mark their own notifications as read
CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE USING (
    public.get_current_user_role() IN ('OWNER', 'ADMIN', 'STAFF')
    OR customer_id = public.get_current_customer_id()
);

-- 3. Insert Policy: Owners, Admins, and Staff can insert notifications
CREATE POLICY "Admins and Staff can insert notifications" ON public.notifications
FOR INSERT WITH CHECK (
    public.get_current_user_role() IN ('OWNER', 'ADMIN', 'STAFF')
);
