from fastapi import APIRouter
from sqlalchemy import text

from app.db.session import get_session

router = APIRouter()


def ping_db() -> str:
    try:
        with get_session() as db:
            db.execute(text("SELECT 1"))
        return "ok"
    except Exception as exc:
        return f"error: {exc}"


@router.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}
