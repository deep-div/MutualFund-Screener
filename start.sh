#!/bin/sh
set -e

if [ "${NGINX_CONF_PROFILE:-default}" = "vps" ] && [ -f /etc/nginx/default.vps.conf.template ]; then
  cp /etc/nginx/default.vps.conf.template /etc/nginx/conf.d/default.conf
fi

cd /app/backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

echo "Waiting for backend to be ready..."
until curl -sf http://127.0.0.1:8000/health > /dev/null 2>&1; do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "Backend process died before becoming ready"
    exit 1
  fi
  sleep 1
done
echo "Backend ready — starting nginx"

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
