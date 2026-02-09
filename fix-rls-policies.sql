    -- Quick Fix: Disable RLS or Make Policies More Permissive
    -- Run this in Supabase SQL Editor

    -- Option 1: Temporarily disable RLS on all tables (easiest for testing)
    -- Core Tables
    ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
    ALTER TABLE users DISABLE ROW LEVEL SECURITY;
    ALTER TABLE employees DISABLE ROW LEVEL SECURITY;

    -- Marine Tables
    ALTER TABLE vessels DISABLE ROW LEVEL SECURITY;
    ALTER TABLE vessel_movements DISABLE ROW LEVEL SECURITY;
    ALTER TABLE vessel_equipment_sales DISABLE ROW LEVEL SECURITY;
    ALTER TABLE vessel_scrap_sales DISABLE ROW LEVEL SECURITY;
    ALTER TABLE drydock_records DISABLE ROW LEVEL SECURITY;
    ALTER TABLE vessel_overhaul_projects DISABLE ROW LEVEL SECURITY;
    ALTER TABLE overhaul_tasks DISABLE ROW LEVEL SECURITY;
    ALTER TABLE maintenance_schedules DISABLE ROW LEVEL SECURITY;
    ALTER TABLE fuel_records DISABLE ROW LEVEL SECURITY;

    -- Scrap Tables
    ALTER TABLE land_purchases DISABLE ROW LEVEL SECURITY;
    ALTER TABLE land_equipment DISABLE ROW LEVEL SECURITY;
    ALTER TABLE land_scrap_sales DISABLE ROW LEVEL SECURITY;

    -- Finance Tables
    ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
    ALTER TABLE invoice_items DISABLE ROW LEVEL SECURITY;
    ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
    ALTER TABLE salary_payments DISABLE ROW LEVEL SECURITY;
    ALTER TABLE external_labor DISABLE ROW LEVEL SECURITY;

    -- Inventory Tables
    ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;
    ALTER TABLE inventory_transactions DISABLE ROW LEVEL SECURITY;
    ALTER TABLE marine_inventory DISABLE ROW LEVEL SECURITY;

    -- Warehouse Tables
    ALTER TABLE warehouses DISABLE ROW LEVEL SECURITY;
    ALTER TABLE warehouse_sales DISABLE ROW LEVEL SECURITY;

    -- Income Tables
    ALTER TABLE income_records DISABLE ROW LEVEL SECURITY;
    ALTER TABLE vessel_rentals DISABLE ROW LEVEL SECURITY;

    -- Rental Tables
    ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
    ALTER TABLE rental_payments DISABLE ROW LEVEL SECURITY;

    -- Crew Tables
    ALTER TABLE crew_assignments DISABLE ROW LEVEL SECURITY;
    ALTER TABLE crew_certifications DISABLE ROW LEVEL SECURITY;

    -- Vessel Operations Tables (from vessel-operations-schema.sql)
    ALTER TABLE vessel_maintenance_issues DISABLE ROW LEVEL SECURITY;
    ALTER TABLE maintenance_time_logs DISABLE ROW LEVEL SECURITY;
    ALTER TABLE vessel_service_schedules DISABLE ROW LEVEL SECURITY;
    ALTER TABLE vessel_crew_assignments DISABLE ROW LEVEL SECURITY;
    ALTER TABLE vessel_tasks DISABLE ROW LEVEL SECURITY;
    ALTER TABLE vessel_log_entries DISABLE ROW LEVEL SECURITY;
    ALTER TABLE vessel_incident_logs DISABLE ROW LEVEL SECURITY;
    ALTER TABLE vessel_spares_inventory DISABLE ROW LEVEL SECURITY;
    ALTER TABLE vessel_provisions DISABLE ROW LEVEL SECURITY;
    ALTER TABLE vessel_documents DISABLE ROW LEVEL SECURITY;
    ALTER TABLE vessel_reminders DISABLE ROW LEVEL SECURITY;
    ALTER TABLE vessel_contacts DISABLE ROW LEVEL SECURITY;
    ALTER TABLE vessel_guest_preferences DISABLE ROW LEVEL SECURITY;
    ALTER TABLE vessel_operational_costs DISABLE ROW LEVEL SECURITY;

    -- System Tables
    ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
    ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
    ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
    ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
    ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
    ALTER TABLE documents DISABLE ROW LEVEL SECURITY;

    -- Alternative Option 2: Allow anonymous access (if you want to keep RLS enabled)
    -- Uncomment the lines below if you prefer this approach:

    /*
    -- Drop existing restrictive policies
    DROP POLICY IF EXISTS "Allow authenticated users to read" ON companies;
    DROP POLICY IF EXISTS "Allow admin/manager to modify" ON companies;
    DROP POLICY IF EXISTS "Allow authenticated users to read" ON users;
    DROP POLICY IF EXISTS "Allow admin/manager to modify" ON users;
    DROP POLICY IF EXISTS "Allow authenticated users to read" ON employees;
    DROP POLICY IF EXISTS "Allow admin/manager to modify" ON employees;
    DROP POLICY IF EXISTS "Allow authenticated users to read" ON vessels;
    DROP POLICY IF EXISTS "Allow admin/manager to modify" ON vessels;
    DROP POLICY IF EXISTS "Allow authenticated users to read" ON land_purchases;
    DROP POLICY IF EXISTS "Allow admin/manager to modify" ON land_purchases;
    DROP POLICY IF EXISTS "Allow authenticated users to read" ON invoices;
    DROP POLICY IF EXISTS "Allow admin/manager to modify" ON invoices;
    DROP POLICY IF EXISTS "Allow authenticated users to read" ON expenses;
    DROP POLICY IF EXISTS "Allow admin/manager to modify" ON expenses;

    -- Create permissive policies that allow all operations
    CREATE POLICY "Allow all operations" ON companies FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all operations" ON users FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all operations" ON employees FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all operations" ON vessels FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all operations" ON land_purchases FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all operations" ON invoices FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all operations" ON expenses FOR ALL USING (true) WITH CHECK (true);
    */

    -- After running this, your application should work without authentication issues
    -- Note: For production, you should implement proper authentication and more secure policies
