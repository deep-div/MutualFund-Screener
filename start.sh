#!/bin/sh
set -e

cd /app/backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

for i in $(seq 1 60); do
  python3 -c "import urllib.request,json; assert json.loads(urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health').read()).get('status')=='ok'" 2>/dev/null && break
  [ "$i" -eq 60 ] && { echo "ERROR: uvicorn did not start after 60 attempts" >&2; exit 1; }
  sleep 0.5
done

nginx -g "daemon off;" &
NGINX_PID=$!

cleanup() {
  kill "$BACKEND_PID" "$NGINX_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
  wait "$NGINX_PID" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

while kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$NGINX_PID" 2>/dev/null; do
  sleep 1
done

exit 1
