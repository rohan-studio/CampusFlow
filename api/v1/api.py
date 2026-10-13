from fastapi import APIRouter
from .endpoints import complaints, tickets, admin

api_router = APIRouter()
api_router.include_router(complaints.router, tags=["complaints"])
api_router.include_router(tickets.router, tags=["tickets"])
api_router.include_router(admin.router, tags=["admin"])
