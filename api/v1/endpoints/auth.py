from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from core.database import get_db
from core.security import create_access_token, decode_access_token
from services.user_service import (
    register_user,
    authenticate_user,
    get_user_by_college_id
)

router = APIRouter()

class RegisterRequest(BaseModel):
    college_id: str
    name: str
    email: str
    user_type: str = "student"
    password: str

class LoginRequest(BaseModel):
    college_id: str
    password: str

@router.post("/auth/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
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
        user = register_user(
            session=db,
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

@router.post("/auth/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """
    Login with College ID (unique username) or Email and Password.
    """
    if not data.college_id or not data.password:
        raise HTTPException(status_code=400, detail="College ID and password are required.")

    user = authenticate_user(db, data.college_id, data.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid College ID or password. Please verify your credentials."
        )

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

@router.get("/auth/me")
def get_current_user(request: Request, db: Session = Depends(get_db)):
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

    user = get_user_by_college_id(db, payload.get("sub", ""))
    if not user:
        user = {
            "college_id": payload.get("sub"),
            "name": payload.get("name"),
            "email": payload.get("email"),
            "user_type": payload.get("user_type", "student")
        }
    return {"user": user}
