import os
from google import genai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel



from .tickets import (
    create_ticket_sqlalchemy,
    get_ticket_sqlalchemy,
    get_all_tickets_sqlalchemy,
    update_ticket_status_sqlalchemy
)




app = FastAPI()

# Allow browser requests from the frontend (file:// or local dev server)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten to specific origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



load_dotenv()


api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

class ComplaintRequest(BaseModel):
    message: str

class ComplaintAnalysis(BaseModel):
    category: str
    location: str
    problem: str
    urgency: str

class StatusUpdate(BaseModel):
    status: str



def analyze_complaint(message):

    prompt = f"""
    Analyze this college complaint.

    Extract these four things:
    1. category
    2. location
    3. problem
    4. urgency

    Choose the category from ONLY these options:

    Equipment
    Network
    Electrical
    Cleanliness
    Water
    Other

    Do not create a new category.

    Return the result as JSON.

    Complaint:
    {message}
    """

    response = client.models.generate_content(
        model="gemini-3.5-flash",
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": ComplaintAnalysis,
        }
    )
    return response.parsed







def find_department(category):
    if category == "equipment":
        return "IT Support"

    elif category == "network":
        return "Network Team"

    elif category == "electrical":
        return "Electrical Team"

    elif category == "cleanliness":
        return "Maintenance"

    elif category == "water":
        return "Maintenance"

    else:
        return "General Administration"




@app.get("/")
def home():
    return {"message": "CampusFlow AI is running"}




@app.post("/complaint")
def create_complaint(complaint: ComplaintRequest):


    analysis = analyze_complaint(complaint.message)
    department = find_department(analysis.category.lower())

    ticket = create_ticket_sqlalchemy(analysis, department)
    
    return {
        "message": "Complaint received",
        "complaint": complaint.message,
        "analysis": analysis,
        "department": department,
        "ticket": ticket
    }


@app.get("/tickets")
def get_tickets():
    
    return get_all_tickets_sqlalchemy()


@app.patch("/tickets/{ticket_id}")
def update_status(ticket_id:str, data: StatusUpdate):
    
    if data.status not in ["Pending", "In Progress", "Resolved"]:
        raise HTTPException(
            status_code=400, 
            detail="Invalid status."
            )
        
    updated = update_ticket_status_sqlalchemy(ticket_id, data.status)

    if not updated:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found"
        )
    
    return {"message": "Ticket status updated"}




@app.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: str):
    ticket = get_ticket_sqlalchemy(ticket_id)

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found"
        )
    
    return ticket