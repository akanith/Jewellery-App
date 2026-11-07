-- Permit the notification emitted by record_installment_payment when a scheme reaches 12/12.
-- Preserve all existing notification types and historical notification rows.
-- This fixes Playwright AW-08/AW-09 maturity and redemption failures (SQLSTATE 23514).
BEGIN;

ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_notification_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_notification_type_check
  CHECK (notification_type IN (
    'INSTALLMENT_REMINDER',
    'PAYMENT_RECORDED',
    'BONUS_CREDITED',
    'REDEMPTION_UPDATE',
    'SHOP_UPDATE',
    'GENERAL',
    'SCHEME_MATURED'
  ));

COMMIT;
