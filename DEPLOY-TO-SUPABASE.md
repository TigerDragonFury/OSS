# Deploy Database to Supabase - Step by Step

## ⚠️ IMPORTANT: Run in this EXACT ORDER

Your migration script isn't working because it requires a function that doesn't exist. Follow these steps instead:

### Step 1: Open Supabase SQL Editor

1. Go to https://bybdoxmcyrzpavnvddfa.supabase.co
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**

### Step 2: Run SQL Files in Order

Copy and paste each file's contents into the SQL Editor and click **Run** (or press Ctrl+Enter).

**Run these files in this exact order:**

#### 1️⃣ **supabase-schema.sql** (Main schema - REQUIRED)
   - Contains: vessels, employees, invoices, expenses, etc.
   - Contains: **vessel_financial_summary VIEW** ✅ (fixes your 400 error)

#### 2️⃣ **auth-schema.sql** (Auth & Rentals - REQUIRED)
   - Contains: customers, vessel_rentals, **rental_payments** ✅ (fixes your 400 error)
   - Contains: RLS policies

#### 3️⃣ **vessel-operations-schema.sql** (Operations - REQUIRED for new features)
   - Contains: All 14 operations tables (maintenance, crew, tasks, logs, documents, etc.)
   - **NOT in migration script** - you must run this manually!

#### 4️⃣ **warehouse-schema.sql** (Warehouse features)
   - Contains: warehouse inventory tables

#### 5️⃣ **fix-rls-policies.sql** (Security fixes)
   - Disables RLS temporarily for development
   - Run this AFTER the above schemas

### Step 3: Verify Tables Created

After running each file, check the **Table Editor** (left sidebar) to verify tables are created.

### Step 4: Test Your Application

1. Refresh your browser (Ctrl+Shift+R)
2. Navigate to a vessel detail page
3. The 400 errors should be gone

---

## 🔧 Quick Fix for Current Errors

If you just want to fix the 400 errors quickly, run these 3 files in order:

1. **supabase-schema.sql** → Creates `vessel_financial_summary` view
2. **auth-schema.sql** → Creates `rental_payments` table  
3. **vessel-operations-schema.sql** → Creates all operations tables

---

## ❓ Troubleshooting

**If you get errors about existing tables:**
- That's OK! The scripts use `CREATE TABLE IF NOT EXISTS`
- They won't delete existing data
- Just continue to the next file

**If you get RLS policy errors:**
- Run **fix-rls-policies.sql** last
- This disables RLS for development

**If vessel operations pages show "table doesn't exist":**
- You MUST run **vessel-operations-schema.sql**
- This file is NOT in the automatic migration list
