from fastapi import FastAPI

from app.api.router import router as api_router


app = FastAPI(title="Mutual Fund Screener API")
app.include_router(api_router, prefix="/api")


# py -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000