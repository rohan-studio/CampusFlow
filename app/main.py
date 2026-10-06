import os
from google import genai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
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

frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
templates = Jinja2Templates(directory=frontend_dir)

css_dir = os.path.join(frontend_dir, "css")
js_dir = os.path.join(frontend_dir, "js")
if os.path.exists(css_dir):
    app.mount("/css", StaticFiles(directory=css_dir), name="css")
if os.path.exists(js_dir):
    app.mount("/js", StaticFiles(directory=js_dir), name="js")



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
def home(request: Request):
    tickets = get_all_tickets_sqlalchemy()
    total = len(tickets)
    resolved = sum(1 for t in tickets if (t.get("status") or "").lower() == "resolved")
    pending = total - resolved
    departments = len(set(t.get("department") for t in tickets if t.get("department")))
    satisfaction = round((resolved / total) * 100) if total > 0 else 100

    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "tickets": tickets,
            "total_count": total,
            "resolved_count": resolved,
            "pending_count": pending,
            "dept_count": departments or 4,
            "satisfaction": satisfaction,
        }
    )


@app.get("/admin-login.html")
def admin_login_page(request: Request):
    return templates.TemplateResponse(request=request, name="admin-login.html", context={})


@app.get("/admin-dashboard.html")
def admin_dashboard_page(request: Request):
    return templates.TemplateResponse(request=request, name="admin-dashboard.html", context={})


@app.get("/health")
def health():
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