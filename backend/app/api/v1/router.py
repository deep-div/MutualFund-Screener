from fastapi import APIRouter

from app.api.v1.endpoints import users
from backend.app.api.v1.endpoints import mutual_fund

router = APIRouter()

router.include_router(mutual_fund.router, tags=["Mutual Funds"])
router.include_router(users.router, tags=["Users"])