from google import genai
from google.genai import types
from fastapi import HTTPException
from pydantic import BaseModel
from core.config import GEMINI_API_KEY

client = genai.Client(api_key=GEMINI_API_KEY)

class ComplaintAnalysis(BaseModel):
    category: str
    location: str
    problem: str
    urgency: str

class ImageModeration(BaseModel):
    is_safe: bool
    reason: str

def analyze_complaint(message: str) -> ComplaintAnalysis:
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

def moderate_image(image_data: bytes, mime_type: str) -> ImageModeration:
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

def find_department(category: str) -> str:
    cat = (category or "").lower()
    if cat == "equipment":
        return "IT Support"
    elif cat == "network":
        return "Network Team"
    elif cat == "electrical":
        return "Electrical Team"
    elif cat in ("cleanliness", "water"):
        return "Maintenance"
    else:
        return "General Administration"
