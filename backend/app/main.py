from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware

from app.api.v1.router import router as api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles startup and shutdown events for the FastAPI app"""
    yield


app = FastAPI(
    title="Mutual Fund Screener API",
    lifespan=lifespan
)

app.add_middleware(GZipMiddleware, minimum_size=1024)

@app.get("/health", tags=["Health"])
async def health_check():
    """Basic health check endpoint"""
    return {"status": "ok"}

app.include_router(api_router, prefix="/api")


# py -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000