import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .models import Base, Ticket


load_dotenv()
db_url = os.getenv("DATABASE_URL")

engine = create_engine(
    db_url,
    pool_pre_ping=True,
    pool_recycle=300,
)
SessionLocal = sessionmaker(bind=engine)

with SessionLocal() as session:

    tickets = session.query(Ticket).all()

    list_of_tickets = []
    for ticket in tickets:
        ticket_dict = {
            "ticket_id": ticket.ticket_id,
            "status": ticket.status,
            "problem": ticket.problem,
            "urgency": ticket.urgency
        }
        list_of_tickets.append(ticket_dict)
    

