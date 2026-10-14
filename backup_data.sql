-- ==========================================
-- CampusFlow Database Backup & Restore SQL
-- Run this directly in the Neon SQL Editor
-- ==========================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    college_id VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    user_type VARCHAR DEFAULT 'student',
    password_hash VARCHAR NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    ticket_id VARCHAR UNIQUE,
    submission_id VARCHAR UNIQUE,
    status VARCHAR,
    department VARCHAR,
    category VARCHAR,
    location VARCHAR,
    problem VARCHAR,
    urgency VARCHAR,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    image_url VARCHAR,
    submitted_by VARCHAR,
    user_college_id VARCHAR
);

INSERT INTO users (id, college_id, name, email, user_type, password_hash, created_at) VALUES (1, 'FAC9901', 'Raj', 'demo@gmail.com', 'student', 'bf4392d93d496eb29cdfc02147f594b2:f8950995dd2d0d937057d43fb560c8e875fd8073cd93524e275304c574179515', '2026-10-09T13:07:25.264548') ON CONFLICT (id) DO NOTHING;

SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));

INSERT INTO tickets (id, ticket_id, submission_id, status, department, category, location, problem, urgency, created_at, image_url, submitted_by, user_college_id) VALUES (1, 'TKT-001', NULL, 'In Progress', 'IT Support', 'Equipment', 'CSE lab', 'The AC is not working and we have an online exam tomorrow morning', NULL, '2026-10-06T18:04:16.200861', NULL, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO tickets (id, ticket_id, submission_id, status, department, category, location, problem, urgency, created_at, image_url, submitted_by, user_college_id) VALUES (2, 'TKT-002', NULL, 'Resolved', 'Network Team', 'Network', 'CSE lab', 'Wifi is not working', NULL, '2026-10-06T18:04:16.200861', NULL, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO tickets (id, ticket_id, submission_id, status, department, category, location, problem, urgency, created_at, image_url, submitted_by, user_college_id) VALUES (3, 'TKT-003', NULL, 'Resolved', 'Network Team', 'Network', 'CSE lab', 'The Wi-Fi is not working', 'High (online exam tomorrow morning)', '2026-10-06T18:04:16.200861', NULL, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO tickets (id, ticket_id, submission_id, status, department, category, location, problem, urgency, created_at, image_url, submitted_by, user_college_id) VALUES (4, 'TKT-004', NULL, 'Resolved', 'IT Support', 'Equipment', 'CSE Lab 2', 'The projector is not working', 'High - presentation tomorrow', '2026-10-06T18:04:16.200861', NULL, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO tickets (id, ticket_id, submission_id, status, department, category, location, problem, urgency, created_at, image_url, submitted_by, user_college_id) VALUES (5, 'TKT-005', NULL, 'Pending', 'Network Team', 'Network', 'computer lab 2', 'the wifi is not working', 'High - presentation is tomorrow', '2026-10-06T18:04:16.200861', NULL, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO tickets (id, ticket_id, submission_id, status, department, category, location, problem, urgency, created_at, image_url, submitted_by, user_college_id) VALUES (6, 'TKT-006', NULL, 'Pending', 'IT Support', 'Equipment', 'room 101', 'AC is not working', 'Medium', '2026-10-06T18:04:16.200861', NULL, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO tickets (id, ticket_id, submission_id, status, department, category, location, problem, urgency, created_at, image_url, submitted_by, user_college_id) VALUES (7, 'TKT-007', NULL, 'Resolved', 'IT Support', 'Equipment', 'Lab Three, PC no. 3', 'The PC is not working while a data analytics class is currently in progress', 'High', '2026-10-06T18:04:16.200861', NULL, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO tickets (id, ticket_id, submission_id, status, department, category, location, problem, urgency, created_at, image_url, submitted_by, user_college_id) VALUES (8, 'TKT-008', NULL, 'Pending', 'IT Support', 'Equipment', 'Computer Lab 3', 'All computers are damaged', 'High', '2026-10-08T19:06:16.082098', NULL, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO tickets (id, ticket_id, submission_id, status, department, category, location, problem, urgency, created_at, image_url, submitted_by, user_college_id) VALUES (9, 'TKT-009', NULL, 'Pending', 'IT Support', 'Equipment', 'CSE lab', 'The projector is not working', 'High', '2026-10-08T20:13:59.050514', 'https://res.cloudinary.com/kgw3qdf4/image/upload/v1791490438/ic2oqugr5rigbbylczbh.jpg', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO tickets (id, ticket_id, submission_id, status, department, category, location, problem, urgency, created_at, image_url, submitted_by, user_college_id) VALUES (10, 'TKT-010', 'test212', 'Resolved', 'IT Support', 'Equipment', 'CSE lab 2', 'The projector is not working', 'High', '2026-10-08T20:28:29.712176', 'https://res.cloudinary.com/kgw3qdf4/image/upload/v1791491307/bc5w5i3qg8b4rl587hry.jpg', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO tickets (id, ticket_id, submission_id, status, department, category, location, problem, urgency, created_at, image_url, submitted_by, user_college_id) VALUES (11, 'TKT-011', 'abc123', 'Pending', 'IT Support', 'Equipment', 'CSE lab 2', 'The projector is not working', 'High (presentation tomorrow)', '2026-10-08T20:34:14.966012', 'https://res.cloudinary.com/kgw3qdf4/image/upload/v1791491654/gjxil5a5vzxdbx8ahmty.jpg', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO tickets (id, ticket_id, submission_id, status, department, category, location, problem, urgency, created_at, image_url, submitted_by, user_college_id) VALUES (12, 'TKT-012', 'test_a269d4b9', 'Resolved', 'IT Support', 'Equipment', 'lab 402', 'The air conditioner is making loud noises and leaking water', 'Medium', '2026-10-08T20:49:07.999219', NULL, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO tickets (id, ticket_id, submission_id, status, department, category, location, problem, urgency, created_at, image_url, submitted_by, user_college_id) VALUES (13, 'TKT-013', 'test_img_23cf0e14', 'Pending', 'Electrical Team', 'Electrical', 'classroom 101', 'The light tube has fallen down from the ceiling.', 'High', '2026-10-08T20:49:46.273942', 'https://res.cloudinary.com/kgw3qdf4/image/upload/v1791492585/se9gdkkq8zrzg2089jnz.bmp', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO tickets (id, ticket_id, submission_id, status, department, category, location, problem, urgency, created_at, image_url, submitted_by, user_college_id) VALUES (14, 'TKT-014', 'e5efc90d-9ae2-4594-a3ce-15b6fa39b840', 'Resolved', 'IT Support', 'Equipment', 'Lab 2, computer no. 49', 'computer not working for 2 weeks', 'Medium', '2026-10-08T21:00:28.112339', 'https://res.cloudinary.com/kgw3qdf4/image/upload/v1791493227/ovvcmagsqjbzclthm5im.jpg', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO tickets (id, ticket_id, submission_id, status, department, category, location, problem, urgency, created_at, image_url, submitted_by, user_college_id) VALUES (15, 'TKT-015', '91b7f63b-caad-4762-99e3-9b09e2ef9431', 'Resolved', 'IT Support', 'Equipment', 'Not specified', 'computer not working for 3 weeks', 'Medium', '2026-10-08T21:18:35.021593', 'https://res.cloudinary.com/kgw3qdf4/image/upload/v1791494314/h2vewqtsnoxliz2qsjf4.jpg', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO tickets (id, ticket_id, submission_id, status, department, category, location, problem, urgency, created_at, image_url, submitted_by, user_college_id) VALUES (16, 'TKT-016', '8d492d83-6c56-4ee5-b8cb-2a1cb20b7bef', 'Pending', 'IT Support', 'Equipment', 'Not specified', 'Computer not working for 4 weeks', 'High', '2026-10-08T21:31:32.874349', 'https://res.cloudinary.com/kgw3qdf4/image/upload/v1791495092/ngjmiyhvowon9igk1cy6.jpg', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO tickets (id, ticket_id, submission_id, status, department, category, location, problem, urgency, created_at, image_url, submitted_by, user_college_id) VALUES (17, 'TKT-017', '909f0992-7fd2-4ee9-b1e1-6efabcf18692', 'Resolved', 'IT Support', 'Equipment', 'lab 2', 'projector not working', 'high', '2026-10-09T03:10:17.739880', 'https://res.cloudinary.com/kgw3qdf4/image/upload/v1791495617/owzjernyujs9zvferd2u.jpg', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO tickets (id, ticket_id, submission_id, status, department, category, location, problem, urgency, created_at, image_url, submitted_by, user_college_id) VALUES (18, 'TKT-018', 'af7383c4-1d33-4fa4-a3de-07933f7afea9', 'Resolved', 'IT Support', 'Equipment', 'lab 4', 'pc no 56 not working', 'medium', '2026-10-09T10:06:57.165075', 'https://res.cloudinary.com/kgw3qdf4/image/upload/v1791520616/khts7rz9yjgq4ashlmeh.jpg', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO tickets (id, ticket_id, submission_id, status, department, category, location, problem, urgency, created_at, image_url, submitted_by, user_college_id) VALUES (19, 'TKT-019', '2a942251-c2ee-4e75-984b-7623c7c2f11c', 'Pending', 'IT Support', 'Equipment', 'lab 3', 'projector is not working', 'medium', '2026-10-09T16:10:40.568738', NULL, 'Raj', 'FAC9901') ON CONFLICT (id) DO NOTHING;

SELECT setval('tickets_id_seq', (SELECT COALESCE(MAX(id), 1) FROM tickets));
