# Multi-stage build for Daily Sumire Sync Server
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./
COPY prisma ./prisma/

# Install build dependencies
RUN npm ci

# Generate Prisma Client & compile TypeScript
COPY tsconfig.json ./
COPY src ./src/
RUN npx prisma generate
RUN npm run build

# --- Production Runner Stage ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Install curl for docker healthcheck
RUN apk add --no-cache curl

# Copy production package descriptors & install production-only dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy generated prisma client and compiled javascript
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist

# Expose backend port
EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start the server
CMD ["node", "dist/index.js"]
