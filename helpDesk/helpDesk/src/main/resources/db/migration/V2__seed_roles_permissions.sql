

INSERT INTO roles (name, description)
VALUES
    ('ADMIN', 'Manages users, categories, priorities, and all tickets'),
    ('SUPPORT_MANAGER', 'Assigns tickets, monitors SLA, and reviews reports'),
    ('SUPPORT_AGENT', 'Works assigned tickets and updates ticket status'),
    ('REQUESTER', 'Creates tickets and views own tickets');


INSERT INTO permissions (name, description)
VALUES
    ('TICKET_READ', 'View helpdesk tickets'),
    ('TICKET_CREATE', 'Create helpdesk tickets'),
    ('TICKET_UPDATE', 'Update helpdesk tickets'),
    ('TICKET_ASSIGN', 'Assign tickets to support agents'),
    ('USER_MANAGE', 'Manage helpdesk users'),
    ('CATEGORY_MANAGE', 'Manage ticket categories'),
    ('PRIORITY_MANAGE', 'Manage ticket priorities'),
    ('COMMENT_CREATE', 'Create comments on tickets'),
    ('INTERNAL_NOTE_READ', 'View internal ticket notes'),
    ('SLA_MONITOR', 'Monitor ticket SLA and SLA risk'),
    ('REPORT_READ', 'View support reports'),
    ('NOTIFICATION_READ', 'View notifications'),
    ('WORKLOAD_READ', 'View support workload');



INSERT INTO role_permission_junction (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
         JOIN permissions p ON p.name IN (
                                          'TICKET_READ',
                                          'TICKET_CREATE',
                                          'TICKET_UPDATE',
                                          'TICKET_ASSIGN',
                                          'USER_MANAGE',
                                          'CATEGORY_MANAGE',
                                          'PRIORITY_MANAGE',
                                          'COMMENT_CREATE',
                                          'INTERNAL_NOTE_READ',
                                          'SLA_MONITOR',
                                          'REPORT_READ',
                                          'NOTIFICATION_READ',
                                          'WORKLOAD_READ'
    )
WHERE r.name = 'ADMIN';



INSERT INTO role_permission_junction (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
         JOIN permissions p ON p.name IN (
                                          'TICKET_READ',
                                          'TICKET_UPDATE',
                                          'TICKET_ASSIGN',
                                          'COMMENT_CREATE',
                                          'INTERNAL_NOTE_READ',
                                          'SLA_MONITOR',
                                          'REPORT_READ',
                                          'NOTIFICATION_READ',
                                          'WORKLOAD_READ'
    )
WHERE r.name = 'SUPPORT_MANAGER';




INSERT INTO role_permission_junction (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
         JOIN permissions p ON p.name IN (
                                          'TICKET_READ',
                                          'TICKET_UPDATE',
                                          'COMMENT_CREATE',
                                          'INTERNAL_NOTE_READ',
                                          'NOTIFICATION_READ',
                                          'WORKLOAD_READ'
    )
WHERE r.name = 'SUPPORT_AGENT';




INSERT INTO role_permission_junction (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
         JOIN permissions p ON p.name IN (
                                          'TICKET_READ',
                                          'TICKET_CREATE',
                                          'COMMENT_CREATE',
                                          'NOTIFICATION_READ'
    )
WHERE r.name = 'REQUESTER';