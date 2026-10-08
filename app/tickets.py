from sqlalchemy import select

from .sqlalchemy_database import SessionLocal
from .models import Ticket



def create_ticket_sqlalchemy(analysis, department, image_url=None, submission_id=None):
    
    with SessionLocal() as session:
        db_ticket = Ticket(
            status="Pending",
            department=department,
            category=analysis.category,
            location=analysis.location,
            problem=analysis.problem,
            urgency=analysis.urgency,
            image_url=image_url,
            submission_id=submission_id
        )

        try:
            session.add(db_ticket)
            
            session.flush()  # Flush to get the ID assigned by the database
    
            ticket_id = f"TKT-{db_ticket.id:03d}"
    
            db_ticket.ticket_id = ticket_id
    
            session.commit()
            session.refresh(db_ticket)

            result_ticket = ticket_to_dict(db_ticket)
        except Exception:
            session.rollback()
            raise

    return result_ticket


def get_ticket_by_submission_id(submission_id):
    with SessionLocal() as session:
        statement = select(Ticket).where(
            Ticket.submission_id == submission_id
        )

        ticket = session.scalars(statement).first()

        if not ticket:
            return None

        return ticket_to_dict(ticket)


def get_ticket_sqlalchemy(ticket_id):
    with SessionLocal() as session:
        statement = select(Ticket).where(Ticket.ticket_id == ticket_id)
        ticket = session.scalars(statement).first()

        if not ticket:
            return None

        return ticket_to_dict(ticket)



def get_all_tickets_sqlalchemy():
    with SessionLocal() as session:
        statement = select(Ticket).order_by(Ticket.id.desc())
        tickets = session.scalars(statement).all()

        result = []
        
        for ticket in tickets:
            result.append(ticket_to_dict(ticket))

        return result

def update_ticket_status_sqlalchemy(ticket_id, new_status):
    with SessionLocal() as session:
        statement = select(Ticket).where(Ticket.ticket_id == ticket_id)
        ticket = session.scalars(statement).first()

        if not ticket:
            return False
        
        ticket.status = new_status

        session.commit()    

        return True
        


def ticket_to_dict(ticket):

    return {
        "id": ticket.id,
        "ticket_id": ticket.ticket_id,
        "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
        "status": ticket.status,
        "department": ticket.department,
        "category": ticket.category,
        "location": ticket.location,
        "problem": ticket.problem,
        "urgency": ticket.urgency,
        "image_url": ticket.image_url
    }



