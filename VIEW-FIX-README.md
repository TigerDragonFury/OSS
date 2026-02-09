## CRITICAL BUG FOUND AND FIXED

### The Problem:
The `vessel_financial_summary` VIEW had **WRONG COLUMN NAMES** that didn't match what the TypeScript code expected:

**TypeScript code expects:**
- `total_equipment_sales`
- `total_scrap_sales`
- `total_rental_income`
- `total_expenses`
- `total_overhaul_expenses`

**Old VIEW was providing:**
- `equipment_sales` ❌ (wrong name)
- `scrap_sales` ❌ (wrong name)
- `total_rental_income` ✅ (correct)
- Missing `total_expenses` ❌
- Missing `total_overhaul_expenses` ❌

**Result:** All vessel pages showed 0 revenue because the column names didn't match!

### Additional Issues Fixed:
1. **Rental income calculation** was summing ALL rentals instead of only `paid` + `active/completed` rentals
2. Missing columns `total_expenses` and `total_overhaul_expenses` that TypeScript expected

### The Fix:
Updated the VIEW in three files:
1. `supabase-schema.sql` - Main schema file (source of truth)
2. `add-rental-income-to-view.sql` - Migration file
3. `complete-view-fix.sql` - Comprehensive diagnostic and fix script

### How to Apply the Fix:

**Option 1: Run complete-view-fix.sql (RECOMMENDED)**
1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/bybdoxmcyrzpavnvddfa/sql
2. Copy ALL contents of `complete-view-fix.sql`
3. Run it in Supabase SQL Editor
4. This will:
   - Show you current VIEW state (diagnostic)
   - Drop and recreate VIEW with correct column names
   - Filter rentals properly (paid + active/completed only)
   - Add missing columns
   - Verify the fix worked

**Option 2: Run add-rental-income-to-view.sql (Quick Fix)**
1. Open Supabase SQL Editor
2. Copy the CREATE VIEW statement from `add-rental-income-to-view.sql`
3. Run it

### After Running the SQL:
Refresh your browser on these pages and they should all show correct data:
- Dashboard: http://localhost:3000/dashboard
- Vessel detail: http://localhost:3000/dashboard/marine/vessels/[id]
- Financial operations: http://localhost:3000/dashboard/marine/vessels/[id]/operations/financial
- Rentals operations: http://localhost:3000/dashboard/marine/vessels/[id]/operations/rentals

### Expected Results:
- ✅ Vessel with equipment sales will show revenue > 0
- ✅ Rental income will be 10,766 (not 53,880) for the test vessel
- ✅ All financial breakdowns will be accurate
- ✅ All three vessel pages will show consistent numbers

### Files Changed:
- `supabase-schema.sql` - Updated VIEW definition
- `add-rental-income-to-view.sql` - Updated migration script
- `complete-view-fix.sql` - NEW comprehensive fix script
- `app/dashboard/marine/vessels/[id]/operations/rentals/page.tsx` - Fixed rental calculation

### Git Commit:
- Commit: b218129
- Already pushed to GitHub ✅
