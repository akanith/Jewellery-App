# Row Level Security (RLS) Policy Matrix

All database tables in the `public` schema have Row Level Security explicitly enabled.

---

## RLS Security Matrix

| Table | Operation | Allowed Roles | Ownership Enforcement Rule |
| :--- | :--- | :--- | :--- |
| `profiles` | `SELECT` | Authenticated | `auth.uid() = id` OR role IN (`OWNER`, `ADMIN`) |
| `profiles` | `UPDATE` | Authenticated | `auth.uid() = id` OR role IN (`OWNER`, `ADMIN`) |
| `customers` | `SELECT` | Customer / Admin | `profile_id = auth.uid()` OR role IN (`OWNER`, `ADMIN`, `STAFF`) |
| `customers` | `INSERT/UPDATE` | Admin / Staff | role IN (`OWNER`, `ADMIN`, `STAFF`) |
| `scheme_plans` | `SELECT` | Everyone / Anon | `is_active = true` OR role IN (`OWNER`, `ADMIN`, `STAFF`) |
| `scheme_plans` | `INSERT/UPDATE` | Owner / Admin | role IN (`OWNER`, `ADMIN`) |
| `customer_schemes` | `SELECT` | Customer / Admin | `customer_id = get_current_customer_id()` OR role IN (`OWNER`, `ADMIN`, `STAFF`) |
| `customer_schemes` | `INSERT/UPDATE` | Admin / Staff | role IN (`OWNER`, `ADMIN`, `STAFF`) |
| `installments` | `SELECT` | Customer / Admin | Customer owns parent `customer_scheme` OR role IN (`OWNER`, `ADMIN`, `STAFF`) |
| `installments` | `INSERT/UPDATE` | Admin / Staff | role IN (`OWNER`, `ADMIN`, `STAFF`) |
| `payments` | `SELECT` | Customer / Admin | Customer owns parent `customer_scheme` OR role IN (`OWNER`, `ADMIN`, `STAFF`) |
| `payments` | `INSERT` | Admin / Staff | role IN (`OWNER`, `ADMIN`, `STAFF`) |
| `redemptions` | `SELECT` | Customer / Admin | Customer owns parent `customer_scheme` OR role IN (`OWNER`, `ADMIN`) |
| `redemptions` | `INSERT/UPDATE` | Owner / Admin | role IN (`OWNER`, `ADMIN`) |
| `audit_logs` | `SELECT` | Owner / Admin | role IN (`OWNER`, `ADMIN`) |
| `audit_logs` | `INSERT/UPDATE/DELETE` | System Only | Disallowed for all clients (system RPC / trigger insertion only) |
| `shop_settings` | `SELECT` | Everyone | Authenticated users & anon |
| `shop_settings` | `UPDATE` | Owner / Admin | role IN (`OWNER`, `ADMIN`) |
