# Multi-stage Dockerfile for Auth Service
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY services/auth-service/package.json ./services/auth-service/

# Install dependencies
RUN npm install --legacy-peer-deps --workspace=@user-management/auth-service --workspace=@user-management/shared --include-workspace-root

# Copy source
COPY shared/ ./shared/
COPY services/auth-service/ ./services/auth-service/
COPY tsconfig.base.json ./

# Build
RUN cd services/auth-service && npm run build

# Production image
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/services/auth-service/package.json ./services/auth-service/

RUN npm install --legacy-peer-deps --workspace=@user-management/auth-service --workspace=@user-management/shared --include-workspace-root --omit=dev

COPY --from=builder /app/shared/src ./shared/src
COPY --from=builder /app/services/auth-service/dist ./services/auth-service/dist

WORKDIR /app/services/auth-service

EXPOSE 3001
ENV PORT=3001
CMD ["node", "dist/main.js"]
