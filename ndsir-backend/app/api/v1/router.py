from fastapi import APIRouter
from app.api.v1.incidents import router as incidents_router

api_router = APIRouter()
api_router.include_router(incidents_router)