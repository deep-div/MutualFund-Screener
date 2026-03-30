FROM node:20-bookworm-slim AS backend-builder

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
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /tmp/backend-requirements.txt
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --upgrade pip \
    && /opt/venv/bin/pip install -r /tmp/backend-requirements.txt

FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci \
    && npm cache clean --force

COPY frontend/ ./
RUN npm run build

FROM node:20-bookworm-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PATH="/opt/venv/bin:$PATH"

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        nginx \
        libpq5 \
    && rm -f /etc/nginx/sites-enabled/default \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=backend-builder /opt/venv /opt/venv
COPY --from=frontend-builder /app/frontend /app/frontend

COPY backend /app/backend
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY start.sh /app/start.sh
RUN sed -i 's/\r$//' /app/start.sh \
    && chmod +x /app/start.sh

EXPOSE 80

CMD ["/app/start.sh"]

