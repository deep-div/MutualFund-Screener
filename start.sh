#!/bin/sh
set -e

cd /app/backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

cd /app/frontend
npm run preview -- --host 127.0.0.1 --port 4000 &
FRONTEND_PID=$!

nginx -g "daemon off;" &
NGINX_PID=$!

cleanup() {
  kill "$BACKEND_PID" "$FRONTEND_PID" "$NGINX_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
  wait "$FRONTEND_PID" 2>/dev/null || true
  wait "$NGINX_PID" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

while kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null && kill -0 "$NGINX_PID" 2>/dev/null; do
  sleep 1
done

exit 1
