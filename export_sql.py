import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))

with engine.connect() as conn:
    users = conn.execute(text("SELECT * FROM users ORDER BY id ASC")).mappings().all()
    tickets = conn.execute(text("SELECT * FROM tickets ORDER BY id ASC")).mappings().all()

sql_lines = [
    "-- ==========================================",
    "-- CampusFlow Database Backup & Restore SQL",
    "-- Run this directly in the Neon SQL Editor",
    "-- ==========================================\n",
    """CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    college_id VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    user_type VARCHAR DEFAULT 'student',
    password_hash VARCHAR NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);
""",
    """CREATE TABLE IF NOT EXISTS tickets (
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
"""
]

# Insert users
for u in users:
    cid = u["college_id"].replace("'", "''")
    name = u["name"].replace("'", "''")
    email = u["email"].replace("'", "''")
    ut = (u["user_type"] or "student").replace("'", "''")
    phash = u["password_hash"].replace("'", "''")
    cat = f"'{u['created_at'].isoformat()}'" if u["created_at"] else "NOW()"
    sql_lines.append(
        f"INSERT INTO users (id, college_id, name, email, user_type, password_hash, created_at) "
        f"VALUES ({u['id']}, '{cid}', '{name}', '{email}', '{ut}', '{phash}', {cat}) "
        f"ON CONFLICT (id) DO NOTHING;"
    )

sql_lines.append("\nSELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));\n")

# Insert tickets
for t in tickets:
    def val(k):
        v = t.get(k)
        if v is None:
            return "NULL"
        escaped = str(v).replace("'", "''")
        return f"'{escaped}'"

    c_at = f"'{t['created_at'].isoformat()}'" if t.get("created_at") else "NOW()"

    sql_lines.append(
        f"INSERT INTO tickets (id, ticket_id, submission_id, status, department, category, location, problem, urgency, created_at, image_url, submitted_by, user_college_id) "
        f"VALUES ({t['id']}, {val('ticket_id')}, {val('submission_id')}, {val('status')}, {val('department')}, {val('category')}, {val('location')}, {val('problem')}, {val('urgency')}, {c_at}, {val('image_url')}, {val('submitted_by')}, {val('user_college_id')}) "
        f"ON CONFLICT (id) DO NOTHING;"
    )

sql_lines.append("\nSELECT setval('tickets_id_seq', (SELECT COALESCE(MAX(id), 1) FROM tickets));\n")

with open("backup_data.sql", "w", encoding="utf-8") as f:
    f.write("\n".join(sql_lines))

print(f"Exported {len(users)} users and {len(tickets)} tickets to backup_data.sql successfully!")
