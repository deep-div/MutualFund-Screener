FROM node:20-bookworm-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PATH="/opt/venv/bin:$PATH"

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        python3-venv \
        python3-pip \
        gcc \
        libpq-dev \
        nginx \
    && rm -f /etc/nginx/sites-enabled/default \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt /tmp/backend-requirements.txt
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --upgrade pip \
    && /opt/venv/bin/pip install -r /tmp/backend-requirements.txt

COPY frontend/package*.json /app/frontend/
RUN cd /app/frontend && npm ci

COPY . /app

RUN cd /app/frontend && npm run build
RUN chmod +x /app/services.sh

COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["sh", "-c", "set -e; /app/services.sh & SERVICES_PID=$!; nginx -g 'daemon off;' & NGINX_PID=$!; while kill -0 $SERVICES_PID 2>/dev/null && kill -0 $NGINX_PID 2>/dev/null; do sleep 1; done; kill $SERVICES_PID $NGINX_PID 2>/dev/null || true; wait $SERVICES_PID 2>/dev/null || true; wait $NGINX_PID 2>/dev/null || true; exit 1"]
