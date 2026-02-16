# SQL Database Setup Guide

This guide explains how to set up the OSS System database in Supabase. All SQL scripts are **idempotent** - you can run them multiple times safely without errors.

## 📋 Prerequisites

- Supabase account created
- Project created in Supabase
- Access to Supabase SQL Editor

## 🚀 Quick Setup (Run These in Order)

### Step 1: Core Database Schema
Run `supabase-schema.sql` first - this creates all core tables.

```sql
-- Copy and paste the entire contents of supabase-schema.sql
-- into Supabase SQL Editor and execute
```

**Creates:**
- Companies, Users, Employees
- Vessels and vessel-related tables (movements, equipment sales, scrap sales, drydock, overhauls)
- Land purchases and scrap services tables
- Invoices, Expenses, Inventory
- Financial summary views

### Step 2: Authentication & Role Management
Run `auth-schema.sql` second - adds authentication and rental features.

```sql
-- Copy and paste the entire contents of auth-schema.sql
-- into Supabase SQL Editor and execute
```

**Creates:**
- Roles and user management
- Customers and vessel rentals
- Rental payments
- Crew assignments and certifications
- Maintenance schedules and fuel records
- Activity logs, notifications, documents
- Default admin users

**Default Users Created:**
| Email | Password | Role |
|-------|----------|------|
| admin@ossgroup.com | admin123 | Admin |
| hr@ossgroup.com | hr123 | HR Manager |
| store@ossgroup.com | store123 | Store Keeper |
| accounts@ossgroup.com | accounts123 | Accountant |

⚠️ **Change these passwords immediately in production!**

### Step 3: Warehouse & Inventory
Run `warehouse-schema.sql` third - adds warehouse management.

```sql
-- Copy and paste the entire contents of warehouse-schema.sql
-- into Supabase SQL Editor and execute
```

**Creates:**
- Warehouses
- Marine inventory (spare parts, consumables)
- Equipment tracking (generators, engines, large equipment)
- Purchase requisitions
- Inventory movements

**Sample Warehouses Created:**
- Warehouse A (Dubai)
- Warehouse B (Sharjah)
- Port Storage 1 (Abu Dhabi)

### Step 4: Inventory Usage + Ledger
Run `inventory-usage-schema.sql` and `inventory-ledger.sql` to enable item-level usage and full stock movement history.

```sql
-- Copy and paste the entire contents of inventory-usage-schema.sql
-- into Supabase SQL Editor and execute

-- Then run inventory-ledger.sql
```

**Creates:**
- Inventory usage tracking
- Equipment replacement tracking
- Inventory ledger with running balance view

### Step 5: Disable Row Level Security (For Testing)
Run `fix-rls-policies.sql` last - disables RLS for easier testing.

```sql
-- Copy and paste the entire contents of fix-rls-policies.sql
-- into Supabase SQL Editor and execute
```

**What it does:**
- Disables Row Level Security on all 47+ tables
- Allows your application to access data without authentication restrictions
- ⚠️ Only use this in development/testing - implement proper RLS in production!

## 🔄 Re-running Scripts

All scripts are idempotent and include:
- `DROP TABLE IF EXISTS` statements
- `DROP TRIGGER IF EXISTS` statements  
- `DROP POLICY IF EXISTS` statements
- `ON CONFLICT DO NOTHING` for sample data inserts

**You can safely re-run any script multiple times without errors.**

## 📊 Database Structure

### Total Tables: 47+

**Core (8):** companies, users, employees, external_labor, salary_payments, invoices, invoice_items, expenses

**Marine Services (10):** vessels, vessel_movements, vessel_equipment_sales, vessel_scrap_sales, drydock_records, vessel_overhaul_projects, overhaul_tasks, maintenance_schedules, fuel_records, crew_assignments

**Scrap Services (3):** land_purchases, land_equipment, land_scrap_sales

**Rentals (3):** customers, vessel_rentals, rental_payments

**Inventory (7):** warehouses, marine_inventory, equipment_tracking, purchase_requisitions, inventory_movements, inventory, inventory_transactions

**HR & Crew (2):** crew_certifications, crew_assignments

**Auth & System (8):** roles, user_roles, user_sessions, activity_logs, notifications, documents

## 🔍 Verify Setup

After running all scripts, verify in Supabase:

1. **Table Editor**: Check that all 47+ tables exist
2. **SQL Editor**: Run test query:
```sql
SELECT 
  (SELECT COUNT(*) FROM companies) as companies,
  (SELECT COUNT(*) FROM vessels) as vessels,
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM warehouses) as warehouses,
  (SELECT COUNT(*) FROM roles) as roles;
```

Expected results: At least 3 companies, 1 vessel, 4 users, 3 warehouses, 9 roles

## ⚙️ Environment Variables

After database setup, update your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get these from: Supabase Dashboard → Settings → API

## 🎯 Next Steps

1. ✅ Run all 6 SQL scripts in order
2. ✅ Verify tables created successfully
3. ✅ Update environment variables
4. ✅ Test login with default users
5. ✅ Change default passwords
6. 🚀 Deploy your Next.js app to Vercel

## ❓ Troubleshooting

### "Table already exists" error
- Scripts are idempotent - this shouldn't happen
- If it does, the script will drop and recreate tables automatically

### "Policy already exists" error
- Scripts include `DROP POLICY IF EXISTS`
- Re-run the script - it will handle this automatically

### "Foreign key violation" error
- Make sure you ran scripts in the correct order:
  1. supabase-schema.sql
  2. auth-schema.sql
  3. warehouse-schema.sql
  4. inventory-usage-schema.sql
  5. inventory-ledger.sql
  6. fix-rls-policies.sql

### "Function already exists" error
- Functions use `CREATE OR REPLACE` - this is normal and safe

### Authentication not working
- Run `fix-rls-policies.sql` to disable RLS
- Check that users table has the default users
- Verify environment variables are correct

## 📝 Notes

- All timestamps use `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- All IDs use `UUID DEFAULT uuid_generate_v4()`
- All amounts use `DECIMAL(15,2)` for precision
- Sample data is included for testing
- RLS is enabled but permissive for development

## 🔐 Production Checklist

Before going to production:

- [ ] Change all default passwords
- [ ] Implement proper RLS policies (remove fix-rls-policies.sql changes)
- [ ] Add proper authentication flow
- [ ] Set up backup schedules
- [ ] Configure environment-specific variables
- [ ] Review and adjust user roles/permissions
- [ ] Add audit logging
- [ ] Set up monitoring and alerts

---

**Last Updated:** February 2026  
**OSS Group Marine & Scrap Management System**
