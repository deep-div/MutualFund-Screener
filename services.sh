#!/bin/sh
set -e

cd /app/backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 &
UVICORN_PID=$!

cd /app/frontend
npm run preview -- --host 127.0.0.1 --port 4000 &
FRONTEND_PID=$!

while kill -0 "$UVICORN_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; do
  sleep 1
done

kill "$UVICORN_PID" "$FRONTEND_PID" 2>/dev/null || true
wait "$UVICORN_PID" 2>/dev/null || true
wait "$FRONTEND_PID" 2>/dev/null || true
exit 1
