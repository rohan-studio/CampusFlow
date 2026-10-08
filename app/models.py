from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, DateTime, Integer, String, func


class Base(DeclarativeBase):
    pass


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
    created_at = Column(DateTime, server_default=func.now())
    image_url = Column(String)