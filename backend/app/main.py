from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware

from app.api.v1.router import router as api_router
from app.db.session import init_db
from app.core.logging import logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles startup and shutdown events for the FastAPI app"""
    logger.info("Starting DB Connections")
    init_db()
    logger.info("Shutting down DB Connections")
    yield


app = FastAPI(
    title="Mutual Fund Screener API",
    lifespan=lifespan
)

app.add_middleware(GZipMiddleware, minimum_size=1024)
app.include_router(api_router, prefix="/api")

# py -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
