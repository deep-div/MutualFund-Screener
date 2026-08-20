import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as api_router
from app.api.v1.endpoints.health import ping_db
from app.core.logging import logger


@asynccontextmanager
async def lifespan(_app: FastAPI):
    for attempt in range(1, 6):
        status = ping_db()
        if status == "ok":
            logger.info("Database connection pool warmed up")
            break
        if attempt == 5:
            logger.error(f"DB warm-up failed after {attempt} attempts: {status}")
        else:
            logger.warning(f"DB warm-up attempt {attempt} failed, retrying in 2s: {status}")
            time.sleep(2)
    yield


app = FastAPI(
    title="Mutual Fund Screener API",
    lifespan=lifespan
)

app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


# py -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
