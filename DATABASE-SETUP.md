# Database Setup Guide

## 📋 Required Actions in Supabase

To make your OSS system fully functional, you need to run the SQL scripts in your Supabase database.

### Step 1: Run Main Schema
1. Go to [Supabase SQL Editor](https://app.supabase.com)
2. Navigate to your project
3. Open **SQL Editor**
4. Copy and run the contents of `supabase-schema.sql`
5. Wait for completion

### Step 2: Run Auth Schema  
1. In the same SQL Editor
2. Copy and run the contents of `auth-schema.sql`
3. This adds rental, crew, maintenance, and fuel management tables

### Step 3: Run Warehouse Schema (Optional)
1. If you need enhanced inventory features
2. Copy and run the contents of `warehouse-schema.sql`

### Step 4: Fix RLS Policies
1. **IMPORTANT**: Run this to fix the 404 and 400 errors
2. Copy and run the contents of `fix-rls-policies.sql`
3. This disables Row Level Security for testing

> **Note**: The RLS script disables security for testing. For production, implement proper authentication-based policies.

---

## ✅ What Was Fixed

### 1. **Table Reference Errors**
- ✅ Fixed `maintenance_records` → `maintenance_schedules`
- ✅ Fixed `vessel_name` → `name` field references
- ✅ Fixed `rentals` → `vessel_rentals` references

### 2. **Missing Pages Created**
- ✅ `/dashboard/marine/maintenance` - Vessel maintenance tracking
- ✅ `/dashboard/marine/fuel` - Fuel consumption records
- ✅ `/dashboard/rentals/payments` - Rental payment management
- ✅ `/dashboard/crew` - Crew assignments
- ✅ `/dashboard/crew/certifications` - Crew certifications tracking
- ✅ `/dashboard/settings` - Application settings
- ✅ `/dashboard/profile` - User profile management

### 3. **RLS Policies Updated**
- ✅ Added all 47 tables to RLS disable script
- ✅ Organized by category (Core, Marine, Scrap, Finance, etc.)
- ✅ Includes all new tables for crew, rentals, maintenance, and fuel

---

## 🔧 Testing Your Application

### After running the SQL scripts:

1. **Test Navigation**
   - All sidebar links should work
   - No more 404 errors

2. **Test Data Loading**
   - Land purchases page should load
   - Overhauls page should display projects
   - All new pages should be accessible

3. **Test Features**
   - Add new crew assignments
   - Track maintenance schedules
   - Record fuel consumption
   - Manage rental payments

---

## 🚀 Deployment to Vercel

### Environment Variables Required:
When deploying to Vercel, add these environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://bybdoxmcyrzpavnvddfa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

⚠️ **Never commit `.env.local` to git** - it's already in `.gitignore`

---

## 📊 Database Tables Overview

### Core Management
- `companies`, `users`, `employees`, `roles`, `user_roles`

### Marine Services  
- `vessels`, `vessel_movements`, `drydock_records`
- `vessel_overhaul_projects`, `overhaul_tasks`
- `maintenance_schedules`, `fuel_records`
- `crew_assignments`, `crew_certifications`

### Rental Management
- `customers`, `vessel_rentals`, `rental_payments`

### Scrap Services
- `land_purchases`, `land_equipment`, `land_scrap_sales`
- `vessel_equipment_sales`, `vessel_scrap_sales`

### Finance
- `invoices`, `invoice_items`, `expenses`
- `salary_payments`, `external_labor`

### Inventory
- `inventory`, `inventory_transactions`

### System
- `activity_logs`, `notifications`, `documents`, `user_sessions`

---

## 🐛 Troubleshooting

### If you still see 404 errors:
1. Clear browser cache
2. Restart the Next.js dev server
3. Check browser console for specific errors

### If you see 400 errors from Supabase:
1. Make sure you ran `fix-rls-policies.sql`
2. Check if all tables exist in your database
3. Verify your Supabase credentials in `.env.local`

### If data doesn't load:
1. Check Supabase logs in dashboard
2. Verify table names match the schema
3. Ensure RLS policies are disabled for testing

---

## 📧 Support

For issues or questions, refer to:
- `QUICKSTART.md` - Quick setup guide
- `DEPLOYMENT.md` - Deployment instructions
- `README.md` - Project overview

---

**Last Updated**: February 8, 2026
**Version**: 1.0.0
