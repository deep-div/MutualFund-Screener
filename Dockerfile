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

# Set working directory for frontend build
WORKDIR /app/frontend

# Copy package files and install frontend dependencies
COPY frontend/package*.json ./
RUN npm ci \
    && npm cache clean --force

# Copy frontend source code and build production-ready static files
COPY frontend/ ./
RUN npm run build



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
        libpq5 \
    && rm -f /etc/nginx/sites-enabled/default \
    && rm -rf /var/lib/apt/lists/*

# Set working directory for the application
WORKDIR /app

# Copy pre-built Python virtual environment from backend stage
COPY --from=backend-builder /opt/venv /opt/venv

# Copy built frontend static files from frontend stage   
# NPM run build creates a static folder which we will use in ngnix to serve the frontend which is much faster and production ready
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Copy backend application source code
COPY backend /app/backend

# Copy Nginx configuration for routing requests
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy startup script that runs backend and Nginx together
COPY start.sh /app/start.sh

# Fix Windows line endings and make script executable
RUN sed -i 's/\r$//' /app/start.sh \
    && chmod +x /app/start.sh

# Expose port 80 for incoming HTTP traffic
EXPOSE 80

# Start the application using custom startup script
CMD ["/app/start.sh"]