# Multi-stage Dockerfile for AI Service
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY services/ai-service/package.json ./services/ai-service/

RUN npm install --legacy-peer-deps --workspace=@user-management/ai-service --workspace=@user-management/shared --include-workspace-root

COPY shared/ ./shared/
COPY services/ai-service/ ./services/ai-service/
COPY tsconfig.base.json ./

RUN cd services/ai-service && npm run build

FROM node:20-alpine AS production

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/services/ai-service/package.json ./services/ai-service/

RUN npm install --legacy-peer-deps --workspace=@user-management/ai-service --workspace=@user-management/shared --include-workspace-root --omit=dev

COPY --from=builder /app/shared/src ./shared/src
COPY --from=builder /app/services/ai-service/dist ./services/ai-service/dist

WORKDIR /app/services/ai-service

EXPOSE 3005
ENV PORT=3005
CMD ["node", "dist/main.js"]
