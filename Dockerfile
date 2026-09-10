# Multi-stage production Dockerfile for Daily Sumire (React PWA + Express Server)
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install
COPY . .
RUN npx vite build

FROM node:22-alpine AS backend-builder
WORKDIR /app/server
COPY server/package.json server/pnpm-lock.yaml ./
RUN npm install
COPY server/ ./
RUN npx prisma generate
RUN npx tsc

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5050
ENV DATABASE_URL="file:/app/server/prisma/dev.db"

# Copy server files
COPY --from=backend-builder /app/server/package.json ./server/
WORKDIR /app/server
RUN npm install --omit=dev

COPY --from=backend-builder /app/server/dist ./dist
COPY --from=backend-builder /app/server/prisma ./prisma
COPY --from=backend-builder /app/server/node_modules ./node_modules

# Copy React PWA web build
COPY --from=frontend-builder /app/dist /app/public_web

EXPOSE 5050

CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
