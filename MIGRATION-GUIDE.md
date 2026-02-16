# Database Migration Guide

This guide explains how to run database migrations automatically or manually.

## Method 1: Browser-Based (Recommended - Easiest)

**Best for:** Quick setup, no additional tools needed

1. **Open Supabase SQL Editor:**
   ```
   https://app.supabase.com/project/_/sql
   ```

2. **Run scripts in this order:**
   - `supabase-schema.sql` - Main database schema
   - `auth-schema.sql` - Authentication setup
   - `warehouse-schema.sql` - Warehouse tables
   - `inventory-usage-schema.sql` - Inventory usage + equipment tracking
   - `inventory-ledger.sql` - Item-level inventory ledger
   - `fix-rls-policies.sql` - Row-level security policies
   - `sync-completed-expenses.sql` - Backfill expenses
   - `auto-update-total-spent.sql` - Auto-update trigger
   - `add-payment-method-to-expenses.sql` - Add payment method
   - `fix-land-scrap-sales-schema.sql` - Fix land scrap columns
   - `update-companies-types.sql` - Update company types

3. **For each file:**
   - Copy the entire file content
   - Paste into SQL Editor
   - Click "Run" button
   - Wait for success message

**Note:** All scripts are idempotent (safe to run multiple times).

---

## Method 2: Node.js Script (Automated)

**Best for:** Quick automated execution from your project

### Prerequisites:
- Node.js installed
- Supabase credentials in `.env.local`

### Setup `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key (optional)
```

### Run:
```bash
node run-migrations.js
```

### What it does:
- ✅ Connects to your Supabase database
- ✅ Runs all SQL files in correct order
- ✅ Reports success/failure for each file
- ✅ Provides helpful error messages
- ✅ Shows migration summary

### Limitations:
- May require manual execution for some scripts via SQL Editor
- REST API has limitations with raw SQL execution

---

## Method 3: PostgreSQL Client (Advanced)

**Best for:** Direct database access, full control

### Prerequisites:
- PostgreSQL client tools (`psql`) installed
- Direct database connection details

### Get Connection Details:
1. Go to Supabase Project Settings > Database
2. Copy connection info:
   - Host: `db.*.supabase.co`
   - Database: `postgres`
   - Port: `5432`
   - User: `postgres`
   - Password: Your database password

### Option A: PowerShell Script (Windows)
```powershell
# Set environment variables
$env:SUPABASE_DB_HOST = "db.your-project.supabase.co"
$env:SUPABASE_DB_PASSWORD = "your-password"

# Run migrations
.\run-migrations.ps1
```

### Option B: Direct psql Commands
```bash
# Set password (to avoid prompts)
export PGPASSWORD='your-password'

# Run each migration
psql -h db.your-project.supabase.co -U postgres -d postgres -f supabase-schema.sql
psql -h db.your-project.supabase.co -U postgres -d postgres -f auth-schema.sql
# ... repeat for other files

# Clear password
unset PGPASSWORD
```

---

## Troubleshooting

### ❌ "relation does not exist"
**Cause:** Table/schema not created yet  
**Fix:** Make sure `supabase-schema.sql` ran successfully first

### ❌ "constraint violation"
**Cause:** Data doesn't match constraint requirements  
**Fix:** Check the data being inserted matches table constraints

### ❌ "column does not exist"
**Cause:** Migration order issue or missing migration  
**Fix:** Run migrations in the exact order specified

### ❌ "function does not exist"
**Cause:** Function not created yet  
**Fix:** Make sure `supabase-schema.sql` ran first

### ❌ "permission denied"
**Cause:** Insufficient database permissions  
**Fix:** Use service role key or database password

---

## Verification

After running migrations, verify success:

### Check Tables Created:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Check Companies Table:
```sql
SELECT * FROM companies ORDER BY type, name;
```

### Check Triggers:
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

---

## Quick Reference

| Method | Difficulty | Speed | Recommended For |
|--------|-----------|-------|-----------------|
| Browser SQL Editor | ⭐ Easy | Moderate | First-time setup, manual control |
| Node.js Script | ⭐⭐ Medium | Fast | Automated deployments |
| psql Client | ⭐⭐⭐ Advanced | Fastest | Direct DB access, CI/CD |

---

## Need Help?

If migrations fail:
1. Check the error message carefully
2. Verify prerequisite migrations ran successfully
3. Check Supabase logs: https://app.supabase.com/project/_/logs
4. Ensure environment variables are set correctly
5. Try running the failed script manually in SQL Editor

**All migration scripts are idempotent** - safe to run multiple times without breaking anything!
