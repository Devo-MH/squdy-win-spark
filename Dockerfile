# Stage 1: Build Backend
FROM node:18-alpine AS backend-builder

WORKDIR /app

# Copy root package.json and backend package.json
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install all dependencies
RUN npm install
RUN cd backend && npm install

# Copy all source files
COPY . .

# Build backend
RUN cd backend && npm run build

# ---
# Stage 2: Build Frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY bun.lockb ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# ---
# Stage 3: Production Backend
FROM node:18-alpine AS backend-production

WORKDIR /app

# Copy built backend from backend-builder stage
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY backend/package.json .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3001
CMD ["node", "dist/index.js"]

# ---
# Stage 4: Production Frontend
FROM nginx:alpine AS frontend-production

# Copy built assets from frontend-builder stage
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-default.conf /etc/nginx/conf.d/default.conf

# Create non-root user and set permissions
RUN addgroup -g 1001 -S nodejs && \
    adduser nginx nodejs && \
    chown -R nginx:nodejs /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nodejs /var/run/nginx.pid

USER nginx

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]