# Multi-stage Dockerfile for Audit Service
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY services/audit-service/package.json ./services/audit-service/

RUN npm install --legacy-peer-deps --workspace=@user-management/audit-service --workspace=@user-management/shared --include-workspace-root

COPY shared/ ./shared/
COPY services/audit-service/ ./services/audit-service/
COPY tsconfig.base.json ./

RUN cd services/audit-service && npm run build

FROM node:20-alpine AS production

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/services/audit-service/package.json ./services/audit-service/

RUN npm install --legacy-peer-deps --workspace=@user-management/audit-service --workspace=@user-management/shared --include-workspace-root --omit=dev

COPY --from=builder /app/shared/src ./shared/src
COPY --from=builder /app/services/audit-service/dist ./services/audit-service/dist

WORKDIR /app/services/audit-service

EXPOSE 3004
ENV PORT=3004
CMD ["node", "dist/main.js"]
