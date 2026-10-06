-- V6: Seed High-Volume Realistic Demo Dataset (1,000 Users and 1,000 Tickets)
-- Enables comprehensive testing of pagination, filtering, search, caching, and database performance.

-- 1. Insert 1,000 Demo Users (Password for all accounts is: Password@123)
-- BCrypt: $2a$10$58qTDUvR9eVl.f95YnvA8eANOaPzGrvmJXPV5YpddAPBcmlekmGU6
WITH user_names AS (
    SELECT 
        ARRAY['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Sam', 'Chris', 'Pat', 'Jamie', 'Riley',
              'Dana', 'Avery', 'Cameron', 'Logan', 'Skyler', 'Jesse', 'Dakota', 'Reese', 'Kendall', 'Harper'] AS firsts,
        ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
              'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'] AS lasts
)
INSERT INTO users (email, name, password, role_id, user_public_id, is_active, created_at, updated_at)
SELECT 
    'demo.user' || i || '@company.com' AS email,
    (un.firsts[((i - 1) % 20) + 1] || ' ' || un.lasts[(((i - 1) / 20) % 20) + 1]) AS name,
    '$2a$10$58qTDUvR9eVl.f95YnvA8eANOaPzGrvmJXPV5YpddAPBcmlekmGU6' AS password,
    CASE 
        WHEN i % 10 = 0 THEN (SELECT role_id FROM roles WHERE name = 'SUPPORT_AGENT' LIMIT 1)
        ELSE (SELECT role_id FROM roles WHERE name = 'REQUESTER' LIMIT 1)
    END AS role_id,
    gen_random_uuid() AS user_public_id,
    true AS is_active,
    CURRENT_TIMESTAMP - (i * INTERVAL '30 minutes') AS created_at,
    CURRENT_TIMESTAMP - (i * INTERVAL '30 minutes') AS updated_at
FROM generate_series(1, 1000) AS i
CROSS JOIN user_names un
ON CONFLICT (email) DO NOTHING;

-- 2. Insert 1,000 Demo Tickets
WITH ticket_templates AS (
    SELECT ARRAY[
        'Cannot connect to corporate VPN',
        'Monitor flickering after recent OS update',
        'Request for IntelliJ IDEA license renewal',
        'Need access to analytics dashboard',
        'Email client crashing on attachment download',
        'Laptop battery draining unusually fast',
        'Wi-Fi disconnection in 4th floor conference',
        'Keyboard keys sticking and unresponsive',
        'Database connection timeout during peak hours',
        'Password reset required for SSO portal',
        'Slow network throughput in branch office',
        'Request for secondary monitor and dock',
        'Printer paper jam on 2nd floor printer',
        'Software crash when exporting large PDF report',
        'Unable to join video meeting audio',
        'Security certificate error on internal portal',
        'Mouse cursor freezing intermittently',
        'Request access to production logs bucket',
        'Two-factor authentication code not receiving',
        'Disk space full alert on virtual workstation'
    ] AS titles,
    ARRAY['OPEN', 'IN_PROGRESS', 'WAITING_ON_REQUESTOR', 'RESOLVED', 'CLOSED'] AS statuses
),
categories_list AS (
    SELECT category_id, ROW_NUMBER() OVER (ORDER BY category_id) AS row_num
    FROM ticket_categories
),
priorities_list AS (
    SELECT priority_id, ROW_NUMBER() OVER (ORDER BY priority_id) AS row_num
    FROM priorities
),
requester_users AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY user_id) AS row_num
    FROM users
    WHERE email LIKE 'demo.user%@company.com'
)
INSERT INTO tickets (
    category_id,
    requestor_id,
    ticket_priority_id,
    ticket_public_id,
    title,
    description,
    status,
    response_deadline,
    resolution_deadline,
    created_at,
    updated_at
)
SELECT 
    -- Category round-robin across available categories
    COALESCE(
        (SELECT c.category_id FROM categories_list c WHERE c.row_num = ((i - 1) % 5) + 1),
        (SELECT category_id FROM ticket_categories LIMIT 1)
    ),
    -- Requester user from seeded demo accounts
    COALESCE(
        (SELECT u.user_id FROM requester_users u WHERE u.row_num = ((i - 1) % 900) + 1),
        (SELECT user_id FROM users WHERE role_id = (SELECT role_id FROM roles WHERE name = 'REQUESTER' LIMIT 1) LIMIT 1)
    ),
    -- Priority round-robin across available priorities
    COALESCE(
        (SELECT p.priority_id FROM priorities_list p WHERE p.row_num = ((i - 1) % 4) + 1),
        (SELECT priority_id FROM priorities LIMIT 1)
    ),
    gen_random_uuid() AS ticket_public_id,
    (tt.titles[((i - 1) % 20) + 1] || ' #' || i) AS title,
    'Standard operational incident logged by employee. Workstation diagnostics and triage required by IT helpdesk team.' AS description,
    tt.statuses[((i - 1) % 5) + 1] AS status,
    (CURRENT_TIMESTAMP - (i * INTERVAL '40 minutes')) + INTERVAL '2 hours' AS response_deadline,
    (CURRENT_TIMESTAMP - (i * INTERVAL '40 minutes')) + INTERVAL '24 hours' AS resolution_deadline,
    CURRENT_TIMESTAMP - (i * INTERVAL '40 minutes') AS created_at,
    CURRENT_TIMESTAMP - (i * INTERVAL '40 minutes') + INTERVAL '15 minutes' AS updated_at
FROM generate_series(1, 1000) AS i
CROSS JOIN ticket_templates tt
ON CONFLICT (ticket_public_id) DO NOTHING;

-- 3. Assign In-Progress, Waiting, and Resolved Tickets to Support Agents
WITH agent_users AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY user_id) AS row_num
    FROM users
    WHERE role_id = (SELECT role_id FROM roles WHERE name = 'SUPPORT_AGENT' LIMIT 1)
       OR email = 'agent@helpdesk.com'
),
agent_count AS (
    SELECT COUNT(*) AS total FROM agent_users
),
admin_user AS (
    SELECT user_id FROM users WHERE email = 'admin@helpdesk.com' LIMIT 1
)
INSERT INTO ticket_assignment (
    ticket_id,
    assigned_to_user_id,
    assigned_by_user_id,
    is_active,
    assigned_at,
    created_at,
    updated_at
)
SELECT 
    t.ticket_id,
    (SELECT au.user_id FROM agent_users au WHERE au.row_num = ((t.ticket_id - 1) % (SELECT GREATEST(total, 1) FROM agent_count)) + 1),
    COALESCE((SELECT user_id FROM admin_user), (SELECT user_id FROM users LIMIT 1)),
    true,
    t.created_at + INTERVAL '10 minutes',
    t.created_at + INTERVAL '10 minutes',
    t.created_at + INTERVAL '10 minutes'
FROM tickets t
WHERE t.status IN ('IN_PROGRESS', 'WAITING_ON_REQUESTOR', 'RESOLVED', 'CLOSED')
  AND t.title LIKE '%#%'
  AND NOT EXISTS (
      SELECT 1 FROM ticket_assignment ta WHERE ta.ticket_id = t.ticket_id
  );

-- 4. Insert Initial Creation Activities for the Seeded Tickets
INSERT INTO ticket_activities (ticket_id, user_id, description, created_at)
SELECT 
    t.ticket_id,
    t.requestor_id,
    'Incident ticket created and queued for technical support triage.',
    t.created_at
FROM tickets t
WHERE t.title LIKE '%#%'
  AND NOT EXISTS (
      SELECT 1 FROM ticket_activities ta WHERE ta.ticket_id = t.ticket_id
  );
