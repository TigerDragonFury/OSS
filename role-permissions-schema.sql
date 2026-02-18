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
  "trailers": "full",
  "finance.bankAccounts": "full",
  "finance.expenses": "full",
  "finance.reports": "full",
  "finance.quickEntry": "full",
  "finance.quotations": "full",
  "finance.income": "full",
  "finance.invoices": "full",
  "hr.employees": "full",
  "hr.salaries": "full",
  "marine.vessels": "full",
  "marine.customers": "full",
  "marine.rentals": "full",
  "scrap.lands": "full",
  "scrap.equipment": "full",
  "warehouse.inventory": "full",
  "warehouse.sales": "full",
  "settings": "full"
}'),
('accountant', '{
  "dashboard": "none",
  "trailers": "edit",
  "finance.bankAccounts": "create",
  "finance.expenses": "edit",
  "finance.reports": "view",
  "finance.quickEntry": "create",
  "finance.quotations": "edit",
  "finance.income": "view",
  "finance.invoices": "edit",
  "hr.employees": "view",
  "hr.salaries": "view",
  "marine.vessels": "view",
  "marine.customers": "full",
  "marine.rentals": "edit",
  "scrap.lands": "view",
  "scrap.equipment": "view",
  "warehouse.inventory": "edit",
  "warehouse.sales": "edit",
  "settings": "view"
}'),
('hr', '{
  "dashboard": "none",
  "trailers": "none",
  "finance.bankAccounts": "none",
  "finance.expenses": "none",
  "finance.reports": "none",
  "finance.quickEntry": "none",
  "finance.quotations": "none",
  "finance.income": "none",
  "finance.invoices": "none",
  "hr.employees": "full",
  "hr.salaries": "edit",
  "marine.vessels": "none",
  "marine.customers": "none",
  "marine.rentals": "none",
  "scrap.lands": "none",
  "scrap.equipment": "none",
  "warehouse.inventory": "none",
  "warehouse.sales": "none",
  "settings": "view"
}'),
('storekeeper', '{
  "dashboard": "none",
  "trailers": "none",
  "finance.bankAccounts": "none",
  "finance.expenses": "none",
  "finance.reports": "none",
  "finance.quickEntry": "create",
  "finance.quotations": "none",
  "finance.income": "none",
  "finance.invoices": "none",
  "hr.employees": "none",
  "hr.salaries": "none",
  "marine.vessels": "view",
  "marine.customers": "view",
  "marine.rentals": "view",
  "scrap.lands": "view",
  "scrap.equipment": "edit",
  "warehouse.inventory": "full",
  "warehouse.sales": "create",
  "settings": "none"
}')
ON CONFLICT (role) DO NOTHING;

-- ── Update existing rows to remove dashboard access for non-admin ─────────────
UPDATE role_permissions
SET permissions = permissions || '{"dashboard": "none"}'::jsonb,
    updated_at  = NOW()
WHERE role IN ('accountant', 'hr', 'storekeeper');
