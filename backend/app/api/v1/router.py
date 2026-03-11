from fastapi import APIRouter

from app.api.v1.endpoints import mf, users

router = APIRouter()

router.include_router(mf.router, tags=["Mutual Funds"])
router.include_router(users.router, tags=["Users"])