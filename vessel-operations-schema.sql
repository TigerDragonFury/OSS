-- Comprehensive Vessel Operations Management System
-- Includes: Maintenance, Crew, Logs, Documents, Reminders, Inventory

-- ============================================
-- MAINTENANCE MANAGEMENT
-- ============================================

-- Maintenance Issues/Work Orders
CREATE TABLE IF NOT EXISTS vessel_maintenance_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vessel_id UUID REFERENCES vessels(id) ON DELETE CASCADE,
    issue_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) CHECK (category IN ('engine', 'electrical', 'plumbing', 'hull', 'deck', 'navigation', 'safety', 'hvac', 'other')),
    priority VARCHAR(20) CHECK (priority IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
    status VARCHAR(30) CHECK (status IN ('reported', 'assigned', 'in_progress', 'parts_ordered', 'completed', 'cancelled')) DEFAULT 'reported',
    reported_by UUID REFERENCES employees(id),
    reported_date TIMESTAMP DEFAULT NOW(),
    assigned_to UUID REFERENCES employees(id),
    assigned_date TIMESTAMP,
    due_date DATE,
    completed_date TIMESTAMP,
    estimated_hours DECIMAL(6,2),
    actual_hours DECIMAL(6,2),
    labor_cost DECIMAL(12,2),
    parts_cost DECIMAL(12,2),
    total_cost DECIMAL(12,2),
    location_on_vessel VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Maintenance Time Tracking
CREATE TABLE IF NOT EXISTS maintenance_time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maintenance_issue_id UUID REFERENCES vessel_maintenance_issues(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    work_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    hours_worked DECIMAL(6,2) NOT NULL,
    work_description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Service Schedules
CREATE TABLE IF NOT EXISTS vessel_service_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vessel_id UUID REFERENCES vessels(id) ON DELETE CASCADE,
    service_type VARCHAR(100) NOT NULL,
    description TEXT,
    frequency_type VARCHAR(20) CHECK (frequency_type IN ('hours', 'days', 'weeks', 'months', 'years')),
    frequency_value INTEGER,
    last_service_date DATE,
    next_service_date DATE,
    service_provider VARCHAR(200),
    estimated_cost DECIMAL(12,2),
    status VARCHAR(20) CHECK (status IN ('active', 'overdue', 'completed', 'cancelled')) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- CREW & TASK MANAGEMENT
-- ============================================

-- Crew Assignments
CREATE TABLE IF NOT EXISTS vessel_crew_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vessel_id UUID REFERENCES vessels(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    position VARCHAR(100) NOT NULL,
    assignment_type VARCHAR(20) CHECK (assignment_type IN ('permanent', 'temporary', 'relief')) DEFAULT 'permanent',
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Task Assignments
CREATE TABLE IF NOT EXISTS vessel_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vessel_id UUID REFERENCES vessels(id) ON DELETE CASCADE,
    task_title VARCHAR(255) NOT NULL,
    task_description TEXT,
    assigned_to UUID REFERENCES employees(id),
    assigned_by UUID REFERENCES employees(id),
    priority VARCHAR(20) CHECK (priority IN ('urgent', 'high', 'normal', 'low')) DEFAULT 'normal',
    status VARCHAR(30) CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
    due_date DATE,
    completed_date TIMESTAMP,
    estimated_hours DECIMAL(6,2),
    actual_hours DECIMAL(6,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- LOGS & RECORDS
-- ============================================

-- Vessel Log Book
CREATE TABLE IF NOT EXISTS vessel_log_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vessel_id UUID REFERENCES vessels(id) ON DELETE CASCADE,
    log_date TIMESTAMP NOT NULL DEFAULT NOW(),
    log_type VARCHAR(50) CHECK (log_type IN ('departure', 'arrival', 'navigation', 'maintenance', 'fuel', 'crew_change', 'weather', 'incident', 'general')),
    location VARCHAR(200),
    coordinates VARCHAR(100),
    nautical_miles DECIMAL(10,2),
    fuel_consumed DECIMAL(10,2),
    weather_conditions TEXT,
    sea_state VARCHAR(50),
    crew_on_board TEXT,
    passengers_count INTEGER,
    entry_description TEXT NOT NULL,
    entered_by UUID REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- First Aid & Accident Log
CREATE TABLE IF NOT EXISTS vessel_incident_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vessel_id UUID REFERENCES vessels(id) ON DELETE CASCADE,
    incident_number VARCHAR(50) UNIQUE NOT NULL,
    incident_date TIMESTAMP NOT NULL,
    incident_type VARCHAR(50) CHECK (incident_type IN ('injury', 'illness', 'accident', 'near_miss', 'equipment_failure', 'security', 'environmental', 'other')),
    severity VARCHAR(20) CHECK (severity IN ('minor', 'moderate', 'serious', 'critical')) DEFAULT 'minor',
    location_on_vessel VARCHAR(100),
    persons_involved TEXT,
    description TEXT NOT NULL,
    immediate_action_taken TEXT,
    medical_treatment_required BOOLEAN DEFAULT false,
    medical_provider VARCHAR(200),
    reported_to_authorities BOOLEAN DEFAULT false,
    authority_reference VARCHAR(100),
    investigation_required BOOLEAN DEFAULT false,
    investigation_notes TEXT,
    preventive_actions TEXT,
    reported_by UUID REFERENCES employees(id),
    status VARCHAR(30) CHECK (status IN ('open', 'investigating', 'closed')) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INVENTORY & PROVISIONS
-- ============================================

-- Vessel Spares Inventory
CREATE TABLE IF NOT EXISTS vessel_spares_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vessel_id UUID REFERENCES vessels(id) ON DELETE CASCADE,
    part_number VARCHAR(100),
    part_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    manufacturer VARCHAR(200),
    location_on_vessel VARCHAR(100),
    quantity_on_hand INTEGER DEFAULT 0,
    minimum_quantity INTEGER DEFAULT 0,
    unit_of_measure VARCHAR(50),
    unit_cost DECIMAL(12,2),
    supplier VARCHAR(200),
    last_order_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Provisions Inventory
CREATE TABLE IF NOT EXISTS vessel_provisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vessel_id UUID REFERENCES vessels(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) CHECK (category IN ('food', 'beverages', 'cleaning', 'toiletries', 'medical', 'safety', 'other')),
    quantity DECIMAL(10,2) DEFAULT 0,
    unit VARCHAR(50),
    minimum_quantity DECIMAL(10,2),
    expiry_date DATE,
    storage_location VARCHAR(100),
    supplier VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- DOCUMENTS & MANUALS
-- ============================================

-- Vessel Documents
CREATE TABLE IF NOT EXISTS vessel_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vessel_id UUID REFERENCES vessels(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) CHECK (document_type IN ('manual', 'certificate', 'registration', 'insurance', 'survey', 'contract', 'checklist', 'procedure', 'drawing', 'other')),
    document_category VARCHAR(100),
    file_url TEXT,
    file_size INTEGER,
    file_type VARCHAR(50),
    version VARCHAR(50),
    issue_date DATE,
    expiry_date DATE,
    description TEXT,
    tags TEXT,
    is_critical BOOLEAN DEFAULT false,
    uploaded_by UUID REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- REMINDERS & NOTIFICATIONS
-- ============================================

-- Automated Reminders
CREATE TABLE IF NOT EXISTS vessel_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vessel_id UUID REFERENCES vessels(id) ON DELETE CASCADE,
    reminder_type VARCHAR(50) CHECK (reminder_type IN ('maintenance', 'certification', 'licensing', 'insurance', 'survey', 'service', 'safety_equipment', 'other')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    reminder_days_before INTEGER DEFAULT 30,
    status VARCHAR(30) CHECK (status IN ('active', 'completed', 'snoozed', 'cancelled')) DEFAULT 'active',
    priority VARCHAR(20) CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
    assigned_to UUID REFERENCES employees(id),
    recurrence_type VARCHAR(20) CHECK (recurrence_type IN ('none', 'daily', 'weekly', 'monthly', 'yearly')) DEFAULT 'none',
    recurrence_interval INTEGER,
    last_notification_sent TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- CONTACTS & GUEST PREFERENCES
-- ============================================

-- Vessel Contacts Directory
CREATE TABLE IF NOT EXISTS vessel_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vessel_id UUID REFERENCES vessels(id) ON DELETE CASCADE,
    contact_type VARCHAR(50) CHECK (contact_type IN ('emergency', 'port_authority', 'marina', 'supplier', 'service_provider', 'agent', 'owner', 'charter', 'other')),
    contact_name VARCHAR(200) NOT NULL,
    company_name VARCHAR(200),
    phone_primary VARCHAR(50),
    phone_secondary VARCHAR(50),
    email VARCHAR(200),
    address TEXT,
    country VARCHAR(100),
    notes TEXT,
    is_emergency_contact BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Guest Preferences
CREATE TABLE IF NOT EXISTS vessel_guest_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vessel_id UUID REFERENCES vessels(id) ON DELETE CASCADE,
    guest_name VARCHAR(200) NOT NULL,
    dietary_restrictions TEXT,
    food_preferences TEXT,
    beverage_preferences TEXT,
    cabin_preferences VARCHAR(100),
    allergies TEXT,
    medical_conditions TEXT,
    special_requests TEXT,
    contact_email VARCHAR(200),
    contact_phone VARCHAR(50),
    last_visit_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- OPERATIONAL COSTS TRACKING
-- ============================================

-- Vessel Operational Costs
CREATE TABLE IF NOT EXISTS vessel_operational_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vessel_id UUID REFERENCES vessels(id) ON DELETE CASCADE,
    cost_date DATE NOT NULL,
    cost_category VARCHAR(100) CHECK (cost_category IN ('fuel', 'maintenance', 'crew_wages', 'provisions', 'port_fees', 'insurance', 'berthing', 'communications', 'supplies', 'other')),
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'AED',
    vendor VARCHAR(200),
    invoice_number VARCHAR(100),
    payment_method VARCHAR(50),
    payment_status VARCHAR(30) CHECK (payment_status IN ('pending', 'paid', 'overdue')) DEFAULT 'pending',
    notes TEXT,
    entered_by UUID REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_maintenance_vessel ON vessel_maintenance_issues(vessel_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON vessel_maintenance_issues(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_assigned ON vessel_maintenance_issues(assigned_to);
CREATE INDEX IF NOT EXISTS idx_time_logs_issue ON maintenance_time_logs(maintenance_issue_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_employee ON maintenance_time_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_service_vessel ON vessel_service_schedules(vessel_id);
CREATE INDEX IF NOT EXISTS idx_crew_vessel ON vessel_crew_assignments(vessel_id);
CREATE INDEX IF NOT EXISTS idx_crew_employee ON vessel_crew_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_vessel ON vessel_tasks(vessel_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON vessel_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_log_vessel ON vessel_log_entries(vessel_id);
CREATE INDEX IF NOT EXISTS idx_log_date ON vessel_log_entries(log_date);
CREATE INDEX IF NOT EXISTS idx_incident_vessel ON vessel_incident_logs(vessel_id);
CREATE INDEX IF NOT EXISTS idx_spares_vessel ON vessel_spares_inventory(vessel_id);
CREATE INDEX IF NOT EXISTS idx_provisions_vessel ON vessel_provisions(vessel_id);
CREATE INDEX IF NOT EXISTS idx_documents_vessel ON vessel_documents(vessel_id);
CREATE INDEX IF NOT EXISTS idx_reminders_vessel ON vessel_reminders(vessel_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON vessel_reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_contacts_vessel ON vessel_contacts(vessel_id);
CREATE INDEX IF NOT EXISTS idx_guests_vessel ON vessel_guest_preferences(vessel_id);
CREATE INDEX IF NOT EXISTS idx_opcosts_vessel ON vessel_operational_costs(vessel_id);
CREATE INDEX IF NOT EXISTS idx_opcosts_date ON vessel_operational_costs(cost_date);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_vessel_ops_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_maintenance_issues_updated_at ON vessel_maintenance_issues;
CREATE TRIGGER update_maintenance_issues_updated_at
    BEFORE UPDATE ON vessel_maintenance_issues
    FOR EACH ROW EXECUTE FUNCTION update_vessel_ops_updated_at();

DROP TRIGGER IF EXISTS update_service_schedules_updated_at ON vessel_service_schedules;
CREATE TRIGGER update_service_schedules_updated_at
    BEFORE UPDATE ON vessel_service_schedules
    FOR EACH ROW EXECUTE FUNCTION update_vessel_ops_updated_at();

DROP TRIGGER IF EXISTS update_crew_assignments_updated_at ON vessel_crew_assignments;
CREATE TRIGGER update_crew_assignments_updated_at
    BEFORE UPDATE ON vessel_crew_assignments
    FOR EACH ROW EXECUTE FUNCTION update_vessel_ops_updated_at();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON vessel_tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON vessel_tasks
    FOR EACH ROW EXECUTE FUNCTION update_vessel_ops_updated_at();

DROP TRIGGER IF EXISTS update_incident_logs_updated_at ON vessel_incident_logs;
CREATE TRIGGER update_incident_logs_updated_at
    BEFORE UPDATE ON vessel_incident_logs
    FOR EACH ROW EXECUTE FUNCTION update_vessel_ops_updated_at();

DROP TRIGGER IF EXISTS update_spares_updated_at ON vessel_spares_inventory;
CREATE TRIGGER update_spares_updated_at
    BEFORE UPDATE ON vessel_spares_inventory
    FOR EACH ROW EXECUTE FUNCTION update_vessel_ops_updated_at();

DROP TRIGGER IF EXISTS update_provisions_updated_at ON vessel_provisions;
CREATE TRIGGER update_provisions_updated_at
    BEFORE UPDATE ON vessel_provisions
    FOR EACH ROW EXECUTE FUNCTION update_vessel_ops_updated_at();

DROP TRIGGER IF EXISTS update_documents_updated_at ON vessel_documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON vessel_documents
    FOR EACH ROW EXECUTE FUNCTION update_vessel_ops_updated_at();

DROP TRIGGER IF EXISTS update_reminders_updated_at ON vessel_reminders;
CREATE TRIGGER update_reminders_updated_at
    BEFORE UPDATE ON vessel_reminders
    FOR EACH ROW EXECUTE FUNCTION update_vessel_ops_updated_at();

DROP TRIGGER IF EXISTS update_contacts_updated_at ON vessel_contacts;
CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON vessel_contacts
    FOR EACH ROW EXECUTE FUNCTION update_vessel_ops_updated_at();

DROP TRIGGER IF EXISTS update_guests_updated_at ON vessel_guest_preferences;
CREATE TRIGGER update_guests_updated_at
    BEFORE UPDATE ON vessel_guest_preferences
    FOR EACH ROW EXECUTE FUNCTION update_vessel_ops_updated_at();

-- Auto-calculate total cost in maintenance issues
CREATE OR REPLACE FUNCTION calculate_maintenance_total_cost()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_cost = COALESCE(NEW.labor_cost, 0) + COALESCE(NEW.parts_cost, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_maintenance_cost ON vessel_maintenance_issues;
CREATE TRIGGER calculate_maintenance_cost
    BEFORE INSERT OR UPDATE OF labor_cost, parts_cost ON vessel_maintenance_issues
    FOR EACH ROW EXECUTE FUNCTION calculate_maintenance_total_cost();

-- Auto-update next service date
CREATE OR REPLACE FUNCTION calculate_next_service_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.last_service_date IS NOT NULL AND NEW.frequency_type IS NOT NULL AND NEW.frequency_value IS NOT NULL THEN
        CASE NEW.frequency_type
            WHEN 'days' THEN
                NEW.next_service_date = NEW.last_service_date + (NEW.frequency_value || ' days')::INTERVAL;
            WHEN 'weeks' THEN
                NEW.next_service_date = NEW.last_service_date + (NEW.frequency_value || ' weeks')::INTERVAL;
            WHEN 'months' THEN
                NEW.next_service_date = NEW.last_service_date + (NEW.frequency_value || ' months')::INTERVAL;
            WHEN 'years' THEN
                NEW.next_service_date = NEW.last_service_date + (NEW.frequency_value || ' years')::INTERVAL;
        END CASE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_next_service_date ON vessel_service_schedules;
CREATE TRIGGER auto_next_service_date
    BEFORE INSERT OR UPDATE OF last_service_date, frequency_type, frequency_value ON vessel_service_schedules
    FOR EACH ROW EXECUTE FUNCTION calculate_next_service_date();

COMMENT ON TABLE vessel_maintenance_issues IS 'Track maintenance issues, work orders, and repairs';
COMMENT ON TABLE maintenance_time_logs IS 'Track time spent on maintenance work by crew members';
COMMENT ON TABLE vessel_service_schedules IS 'Schedule recurring vessel services and maintenance';
COMMENT ON TABLE vessel_crew_assignments IS 'Assign crew members to vessels';
COMMENT ON TABLE vessel_tasks IS 'Assign tasks and jobs to crew members';
COMMENT ON TABLE vessel_log_entries IS 'Vessel log book for all operational activities';
COMMENT ON TABLE vessel_incident_logs IS 'First aid, accident, and incident reporting';
COMMENT ON TABLE vessel_spares_inventory IS 'Track spare parts inventory on vessels';
COMMENT ON TABLE vessel_provisions IS 'Track provisions (food, supplies) on vessels';
COMMENT ON TABLE vessel_documents IS 'Store vessel manuals, certificates, and documents';
COMMENT ON TABLE vessel_reminders IS 'Automated reminders for maintenance, certifications, etc.';
COMMENT ON TABLE vessel_contacts IS 'Essential contact numbers and addresses';
COMMENT ON TABLE vessel_guest_preferences IS 'Guest preference sheets for charter operations';
COMMENT ON TABLE vessel_operational_costs IS 'Track all vessel operational expenses';
