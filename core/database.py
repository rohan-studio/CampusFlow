from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import NullPool
from .config import DATABASE_URL

class Base(DeclarativeBase):
    pass

# NullPool is used for serverless environments (Vercel) to prevent connection leaks
# while working seamlessly on traditional servers (Render, localhost)
engine = create_engine(
    DATABASE_URL,
    poolclass=NullPool,
    connect_args={"connect_timeout": 10},
)

SessionLocal = sessionmaker(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
