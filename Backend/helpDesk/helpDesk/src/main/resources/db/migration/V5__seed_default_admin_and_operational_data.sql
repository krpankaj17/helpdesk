-- V5: Seed Initial Production Data (Admin, Standard Staff Users, Priorities, SLA Policies, and Categories)

-- 1. Default Production Seed Users (Password for all default accounts is: Password@123)
-- BCrypt hash for 'Password@123': $2a$10$58qTDUvR9eVl.f95YnvA8eANOaPzGrvmJXPV5YpddAPBcmlekmGU6
INSERT INTO users (email, name, password, role_id, user_public_id, is_active, created_at, updated_at)
VALUES 
    (
        'admin@helpdesk.com', 
        'Admin User', 
        '$2a$10$58qTDUvR9eVl.f95YnvA8eANOaPzGrvmJXPV5YpddAPBcmlekmGU6', 
        (SELECT role_id FROM roles WHERE name = 'ADMIN' LIMIT 1), 
        gen_random_uuid(), 
        true, 
        CURRENT_TIMESTAMP, 
        CURRENT_TIMESTAMP
    ),
    (
        'manager@helpdesk.com', 
        'Support Manager', 
        '$2a$10$58qTDUvR9eVl.f95YnvA8eANOaPzGrvmJXPV5YpddAPBcmlekmGU6', 
        (SELECT role_id FROM roles WHERE name = 'SUPPORT_MANAGER' LIMIT 1), 
        gen_random_uuid(), 
        true, 
        CURRENT_TIMESTAMP, 
        CURRENT_TIMESTAMP
    ),
    (
        'agent@helpdesk.com', 
        'Support Agent', 
        '$2a$10$58qTDUvR9eVl.f95YnvA8eANOaPzGrvmJXPV5YpddAPBcmlekmGU6', 
        (SELECT role_id FROM roles WHERE name = 'SUPPORT_AGENT' LIMIT 1), 
        gen_random_uuid(), 
        true, 
        CURRENT_TIMESTAMP, 
        CURRENT_TIMESTAMP
    ),
    (
        'requester@helpdesk.com', 
        'Requester User', 
        '$2a$10$58qTDUvR9eVl.f95YnvA8eANOaPzGrvmJXPV5YpddAPBcmlekmGU6', 
        (SELECT role_id FROM roles WHERE name = 'REQUESTER' LIMIT 1), 
        gen_random_uuid(), 
        true, 
        CURRENT_TIMESTAMP, 
        CURRENT_TIMESTAMP
    )
ON CONFLICT (email) DO UPDATE 
SET 
    is_active = true,
    role_id = EXCLUDED.role_id,
    password = EXCLUDED.password;

-- 2. Core Operational Priorities
INSERT INTO priorities (name, description)
VALUES 
    ('URGENT', 'Critical system-down incidents requiring immediate attention'),
    ('HIGH', 'High severity business operational impairment'),
    ('MEDIUM', 'Standard issues with manageable business impact'),
    ('LOW', 'Minor inquiries, non-critical enhancements or cosmetic defects')
ON CONFLICT (name) DO NOTHING;

-- 3. Core SLA Policies for Standard Priorities
INSERT INTO sla_policies (priority_id, response_time, resolution_time, description)
SELECT p.priority_id, INTERVAL '1 hour', INTERVAL '4 hours', 'Urgent incident SLA (1h response, 4h resolution)'
FROM priorities p
WHERE p.name = 'URGENT'
  AND NOT EXISTS (SELECT 1 FROM sla_policies sp WHERE sp.priority_id = p.priority_id);

INSERT INTO sla_policies (priority_id, response_time, resolution_time, description)
SELECT p.priority_id, INTERVAL '2 hours', INTERVAL '8 hours', 'High priority SLA (2h response, 8h resolution)'
FROM priorities p
WHERE p.name = 'HIGH'
  AND NOT EXISTS (SELECT 1 FROM sla_policies sp WHERE sp.priority_id = p.priority_id);

INSERT INTO sla_policies (priority_id, response_time, resolution_time, description)
SELECT p.priority_id, INTERVAL '4 hours', INTERVAL '24 hours', 'Medium priority SLA (4h response, 24h resolution)'
FROM priorities p
WHERE p.name = 'MEDIUM'
  AND NOT EXISTS (SELECT 1 FROM sla_policies sp WHERE sp.priority_id = p.priority_id);

INSERT INTO sla_policies (priority_id, response_time, resolution_time, description)
SELECT p.priority_id, INTERVAL '8 hours', INTERVAL '72 hours', 'Low priority SLA (8h response, 72h resolution)'
FROM priorities p
WHERE p.name = 'LOW'
  AND NOT EXISTS (SELECT 1 FROM sla_policies sp WHERE sp.priority_id = p.priority_id);

-- 4. Core Ticket Categories
INSERT INTO ticket_categories (name, description)
VALUES 
    ('Hardware', 'Computers, monitors, printers, peripherals, and physical hardware issues'),
    ('Software', 'Application errors, software installations, license requests'),
    ('Network & Connectivity', 'VPN, Wi-Fi, Ethernet, internet access, and firewall issues'),
    ('Account & Access', 'Password resets, permissions, new user account provisioning'),
    ('General Inquiry', 'General technical guidance, documentation, and support questions')
ON CONFLICT (name) DO NOTHING;
