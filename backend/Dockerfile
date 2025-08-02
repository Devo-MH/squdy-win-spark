# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src
COPY scripts/copy-abi.js ./scripts/
COPY artifacts ./artifacts

RUN npm install
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json .

# Create non-root user and logs directory
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 && \
    mkdir -p logs && \
    chown -R appuser:nodejs /app && \
    chown -R appuser:nodejs logs
USER appuser

EXPOSE 3001
CMD ["node", "dist/index.js"]