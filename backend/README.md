# Mutual Fund Screener - Backend

FastAPI backend for the Mutual Fund Screener project.  
It provides screening/search APIs, analytics APIs, user watchlist/filter APIs, and a protected data pipeline trigger.

## Tech Stack

- Python
- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL (Supabase-compatible)

## Project Structure

```text
backend/
  app/
    api/v1/endpoints/
    core/
    db/
    domains/
    orchestrator/
  alembic/
  requirements.txt
  .env
```

## Prerequisites

- Python 3.11+ recommended
- A PostgreSQL database URL

## Environment Variables

Create `backend/.env`:

```env
DATABASE_URL="postgresql+psycopg2://<user>:<password>@<host>:5432/<db>?sslmode=require"
PIPELINE_TRIGGER_API_KEY="<your-long-random-api-key>"
```

## Installation

```bash
cd backend
python -m venv .venv
```

Activate venv:

- Windows (PowerShell)

```powershell
.\.venv\Scripts\Activate.ps1
```

- macOS/Linux

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

## Database Migration

Run migrations before starting the API:

```bash
alembic upgrade head
```

## Run Locally

```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API base URL: `http://127.0.0.1:8000`  
Swagger docs: `http://127.0.0.1:8000/docs`  
Health check: `GET /health`

## API Overview

Base prefix: `/api/v1`

- `POST /pipeline/trigger` (requires `API_KEY` header)
- `POST /schemes`
- `GET /schemes/search`
- `GET /schemes/leaderboards`
- `GET /schemes/{external_id}/analytics`
- `POST /users`
- `POST /users/watchlist`
- `GET /users/watchlist`
- `PUT /users/watchlist`
- `DELETE /users/watchlist`
- `POST /users/filters`
- `GET /users/filters`
- `GET /users/filters/defaults`
- `PUT /users/filters/{external_id}`
- `DELETE /users/filters/{external_id}`

## Notes

- CORS currently allows `http://localhost:4000` (configured for frontend Vite dev server).
- `POST /pipeline/trigger` accepts `API_KEY` (or legacy `X-API-Key`) header.
