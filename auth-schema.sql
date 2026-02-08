-- Authentication and Role-Based Access Control Schema
-- Run this AFTER the main supabase-schema.sql

-- Drop existing tables if needed
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Roles Table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
('admin', 'Full system access', '{"all": true}'),
('hr_manager', 'HR Department Manager - Manage employees, salaries, attendance', '{"employees": true, "salaries": true, "attendance": true, "reports": ["hr"]}'),
('hr_staff', 'HR Staff - View employees, process salaries', '{"employees": ["read"], "salaries": true}'),
('store_keeper', 'Store Keeper - Manage inventory and warehouses', '{"inventory": true, "warehouses": true, "requisitions": true, "equipment": true}'),
('accountant', 'Accountant - Manage finances, invoices, expenses', '{"invoices": true, "expenses": true, "reports": ["finance"], "salaries": ["read"]}'),
('operations_manager', 'Operations Manager - Manage vessels, rentals, overhauls', '{"vessels": true, "rentals": true, "overhauls": true, "crew": true}'),
('vessel_captain', 'Vessel Captain - View assigned vessel, manage crew', '{"vessels": ["read"], "crew": ["read"], "inventory": ["read"]}'),
('rental_agent', 'Rental Agent - Manage customers and bookings', '{"customers": true, "rentals": true, "vessels": ["read"]}'),
('viewer', 'View Only - Read access to most areas', '{"read_only": true}');

-- User Roles Junction Table (users can have multiple roles)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, role_id)
);

-- User Sessions Table
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers Table (for vessel rentals)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_code VARCHAR(50) UNIQUE,
  company_name VARCHAR(255),
  contact_person VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  mobile VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'UAE',
  tax_id VARCHAR(100),
  customer_type VARCHAR(50) DEFAULT 'individual', -- individual, company, government
  credit_limit DECIMAL(15,2) DEFAULT 0,
  payment_terms INTEGER DEFAULT 30, -- days
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, blacklisted
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vessel Rentals Table
CREATE TABLE vessel_rentals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_number VARCHAR(50) UNIQUE NOT NULL,
  vessel_id UUID REFERENCES vessels(id) NOT NULL,
  customer_id UUID REFERENCES customers(id) NOT NULL,
  rental_type VARCHAR(50) DEFAULT 'daily', -- daily, weekly, monthly, voyage
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  actual_return_date DATE,
  daily_rate DECIMAL(12,2),
  total_amount DECIMAL(15,2),
  deposit_amount DECIMAL(15,2) DEFAULT 0,
  deposit_paid BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, active, completed, cancelled
  pickup_location VARCHAR(255),
  return_location VARCHAR(255),
  purpose TEXT,
  special_requirements TEXT,
  crew_included BOOLEAN DEFAULT false,
  fuel_included BOOLEAN DEFAULT false,
  insurance_included BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMP,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rental Payments Table
CREATE TABLE rental_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID REFERENCES vessel_rentals(id) NOT NULL,
  payment_type VARCHAR(50) DEFAULT 'rental', -- deposit, rental, extension, damage, other
  amount DECIMAL(15,2) NOT NULL,
  payment_method VARCHAR(50), -- cash, bank_transfer, cheque, card
  payment_date DATE NOT NULL,
  reference_number VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, refunded
  notes TEXT,
  received_by UUID REFERENCES employees(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crew Assignments Table
CREATE TABLE crew_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vessel_id UUID REFERENCES vessels(id) NOT NULL,
  employee_id UUID REFERENCES employees(id) NOT NULL,
  role VARCHAR(100) NOT NULL, -- captain, engineer, deckhand, cook, etc.
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'active', -- active, completed, cancelled
  daily_allowance DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  assigned_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(vessel_id, employee_id, start_date)
);

-- Crew Certifications Table
CREATE TABLE crew_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) NOT NULL,
  certification_name VARCHAR(200) NOT NULL,
  certification_number VARCHAR(100),
  issuing_authority VARCHAR(200),
  issue_date DATE,
  expiry_date DATE,
  status VARCHAR(50) DEFAULT 'valid', -- valid, expired, revoked
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance Schedule Table
CREATE TABLE maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vessel_id UUID REFERENCES vessels(id),
  equipment_id UUID REFERENCES equipment_tracking(id),
  maintenance_type VARCHAR(100) NOT NULL, -- routine, preventive, corrective, emergency
  title VARCHAR(255) NOT NULL,
  description TEXT,
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  frequency VARCHAR(50), -- daily, weekly, monthly, quarterly, yearly, one-time
  priority VARCHAR(50) DEFAULT 'normal', -- low, normal, high, critical
  estimated_hours DECIMAL(6,2),
  actual_hours DECIMAL(6,2),
  estimated_cost DECIMAL(12,2),
  actual_cost DECIMAL(12,2),
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled, overdue
  assigned_to UUID REFERENCES employees(id),
  completed_by UUID REFERENCES employees(id),
  parts_used TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fuel Records Table
CREATE TABLE fuel_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vessel_id UUID REFERENCES vessels(id) NOT NULL,
  record_date DATE NOT NULL,
  fuel_type VARCHAR(50) DEFAULT 'diesel', -- diesel, gasoline, marine_gas_oil
  quantity_liters DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(8,2),
  total_cost DECIMAL(12,2),
  supplier VARCHAR(200),
  receipt_number VARCHAR(100),
  current_engine_hours DECIMAL(10,2),
  notes TEXT,
  recorded_by UUID REFERENCES employees(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity Logs Table (Audit Trail)
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL, -- create, update, delete, login, logout, view
  entity_type VARCHAR(100), -- vessel, employee, rental, invoice, etc.
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50) DEFAULT 'info', -- info, warning, error, success
  category VARCHAR(50), -- rental, maintenance, payment, system
  link VARCHAR(255),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents Table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(100) NOT NULL, -- vessel, employee, rental, customer, invoice
  entity_id UUID NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(100), -- contract, certificate, invoice, receipt, photo
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update users table to add password hash and additional fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vessel_rentals_updated_at BEFORE UPDATE ON vessel_rentals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crew_assignments_updated_at BEFORE UPDATE ON crew_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crew_certifications_updated_at BEFORE UPDATE ON crew_certifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_schedules_updated_at BEFORE UPDATE ON maintenance_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for new tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vessel_rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (adjust based on role requirements later)
CREATE POLICY "Allow all on roles" ON roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on user_roles" ON user_roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on user_sessions" ON user_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on vessel_rentals" ON vessel_rentals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on rental_payments" ON rental_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on crew_assignments" ON crew_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on crew_certifications" ON crew_certifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on maintenance_schedules" ON maintenance_schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on fuel_records" ON fuel_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on activity_logs" ON activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on documents" ON documents FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_vessel_rentals_vessel_id ON vessel_rentals(vessel_id);
CREATE INDEX idx_vessel_rentals_customer_id ON vessel_rentals(customer_id);
CREATE INDEX idx_vessel_rentals_status ON vessel_rentals(status);
CREATE INDEX idx_rental_payments_rental_id ON rental_payments(rental_id);
CREATE INDEX idx_crew_assignments_vessel_id ON crew_assignments(vessel_id);
CREATE INDEX idx_crew_assignments_employee_id ON crew_assignments(employee_id);
CREATE INDEX idx_maintenance_schedules_vessel_id ON maintenance_schedules(vessel_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id);

-- Insert sample admin user (password: admin123 - should be hashed in production)
-- Note: In production, use proper password hashing like bcrypt
INSERT INTO users (email, full_name, role, phone, password_hash, is_active) VALUES
('admin@ossgroup.com', 'System Administrator', 'admin', '+971501234567', 'admin123', true),
('hr@ossgroup.com', 'HR Manager', 'manager', '+971501234568', 'hr123', true),
('store@ossgroup.com', 'Store Keeper', 'operator', '+971501234569', 'store123', true),
('accounts@ossgroup.com', 'Chief Accountant', 'accountant', '+971501234570', 'accounts123', true)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Assign roles to sample users
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'admin@ossgroup.com' AND r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'hr@ossgroup.com' AND r.name = 'hr_manager'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'store@ossgroup.com' AND r.name = 'store_keeper'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'accounts@ossgroup.com' AND r.name = 'accountant'
ON CONFLICT DO NOTHING;

-- Sample customer
INSERT INTO customers (customer_code, company_name, contact_person, email, phone, city, country, customer_type) VALUES
('CUST-001', 'Dubai Port World', 'Ahmed Al Maktoum', 'ahmed@dpworld.ae', '+97142881111', 'Dubai', 'UAE', 'company'),
('CUST-002', 'Abu Dhabi Shipping', 'Mohammed Al Nahyan', 'mohammed@adship.ae', '+97126661111', 'Abu Dhabi', 'UAE', 'company'),
('CUST-003', NULL, 'John Smith', 'john.smith@email.com', '+971501112222', 'Sharjah', 'UAE', 'individual');
