# ==========================================
# Stage 1: Build the Vue 3 Frontend
# ==========================================
FROM node:24-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Production Runner (Node.js 24 + Express + SQLite)
# ==========================================
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Install backend production dependencies
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy backend application source code
COPY backend/ ./

# Copy built frontend assets from Stage 1 into /app/frontend/dist
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Expose web server port
EXPOSE 3000

# Volume for persistent SQLite database
VOLUME ["/app/backend/data"]

# Start production server
CMD ["node", "--env-file-if-exists=.env", "index.js"]
