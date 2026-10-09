import os
from google import genai
from google.genai import types
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
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
from .user_config import create_access_token, decode_access_token
from .users import (
    register_user_sqlalchemy,
    authenticate_user_sqlalchemy,
    get_user_by_college_id_sqlalchemy,
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

class RegisterRequest(BaseModel):
    college_id: str
    name: str
    email: str
    user_type: str = "student"
    password: str

class LoginRequest(BaseModel):
    college_id: str  # College ID or Email
    password: str



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

    try:
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": ComplaintAnalysis,
            }
        )
        return response.parsed
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail="AI complaint analysis is temporarily busy. Please try again shortly."
        )



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

    try:
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite",
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
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail="Image check service is temporarily busy. Please try again shortly."
        )



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



# ══ User Authentication Endpoints ════════════════════════════════════════

@app.post("/auth/register")
def register_user(data: RegisterRequest):
    """
    Register genuine college student or faculty with their college ID.
    """
    if not data.college_id or not data.college_id.strip():
        raise HTTPException(status_code=400, detail="College ID is required.")
    if not data.name or not data.name.strip():
        raise HTTPException(status_code=400, detail="Full Name is required.")
    if not data.email or not data.email.strip():
        raise HTTPException(status_code=400, detail="Email is required.")
    if not data.password or len(data.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters long.")

    try:
        user = register_user_sqlalchemy(
            college_id=data.college_id,
            name=data.name,
            email=data.email,
            user_type=data.user_type,
            password=data.password
        )
        token = create_access_token({
            "sub": user["college_id"],
            "name": user["name"],
            "email": user["email"],
            "user_type": user["user_type"]
        })
        return {
            "message": "Registration successful",
            "user": user,
            "token": token
        }
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Registration failed: {err}")


@app.post("/auth/login")
def login_user(data: LoginRequest):
    """
    Login with College ID (unique username) or Email and Password.
    """
    if not data.college_id or not data.password:
        raise HTTPException(status_code=400, detail="College ID and password are required.")

    user = authenticate_user_sqlalchemy(data.college_id, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid College ID or password. Please verify your credentials.")

    token = create_access_token({
        "sub": user["college_id"],
        "name": user["name"],
        "email": user["email"],
        "user_type": user["user_type"]
    })
    return {
        "message": "Login successful",
        "user": user,
        "token": token
    }


@app.get("/auth/me")
def get_current_user(request: Request):
    """
    Verify user session token and return user details.
    """
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "").strip()
    
    if not token:
        raise HTTPException(status_code=401, detail="Missing authentication token.")

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session token. Please login again.")

    user = get_user_by_college_id_sqlalchemy(payload.get("sub", ""))
    if not user:
        # Fall back to payload info
        user = {
            "college_id": payload.get("sub"),
            "name": payload.get("name"),
            "email": payload.get("email"),
            "user_type": payload.get("user_type", "student")
        }
    return {"user": user}



# ══ Complaint Submission (Protected) ═════════════════════════════════════

@app.post("/complaint")
async def create_complaint(
    request: Request,
    message: str = Form(...),
    photo: UploadFile | None = File(None),
    submission_id: str = Form(...),
    token: str | None = Form(None)
):
    # Verify genuine student/faculty auth token
    user_token = token
    if not user_token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            user_token = auth_header.replace("Bearer ", "").strip()

    submitted_by = "Campus Member"
    user_college_id = None

    if user_token:
        payload = decode_access_token(user_token)
        if payload:
            submitted_by = payload.get("name", "Campus Member")
            user_college_id = payload.get("sub")
        else:
            raise HTTPException(
                status_code=401,
                detail="Your login session has expired. Please sign in again with your College ID."
            )
    else:
        raise HTTPException(
            status_code=401,
            detail="Access restricted: Only verified college campus students and faculty can submit complaints. Please login with your College ID."
        )

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
        submission_id=submission_id,
        submitted_by=submitted_by,
        user_college_id=user_college_id
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
