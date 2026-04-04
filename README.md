# Mutual Fund Screener

<img width="1920" height="939" alt="Screenshot (920)" src="https://github.com/user-attachments/assets/8f7eb80a-f56e-45e1-80c2-e2279d78807e" />
<img width="1920" height="934" alt="Screenshot (921)" src="https://github.com/user-attachments/assets/651e29e7-adc1-46da-a79b-7441d1f97b79" />
<img width="1920" height="937" alt="Screenshot (922)" src="https://github.com/user-attachments/assets/ae304268-5e0c-4498-82a3-4c9a596a9eea" />
<img width="1920" height="936" alt="Screenshot (923)" src="https://github.com/user-attachments/assets/4497704f-0131-4161-a639-e68d8ee09c0a" />
<img width="1920" height="938" alt="Screenshot (924)" src="https://github.com/user-attachments/assets/7773abb5-4af1-41a0-82de-c1317f790180" />


https://github.com/user-attachments/assets/2a897819-47c4-4074-8694-ac8a8d876479


Full-stack mutual fund screening application with:

- `backend`: FastAPI service (screening, analytics, user state, pipeline trigger)
- `frontend`: React + Vite web app

## Repository Structure

```text
Mutual-Fund-Screener/
  backend/
  frontend/
  LICENSE
```

## Architecture

- Frontend runs on `http://localhost:4000`
- Backend runs on `http://127.0.0.1:8000`
- Frontend calls backend using `VITE_API_BASE_URL`
- Backend allows CORS for `http://localhost:4000`

## Quick Start (Run Both Services)

Open 2 terminals.

### 1. Start Backend

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

Install and run:

```bash
pip install -r requirements.txt
alembic upgrade head
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:4000`.

## Environment Setup

### Backend (`backend/.env`)

```env
DATABASE_URL="postgresql+psycopg2://<user>:<password>@<host>:5432/<db>?sslmode=require"
PIPELINE_TRIGGER_API_KEY="<your-long-random-api-key>"
```

### Frontend (`frontend/.env`)

```env
VITE_FIREBASE_API_KEY="<firebase-api-key>"
VITE_FIREBASE_AUTH_DOMAIN="<project>.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="<project-id>"
VITE_FIREBASE_STORAGE_BUCKET="<project>.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="<sender-id>"
VITE_FIREBASE_APP_ID="<app-id>"
VITE_FIREBASE_MEASUREMENT_ID="<measurement-id>"
VITE_API_BASE_URL="http://127.0.0.1:8000"
```

## Service Docs

- Backend details: [backend/README.md](./backend/README.md)
- Frontend details: [frontend/README.md](./frontend/README.md)

## Useful URLs

- Frontend: `http://localhost:4000`
- Backend health: `http://127.0.0.1:8000/health`
- Backend Swagger: `http://127.0.0.1:8000/docs`

## Troubleshooting

- `CORS error`: confirm frontend is running on `http://localhost:4000`.
- `401 on /pipeline/trigger`: pass valid `API_KEY` header.
- `Frontend cannot call backend`: verify `VITE_API_BASE_URL` and that backend is running on port `8000`.
