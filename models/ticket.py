from datetime import datetime, timezone, timedelta
from sqlalchemy import Column, DateTime, Integer, String
from core.database import Base

IST = timezone(timedelta(hours=5, minutes=30))

def get_ist_now():
    return datetime.now(IST).replace(tzinfo=None)

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
