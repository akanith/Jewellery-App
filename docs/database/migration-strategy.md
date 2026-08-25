# Migration Strategy & Ordering

Supabase migrations are managed as modular, ordered SQL files in `supabase/migrations/`.

---

## Migration File Sequence

1. `001_initial_extensions_and_helpers.sql`: Loads `uuid-ossp`, `pgcrypto` extensions, creates `update_updated_at_column()` trigger function.
2. `002_profiles_and_roles.sql`: Creates `profiles` table, role enum checks, and `on_auth_user_created` trigger connecting `auth.users` to `public.profiles`.
3. `003_customers.sql`: Creates `customers` table, customer number auto-sequence, and mobile number unique constraints.
4. `004_scheme_plans.sql`: Creates `scheme_plans` table for reusable scheme templates.
5. `005_customer_schemes.sql`: Creates `customer_schemes` enrollment table.
6. `006_installments.sql`: Creates `installments` schedule table with unique installment sequence constraints.
7. `007_payments.sql`: Creates `payments` financial transaction ledger table.
8. `008_redemptions.sql`: Creates `redemptions` maturity settlement table.
9. `009_audit_logs.sql`: Creates `audit_logs` administrative & financial trail table.
10. `010_shop_settings.sql`: Creates `shop_settings` singleton table.
11. `011_rls_policies.sql`: Enables RLS across all tables and applies security policies.
12. `012_rpc_functions.sql`: Installs atomic RPC functions (`record_installment_payment`, `process_scheme_redemption`, `get_admin_dashboard_stats`).
