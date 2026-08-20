from fastapi import APIRouter

from app.api.v1.endpoints import users
from app.api.v1.endpoints import mutual_fund
from app.api.v1.endpoints import blogs
from app.api.v1.endpoints import health

router = APIRouter()

router.include_router(health.router, tags=["Health"])
router.include_router(mutual_fund.router, tags=["Mutual Funds"])
router.include_router(users.router, tags=["Users"])
router.include_router(blogs.router, tags=["Blogs"])
