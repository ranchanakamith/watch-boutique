# ==============================================================================
# Stage 1: Build the Vue 3 Frontend SPA
# ==============================================================================
FROM node:24-alpine AS frontend-builder
WORKDIR /app/frontend

# Install dependencies with clean cache
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source and build static production bundle into dist/
COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Production Runner (Node.js 24 + Express + SQLite)
# ==============================================================================
FROM node:24-alpine AS runner
WORKDIR /app

# OCI Standard Metadata Labels
LABEL org.opencontainers.image.title="The Premium Watch Boutique" \
      org.opencontainers.image.description="Full-stack Luxury E-Commerce Platform" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.authors="DevOps Team"

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Install backend production dependencies only
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy backend application source code
COPY backend/ ./

# Copy built frontend assets from Stage 1 into /app/frontend/dist
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Prepare data directory for SQLite persistence and grant ownership to non-root user
RUN mkdir -p /app/backend/data && chown -R node:node /app

# Switch to non-root 'node' user for container security hardening (CIS Benchmark)
USER node

# Expose HTTP port
EXPOSE 3000

# Container health probe checking Express /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider -q http://127.0.0.1:3000/api/health || exit 1

# Volume mount point for persistent SQLite database
VOLUME ["/app/backend/data"]

# Start production server
CMD ["node", "--env-file-if-exists=.env", "index.js"]
