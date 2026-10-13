import time
import urllib.request
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import cloudinary.uploader
import cloudinary.utils
from core.database import get_db
import core.cloudinary
from core.config import CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME
from services.ai_service import analyze_complaint, moderate_image, find_department
from services.ticket_service import create_ticket, get_ticket_by_submission_id

router = APIRouter()

@router.get("/cloudinary-sign")
def get_cloudinary_signature():
    """
    Generate signature for direct client-to-Cloudinary upload.
    This bypasses Vercel/serverless payload limits (4.5MB).
    """
    if not CLOUDINARY_API_SECRET or not CLOUDINARY_API_KEY or not CLOUDINARY_CLOUD_NAME:
        raise HTTPException(status_code=500, detail="Cloudinary credentials not configured")

    timestamp = int(time.time())
    params = {"timestamp": timestamp}
    signature = cloudinary.utils.api_sign_request(params, CLOUDINARY_API_SECRET)

    return {
        "timestamp": timestamp,
        "signature": signature,
        "api_key": CLOUDINARY_API_KEY,
        "cloud_name": CLOUDINARY_CLOUD_NAME
    }

@router.post("/complaint")
async def create_complaint(
    message: str = Form(...),
    photo: UploadFile | None = File(None),
    image_url: str | None = Form(None),
    submission_id: str = Form(...),
    db: Session = Depends(get_db)
):
    exist_ticket = get_ticket_by_submission_id(db, submission_id)
    if exist_ticket:
        return {
            "message": "This complaint has already been submitted",
            "ticket": exist_ticket
        }

    analysis = analyze_complaint(message)
    department = find_department(analysis.category.lower())

    # Case 1: Image already uploaded directly to Cloudinary from client
    if image_url:
        try:
            req = urllib.request.Request(
                image_url,
                headers={"User-Agent": "CampusFlow/1.0"}
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                image_data = resp.read()
                content_type = resp.headers.get_content_type() or "image/jpeg"
            moderation = moderate_image(image_data, content_type)
            if not moderation.is_safe:
                raise HTTPException(
                    status_code=400,
                    detail="Image rejected: " + moderation.reason
                )
        except HTTPException:
            raise
        except Exception as e:
            print(f"Direct image moderation warning: {e}")

    # Case 2: Fallback image file upload through backend
    elif photo:
        image_data = await photo.read()
        moderation = moderate_image(image_data, photo.content_type)
        if not moderation.is_safe:
            raise HTTPException(
                status_code=400,
                detail="Image rejected: " + moderation.reason
            )
        result = cloudinary.uploader.upload(image_data)
        image_url = result.get("secure_url")

    # Create ticket in database with synchronized ticket details and image_url
    ticket = create_ticket(
        db,
        analysis=analysis,
        department=department,
        image_url=image_url,
        submission_id=submission_id
    )

    return {
        "message": "Complaint received",
        "complaint": message,
        "analysis": analysis,
        "department": department,
        "ticket": ticket
    }
