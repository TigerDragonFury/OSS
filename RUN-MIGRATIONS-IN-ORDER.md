# Database Migration Guide - Run in Supabase SQL Editor

Go to: https://app.supabase.com/project/bybdoxmcyrzpavnvddfa/sql

**Run these SQL files in this exact order:**

## Step 1: Core Schema (REQUIRED - Fixes 406 errors)
```
1. supabase-schema.sql          - Core tables with all columns
2. auth-schema.sql              - Authentication setup
3. warehouse-schema.sql         - Warehouse tables
4. inventory-usage-schema.sql   - Inventory usage + equipment tracking
5. inventory-ledger.sql         - Item-level inventory ledger
6. fix-rls-policies.sql         - Security policies
```

## Step 2: Triggers & Automation
```
7. auto-update-total-spent.sql  - Auto-update project costs
```

## Step 3: Data Migrations
```
8. add-payment-method-to-expenses.sql  - Add payment_method column
9. update-companies-types.sql          - Add company categorization
10. fix-land-scrap-sales-schema.sql     - Update scrap sales columns
11. fix-scrap-sales-units.sql           - Convert kg to tons + auto-sync trigger
```

---

## Alternative: Copy/Paste Individual Files

If a file fails, you can copy/paste the contents of each SQL file directly into the SQL Editor.

### Files are located in:
```
C:\Users\Exceed\Desktop\oss-system\
```

### After running all migrations:
1. The 406 error will be fixed
2. All data syncing will work automatically
3. Use admin utilities for one-time data corrections:
   - /dashboard/admin/sync-expenses
   - /dashboard/admin/sync-tonnage

---

## Quick Test After Migration:
1. Go to: https://oss-wheat.vercel.app/dashboard/scrap/lands
2. Try to view a land purchase (should work without 406 error)
3. Add a scrap sale - remaining tonnage should auto-update
4. Forms should show company dropdowns (contractors, scrap buyers, dealers)

---

## Troubleshooting:

**If you still get 406 errors:**
1. In Supabase Dashboard: Settings → API → click "Restart PostgREST"
2. This refreshes the schema cache

**If columns are missing:**
- Re-run supabase-schema.sql (it's safe to run multiple times)
- Check "Table Editor" in Supabase to verify columns exist

**If triggers aren't working:**
- Re-run auto-update-total-spent.sql
- Re-run fix-scrap-sales-units.sql
