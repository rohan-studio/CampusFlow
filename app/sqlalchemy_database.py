import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from .models import Base, Ticket, User

load_dotenv()
db_url = os.getenv("DATABASE_URL")

if db_url and ("postgres" in db_url):
    engine = create_engine(
        db_url,
        pool_recycle=300,
        connect_args={"connect_timeout": 5},
    )
elif db_url and db_url.startswith("sqlite"):
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
else:
    # Safe local fallback when DATABASE_URL is not set on this machine
    engine = create_engine("sqlite:///campusflow_local.db", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(bind=engine)

# Auto-create tables (users, tickets) if they do not exist
try:
    Base.metadata.create_all(bind=engine)
    # Ensure optional columns exist in existing tickets table without failing
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS submitted_by VARCHAR;"))
            conn.execute(text("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS user_college_id VARCHAR;"))
            conn.commit()
        except Exception:
            pass
except Exception as e:
    print(f"Database table initialization notice: {e}")
