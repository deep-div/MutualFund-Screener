FROM node:20-bookworm-slim AS backend-builder

# Set Python environment variables for better performance and clean logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PATH="/opt/venv/bin:$PATH"

# Install Python and system dependencies required for backend build
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        python3-venv \
        python3-pip \
        gcc \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy backend dependencies file to install Python packages
COPY backend/requirements.txt /tmp/backend-requirements.txt

# Create virtual environment and install backend dependencies
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --upgrade pip \
    && /opt/venv/bin/pip install -r /tmp/backend-requirements.txt



FROM node:20-bookworm-slim AS frontend-builder

# Chromium is used by the prerender step (Puppeteer) to render the SPA to static
# HTML so crawlers/AdSense receive real content instead of an empty shell.
# Use the distro Chromium and skip Puppeteer's bundled download to keep the image lean.
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        chromium \
        ca-certificates \
        fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Set working directory for frontend build
WORKDIR /app/frontend

# Copy package files and install frontend dependencies
COPY frontend/package*.json ./
RUN npm ci \
    && npm cache clean --force

# Copy frontend source code and build production-ready static files,
# then prerender routes into static HTML (build:prod = vite build + prerender).
# PRERENDER_API_TARGET points the prerender proxy at the live API to fetch blog content.
ARG PRERENDER_API_TARGET=https://fundscreener.online
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MEASUREMENT_ID

ENV PRERENDER_API_TARGET=${PRERENDER_API_TARGET} \
    VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY} \
    VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN} \
    VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID} \
    VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET} \
    VITE_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID} \
    VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID} \
    VITE_FIREBASE_MEASUREMENT_ID=${VITE_FIREBASE_MEASUREMENT_ID}

COPY frontend/ ./
RUN npm run build:prod



FROM node:20-bookworm-slim

# Set runtime environment variables for Python execution
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PATH="/opt/venv/bin:$PATH"

# Install only runtime dependencies (Python, Nginx, PostgreSQL client)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        nginx \
        ca-certificates \
        libpq5 \
    && update-ca-certificates \
    && rm -f /etc/nginx/sites-enabled/default \
    && rm -rf /var/lib/apt/lists/*

# Set working directory for the application
WORKDIR /app

# Copy pre-built Python virtual environment from backend stage
COPY --from=backend-builder /opt/venv /opt/venv

# Copy built frontend static files from frontend stage   
# NPM run build creates a static folder which we will use in ngnix to serve the frontend which is much faster and production ready
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Copy custom Nginx error page into the served frontend directory
COPY nginx/error_page.html /app/frontend/dist/error_page.html

# Copy backend application source code
COPY backend /app/backend

# Copy Nginx configuration for routing requests
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/default.vps.conf /etc/nginx/default.vps.conf.template

# Copy startup script that runs backend and Nginx together
COPY start.sh /app/start.sh

# Fix Windows line endings and make script executable
RUN sed -i 's/\r$//' /app/start.sh \
    && chmod +x /app/start.sh

# Expose HTTP and HTTPS ports
EXPOSE 80 443

# Start the application using custom startup script
CMD ["/app/start.sh"]

