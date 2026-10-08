import os
from google import genai
from google.genai import types
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import cloudinary.uploader

from . import cloudinary_config

from .tickets import (
    create_ticket_sqlalchemy,
    get_ticket_sqlalchemy,
    get_all_tickets_sqlalchemy,
    update_ticket_status_sqlalchemy,
    get_ticket_by_submission_id,
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

class ComplaintAnalysis(BaseModel):
    category: str
    location: str
    problem: str
    urgency: str

class StatusUpdate(BaseModel):
    status: str

class ImageModeration(BaseModel):
    is_safe: bool
    reason: str



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



def moderate_image(image_data, mime_type):

    prompt = """
    Check this image for inappropriate content.

    This image will be uploaded to a college campus complaint system.

    Allow normal campus-related images such as:
    - damaged equipment
    - classrooms
    - laboratories
    - buildings
    - electrical problems
    - water problems
    - cleanliness problems

    Reject images containing:
    - sexually explicit or nude content
    - graphic violence or gore
    - hateful or abusive content
    - other clearly inappropriate content

    Return whether the image is allowed and give a short reason.
    """

    response = client.models.generate_content(
        model="gemini-3.5-flash",
        contents=[
            types.Part.from_bytes(
                data=image_data,
                mime_type=mime_type
            ),
            prompt
        ],
        config={
            "response_mime_type": "application/json",
            "response_schema": ImageModeration,
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




@app.api_route("/health", methods=["GET", "HEAD", "OPTIONS"])
def health():
    return {"message": "CampusFlow AI is running"}



@app.post("/complaint")
async def create_complaint(
    message: str = Form(...),
    photo: UploadFile | None = File(None),
    submission_id: str = Form(...)
):

    exist_ticket = get_ticket_by_submission_id(submission_id)

    if exist_ticket:
        return {
            "message": "This complaint has already been submitted",
            "ticket": exist_ticket
        }


    analysis = analyze_complaint(message)
    department = find_department(analysis.category.lower())

    image_url = None

    if photo:
        image_data = await photo.read()

        moderation = moderate_image(
            image_data,
            photo.content_type
        )

        if not moderation.is_safe:
            raise HTTPException(
                status_code=400,
                detail="Image rejected: " + moderation.reason
            )
        
        result = cloudinary.uploader.upload(image_data)

        image_url = result["secure_url"]

    ticket = create_ticket_sqlalchemy(
        analysis,
        department,
        image_url,
        submission_id=submission_id
    )

    return {
        "message": "Complaint received",
        "complaint": message,
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


# Cloudflare Pages frontend URL (configurable via environment variable)
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://campusflow-a1o.pages.dev")

@app.api_route("/", methods=["GET", "HEAD"], include_in_schema=False)
def redirect_root():
    return RedirectResponse(url=FRONTEND_URL, status_code=307)

@app.api_route("/{full_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
def redirect_to_frontend(full_path: str):
    target = f"{FRONTEND_URL.rstrip('/')}/{full_path}" if full_path else FRONTEND_URL
    return RedirectResponse(url=target, status_code=307)
