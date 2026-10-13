from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database import get_db
from services.ticket_service import get_all_tickets

router = APIRouter()

@router.get("/admin/stats")
def get_admin_stats(db: Session = Depends(get_db)):
    tickets = get_all_tickets(db)
    resolved = sum(1 for t in tickets if (t.get("status") or "").lower() == "resolved")
    pending = sum(1 for t in tickets if (t.get("status") or "").lower() != "resolved")
    high_urgency = sum(1 for t in tickets if (t.get("urgency") or "").lower() == "high")
    return {
        "total": len(tickets),
        "resolved": resolved,
        "pending": pending,
        "high_urgency": high_urgency
    }
