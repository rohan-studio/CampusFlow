"""
CampusFlow — 1-Click Database Migration to New Neon Account
Usage:
    python migrate_to_new_neon.py "NEW_DATABASE_URL"
"""

import sys
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
OLD_DB_URL = os.getenv("DATABASE_URL")

if len(sys.argv) > 1:
    NEW_DB_URL = sys.argv[1].strip()
else:
    NEW_DB_URL = input("Enter your NEW Neon Database URL: ").strip()

if not NEW_DB_URL or not NEW_DB_URL.startswith("postgresql://"):
    print("❌ Invalid connection string. It must start with postgresql://")
    sys.exit(1)

print("\n🚀 Starting migration from old Neon DB to new Neon DB...")

try:
    with open("backup_data.sql", "r", encoding="utf-8") as f:
        sql_content = f.read()

    new_engine = create_engine(NEW_DB_URL)
    with new_engine.begin() as conn:
        # Split statements and execute
        for statement in sql_content.split(";"):
            stmt = statement.strip()
            if stmt:
                conn.execute(text(stmt))

    print("✅ All tables, users, and tickets migrated to new Neon project successfully!")
    print("\n👉 Remember to update DATABASE_URL in your .env file and on Vercel with your new connection string.")

except Exception as err:
    print(f"❌ Error during migration: {err}")
