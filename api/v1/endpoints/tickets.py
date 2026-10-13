from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from core.database import get_db
from services.ticket_service import get_all_tickets, get_ticket, update_ticket_status

router = APIRouter()

class StatusUpdate(BaseModel):
    status: str

@router.get("/tickets")
def list_tickets(db: Session = Depends(get_db)):
    return get_all_tickets(db)

@router.get("/tickets/{ticket_id}")
def read_ticket(ticket_id: str, db: Session = Depends(get_db)):
    ticket = get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket

@router.patch("/tickets/{ticket_id}")
def update_status(ticket_id: str, data: StatusUpdate, db: Session = Depends(get_db)):
    if data.status not in ["Pending", "In Progress", "Resolved"]:
        raise HTTPException(status_code=400, detail="Invalid status.")
    
    updated = update_ticket_status(db, ticket_id, data.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return {"message": "Ticket status updated"}
