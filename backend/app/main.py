from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.api.router import router as api_router
from app.db.session import warm_up_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles startup and shutdown events for the FastAPI app"""
    warm_up_db()
    yield


app = FastAPI(
    title="Mutual Fund Screener API",
    lifespan=lifespan
)

app.include_router(api_router, prefix="/api")

# py -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000