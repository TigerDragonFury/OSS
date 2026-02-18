-- Role Permissions Table
-- Stores editable per-role module permissions as flat JSON
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS role_permissions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role       VARCHAR(50) UNIQUE NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMP DEFAULT NOW()
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read; only admins can write (enforced in app)
CREATE POLICY "rp_read_all"   ON role_permissions FOR SELECT USING (true);
CREATE POLICY "rp_write_auth" ON role_permissions FOR ALL   USING (true);

-- ── Seed initial data (mirrors lib/auth/rolePermissions.ts) ───────────────────
-- Level meanings:
--   "full"   = canView + canCreate + canEdit + canDelete
--   "edit"   = canView + canCreate + canEdit
--   "create" = canView + canCreate
--   "view"   = canView only
--   "none"   = no access

INSERT INTO role_permissions (role, permissions) VALUES
('admin', '{
  "dashboard": "full",
  "companies": "full",
  "profile": "view",
  "marine.vessels": "full",
  "marine.warehouses": "full",
  "marine.inventory": "full",
  "marine.equipment": "full",
  "marine.requisitions": "full",
  "marine.overhauls": "full",
  "marine.maintenance": "full",
  "marine.fuel": "full",
  "marine.customers": "full",
  "marine.rentals": "full",
  "rentals.bookings": "full",
  "rentals.customers": "full",
  "rentals.payments": "full",
  "scrap.lands": "full",
  "scrap.equipment": "full",
  "trailers": "full",
  "finance.quickEntry": "full",
  "finance.quotations": "full",
  "finance.invoices": "full",
  "finance.income": "full",
  "finance.expenses": "full",
  "finance.bankAccounts": "full",
  "finance.reports": "full",
  "crew.assignments": "full",
  "crew.certifications": "full",
  "hr.employees": "full",
  "hr.salaries": "full",
  "settings": "full"
}'),
('accountant', '{
  "dashboard": "none",
  "companies": "view",
  "profile": "view",
  "marine.vessels": "view",
  "marine.warehouses": "view",
  "marine.inventory": "view",
  "marine.equipment": "view",
  "marine.requisitions": "view",
  "marine.overhauls": "view",
  "marine.maintenance": "view",
  "marine.fuel": "view",
  "marine.customers": "full",
  "marine.rentals": "edit",
  "rentals.bookings": "edit",
  "rentals.customers": "full",
  "rentals.payments": "edit",
  "scrap.lands": "view",
  "scrap.equipment": "view",
  "trailers": "edit",
  "finance.quickEntry": "create",
  "finance.quotations": "edit",
  "finance.invoices": "edit",
  "finance.income": "view",
  "finance.expenses": "edit",
  "finance.bankAccounts": "create",
  "finance.reports": "view",
  "crew.assignments": "none",
  "crew.certifications": "none",
  "hr.employees": "view",
  "hr.salaries": "view",
  "settings": "view"
}'),
('hr', '{
  "dashboard": "none",
  "companies": "none",
  "profile": "view",
  "marine.vessels": "none",
  "marine.warehouses": "none",
  "marine.inventory": "none",
  "marine.equipment": "none",
  "marine.requisitions": "none",
  "marine.overhauls": "none",
  "marine.maintenance": "none",
  "marine.fuel": "none",
  "marine.customers": "none",
  "marine.rentals": "none",
  "rentals.bookings": "none",
  "rentals.customers": "none",
  "rentals.payments": "none",
  "scrap.lands": "none",
  "scrap.equipment": "none",
  "trailers": "none",
  "finance.quickEntry": "none",
  "finance.quotations": "none",
  "finance.invoices": "none",
  "finance.income": "none",
  "finance.expenses": "none",
  "finance.bankAccounts": "none",
  "finance.reports": "none",
  "crew.assignments": "full",
  "crew.certifications": "edit",
  "hr.employees": "full",
  "hr.salaries": "edit",
  "settings": "view"
}'),
('storekeeper', '{
  "dashboard": "none",
  "companies": "none",
  "profile": "view",
  "marine.vessels": "view",
  "marine.warehouses": "view",
  "marine.inventory": "full",
  "marine.equipment": "edit",
  "marine.requisitions": "create",
  "marine.overhauls": "none",
  "marine.maintenance": "none",
  "marine.fuel": "create",
  "marine.customers": "view",
  "marine.rentals": "view",
  "rentals.bookings": "view",
  "rentals.customers": "view",
  "rentals.payments": "none",
  "scrap.lands": "view",
  "scrap.equipment": "edit",
  "trailers": "none",
  "finance.quickEntry": "create",
  "finance.quotations": "none",
  "finance.invoices": "none",
  "finance.income": "none",
  "finance.expenses": "none",
  "finance.bankAccounts": "none",
  "finance.reports": "none",
  "crew.assignments": "none",
  "crew.certifications": "none",
  "hr.employees": "none",
  "hr.salaries": "none",
  "settings": "none"
}')
ON CONFLICT (role) DO NOTHING;

-- ── Update existing rows: add all new keys (preserves existing values) ────────
-- Uses new_defaults || existing so existing custom values win on conflict
UPDATE role_permissions
SET permissions =
  '{"dashboard":"full","companies":"full","profile":"view","marine.vessels":"full","marine.warehouses":"full","marine.inventory":"full","marine.equipment":"full","marine.requisitions":"full","marine.overhauls":"full","marine.maintenance":"full","marine.fuel":"full","marine.customers":"full","marine.rentals":"full","rentals.bookings":"full","rentals.customers":"full","rentals.payments":"full","scrap.lands":"full","scrap.equipment":"full","trailers":"full","finance.quickEntry":"full","finance.quotations":"full","finance.invoices":"full","finance.income":"full","finance.expenses":"full","finance.bankAccounts":"full","finance.reports":"full","crew.assignments":"full","crew.certifications":"full","hr.employees":"full","hr.salaries":"full","settings":"full"}'::jsonb
  || permissions,
  updated_at = NOW()
WHERE role = 'admin';

UPDATE role_permissions
SET permissions =
  '{"dashboard":"none","companies":"view","profile":"view","marine.vessels":"view","marine.warehouses":"view","marine.inventory":"view","marine.equipment":"view","marine.requisitions":"view","marine.overhauls":"view","marine.maintenance":"view","marine.fuel":"view","marine.customers":"full","marine.rentals":"edit","rentals.bookings":"edit","rentals.customers":"full","rentals.payments":"edit","scrap.lands":"view","scrap.equipment":"view","trailers":"edit","finance.quickEntry":"create","finance.quotations":"edit","finance.invoices":"edit","finance.income":"view","finance.expenses":"edit","finance.bankAccounts":"create","finance.reports":"view","crew.assignments":"none","crew.certifications":"none","hr.employees":"view","hr.salaries":"view","settings":"view"}'::jsonb
  || permissions,
  updated_at = NOW()
WHERE role = 'accountant';

UPDATE role_permissions
SET permissions =
  '{"dashboard":"none","companies":"none","profile":"view","marine.vessels":"none","marine.warehouses":"none","marine.inventory":"none","marine.equipment":"none","marine.requisitions":"none","marine.overhauls":"none","marine.maintenance":"none","marine.fuel":"none","marine.customers":"none","marine.rentals":"none","rentals.bookings":"none","rentals.customers":"none","rentals.payments":"none","scrap.lands":"none","scrap.equipment":"none","trailers":"none","finance.quickEntry":"none","finance.quotations":"none","finance.invoices":"none","finance.income":"none","finance.expenses":"none","finance.bankAccounts":"none","finance.reports":"none","crew.assignments":"full","crew.certifications":"edit","hr.employees":"full","hr.salaries":"edit","settings":"view"}'::jsonb
  || permissions,
  updated_at = NOW()
WHERE role = 'hr';

UPDATE role_permissions
SET permissions =
  '{"dashboard":"none","companies":"none","profile":"view","marine.vessels":"view","marine.warehouses":"view","marine.inventory":"full","marine.equipment":"edit","marine.requisitions":"create","marine.overhauls":"none","marine.maintenance":"none","marine.fuel":"create","marine.customers":"view","marine.rentals":"view","rentals.bookings":"view","rentals.customers":"view","rentals.payments":"none","scrap.lands":"view","scrap.equipment":"edit","trailers":"none","finance.quickEntry":"create","finance.quotations":"none","finance.invoices":"none","finance.income":"none","finance.expenses":"none","finance.bankAccounts":"none","finance.reports":"none","crew.assignments":"none","crew.certifications":"none","hr.employees":"none","hr.salaries":"none","settings":"none"}'::jsonb
  || permissions,
  updated_at = NOW()
WHERE role = 'storekeeper';
