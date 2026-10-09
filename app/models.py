from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, DateTime, Integer, String

IST = timezone(timedelta(hours=5, minutes=30))

def get_ist_now():
    return datetime.now(IST).replace(tzinfo=None)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    college_id = Column(String, unique=True, index=True, nullable=False)  # Student ID / Faculty ID (Username)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    user_type = Column(String, default="student")  # student, faculty, staff
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=get_ist_now)


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id = Column(String, unique=True)
    submission_id = Column(String, unique=True)
    status = Column(String)
    department = Column(String)
    category = Column(String)
    location = Column(String)
    problem = Column(String)
    urgency = Column(String)
    created_at = Column(DateTime, default=get_ist_now)
    image_url = Column(String)
    # Submitted by student/faculty info
    submitted_by = Column(String, nullable=True)         # User's full name
    user_college_id = Column(String, nullable=True)      # User's college ID